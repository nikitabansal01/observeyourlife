import { createHmac, timingSafeEqual, randomBytes } from 'crypto';

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events.readonly';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';

export function isGoogleConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID
    && process.env.GOOGLE_CLIENT_SECRET
    && process.env.GOOGLE_REDIRECT_URI
  );
}

export function getClientRedirectBase() {
  return (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
}

function requireGoogleConfig() {
  if (!isGoogleConfigured()) {
    throw new Error('Google Calendar is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI.');
  }
}

function signState(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', process.env.GOOGLE_CLIENT_SECRET)
    .update(body)
    .digest('base64url');
  return `${body}.${sig}`;
}

export function createOAuthState(userId) {
  requireGoogleConfig();
  return signState({
    userId,
    nonce: randomBytes(16).toString('hex'),
    exp: Date.now() + 10 * 60 * 1000,
  });
}

export function verifyOAuthState(state) {
  requireGoogleConfig();
  const [body, sig] = String(state || '').split('.');
  if (!body || !sig) throw new Error('Invalid OAuth state');

  const expected = createHmac('sha256', process.env.GOOGLE_CLIENT_SECRET)
    .update(body)
    .digest('base64url');

  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('Invalid OAuth state signature');
  }

  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (!payload?.userId || !payload?.exp || Date.now() > payload.exp) {
    throw new Error('OAuth state expired. Try connecting again.');
  }
  return payload;
}

export function buildGoogleAuthUrl(state) {
  requireGoogleConfig();
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: CALENDAR_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code) {
  requireGoogleConfig();
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error_description || data.error || 'Failed to exchange Google auth code');
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || null,
    expiresAt: Date.now() + (Number(data.expires_in || 3600) * 1000),
    scope: data.scope || CALENDAR_SCOPE,
    tokenType: data.token_type || 'Bearer',
  };
}

async function refreshAccessToken(refreshToken) {
  requireGoogleConfig();
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error_description || data.error || 'Failed to refresh Google access token');
  }

  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in || 3600) * 1000),
    scope: data.scope,
    tokenType: data.token_type || 'Bearer',
  };
}

export async function getValidAccessToken(stored, onUpdate) {
  if (!stored?.refreshToken && !stored?.accessToken) {
    throw new Error('Google Calendar is not connected');
  }

  if (stored.accessToken && stored.expiresAt && Date.now() < stored.expiresAt - 60_000) {
    return stored.accessToken;
  }

  if (!stored.refreshToken) {
    throw new Error('Google session expired. Disconnect and connect again.');
  }

  const refreshed = await refreshAccessToken(stored.refreshToken);
  const next = {
    ...stored,
    accessToken: refreshed.accessToken,
    expiresAt: refreshed.expiresAt,
    scope: refreshed.scope || stored.scope,
    tokenType: refreshed.tokenType || stored.tokenType,
    updatedAt: new Date().toISOString(),
  };
  if (onUpdate) await onUpdate(next);
  return next.accessToken;
}

/** Compact Google `q` searches — never list the full primary calendar. */
const GOOGLE_SEARCH_QUERIES = [
  'interview',
  'recruiter',
  'phone screen',
  'onsite',
  'hiring',
  'coding interview',
  'technical screen',
  'superday',
  'offer call',
];

const JOB_EVENT_KEYWORDS = [
  'interview',
  'recruiter',
  'phone screen',
  'phonescreen',
  'screening call',
  'hiring manager',
  'onsite',
  'on-site',
  'on site',
  'superday',
  'super day',
  'case interview',
  'coding interview',
  'technical screen',
  'technical interview',
  'final round',
  'loop interview',
  'take-home',
  'take home',
  'offer call',
  'job interview',
  'hiring',
];

const EVENT_FIELDS =
  'items(id,summary,location,start,end,status,htmlLink,hangoutLink,conferenceData/entryPoints/uri)';

function normalizeMatchText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function companyMatchTokens(company) {
  const cleaned = normalizeMatchText(company)
    .replace(/\b(inc|incorporated|llc|ltd|corp|corporation|co|company|the)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length < 3) return [];
  const tokens = [cleaned];
  const parts = cleaned.split(' ').filter((p) => p.length >= 4);
  if (parts.length > 1) tokens.push(parts[0]);
  return tokens;
}

function trackedCompanies(applications = []) {
  return (applications || [])
    .filter((app) => app && !app.isExample && app.company)
    .filter((app) => !['rejected', 'withdrawn'].includes(app.status))
    .map((app) => ({
      id: app.id,
      company: app.company,
      tokens: companyMatchTokens(app.company),
    }))
    .filter((c) => c.tokens.length > 0)
    .slice(0, 25);
}

