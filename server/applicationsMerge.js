export function stripExamples(applications) {
  return Array.isArray(applications) ? applications.filter((app) => !app.isExample) : [];
}

export function mergeApplicationLists(...lists) {
  const map = new Map();

  for (const list of lists) {
    for (const app of stripExamples(list)) {
      if (app?.id) map.set(app.id, app);
    }
  }

  return [...map.values()].sort(
    (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
  );
}

export function applyVoiceDumpResult(existingApps, result) {
  const map = new Map(stripExamples(existingApps).map((app) => [app.id, app]));

  for (const app of result.applications || []) {
    if (!app?.id) continue;
    map.set(app.id, app);
  }

  return [...map.values()].sort(
    (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
  );
}
