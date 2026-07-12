import OpenAI from 'openai';
import { STATUSES } from './constants.js';

const TASK_HINTS = [
  'prep', 'prepare', 'practice', 'leetcode', 'resume', 'cover letter',
  'todo', 'to do', 'task', 'reminder', 'block', 'focus time', 'deep work',
  'study', 'mock interview', 'self', 'personal', 'workout', 'gym',
  'dentist', 'doctor', 'birthday', 'dinner', 'lunch',
];

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function looksLikeTask(title) {
  const text = normalize(title);
  if (!text) return true;
  if (TASK_HINTS.some((hint) => text.includes(hint))) return true;
  if (/^(prep|practice|review|read|write|draft|plan)\b/.test(text)) return true;
  if (/\bmock\b/.test(text) && /\binterview\b/.test(text)) return true;
  return false;
}

function looksCancelled(title) {
  return /\b(cancel+ed|cancelled|declined|call off|rescheduled TBD)\b/i.test(title || '');
}

function inferStatusFromText(text) {
  const t = normalize(text);
  if (/\boffer call\b/.test(t)) return 'offer';
  if (/\bonsite\b|\bon site\b|\bsuperday\b|\bfinal round\b/.test(t)) return 'onsite';
  if (/\bhiring manager\b/.test(t)) return 'phone_screen';
  if (/\brecruiter\b|\bphone screen\b|\bscreening call\b/.test(t)) return 'recruiter_screen';
  if (/\btechnical\b|\bcoding\b|\btake home\b|\btake-home\b|\bloop\b|\bcase interview\b|\binterview\b/.test(t)) {
    return 'interview_scheduled';
  }
  return null;
}

function publicCompanies(applications = []) {
  return (applications || [])
    .filter((app) => app && !app.isExample)
    .map((app) => ({
      id: app.id,
      company: app.company,
      status: app.status,
      interviewDates: app.interviewDates || [],
      googleEventIds: app.googleEventIds || [],
    }));
}

function publicEvents(events = []) {
  return (events || []).map((event) => ({
    eventId: event.id,
    title: event.title,
    location: event.location || '',
    start: event.start || null,
    end: event.end || null,
    matchReason: event.matchReason || '',
    matchedCompany: event.matchedCompany || null,
    matchedCompanyId: event.matchedCompanyId || null,
  }));
}