function buildSearchQueries(applications = []) {
  const queries = [...GOOGLE_SEARCH_QUERIES];
  for (const company of trackedCompanies(applications)) {
    if (!queries.includes(company.company)) queries.push(company.company);
  }
  return queries;
}

function mapRawEvent(event) {
  return {
    id: event.id,
    title: event.summary || '(No title)',
    location: event.location || '',
    hangoutLink: event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri || '',
    start: event.start?.dateTime || event.start?.date || null,
    end: event.end?.dateTime || event.end?.date || null,
    status: event.status || 'confirmed',
    htmlLink: event.htmlLink || '',
  };
}

/** Public shape only — never includes description/attendees/personal notes. */
export function toPublicJobEvent(event) {
  return {
    id: event.id,
    title: event.title,
    location: event.location || '',
    hangoutLink: event.hangoutLink || '',
    start: event.start,
    end: event.end,
    status: event.status,
    htmlLink: event.htmlLink || '',
    matchReason: event.matchReason || null,
    matchedCompanyId: event.matchedCompanyId || null,
    matchedCompany: event.matchedCompany || null,
  };
}

async function searchEventsByQuery(accessToken, query, timeMin, timeMax) {
  const params = new URLSearchParams({
    q: query,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '25',
    fields: EVENT_FIELDS,
  });

  const res = await fetch(`${EVENTS_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || data.error || `Calendar search failed for “${query}”`);
  }

  return (data.items || []).map(mapRawEvent);
}

/**
 * Fetch only job-candidate events via Google search (`q`).
 * Does not list or retain the full primary calendar.
 */
export async function fetchJobCandidateEvents(accessToken, applications = [], {
  daysBack = 7,
  daysForward = 21,
} = {}) {
  const timeMin = new Date();
  timeMin.setDate(timeMin.getDate() - daysBack);
  const timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + daysForward);

  const queries = buildSearchQueries(applications);
  const byId = new Map();

  // Sequential to keep quota gentle; results are tiny vs a full dump.
  for (const query of queries) {
    const batch = await searchEventsByQuery(accessToken, query, timeMin, timeMax);
    for (const event of batch) {
      if (event?.id) byId.set(event.id, event);
    }
  }

  return {
    candidates: [...byId.values()].sort((a, b) => String(a.start).localeCompare(String(b.start))),
    queriesRun: queries.length,
  };
}

/**
 * Second pass: keep only events that still look job-related / company-matched.
 * Drop everything else immediately — do not store, log, or return them.
 */
export function filterJobRelatedEvents(events, applications = []) {
  const companies = trackedCompanies(applications);
  const matched = [];

  for (const event of events || []) {
    const haystack = normalizeMatchText([event.title, event.location].filter(Boolean).join(' '));
    if (!haystack) continue;

    const keyword = JOB_EVENT_KEYWORDS.find((k) => haystack.includes(normalizeMatchText(k)));
    if (keyword) {
      matched.push({
        ...event,
        matchReason: `keyword:${keyword}`,
        matchedCompanyId: null,
        matchedCompany: null,
      });
      continue;
    }

    const companyHit = companies.find((c) =>
      c.tokens.some((token) => {
        if (token.length >= 5) return haystack.includes(token);
        return (
          haystack === token
          || haystack.startsWith(`${token} `)
          || haystack.endsWith(` ${token}`)
          || haystack.includes(` ${token} `)
        );
      })
    );

    if (companyHit) {
      matched.push({
        ...event,
        matchReason: `company:${companyHit.company}`,
        matchedCompanyId: companyHit.id,
        matchedCompany: companyHit.company,
      });
    }
  }

  return matched.map(toPublicJobEvent);
}

/**
 * Guard for future AI features: never pass raw calendar dumps to an LLM.
 * Only already-filtered public job events may be used.
 */
export function assertSafeCalendarContextForLlm(events) {
  if (!Array.isArray(events)) {
    throw new Error('Calendar LLM context must be a filtered events array');
  }
  for (const event of events) {
    if (event?.description != null || event?.attendees != null || event?.raw != null) {
      throw new Error('Refusing to send non-public calendar fields to an LLM');
    }
    if (!event?.matchReason) {
      throw new Error('Refusing to send unmatched calendar events to an LLM');
    }
  }
  return events;
}

export async function revokeGoogleToken(token) {
  if (!token) return;
  try {
    await fetch(`${REVOKE_URL}?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  } catch {
    // Best-effort revoke; local disconnect still proceeds.
  }
}
