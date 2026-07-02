import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_APPLICATION, STATUSES } from './constants.js';
import { applyVoiceDumpResult } from './applicationsMerge.js';

const SYSTEM_PROMPT = `You are a job hunt assistant. The user speaks casually about their job applications and interviews.

Given a voice transcript and the current list of applications (JSON), extract updates and return JSON with this exact shape:
{
  "applications": [
    {
      "id": "existing-id or null for new",
      "company": "string",
      "positionTitle": "string",
      "industry": "string or empty (one of: healthtech, healthcare, fintech, voice-ai, edtech, marketing, other)",
      "businessModel": "string or empty (b2b, b2c, or both)",
      "fundingStage": "string or empty (pre-seed, seed, series-a through series-e, pre-ipo, ipo, public, bootstrapped)",
      "lastFundingDate": "ISO date string or empty",
      "lastFundingAmount": "number in millions USD or null",
      "status": "one of: ${STATUSES.join(', ')}",
      "interviewDates": ["ISO date strings"],
      "nextSteps": ["action items"],
      "needsFollowUp": boolean,
      "needsPrep": boolean,
      "notes": "freeform context from the dump"
    }
  ],
  "summary": "one sentence of what changed"
}

Rules:
- CRITICAL: Only create entries for real employers/companies the user interviewed with or applied to. Never treat dates, filler words, role titles alone, or sentence fragments as company names.
- CRITICAL: If the user mentions multiple companies, return a SEPARATE object for EACH distinct company.
- CRITICAL: "applications" must NEVER be empty when the user clearly mentioned one or more companies.
- Return ONLY companies mentioned in THIS transcript. The server merges with existingApplications — you are not replacing the full pipeline.
- Decode spelled-out names (e.g. "r a y d a r dot xyz" -> "Raydar.xyz", "q v e n t u s" -> "Qventus").
- Match existing applications by company name (fuzzy match OK) and reuse their id.
- Merge new info into existing records; don't wipe fields unless the user corrects them.
- Infer status from context (recruiter call -> recruiter_screen, hiring manager round done -> interview_completed, moving to next round -> interview_scheduled).
- Set needsFollowUp when waiting to hear back. Set needsPrep for upcoming interviews.
- Return ONLY valid JSON, no markdown.`;

