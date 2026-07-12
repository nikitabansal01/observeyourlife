import { DEFAULT_CAREER_PATH, TODAY_PRIORITY_DEFAULTS } from '../careerMocks';
import { getDirectionSnapshot } from '../careerProfile';
import { getProcess, isClosedStatus } from './processSteps';
import { STATUS_LABELS } from '../constants';

const INTERVIEW_STATUSES = new Set([
  'recruiter_screen',
  'phone_screen',
  'interview_scheduled',
  'interview_completed',
  'onsite',
]);

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(from = new Date()) {
  const d = startOfDay(from);
  const day = d.getDay();
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + daysUntilSunday);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function formatInterviewWhen(iso) {
  if (!iso) return 'Time TBD';
  const date = parseDate(iso);
  if (!date) return 'Time TBD';
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function collectInterviewCandidates(applications) {
  const now = Date.now();
  const candidates = [];

  for (const app of applications || []) {
    if (isClosedStatus(app.status)) continue;
    const dates = Array.isArray(app.interviewDates) ? app.interviewDates : [];
    const futureDates = dates
      .map(parseDate)
      .filter(Boolean)
      .filter((d) => d.getTime() >= now - 60 * 60 * 1000)
      .sort((a, b) => a - b);

    if (futureDates.length > 0) {
      candidates.push({
        app,
        at: futureDates[0].toISOString(),
        source: 'dated',
      });
      continue;
    }

    if (INTERVIEW_STATUSES.has(app.status) || app.needsPrep) {
      candidates.push({
        app,
        at: dates.map(parseDate).filter(Boolean).sort((a, b) => b - a)[0]?.toISOString() || null,
        source: 'status',
      });
    }
  }

  candidates.sort((a, b) => {
    if (a.at && b.at) return new Date(a.at) - new Date(b.at);
    if (a.at) return -1;
    if (b.at) return 1;
    return new Date(b.app.updatedAt || 0) - new Date(a.app.updatedAt || 0);
  });

  return candidates;
}

export function getNextInterview(applications) {
  const [next] = collectInterviewCandidates(applications);
  if (!next) return null;

  const { app, at } = next;
  const { currentLabel, index: roundIndex } = getProcess(app);

  return {
    id: app.id,
    company: app.company || 'Unknown company',
    role: app.positionTitle || 'Role TBD',
    stage: currentLabel || STATUS_LABELS[app.status] || app.status,
    roundLabel: currentLabel || STATUS_LABELS[app.status] || app.status,
    roundIndex,
    status: app.status,
    at,
    whenLabel: formatInterviewWhen(at),
    interviewer: app.interviewer || null,
    needsPrep: Boolean(app.needsPrep),
    isExample: Boolean(app.isExample),
  };
}

export function getTodaysPriorities(applications, { limit = 4 } = {}) {
  const items = [];
  const seen = new Set();

  const push = (id, label, meta) => {
    if (seen.has(id) || items.length >= limit) return;
    seen.add(id);
    items.push({ id, label, meta });
  };

  for (const app of applications || []) {
    if (isClosedStatus(app.status)) continue;
    const company = app.company || 'a company';

    if (app.needsFollowUp) {
      push(`follow-${app.id}`, `Follow up with recruiter at ${company}`, company);
    }

    if (app.needsPrep) {
      push(`prep-${app.id}`, `Prepare for ${company} interview`, company);
    }

    for (const step of app.nextSteps || []) {
      const text = String(step || '').trim();
      if (!text) continue;
      push(`step-${app.id}-${text}`, text, company);
    }
  }

  const defaults = TODAY_PRIORITY_DEFAULTS;

  for (const item of defaults) {
    push(item.id, item.label, item.meta);
  }

  return items.slice(0, limit);
}

export function getPipelineSummary(applications) {
  const list = applications || [];
  const active = list.filter((app) => !isClosedStatus(app.status));
  const closed = list.filter((app) => isClosedStatus(app.status));
  const weekEnd = endOfWeek();
  const weekStart = startOfDay(new Date());

  const interviewsThisWeek = active.filter((app) => {
    const dates = (app.interviewDates || []).map(parseDate).filter(Boolean);
    if (dates.some((d) => d >= weekStart && d <= weekEnd)) return true;

    if (!['interview_scheduled', 'onsite', 'phone_screen'].includes(app.status)) return false;
    const updated = parseDate(app.updatedAt);
    return Boolean(updated && updated >= weekStart && updated <= weekEnd);
  }).length;

  const needingFollowUp = active.filter(
    (app) => app.needsFollowUp || (app.nextSteps || []).some((s) => /follow\s*up/i.test(String(s)))
  ).length;

  return {
    active: active.length,
    interviewsThisWeek,
    needingFollowUp,
    closed: closed.length,
  };
}

const DEFAULT_DIRECTION = {
  primaryTitle: DEFAULT_CAREER_PATH.title,
  focusAreas: DEFAULT_CAREER_PATH.focusAreas.slice(0, 2),
  nextAction: DEFAULT_CAREER_PATH.nextAction,
  isMock: true,
};

/** Accepts full profile or legacy selection object. */
export function getCareerDirectionSnapshot(profileOrSelection) {
  if (profileOrSelection?.selection || profileOrSelection?.snapshot || profileOrSelection?.workflow) {
    return getDirectionSnapshot(profileOrSelection);
  }
  return getDirectionSnapshot({ selection: profileOrSelection || {} });
}

export function getLearningFocus({ direction, nextInterview }) {
  const topics = [];

  if (direction?.focusAreas?.[0]) {
    topics.push({
      id: 'path-1',
      title: direction.focusAreas[0],
      reason: `Tied to ${direction.primaryTitle}`,
    });
  }

  if (nextInterview) {
    const industry = nextInterview.stage ? `Interview stage: ${nextInterview.stage}` : 'Upcoming interview';
    topics.push({
      id: 'interview-1',
      title: nextInterview.needsPrep
        ? `${nextInterview.company} interview prep`
        : `Company research: ${nextInterview.company}`,
      reason: industry,
    });
  }

  if (topics.length === 0) {
    topics.push(
      { id: 'mock-1', title: 'Product sense drills', reason: 'General interview readiness' },
      { id: 'mock-2', title: 'System design for PMs', reason: 'Common loop round' }
    );
  } else if (topics.length === 1 && direction?.focusAreas?.[1]) {
    topics.push({
      id: 'path-2',
      title: direction.focusAreas[1],
      reason: `Tied to ${direction.primaryTitle}`,
    });
  }

  return topics.slice(0, 2);
}
