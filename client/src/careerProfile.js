import {
  EMPTY_SNAPSHOT,
  DEFAULT_CAREER_PATH,
  buildAssumptionsFromAnswers,
  buildCareerPaths,
} from './careerMocks';

export const CAREER_PROFILE_VERSION = 1;

export function createEmptyCareerProfile() {
  return {
    version: CAREER_PROFILE_VERSION,
    userProfile: {
      displayName: '',
      updatedAt: null,
    },
    resume: {
      source: null, // upload | linkedin | null
      fileName: '',
      linkedinUrl: '',
      importedAt: null,
    },
    snapshot: { ...EMPTY_SNAPSHOT },
    importBaseline: null,
    reflection: {},
    reflectionComplete: false,
    assumptions: null,
    generatedPaths: [],
    selection: {
      primaryPathId: null,
      secondaryPathId: null,
      primaryTitle: null,
      secondaryTitle: null,
      focusAreas: [],
      nextAction: '',
      updatedAt: null,
    },
    learningTopics: [],
    workflow: {
      hasResume: false,
      hasSnapshot: false,
      hasReflection: false,
      hasPrimaryPath: false,
    },
    updatedAt: null,
  };
}

function fieldFilled(value) {
  return Boolean(String(value || '').trim());
}

function snapshotFilled(snapshot = {}) {
  return Object.values(snapshot).some(fieldFilled);
}

export function deriveWorkflow(profile) {
  const hasResume = Boolean(profile?.resume?.importedAt || profile?.resume?.source);
  const hasSnapshot = snapshotFilled(profile?.snapshot);
  const hasReflection = Boolean(
    profile?.reflectionComplete
    || Object.values(profile?.reflection || {}).filter(fieldFilled).length >= 4
  );
  const hasPrimaryPath = Boolean(profile?.selection?.primaryPathId || profile?.selection?.primaryTitle);

  return {
    hasResume,
    hasSnapshot,
    hasReflection,
    hasPrimaryPath,
  };
}

export function normalizeCareerProfile(raw) {
  const base = createEmptyCareerProfile();
  if (!raw || typeof raw !== 'object') return base;

  const merged = {
    ...base,
    ...raw,
    userProfile: { ...base.userProfile, ...(raw.userProfile || {}) },
    resume: { ...base.resume, ...(raw.resume || {}) },
    snapshot: { ...base.snapshot, ...(raw.snapshot || {}) },
    importBaseline: raw.importBaseline && typeof raw.importBaseline === 'object'
      ? { ...EMPTY_SNAPSHOT, ...raw.importBaseline }
      : null,
    reflection: { ...(raw.reflection || {}) },
    assumptions: raw.assumptions || null,
    generatedPaths: Array.isArray(raw.generatedPaths) ? raw.generatedPaths : [],
    selection: { ...base.selection, ...(raw.selection || {}) },
    learningTopics: Array.isArray(raw.learningTopics) ? raw.learningTopics : [],
  };

  merged.workflow = deriveWorkflow(merged);
  return merged;
}

/** Back-compat: old career-os-direction shape → selection. */
export function selectionFromLegacyDirection(legacy) {
  if (!legacy || typeof legacy !== 'object') return null;
  if (!legacy.primaryTitle && !legacy.primaryPathId) return null;
  return {
    primaryPathId: legacy.primaryPathId || null,
    secondaryPathId: legacy.secondaryPathId || null,
    primaryTitle: legacy.primaryTitle || null,
    secondaryTitle: legacy.secondaryTitle || null,
    focusAreas: Array.isArray(legacy.focusAreas) ? legacy.focusAreas : [],
    nextAction: legacy.nextAction || '',
    updatedAt: legacy.updatedAt || null,
  };
}

export function getDirectionSnapshot(profile) {
  const selection = profile?.selection || {};
  if (!selection.primaryTitle && !selection.primaryPathId) {
    return {
      primaryTitle: DEFAULT_CAREER_PATH.title,
      secondaryTitle: null,
      focusAreas: DEFAULT_CAREER_PATH.focusAreas.slice(0, 3),
      nextAction: DEFAULT_CAREER_PATH.nextAction,
      isMock: true,
      primaryPathId: null,
      secondaryPathId: null,
    };
  }

  return {
    primaryTitle: selection.primaryTitle || DEFAULT_CAREER_PATH.title,
    secondaryTitle: selection.secondaryTitle || null,
    focusAreas: Array.isArray(selection.focusAreas) && selection.focusAreas.length
      ? selection.focusAreas.slice(0, 3)
      : DEFAULT_CAREER_PATH.focusAreas.slice(0, 3),
    nextAction: selection.nextAction || DEFAULT_CAREER_PATH.nextAction,
    isMock: false,
    primaryPathId: selection.primaryPathId || null,
    secondaryPathId: selection.secondaryPathId || null,
  };
}

