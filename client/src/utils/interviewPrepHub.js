import { getDirectionSnapshot, getResumeEvidenceList } from '../careerProfile';
import { STORY_GROUPS as MOCK_STORY_GROUPS } from '../careerMocks';
import { isClosedStatus, getProcess } from './processSteps';
import { STATUS_LABELS } from '../constants';
import { formatInterviewWhen } from './todayInsights';
import {
  getInterviewPrepDefaults,
  getReflectionDefaults,
  getResearchDefaults,
  getRoleFitDefaults,
  getWorkspace,
} from './companyWorkspace';

const PREP_STATUSES = new Set([
  'recruiter_screen',
  'phone_screen',
  'interview_scheduled',
  'interview_completed',
  'onsite',
]);

export const STORY_GROUPS = MOCK_STORY_GROUPS;

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function filled(value) {
  return Boolean(String(value || '').trim());
}

function filledList(list) {
  return Array.isArray(list) && list.some((item) => filled(item));
}

function upcomingAt(app) {
  const now = Date.now() - 60 * 60 * 1000;
  const dates = (app?.interviewDates || [])
    .map(parseDate)
    .filter(Boolean)
    .filter((d) => d.getTime() >= now)
    .sort((a, b) => a - b);
  return dates[0]?.toISOString() || null;
}

function gatherEvidence(applications, profile = null) {
  const bits = [...getResumeEvidenceList(profile, { limit: 4 })];
  for (const app of applications || []) {
    if (isClosedStatus(app.status)) continue;
    const fit = getRoleFitDefaults(app, profile);
    const prep = getInterviewPrepDefaults(app, profile);
    bits.push(...(fit.evidence || []).filter(filled).slice(0, 2));
    bits.push(...(prep.starStories || []).filter(filled).slice(0, 1));
    if (filled(app.notes)) bits.push(app.notes.trim().slice(0, 120));
  }
  return [...new Set(bits)].slice(0, 8);
}

export function getPrepChecklist(app, profile = null) {
  const research = getResearchDefaults(app);
  const roleFit = getRoleFitDefaults(app, profile);
  const prep = getInterviewPrepDefaults(app, profile);
  const reflection = getReflectionDefaults(app);

  return [
    {
      id: 'research',
      label: `Research ${app.company || 'company'}`,
      done: filled(research.summary) || filled(research.product),
    },
    {
      id: 'fit',
      label: 'Map role fit & gaps',
      done: filledList(roleFit.matches) && filledList(roleFit.gaps),
    },
    {
      id: 'stories',
      label: 'Prepare STAR stories',
      done: filledList(prep.starStories),
    },
    {
      id: 'questions',
      label: 'Practice likely questions',
      done: filledList(prep.likelyQuestions) && Boolean(getWorkspace(app).interviewPrep?.practiced),
    },
    {
      id: 'ask',
      label: 'Prep questions to ask',
      done: filledList(prep.questionsToAsk),
    },
    {
      id: 'preNotes',
      label: 'Write pre-interview notes',
      done: filled(reflection.preNotes),
    },
  ];
}

export function getPrepProgress(app, profile = null) {
  const checklist = getPrepChecklist(app, profile);
  const done = checklist.filter((item) => item.done).length;
  return Math.round((done / checklist.length) * 100);
}

export function getNextPrepTask(app, profile = null) {
  const incomplete = getPrepChecklist(app, profile).find((item) => !item.done);
  if (incomplete) return incomplete.label;
  if (app.needsPrep) return `Finish final prep for ${app.company || 'interview'}`;
  const nextStep = (app.nextSteps || []).find((step) => filled(step));
  if (nextStep) return String(nextStep);
  return 'Review prep once more before the interview';
}

export function getUpcomingInterviewCards(applications, profile = null) {
  const cards = [];

  for (const app of applications || []) {
    if (isClosedStatus(app.status)) continue;
    const at = upcomingAt(app);
    const inPrepLane = PREP_STATUSES.has(app.status) || app.needsPrep || Boolean(at);
    if (!inPrepLane) continue;

    const { currentLabel, index: roundIndex } = getProcess(app);
    cards.push({
      id: app.id,
      appId: app.id,
      company: app.company || 'Unknown company',
      role: app.positionTitle || 'Role TBD',
      stage: currentLabel || STATUS_LABELS[app.status] || app.status,
      roundLabel: currentLabel || STATUS_LABELS[app.status] || app.status,
      roundIndex,
      status: app.status,
      at,
      whenLabel: at ? formatInterviewWhen(at) : 'Date TBD',
      progress: getPrepProgress(app, profile),
      nextTask: getNextPrepTask(app, profile),
      needsPrep: Boolean(app.needsPrep),
    });
  }

  return cards.sort((a, b) => {
    if (a.at && b.at) return new Date(a.at) - new Date(b.at);
    if (a.at) return -1;
    if (b.at) return 1;
    return a.progress - b.progress;
  });
}