function findExistingCompany(name, companies) {
  const target = normalize(name);
  if (!target || target.length < 2) return null;

  // Exact / contains
  const direct = companies.find((c) => {
    const n = normalize(c.company);
    return n === target || n.includes(target) || target.includes(n);
  });
  if (direct) return direct;

  // Token overlap for messy titles ("Case Study ... Qventus")
  const targetTokens = target.split(' ').filter((t) => t.length >= 4);
  if (!targetTokens.length) return null;

  let best = null;
  let bestScore = 0;
  for (const c of companies) {
    const n = normalize(c.company);
    const companyTokens = n.split(' ').filter((t) => t.length >= 4);
    const score = companyTokens.filter((t) => targetTokens.includes(t) || target.includes(t)).length;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return bestScore > 0 ? best : null;
}

/**
 * Heuristic intelligence when OpenAI is unavailable.
 */
export function analyzeCalendarEventsHeuristic(events, applications = []) {
  const companies = publicCompanies(applications);
  const groupsByKey = new Map();
  const skippedEvents = [];

  for (const event of events || []) {
    if (!event?.id) continue;

    if (looksCancelled(event.title)) {
      skippedEvents.push({
        eventId: event.id,
        eventTitle: event.title,
        reason: 'Cancelled/declined event',
      });
      continue;
    }

    const isTask = looksLikeTask(event.title);
    const existing =
      (event.matchedCompanyId && companies.find((c) => c.id === event.matchedCompanyId))
      || findExistingCompany(event.matchedCompany || '', companies);

    if (isTask) {
      if (existing) {
        const key = normalize(existing.company);
        if (!groupsByKey.has(key)) {
          groupsByKey.set(key, {
            canonicalName: existing.company,
            action: 'update_existing',
            existingApplicationId: existing.id,
            reason: 'Prep/task linked to existing company',
            events: [],
          });
        }
        groupsByKey.get(key).events.push({
          eventId: event.id,
          relevant: true,
          kind: 'prep_task',
          inferredStatus: null,
          useForStatus: false,
          useForDate: false,
          setNeedsPrep: true,
          reason: 'Prep/task for known company',
        });
      } else {
        skippedEvents.push({
          eventId: event.id,
          eventTitle: event.title,
          reason: 'Task/prep with no clear employer',
        });
      }
      continue;
    }

    const guessedName = event.matchedCompany
      || existing?.company
      || null;

    if (!guessedName) {
      // Try crude leftover from title via matchReason company: or skip
      skippedEvents.push({
        eventId: event.id,
        eventTitle: event.title,
        reason: 'Ambiguous — no clear company to attach',
      });
      continue;
    }

    const matched = existing || findExistingCompany(guessedName, companies);
    const key = normalize(matched?.company || guessedName);
    if (!groupsByKey.has(key)) {
      groupsByKey.set(key, {
        canonicalName: matched?.company || guessedName,
        action: matched ? 'update_existing' : 'create_new',
        existingApplicationId: matched?.id || null,
        reason: matched ? 'Matched existing company' : 'New employer from interview event',
        events: [],
      });
    }

    const inferred = inferStatusFromText([event.title, event.location].join(' '));
    groupsByKey.get(key).events.push({
      eventId: event.id,
      relevant: true,
      kind: 'interview_round',
      inferredStatus: inferred,
      useForStatus: Boolean(inferred),
      useForDate: true,
      setNeedsPrep: true,
      reason: 'Interview-like event',
    });
  }

  return {
    mode: 'heuristic',
    cleanup: [],
    companies: [...groupsByKey.values()],
    skippedEvents,
  };
}

function buildIntelligencePrompt(events, companies) {
  return `You are the intelligence layer for a job-hunt tracker.

You receive:
1) Existing pipeline companies
2) Retrieved Google Calendar candidate events (already privacy-filtered — not a full calendar dump)

Your job:
- Decide which events are relevant to job/interview tracking
- Distinguish real employer interviews vs tasks/prep/personal
- Match to an existing company when possible (fuzzy OK: spelling, Inc/LLC, short names, interviewer names in parentheses)
- Group 2+ events that belong to the same company under one company entry
- Decide create_new vs update_existing vs ignore
- CLEAN UP the existing pipeline: rename messy titles into real employer names, merge duplicates of the same employer, delete bogus companies that were created from prep/tasks or raw calendar titles

Existing companies:
${JSON.stringify(companies, null, 2)}

Candidate events:
${JSON.stringify(publicEvents(events), null, 2)}

Return ONLY JSON with this shape:
{
  "cleanup": [
    {
      "action": "rename" | "merge" | "delete",
      "applicationId": "id for rename/delete",
      "fromApplicationId": "id for merge source",
      "intoApplicationId": "id for merge target",
      "canonicalName": "clean employer name for rename",
      "reason": "short"
    }
  ],
  "companies": [
    {
      "canonicalName": "Stripe",
      "action": "update_existing" | "create_new" | "ignore",
      "existingApplicationId": "id or null",
      "reason": "short",
      "events": [
        {
          "eventId": "string",
          "relevant": true,
          "kind": "interview_round" | "recruiter_screen" | "prep_task" | "unrelated" | "cancelled" | "ambiguous",
          "inferredStatus": "one of ${STATUSES.join('|')} or null",
          "useForStatus": true,
          "useForDate": true,
          "setNeedsPrep": true,
          "reason": "short"
        }
      ]
    }
  ],
  "skippedEvents": [
    { "eventId": "string", "eventTitle": "string", "reason": "short" }
  ]
}

Rules / edge cases:
1. Relevance: keep recruiter screens, HM rounds, technical/onsite/offer calls. Drop birthdays, workouts, random meetings.
2. Company vs task: "Interview prep", "Leetcode", "Resume", "Mock interview", "Plan for interview stories..." are tasks — never create_new for those. Prefer delete if they already exist as fake companies. If clearly for an existing company, attach as prep_task (useForStatus=false, setNeedsPrep=true).
3. Existing match: prefer update_existing over create_new when names fuzzy-match. "Case Study ... Qventus" and "Interview with Qventus" are the SAME company (Qventus).
4. Same company, multiple events: ONE companies[] entry with multiple events[]. Use the strongest/latest interview for status guidance; keep dates for each interview_round.
5. Cancelled/declined: kind=cancelled, relevant=false, or put in skippedEvents.
6. Ambiguous titles with no employer: skip — do not invent a company.
7. Clean names: "Fay Nutrition - Recruiter, PM Scale Pod" → company "Fay Nutrition". "Deepscribe - Hiring Manager Interview (Stephanie Wu)" → "Deepscribe". "Abby Care - Senior Product Manager..." → "Abby Care".
8. Closed apps (rejected/withdrawn): do not reopen unless clearly a new active interview.
9. Past events can still update interviewDates; advance status when event indicates a later/equal clear round.
10. Duplicate near-identical events: group under one company.
11. Networking/coffee chat: skip unless clearly a recruiting screen.
12. Never invent employers. Never use personal/non-job context.
13. Every input eventId should appear either under some companies[].events or in skippedEvents.
14. Always emit cleanup entries when existing company names are polluted with role titles, interviewer names, or are clearly not employers.`;
}

function normalizeCleanup(rawCleanup, applications) {
  const ids = new Set((applications || []).filter((a) => !a.isExample).map((a) => a.id));
  const cleanup = [];
  for (const item of rawCleanup || []) {
    if (!item || !['rename', 'merge', 'delete'].includes(item.action)) continue;
    if (item.action === 'rename') {
      if (!ids.has(item.applicationId) || !item.canonicalName?.trim()) continue;
      cleanup.push({
        action: 'rename',
        applicationId: item.applicationId,
        canonicalName: item.canonicalName.trim(),
        reason: item.reason || 'Rename to clean employer name',
      });
    } else if (item.action === 'merge') {
      if (!ids.has(item.fromApplicationId) || !ids.has(item.intoApplicationId)) continue;
      if (item.fromApplicationId === item.intoApplicationId) continue;
      cleanup.push({
        action: 'merge',
        fromApplicationId: item.fromApplicationId,
        intoApplicationId: item.intoApplicationId,
        reason: item.reason || 'Merge duplicate companies',
      });
    } else if (item.action === 'delete') {
      if (!ids.has(item.applicationId)) continue;
      cleanup.push({
        action: 'delete',
        applicationId: item.applicationId,
        reason: item.reason || 'Remove non-company entry',
      });
    }
  }
  return cleanup;
}

function normalizeIntelligenceResult(raw, events, applications) {
  const companiesIn = publicCompanies(applications);
  const eventById = new Map((events || []).map((e) => [e.id, e]));
  const seen = new Set();
  const cleanup = normalizeCleanup(raw?.cleanup, applications);

  const companies = [];
  for (const group of raw?.companies || []) {
    if (!group || !Array.isArray(group.events) || group.events.length === 0) continue;

    let action = ['update_existing', 'create_new', 'ignore'].includes(group.action)
      ? group.action
      : 'ignore';

    let existingApplicationId = group.existingApplicationId || null;
    if (action === 'update_existing' && existingApplicationId) {
      const exists = companiesIn.some((c) => c.id === existingApplicationId);
      if (!exists) {
        const fuzzy = findExistingCompany(group.canonicalName, companiesIn);
        existingApplicationId = fuzzy?.id || null;
        if (!existingApplicationId) action = 'create_new';
      }
    }
    if (action === 'create_new') {
      const fuzzy = findExistingCompany(group.canonicalName, companiesIn);
      if (fuzzy) {
        action = 'update_existing';
        existingApplicationId = fuzzy.id;
      }
    }

    const normalizedEvents = [];
    for (const ev of group.events) {
      if (!ev?.eventId || !eventById.has(ev.eventId) || seen.has(ev.eventId)) continue;
      seen.add(ev.eventId);
      const inferred = STATUSES.includes(ev.inferredStatus) ? ev.inferredStatus : null;
      normalizedEvents.push({
        eventId: ev.eventId,
        relevant: ev.relevant !== false,
        kind: ev.kind || 'ambiguous',
        inferredStatus: inferred,
        useForStatus: Boolean(ev.useForStatus) && Boolean(inferred),
        useForDate: Boolean(ev.useForDate),
        setNeedsPrep: Boolean(ev.setNeedsPrep),
        reason: ev.reason || '',
      });
    }

    if (!normalizedEvents.length) continue;
    if (!group.canonicalName && action === 'create_new') continue;

    companies.push({
      canonicalName: group.canonicalName || 'Unknown',
      action,
      existingApplicationId,
      reason: group.reason || '',
      events: normalizedEvents,
    });
  }

  const skippedEvents = [];
  for (const s of raw?.skippedEvents || []) {
    if (!s?.eventId || seen.has(s.eventId)) continue;
    seen.add(s.eventId);
    skippedEvents.push({
      eventId: s.eventId,
      eventTitle: s.eventTitle || eventById.get(s.eventId)?.title || '',
      reason: s.reason || 'Skipped',
    });
  }

  for (const event of events || []) {
    if (!event?.id || seen.has(event.id)) continue;
    skippedEvents.push({
      eventId: event.id,
      eventTitle: event.title,
      reason: 'Not classified by intelligence layer; skipped for safety',
    });
  }

  return { cleanup, companies, skippedEvents };
}

/**
 * Full intelligence pass over privacy-filtered calendar events.
 * Uses LLM when OPENAI_API_KEY is set; otherwise heuristic grouping.
 */
export async function analyzeCalendarEvents(events, applications = []) {
  if (!events?.length) {
    return {
      mode: process.env.OPENAI_API_KEY ? 'llm' : 'heuristic',
      cleanup: [],
      companies: [],
      skippedEvents: [],
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return analyzeCalendarEventsHeuristic(events, applications);
  }

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a careful job-hunt calendar intelligence layer. Return valid JSON only. Prefer skip over inventing companies.',
        },
        {
          role: 'user',
          content: buildIntelligencePrompt(events, publicCompanies(applications)),
        },
      ],
    });

    const raw = JSON.parse(completion.choices[0]?.message?.content || '{}');
    const normalized = normalizeIntelligenceResult(raw, events, applications);
    return { mode: 'llm', ...normalized };
  } catch (error) {
    console.error('Calendar intelligence LLM failed, using heuristic:', error.message);
    return analyzeCalendarEventsHeuristic(events, applications);
  }
}
