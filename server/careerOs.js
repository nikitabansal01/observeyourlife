/** Normalize + merge career OS payloads (profile, stories, learning, practice). */

export function emptyCareerOs() {
  return {
    profile: null,
    storyBank: null,
    roadmapProgress: {},
    practicedQuestions: [],
    learningPlanStatuses: {},
    updatedAt: null,
  };
}

export function normalizeCareerOs(raw) {
  const base = emptyCareerOs();
  if (!raw || typeof raw !== 'object') return base;
  return {
    profile: raw.profile && typeof raw.profile === 'object' ? raw.profile : null,
    storyBank: raw.storyBank ?? null,
    roadmapProgress:
      raw.roadmapProgress && typeof raw.roadmapProgress === 'object' && !Array.isArray(raw.roadmapProgress)
        ? raw.roadmapProgress
        : {},
    practicedQuestions: Array.isArray(raw.practicedQuestions) ? raw.practicedQuestions : [],
    learningPlanStatuses:
      raw.learningPlanStatuses && typeof raw.learningPlanStatuses === 'object' && !Array.isArray(raw.learningPlanStatuses)
        ? raw.learningPlanStatuses
        : {},
    updatedAt: raw.updatedAt || null,
  };
}

function ts(value) {
  const n = Date.parse(value || '');
  return Number.isFinite(n) ? n : 0;
}

function pickNewerProfile(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  return ts(b.updatedAt) >= ts(a.updatedAt) ? b : a;
}

function storyList(bank) {
  if (!bank) return [];
  if (Array.isArray(bank.stories)) return bank.stories.filter((s) => s && s.id);
  // Legacy keyed bank → lightweight story shells for merge
  return Object.entries(bank)
    .filter(([, value]) => value && typeof value === 'object')
    .map(([id, value]) => ({
      id: `legacy-${id}`,
      competencyId: id,
      title: id,
      updatedAt: value.updatedAt || null,
      ...value,
    }));
}

function mergeStoryBanks(cloud, local) {
  const map = new Map();
  for (const story of [...storyList(cloud), ...storyList(local)]) {
    const prev = map.get(story.id);
    if (!prev || ts(story.updatedAt) >= ts(prev.updatedAt)) {
      map.set(story.id, story);
    }
  }
  const stories = [...map.values()].sort((a, b) => ts(b.updatedAt) - ts(a.updatedAt));
  if (stories.length === 0 && !cloud && !local) return null;
  return { version: 2, stories };
}

const STATUS_RANK = {
  not_started: 1,
  in_progress: 2,
  completed: 3,
};

function mergeStatusMaps(a = {}, b = {}) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const out = {};
  for (const key of keys) {
    const left = a[key];
    const right = b[key];
    if (!left) out[key] = right;
    else if (!right) out[key] = left;
    else out[key] = (STATUS_RANK[right] || 0) >= (STATUS_RANK[left] || 0) ? right : left;
  }
  return out;
}

function mergeRoadmapProgress(cloud = {}, local = {}) {
  const pathIds = new Set([...Object.keys(cloud || {}), ...Object.keys(local || {})]);
  const out = {};
  for (const pathId of pathIds) {
    out[pathId] = mergeStatusMaps(cloud?.[pathId] || {}, local?.[pathId] || {});
  }
  return out;
}

function mergePracticed(cloud = [], local = []) {
  const map = new Map();
  for (const item of [...(cloud || []), ...(local || [])]) {
    if (!item) continue;
    const key = item.id || `${item.question || ''}::${item.company || ''}`;
    if (!key) continue;
    const prev = map.get(key);
    if (!prev || ts(item.practicedAt) >= ts(prev.practicedAt)) {
      map.set(key, item);
    }
  }
  return [...map.values()]
    .sort((a, b) => ts(b.practicedAt) - ts(a.practicedAt))
    .slice(0, 40);
}

function hasLocalSignal(local) {
  if (!local) return false;
  if (local.profile?.updatedAt || local.profile?.selection?.primaryPathId) return true;
  if (local.storyBank && (local.storyBank.stories?.length || Object.keys(local.storyBank).length)) return true;
  if (Object.keys(local.roadmapProgress || {}).length) return true;
  if ((local.practicedQuestions || []).length) return true;
  if (Object.keys(local.learningPlanStatuses || {}).length) return true;
  return false;
}

/** Merge cloud + browser career OS; prefers newer / further-along data. */
export function mergeCareerOs(cloudRaw, localRaw) {
  const cloud = normalizeCareerOs(cloudRaw);
  const local = normalizeCareerOs(localRaw);

  if (!hasLocalSignal(local)) {
    return { ...cloud, updatedAt: cloud.updatedAt || new Date().toISOString() };
  }
  if (!hasLocalSignal(cloud)) {
    return { ...local, updatedAt: new Date().toISOString() };
  }

  return normalizeCareerOs({
    profile: pickNewerProfile(cloud.profile, local.profile),
    storyBank: mergeStoryBanks(cloud.storyBank, local.storyBank),
    roadmapProgress: mergeRoadmapProgress(cloud.roadmapProgress, local.roadmapProgress),
    practicedQuestions: mergePracticed(cloud.practicedQuestions, local.practicedQuestions),
    learningPlanStatuses: {
      ...(cloud.learningPlanStatuses || {}),
      ...(local.learningPlanStatuses || {}),
    },
    updatedAt: new Date().toISOString(),
  });
}