export function getIncompletePrepTasks(applications, { limit = 8, profile = null } = {}) {
  const tasks = [];

  for (const card of getUpcomingInterviewCards(applications, profile)) {
    const app = applications.find((item) => item.id === card.id);
    if (!app) continue;
    for (const item of getPrepChecklist(app, profile)) {
      if (item.done) continue;
      tasks.push({
        id: `${app.id}-${item.id}`,
        appId: app.id,
        roundIndex: card.roundIndex,
        roundLabel: card.roundLabel,
        label: item.label,
        company: app.company || 'Unknown company',
        whenLabel: card.whenLabel,
      });
    }
  }

  return tasks.slice(0, limit);
}

export function getRecentlyPracticedQuestions(applications, practiced = [], { limit = 6 } = {}) {
  if (Array.isArray(practiced) && practiced.length > 0) {
    return [...practiced]
      .sort((a, b) => new Date(b.practicedAt || 0) - new Date(a.practicedAt || 0))
      .slice(0, limit);
  }

  // Fallback: surface likely questions from active prep companies as “ready to practice”
  const seeded = [];
  for (const app of applications || []) {
    if (isClosedStatus(app.status)) continue;
    if (!PREP_STATUSES.has(app.status) && !app.needsPrep) continue;
    const prep = getInterviewPrepDefaults(app);
    for (const question of (prep.likelyQuestions || []).filter(filled).slice(0, 2)) {
      seeded.push({
        id: `${app.id}-${question}`,
        question,
        company: app.company || 'Unknown company',
        pathHint: 'From company prep',
        practicedAt: app.updatedAt || null,
        readyOnly: true,
      });
    }
  }
  return seeded.slice(0, limit);
}

export function buildPersonalizedStoryBank(applications, profileOrDirection, savedBank) {
  const direction = getDirectionSnapshot(
    profileOrDirection?.selection || profileOrDirection?.workflow
      ? profileOrDirection
      : { selection: profileOrDirection || {} }
  );
  const path = direction.primaryTitle || 'your target path';
  const focus = (direction.focusAreas || []).slice(0, 2);
  const evidence = gatherEvidence(
    applications,
    profileOrDirection?.snapshot ? profileOrDirection : null
  );
  const sampleEvidence = evidence[0] || `Recent work that supports ${path}`;

  const templates = {
    leadership: {
      prompt: `Led a cross-functional outcome relevant to ${path}`,
      angle: focus[0]
        ? `Tie leadership to growing ${focus[0]}`
        : 'Show how you set direction and unblocked the team',
      evidence: sampleEvidence,
    },
    conflict: {
      prompt: `Disagreement that improved the product for ${path}`,
      angle: 'Conflict → principle → better decision',
      evidence: evidence[1] || sampleEvidence,
    },
    prioritization: {
      prompt: 'Said no to a loud request to protect the roadmap',
      angle: focus[1]
        ? `Connect trade-offs to ${focus[1]}`
        : 'Impact, effort, and sequencing under constraint',
      evidence: evidence[2] || sampleEvidence,
    },
    zeroToOne: {
      prompt: `0→1 bet that maps to ${path}`,
      angle: 'Discovery → decision → launch → learning',
      evidence: evidence.find((item) => /0→1|launch|discover/i.test(item)) || sampleEvidence,
    },
    failure: {
      prompt: 'Missed outcome and what you changed next',
      angle: `Make the learning useful for ${path} interviews`,
      evidence: evidence[3] || sampleEvidence,
    },
    technical: {
      prompt: 'Technical judgment call with engineering',
      angle: focus[0]
        ? `Show enough depth for ${focus[0]} conversations`
        : 'Demonstrate technical partnership without over-claiming',
      evidence: evidence.find((item) => /sql|api|platform|ai|model|tech/i.test(item)) || sampleEvidence,
    },
    stakeholders: {
      prompt: 'Aligned execs / partners with competing goals',
      angle: 'Influence without authority',
      evidence: evidence[4] || sampleEvidence,
    },
  };

  return STORY_GROUPS.map((group) => {
    const base = templates[group.id];
    const saved = savedBank?.[group.id];
    return {
      id: group.id,
      label: group.label,
      prompt: filled(saved?.prompt) ? saved.prompt : base.prompt,
      angle: filled(saved?.angle) ? saved.angle : base.angle,
      evidence: filled(saved?.evidence) ? saved.evidence : base.evidence,
      personalized: true,
      path,
    };
  });
}
