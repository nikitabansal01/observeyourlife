import {
  getInterviewPrepDefaults,
  getOverviewDefaults,
  getResearchDefaults,
  getRoleFitDefaults,
  getWorkspace,
} from './companyWorkspace';
import { getPrepChecklist } from './interviewPrepHub';
import { getResumeEvidenceList, getDirectionSnapshot } from '../careerProfile';

function upcomingInterviewAt(app) {
  const now = Date.now() - 60 * 60 * 1000;
  const dates = (app?.interviewDates || [])
    .map((value) => new Date(value))
    .filter((d) => !Number.isNaN(d.getTime()) && d.getTime() >= now)
    .sort((a, b) => a - b);
  return dates[0]?.toISOString() || null;
}

export function buildMockApplicationContext(app, profile = null) {
  const overview = getOverviewDefaults(app);
  const research = getResearchDefaults(app);
  const roleFit = getRoleFitDefaults(app, profile);
  const prep = getInterviewPrepDefaults(app, profile);
  const direction = getDirectionSnapshot(profile);
  const checklist = getPrepChecklist(app, profile);
  const checklistGaps = checklist.filter((item) => !item.done).map((item) => item.label);

  return {
    company: overview.company,
    role: overview.role || app.positionTitle || '',
    positionTitle: app.positionTitle || '',
    status: app.status || '',
    stageLabel: overview.stageLabel || '',
    recruiter: overview.recruiter || '',
    hiringManager: overview.hiringManager || '',
    jobDescription: overview.jobDescription || '',
    researchSummary: [research.summary, research.product].filter(Boolean).join('\n'),
    gaps: roleFit.gaps || [],
    matches: roleFit.matches || [],
    starStories: prep.starStories || [],
    likelyQuestions: prep.likelyQuestions || [],
    studyTopics: prep.studyTopics || [],
    pathTitle: direction.primaryTitle || prep.pathTitle || '',
    resumeEvidence: getResumeEvidenceList(profile, { limit: 4 }),
    checklistGaps,
    interviewAt: upcomingInterviewAt(app),
  };
}

export function getMockInterviewState(app) {
  const workspace = getWorkspace(app);
  const mock = workspace.mockInterview && typeof workspace.mockInterview === 'object'
    ? workspace.mockInterview
    : {};
  return {
    sessions: Array.isArray(mock.sessions) ? mock.sessions : [],
    activeSessionId: mock.activeSessionId || null,
  };
}

export function getActiveMockSession(app) {
  const state = getMockInterviewState(app);
  if (!state.activeSessionId) return null;
  return state.sessions.find((s) => s.id === state.activeSessionId) || null;
}

export function getStudyPlan(app) {
  const workspace = getWorkspace(app);
  return workspace.studyPlan && typeof workspace.studyPlan === 'object'
    ? workspace.studyPlan
    : null;
}

export function defaultMockConfig(app) {
  const status = app?.status || '';
  if (status === 'recruiter_screen') {
    return { type: 'recruiter', maxTurns: 5, persona: 'friendly' };
  }
  if (status === 'onsite') {
    return { type: 'mixed', maxTurns: 10, persona: 'bar-raiser' };
  }
  if (status === 'phone_screen' || status === 'interview_scheduled') {
    return { type: 'mixed', maxTurns: 5, persona: 'friendly' };
  }
  return { type: 'behavioral', maxTurns: 5, persona: 'friendly' };
}

export function mergeDrillIntoPrep(app, drillQuestions = []) {
  const workspace = getWorkspace(app);
  const prep = workspace.interviewPrep || {};
  const existing = Array.isArray(prep.likelyQuestions) ? prep.likelyQuestions : [];
  const merged = [...drillQuestions, ...existing]
    .map((q) => String(q || '').trim())
    .filter(Boolean);
  const unique = [...new Set(merged)].slice(0, 12);
  return {
    ...prep,
    likelyQuestions: unique,
    practiced: true,
    lastPracticedAt: new Date().toISOString(),
  };
}