function normalizeCompany(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findExisting(applications, company) {
  const target = normalizeCompany(company);
  return applications.find((app) => normalizeCompany(app.company) === target);
}

function mergeApplication(existing, incoming) {
  const base = existing || {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    ...DEFAULT_APPLICATION,
  };

  return {
    ...base,
    company: incoming.company || base.company,
    positionTitle: incoming.positionTitle || base.positionTitle,
    industry: incoming.industry || base.industry,
    businessModel: incoming.businessModel || base.businessModel,
    fundingStage: incoming.fundingStage || base.fundingStage,
    lastFundingDate: incoming.lastFundingDate || base.lastFundingDate,
    lastFundingAmount: incoming.lastFundingAmount ?? base.lastFundingAmount,
    status: STATUSES.includes(incoming.status) ? incoming.status : base.status,
    interviewDates: incoming.interviewDates?.length
      ? [...new Set([...(base.interviewDates || []), ...incoming.interviewDates])]
      : base.interviewDates || [],
    nextSteps: incoming.nextSteps?.length ? incoming.nextSteps : base.nextSteps || [],
    needsFollowUp: incoming.needsFollowUp ?? base.needsFollowUp,
    needsPrep: incoming.needsPrep ?? base.needsPrep,
    notes: [base.notes, incoming.notes].filter(Boolean).join('\n').trim(),
    updatedAt: new Date().toISOString(),
    isExample: false,
  };
}

function decodeSpelledName(text) {
  const spelled = text.match(/\b((?:[a-z]\s+){2,}[a-z])\b/i);
  if (!spelled) return null;
  return spelled[1].replace(/\s+/g, '');
}

function extractSpelledCompany(segment) {
  const spelled = segment.match(
    /spelled\s+as\s+((?:[a-z]\s+){2,}[a-z])(?:\s+dot\s+([a-z0-9.]+))?/i
  );
  if (!spelled) return null;

  let name = spelled[1].replace(/\s+/g, '');
  if (spelled[2]) {
    const tld = spelled[2].replace(/^\./, '').toLowerCase();
    name = `${name}.${tld}`;
  }
  return normalizeCompanyName(name);
}

function sanitizeAiApplications(applications) {
  if (!Array.isArray(applications)) return [];
  return applications.filter((app) => app?.company?.trim());
}

function normalizeCompanyName(raw) {
  const name = raw.trim();
  if (!name) return null;

  const spelled = decodeSpelledName(name);
  if (spelled && spelled.length >= 4) {
    return spelled.charAt(0).toUpperCase() + spelled.slice(1).toLowerCase();
  }

  const dotAi = name.match(/([a-z0-9]+)\s*(?:dot\s*)?\.?\s*ai\b/i);
  if (dotAi) {
    return `${dotAi[1].charAt(0).toUpperCase()}${dotAi[1].slice(1).toLowerCase()} AI`;
  }

  return name
    .replace(/\s+dot\s+/gi, '.')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

const NON_COMPANY_WORDS =
  /^(recruiter|june|july|january|february|march|april|may|august|september|october|november|december|today|yesterday|staff|senior|product|manager|role|interview|company|companies|heard|waiting)$/i;

function extractCompanyFromSegment(segment) {
  const spelledCompany = extractSpelledCompany(segment);
  if (spelledCompany) return spelledCompany;

  const dotAi = segment.match(/\b([a-z0-9][a-z0-9.-]*\.(?:ai|xyz|io|com))\b/i);
  if (dotAi) return normalizeCompanyName(dotAi[1]);

  const spelled = segment.match(/\b(?:named|called)\s+((?:[a-z]\s+){2,}[a-z])\b/i);
  if (spelled) return normalizeCompanyName(spelled[1]);

  const atCompany = segment.match(
    /(?:interviewed\s+with|screen\s+at|call\s+at|met\s+with|with|at|from)\s+([A-Za-z0-9][A-Za-z0-9.\s&-]{0,30}?)(?:\s+(?:for|as|on|yesterday|today|tomorrow|last|next|which|this|that)|[,.]|$)/i
  );
  if (atCompany) {
    const candidate = atCompany[1].trim();
    if (candidate && !NON_COMPANY_WORDS.test(candidate)) return normalizeCompanyName(candidate);
  }

  return null;
}

function extractPositionTitle(segment) {
  const normalized = segment.replace(/\bIPM\b/gi, 'PM');
  const roleMatch =
    normalized.match(/(?:staff|senior|principal|lead|junior)\s+product\s+manager(?:\s+[\w]+){0,5}/i) ||
    normalized.match(/(?:for|as)\s+(?:a\s+)?((?:Senior|Staff|Principal|Lead|Junior)?\s*(?:Product\s+)?Manager)\b/i) ||
    normalized.match(/\b((?:Senior|Staff|Principal|Lead|Junior)\s+PM)\b/i) ||
    (/\bPM\s+role\b/i.test(normalized) ? ['Product Manager'] : null);

  if (!roleMatch) return '';

  return (roleMatch[0] || roleMatch)
    .replace(/^(?:for|as)\s+(?:a\s+)?/i, '')
    .replace(/\s+role\b.*$/i, '')
    .trim();
}

function parseSingleSegment(segment, existingApps) {
  const company = extractCompanyFromSegment(segment);
  if (!company) return null;

  const lower = segment.toLowerCase();

  let status = 'applied';
  if (/offer/i.test(lower)) status = 'offer';
  else if (/reject/i.test(lower)) status = 'rejected';
  else if (/onsite|on-site/i.test(lower)) status = 'onsite';
  else if (/moving forward|next round|round three/i.test(lower)) status = 'interview_scheduled';
  else if (/hiring manager.*round|round (?:two|2|three|3)/i.test(lower)) status = 'interview_completed';
  else if (/interview.*(done|completed|went well|finished)/i.test(lower)) status = 'interview_completed';
  else if (/interview.*(scheduled|tomorrow|next week)/i.test(lower)) status = 'interview_scheduled';
  else if (/recruiter|recruiter call/i.test(lower)) status = 'recruiter_screen';
  else if (/interviewed|hiring manager/i.test(lower)) status = 'recruiter_screen';
  else if (/phone screen/i.test(lower)) status = 'phone_screen';

  const incoming = {
    company,
    positionTitle: extractPositionTitle(segment),
    industry: '',
    businessModel: '',
    fundingStage: '',
    lastFundingDate: '',
    lastFundingAmount: null,
    status,
    interviewDates: [],
    nextSteps: [],
    needsFollowUp: /follow up|waiting to hear|haven't heard|hear back|get to hear back/i.test(lower),
    needsPrep: /prep|prepare|upcoming interview/i.test(lower),
    notes: segment.trim(),
  };

  return mergeApplication(findExisting(existingApps, company), incoming);
}

function splitOnCompanyMarkers(transcript) {
  const markers = [
    /(?:^|\s)(?:one|first)\s+(?:company\s+)?(?:is\s+|was\s+)?/gi,
    /(?:^|\s)second\s+compan(?:y|ies)\b/gi,
    /(?:^|\s)(?:third|another|next)\s+compan(?:y|ies)\b/gi,
    /(?:^|\s)my\s+third\s+interview\b/gi,
    /interviewed\s+with\b/gi,
    /spelled\s+as\b/gi,
  ];

  let segments = [transcript.trim()];
  for (const marker of markers) {
    const next = [];
    for (const segment of segments) {
      const parts = segment.split(marker).filter((p) => p.trim());
      next.push(...(parts.length > 1 ? parts : [segment]));
    }
    segments = next;
  }

  return [...new Set(segments.map((s) => s.trim()).filter(Boolean))];
}

function heuristicParse(transcript, existingApps) {
  const segments = splitOnCompanyMarkers(transcript);
  const mergedApps = segments
    .map((segment) => parseSingleSegment(segment, existingApps))
    .filter(Boolean);

  const uniqueByCompany = new Map();
  for (const app of mergedApps) {
    const key = normalizeCompany(app.company);
    if (!key) continue;
    if (!uniqueByCompany.has(key) || app.notes.length > uniqueByCompany.get(key).notes.length) {
      uniqueByCompany.set(key, app);
    }
  }

  const applications = [...uniqueByCompany.values()];
  const names = applications.map((a) => a.company).join(', ');

  return {
    applications,
    summary:
      applications.length > 1
        ? `Added/updated ${applications.length} companies: ${names}`
        : applications[0]
          ? `Updated ${applications[0].company} from voice dump`
          : 'No companies found in voice dump',
    parser: 'heuristic',
  };
}

function withParser(result, parser) {
  return { ...result, parser };
}

export async function parseVoiceDump(transcript, existingApps) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return heuristicParse(transcript, existingApps);
  }

  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: JSON.stringify({
            transcript,
            existingApplications: existingApps,
          }),
        },
      ],
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    const aiApps = sanitizeAiApplications(parsed.applications);

    if (aiApps.length === 0) {
      throw new Error(
        'Could not identify any companies in your update. Name each employer clearly (e.g. "interviewed with Acme for a PM role").'
      );
    }

    const mergedApps = aiApps.map((incoming) => {
      const existing =
        existingApps.find((a) => a.id === incoming.id) ||
        findExisting(existingApps, incoming.company);
      return mergeApplication(existing, incoming);
    });

    return withParser(
      {
        applications: mergedApps,
        summary: parsed.summary || `Added/updated ${mergedApps.length} companies`,
      },
      'openai'
    );
  } catch (error) {
    if (error.message?.includes('Could not identify any companies')) {
      throw error;
    }
    console.error('OpenAI parse failed, using heuristic:', error.message);
    return heuristicParse(transcript, existingApps);
  }
}

export { applyVoiceDumpResult };
