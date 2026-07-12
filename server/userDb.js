import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import {
  readUserApplications,
  writeUserApplications,
  readUserLabels,
  writeUserLabels,
  readUserCareerOs,
  writeUserCareerOs,
} from './store.js';
import { DEFAULT_LABEL_NAME } from './constants.js';
import { mergeCareerOs, normalizeCareerOs } from './careerOs.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function getUserApplications(userId) {
  const applications = await readUserApplications(userId);
  return applications.sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
  );
}

export async function saveUserApplications(userId, applications) {
  await writeUserApplications(userId, applications);
}

export async function migrateUserApplications(userId, incomingApps) {
  const existing = await getUserApplications(userId);
  const map = new Map(existing.map((app) => [app.id, app]));

  for (const app of incomingApps) {
    if (app.isExample) continue;
    const cleaned = { ...app, isExample: false };
    map.set(cleaned.id, cleaned);
  }

  const merged = [...map.values()].sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
  );
  await saveUserApplications(userId, merged);
  return merged;
}

function createDefaultLabel() {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    name: DEFAULT_LABEL_NAME,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getUserLabels(userId) {
  let labels = await readUserLabels(userId);
  if (!Array.isArray(labels) || labels.length === 0) {
    labels = [createDefaultLabel()];
    await writeUserLabels(userId, labels);
  }
  return labels.sort(
    (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
  );
}

export async function saveUserLabels(userId, labels) {
  await writeUserLabels(userId, labels);
}

export async function migrateUserLabels(userId, incomingLabels) {
  const existing = await readUserLabels(userId);
  const map = new Map(existing.map((label) => [label.id, label]));

  for (const label of incomingLabels || []) {
    if (!label?.id || !label?.name?.trim()) continue;
    map.set(label.id, {
      ...map.get(label.id),
      ...label,
      name: label.name.trim(),
    });
  }

  let merged = [...map.values()];
  if (merged.length === 0) {
    merged = [createDefaultLabel()];
  }

  merged.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  await saveUserLabels(userId, merged);
  return merged;
}

export async function createUserLabel(userId, name) {
  const trimmed = name?.trim();
  if (!trimmed) throw new Error('Label name is required');

  const labels = await getUserLabels(userId);
  const now = new Date().toISOString();
  const label = {
    id: uuidv4(),
    name: trimmed,
    createdAt: now,
    updatedAt: now,
  };
  labels.push(label);
  await saveUserLabels(userId, labels);
  return label;
}

export async function updateUserLabel(userId, labelId, name) {
  const trimmed = name?.trim();
  if (!trimmed) throw new Error('Label name is required');

  const labels = await getUserLabels(userId);
  const index = labels.findIndex((l) => l.id === labelId);
  if (index === -1) return null;

  labels[index] = {
    ...labels[index],
    name: trimmed,
    updatedAt: new Date().toISOString(),
  };
  await saveUserLabels(userId, labels);
  return labels[index];
}

export async function deleteUserLabel(userId, labelId) {
  const labels = await getUserLabels(userId);
  const filtered = labels.filter((l) => l.id !== labelId);
  if (filtered.length === labels.length) return false;

  await saveUserLabels(userId, filtered);

  const applications = await getUserApplications(userId);
  const nextApps = applications.map((app) => ({
    ...app,
    labelIds: (app.labelIds || []).filter((id) => id !== labelId),
  }));
  await saveUserApplications(userId, nextApps);
  return true;
}

export async function getUserCareerOs(userId) {
  const raw = await readUserCareerOs(userId);
  return normalizeCareerOs(raw);
}

export async function saveUserCareerOs(userId, careerOs) {
  const normalized = normalizeCareerOs({
    ...careerOs,
    updatedAt: new Date().toISOString(),
  });
  await writeUserCareerOs(userId, normalized);
  return normalized;
}

export async function migrateUserCareerOs(userId, localCareerOs) {
  const existing = await getUserCareerOs(userId);
  const merged = mergeCareerOs(existing, localCareerOs);
  await writeUserCareerOs(userId, merged);
  return merged;
}

export async function loadExampleData() {
  const path = join(__dirname, 'example-data.json');
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw).applications;
}