export function buildSelectionFromPaths(paths, primaryId, secondaryId) {
  const primary = paths.find((p) => p.id === primaryId);
  const secondary = paths.find((p) => p.id === secondaryId);
  if (!primary) {
    return {
      primaryPathId: null,
      secondaryPathId: null,
      primaryTitle: null,
      secondaryTitle: null,
      focusAreas: [],
      nextAction: '',
      updatedAt: null,
    };
  }

  return {
    primaryPathId: primary.id,
    primaryTitle: primary.title,
    secondaryPathId: secondary?.id || null,
    secondaryTitle: secondary?.title || null,
    focusAreas: primary.focusAreas || primary.deepen || [],
    nextAction: `Practice a story that shows fit for ${primary.title}`,
    updatedAt: new Date().toISOString(),
  };
}

export function applyResumeImport(profile, { source, fileName = '', linkedinUrl = '', snapshot }) {
  const next = normalizeCareerProfile(profile);
  next.resume = {
    source,
    fileName,
    linkedinUrl: linkedinUrl || next.resume.linkedinUrl,
    importedAt: new Date().toISOString(),
  };
  next.snapshot = { ...EMPTY_SNAPSHOT, ...snapshot };
  next.importBaseline = { ...EMPTY_SNAPSHOT, ...snapshot };
  next.updatedAt = new Date().toISOString();
  next.workflow = deriveWorkflow(next);
  return next;
}

export function applySnapshot(profile, snapshot) {
  const next = normalizeCareerProfile(profile);
  next.snapshot = { ...EMPTY_SNAPSHOT, ...snapshot };
  next.updatedAt = new Date().toISOString();
  next.workflow = deriveWorkflow(next);
  return next;
}

export function applyReflection(profile, { answers, complete = false }) {
  const next = normalizeCareerProfile(profile);
  next.reflection = { ...(answers || {}) };
  next.reflectionComplete = Boolean(complete);
  if (complete) {
    next.assumptions = buildAssumptionsFromAnswers(next.reflection, next.snapshot);
  }
  next.updatedAt = new Date().toISOString();
  next.workflow = deriveWorkflow(next);
  return next;
}

export function applyGeneratedPaths(profile, { paths, assumptions }) {
  const next = normalizeCareerProfile(profile);
  const resolvedAssumptions = assumptions || next.assumptions || buildAssumptionsFromAnswers(next.reflection, next.snapshot);
  next.generatedPaths = Array.isArray(paths)
    ? paths
    : buildCareerPaths(next.snapshot, resolvedAssumptions, { answers: next.reflection });
  next.assumptions = resolvedAssumptions;
  next.updatedAt = new Date().toISOString();
  next.workflow = deriveWorkflow(next);
  return next;
}

export function applyPathSelection(profile, { primaryPathId, secondaryPathId }) {
  const next = normalizeCareerProfile(profile);
  const paths = next.generatedPaths.length
    ? next.generatedPaths
    : buildCareerPaths(
      next.snapshot,
      next.assumptions || buildAssumptionsFromAnswers(next.reflection, next.snapshot),
      { answers: next.reflection }
    );
  if (!next.generatedPaths.length) next.generatedPaths = paths;
  next.selection = buildSelectionFromPaths(paths, primaryPathId, secondaryPathId);
  next.learningTopics = (next.selection.focusAreas || []).map((topic, index) => ({
    id: `focus-${index}`,
    topic,
    source: 'career_path',
    status: 'not_started',
  }));
  next.updatedAt = new Date().toISOString();
  next.workflow = deriveWorkflow(next);
  return next;
}

export function appendLearningTopicFromReflection(profile, { topic, company, appId, reason }) {
  const next = normalizeCareerProfile(profile);
  const cleaned = String(topic || '').trim();
  if (!cleaned) return next;

  const id = `reflection-${appId || 'general'}-${cleaned.slice(0, 40)}`;
  const exists = next.learningTopics.some(
    (item) => item.topic.toLowerCase() === cleaned.toLowerCase()
  );
  if (!exists) {
    next.learningTopics = [
      {
        id,
        topic: cleaned,
        company: company || null,
        appId: appId || null,
        reason: reason || 'Added from post-interview reflection',
        source: 'interview_reflection',
        status: 'not_started',
        createdAt: new Date().toISOString(),
      },
      ...next.learningTopics,
    ].slice(0, 20);
  }
  next.updatedAt = new Date().toISOString();
  return next;
}

/** Resume evidence helpers for prep / fit / stories. */
export function getResumeEvidenceList(profile, { limit = 6 } = {}) {
  const snapshot = profile?.snapshot || {};
  const bits = [
    snapshot.skills,
    snapshot.productsBuilt,
    snapshot.leadership,
    snapshot.previousRoles,
    snapshot.industries,
    snapshot.currentRole && `${snapshot.yearsExperience || ''} yrs as ${snapshot.currentRole}`.trim(),
  ]
    .map((v) => String(v || '').trim())
    .filter(Boolean);

  return [...new Set(bits)].slice(0, limit);
}
