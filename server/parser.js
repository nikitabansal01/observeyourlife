import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_APPLICATION, STATUSES } from './constants.js';

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
- CRITICAL: If the user mentions multiple companies in one dump, return a SEPARATE object in "applications" for EACH distinct company. Never merge different companies into one record.
- Each company's "notes" should only contain details about that company, not the full transcript.
- Match existing applications by company name (fuzzy match OK).
- Merge new info into existing records; don't wipe fields unless the user corrects them.
- Infer status from context (e.g. "had my recruiter call" -> recruiter_screen or interview_completed).
- Pull out next steps explicitly (follow up, prep for interview, send thank you, etc.).
- Set needsFollowUp true if they mention waiting to hear back or should email recruiter.
- Set needsPrep true if an upcoming interview needs preparation.
- Normalize company names (e.g. "retell dot AI" -> "Retell AI", "typeface.ai" -> "Typeface.ai").
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
  };
}

function decodeSpelledName(text) {
  const spelled = text.match(/\b((?:[a-z]\s+){2,}[a-z])\b/i);
  if (!spelled) return null;
  return spelled[1].replace(/\s+/g, '');
}

function normalizeCompanyName(raw) {
  const name = raw.trim();
  if (!name) return 'Unknown Company';

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

function splitTranscriptIntoSegments(transcript) {
  const anchorPatterns = [
    /\btypeface\.ai\b/i,
    /\b(?:then\s+)?(?:restart|sierra)[^.]{0,40}palo\s+alto\b/i,
    /\bpalo\s+alto\b/i,
    /\bret(?:ail|ell)(?:\.ai)?\b/i,
    /\br\s*e\s*t\s*e\s*l\s*l\b/i,
    /\bophelia\b/i,
    /\bo\s*p\s*h\s*e\s*l\s*i\s*a\b/i,
  ];

  const hits = [];
  for (const pattern of anchorPatterns) {
    const match = transcript.match(pattern);
    if (match) hits.push({ index: match.index, length: match[0].length });
  }

  if (hits.length >= 2) {
    const uniqueHits = hits
      .sort((a, b) => a.index - b.index)
      .filter((hit, i, arr) => i === 0 || hit.index - arr[i - 1].index > 15);

    return uniqueHits.map((hit, i) => {
      const start = hit.index;
      const end = uniqueHits[i + 1]?.index ?? transcript.length;
      return transcript.slice(start, end).trim();
    });
  }

  const markers = [
    /(?:^|\s)(?:one|first)\s+(?:company\s+)?(?:is\s+|was\s+)?/gi,
    /(?:^|\s)then\s+/gi,
    /(?:^|\s)(?:the\s+)?other\s+compan(?:y|ies)\s+(?:that\s+)?(?:i\s+)?(?:interviewed|spoke)\s+(?:with\s+)?(?:was|were)\s+/gi,
    /(?:^|\s)(?:the\s+)?(?:second|third|fourth|another|next)\s+compan(?:y|ies)\s+(?:that\s+)?(?:i\s+)?(?:interviewed|spoke)\s+(?:with\s+)?(?:was|were)?\s*/gi,
    /(?:^|\s)also\s+(?:yesterday|today|recently)\s+/gi,
  ];

  let segments = [transcript.trim()];
  for (const marker of markers) {
    const next = [];
    for (const segment of segments) {
      const parts = segment.split(marker).filter((p) => p.trim());
      if (parts.length > 1) next.push(...parts);
      else next.push(segment);
    }
    segments = next;
  }

  return [...new Set(segments.map((s) => s.trim()).filter(Boolean))];
}

function extractCompanyFromSegment(segment) {
  if (/typeface\.ai/i.test(segment)) return 'Typeface.ai';
  if (/r\s*e\s*t\s*e\s*l\s*l|retell/i.test(segment)) return 'Retell AI';
  if (/retail\.ai/i.test(segment)) return 'Retell AI';
  if (/ophelia|o\s+p\s+h\s+e\s+l\s+i\s+a/i.test(segment)) return 'Ophelia';
  if (/palo\s+alto|sierra|restart/i.test(segment)) return 'Sierra';

  const spelled = segment.match(/\b(?:named|called)\s+((?:[a-z]\s+){2,}[a-z])\b/i);
  if (spelled) return normalizeCompanyName(spelled[1]);

  const dotAi = segment.match(/\b([a-z0-9][a-z0-9.-]*\.ai)\b/i);
  if (dotAi) return normalizeCompanyName(dotAi[1]);

  const spelledInline = segment.match(/\b([a-z](?:\s+[a-z]){3,})\s+(?:dot\s*ai|for\s+)/i);
  if (spelledInline) return normalizeCompanyName(spelledInline[1]);

  const companyMatch =
    segment.match(/\b([A-Z][A-Za-z0-9&]+(?:\s+[A-Z][A-Za-z0-9&]+)?)\b/) ||
    segment.match(/(?:at|with|for|from)\s+([A-Z][A-Za-z0-9&.\s-]+?)(?:\s+(?:for|as|on|yesterday|today|tomorrow|last|next)|[,.]|$)/i);

  if (companyMatch) {
    const candidate = companyMatch[1].trim();
    if (!/^(recruiter|june|july|january|february|march|april|may|august|september|october|november|december|today|yesterday|staff|senior|product|manager|role|interview)$/i.test(candidate)) {
      return normalizeCompanyName(candidate);
    }
  }

  return 'Unknown Company';
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
  const lower = segment.toLowerCase();
  const company = extractCompanyFromSegment(segment);

  let status = 'applied';
  if (/offer/i.test(lower)) status = 'offer';
  else if (/reject/i.test(lower)) status = 'rejected';
  else if (/onsite|on-site/i.test(lower)) status = 'onsite';
  else if (/interview.*(done|completed|went well|finished)/i.test(lower)) status = 'interview_completed';
  else if (/interview.*(scheduled|tomorrow|next week|on monday|on tuesday)/i.test(lower)) status = 'interview_scheduled';
  else if (/recruiter|interviewed/i.test(lower)) status = 'recruiter_screen';
  else if (/phone screen/i.test(lower)) status = 'phone_screen';

  const positionMatch = extractPositionTitle(segment);

  let industry = '';
  if (/marketing/i.test(lower)) industry = 'marketing';
  else if (/healthcare|health care|telehealth|opioid/i.test(lower)) industry = 'healthcare';
  else if (/call center|voice|conversational/i.test(lower)) industry = 'voice-ai';
  else if (/fintech|financial/i.test(lower)) industry = 'fintech';

  const fundingMatch = segment.match(/(pre-seed|seed|series [a-e]|ipo|public|bootstrapped|late stage)/i);
  const businessModelMatch = segment.match(/\b(b2b|b2c|b2b\s*(?:and|&)\s*b2c|both)\b/i);
  let businessModel = '';
  if (businessModelMatch) {
    const bm = businessModelMatch[1].toLowerCase();
    if (/both|b2b.*b2c|b2c.*b2b/.test(bm)) businessModel = 'both';
    else if (/b2c/.test(bm)) businessModel = 'b2c';
    else if (/b2b/.test(bm)) businessModel = 'b2b';
  }

  const fundingAmountMatch = segment.match(/\$?\s*(\d+(?:\.\d+)?)\s*(million|m|billion|b)\b/i);
  const fundingDateMatch = segment.match(/(?:raised|funding|round).{0,30}?(\d{4})/i);
  const interviewDateMatch = segment.match(/(?:june|july|january|february|march|april|may|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i);

  const nextSteps = [];
  if (/follow up|follow-up|reach out|email recruiter/i.test(lower)) nextSteps.push('Follow up with recruiter');
  if (/prep|prepare|study|practice/i.test(lower)) nextSteps.push('Prep for interview');

  let lastFundingAmount = null;
  if (fundingAmountMatch) {
    const num = parseFloat(fundingAmountMatch[1]);
    const unit = fundingAmountMatch[2].toLowerCase();
    lastFundingAmount = unit.startsWith('b') ? num * 1000 : num;
  }

  let lastFundingDate = '';
  if (fundingDateMatch) {
    lastFundingDate = new Date(`${fundingDateMatch[1]}-06-01`).toISOString();
  }

  const interviewDates = [];
  if (interviewDateMatch) {
    const month = interviewDateMatch[0].match(/[a-z]+/i)[0];
    const day = interviewDateMatch[1].padStart(2, '0');
    const year = interviewDateMatch[2];
    interviewDates.push(new Date(`${month} ${day}, ${year}`).toISOString());
  }

  const incoming = {
    company,
    positionTitle: positionMatch || '',
    industry,
    businessModel,
    fundingStage: fundingMatch?.[1]?.toLowerCase().replace(/\s+/g, '-') || '',
    lastFundingDate,
    lastFundingAmount,
    status,
    interviewDates,
    nextSteps,
    needsFollowUp: /follow up|waiting to hear|haven't heard/i.test(lower),
    needsPrep: /prep|prepare|upcoming interview/i.test(lower),
    notes: segment.trim(),
  };

  const existing = findExisting(existingApps, company);
  return mergeApplication(existing, incoming);
}

function heuristicParse(transcript, existingApps) {
  const segments = splitTranscriptIntoSegments(transcript);
  const mergedApps = segments.map((segment) => parseSingleSegment(segment, existingApps));

  const uniqueByCompany = new Map();
  for (const app of mergedApps) {
    const key = normalizeCompanyName(app.company).toLowerCase().replace(/[^a-z0-9]/g, '');
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
  };
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
    const mergedApps = parsed.applications.map((incoming) => {
      const existing =
        existingApps.find((a) => a.id === incoming.id) ||
        findExisting(existingApps, incoming.company);
      return mergeApplication(existing, incoming);
    });

    return {
      applications: mergedApps,
      summary: parsed.summary || 'Updated from voice dump',
    };
  } catch (error) {
    console.error('OpenAI parse failed, using heuristic:', error.message);
    return heuristicParse(transcript, existingApps);
  }
}

export function applyVoiceDumpResult(existingApps, result) {
  const map = new Map(existingApps.map((app) => [app.id, app]));

  for (const app of result.applications) {
    map.set(app.id, app);
  }

  return [...map.values()].sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
  );
}
