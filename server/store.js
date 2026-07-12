import { neon } from '@neondatabase/serverless';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const USERS_DATA_DIR = join(DATA_DIR, 'accounts');

let sqlClient = null;
let schemaReady = false;

export function isVercelRuntime() {
  return process.env.VERCEL === '1';
}

export function getDatabaseUrl() {
  return (
    process.env.DATABASE_URL
    || process.env.POSTGRES_URL
    || process.env.DATABASE_URL_UNPOOLED
    || process.env.POSTGRES_URL_NON_POOLING
    || process.env.POSTGRES_PRISMA_URL
    || process.env.NEON_DATABASE_URL
    || ''
  );
}

export function usePostgresStorage() {
  return Boolean(getDatabaseUrl());
}

export function getStorageMode() {
  if (usePostgresStorage()) return 'postgres';
  if (isVercelRuntime()) return 'unconfigured';
  return 'filesystem';
}

export function assertStorageReady() {
  if (isVercelRuntime() && !usePostgresStorage()) {
    throw new Error(
      'Cloud accounts need a Postgres database. In Vercel, open Storage, connect Neon to this project, then redeploy.'
    );
  }
}

function getSql() {
  if (!sqlClient) {
    sqlClient = neon(getDatabaseUrl());
  }
  return sqlClient;
}

async function ensureSchema() {
  if (schemaReady || !usePostgresStorage()) return;

  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS user_applications (
      user_id TEXT PRIMARY KEY,
      applications JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    ALTER TABLE user_applications
    ADD COLUMN IF NOT EXISTS labels JSONB NOT NULL DEFAULT '[]'::jsonb
  `;
  await sql`
    ALTER TABLE user_applications
    ADD COLUMN IF NOT EXISTS career_os JSONB NOT NULL DEFAULT '{}'::jsonb
  `;
  schemaReady = true;
}

function parseJsonArray(raw) {
  if (!raw) return [];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(raw) ? raw : [];
}

function parseJsonObject(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  return raw && typeof raw === 'object' ? raw : null;
}

async function readFilesystemUserData(userId) {
  const userDir = join(USERS_DATA_DIR, userId);
  await mkdir(userDir, { recursive: true });
  const dbPath = join(userDir, 'db.json');
  try {
    const raw = await readFile(dbPath, 'utf8');
    const data = JSON.parse(raw);
    return {
      applications: Array.isArray(data.applications) ? data.applications : [],
      labels: Array.isArray(data.labels) ? data.labels : [],
      careerOs: data.careerOs && typeof data.careerOs === 'object' ? data.careerOs : null,
    };
  } catch {
    return { applications: [], labels: [], careerOs: null };
  }
}

async function writeFilesystemUserData(userId, { applications, labels, careerOs }) {
  const userDir = join(USERS_DATA_DIR, userId);
  await mkdir(userDir, { recursive: true });
  const dbPath = join(userDir, 'db.json');
  await writeFile(
    dbPath,
    JSON.stringify({ applications, labels, careerOs: careerOs ?? null }, null, 2)
  );
}

export async function readUserApplications(userId) {
  assertStorageReady();

  if (usePostgresStorage()) {
    await ensureSchema();
    const sql = getSql();
    const rows = await sql`
      SELECT applications
      FROM user_applications
      WHERE user_id = ${userId}
      LIMIT 1
    `;
    return parseJsonArray(rows[0]?.applications);
  }

  const data = await readFilesystemUserData(userId);
  return data.applications;
}

export async function writeUserApplications(userId, applications) {
  assertStorageReady();

  if (usePostgresStorage()) {
    await ensureSchema();
    const sql = getSql();
    const payload = JSON.stringify(applications);

    try {
      await sql`
        INSERT INTO user_applications (user_id, applications, labels, updated_at)
        VALUES (${userId}, ${payload}::jsonb, '[]'::jsonb, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET
          applications = EXCLUDED.applications,
          updated_at = NOW()
      `;
    } catch (error) {
      console.error('Neon write failed:', error.message, {
        userId,
        companyCount: applications.length,
      });
      throw new Error(`Failed to save to database: ${error.message}`);
    }
    return;
  }

  const existing = await readFilesystemUserData(userId);
  await writeFilesystemUserData(userId, {
    applications,
    labels: existing.labels,
    careerOs: existing.careerOs,
  });
}

export async function readUserLabels(userId) {
  assertStorageReady();

  if (usePostgresStorage()) {
    await ensureSchema();
    const sql = getSql();
    const rows = await sql`
      SELECT labels
      FROM user_applications
      WHERE user_id = ${userId}
      LIMIT 1
    `;
    return parseJsonArray(rows[0]?.labels);
  }

  const data = await readFilesystemUserData(userId);
  return data.labels;
}

export async function writeUserLabels(userId, labels) {
  assertStorageReady();

  if (usePostgresStorage()) {
    await ensureSchema();
    const sql = getSql();
    const payload = JSON.stringify(labels);

    try {
      await sql`
        INSERT INTO user_applications (user_id, applications, labels, updated_at)
        VALUES (${userId}, '[]'::jsonb, ${payload}::jsonb, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET
          labels = EXCLUDED.labels,
          updated_at = NOW()
      `;
    } catch (error) {
      console.error('Neon labels write failed:', error.message, { userId });
      throw new Error(`Failed to save labels: ${error.message}`);
    }
    return;
  }

  const existing = await readFilesystemUserData(userId);
  await writeFilesystemUserData(userId, {
    applications: existing.applications,
    labels,
    careerOs: existing.careerOs,
  });
}

export async function readUserCareerOs(userId) {
  assertStorageReady();

  if (usePostgresStorage()) {
    await ensureSchema();
    const sql = getSql();
    const rows = await sql`
      SELECT career_os
      FROM user_applications
      WHERE user_id = ${userId}
      LIMIT 1
    `;
    return parseJsonObject(rows[0]?.career_os);
  }

  const data = await readFilesystemUserData(userId);
  return data.careerOs;
}

export async function writeUserCareerOs(userId, careerOs) {
  assertStorageReady();
  const payload = JSON.stringify(careerOs || {});

  if (usePostgresStorage()) {
    await ensureSchema();
    const sql = getSql();

    try {
      await sql`
        INSERT INTO user_applications (user_id, applications, labels, career_os, updated_at)
        VALUES (${userId}, '[]'::jsonb, '[]'::jsonb, ${payload}::jsonb, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET
          career_os = EXCLUDED.career_os,
          updated_at = NOW()
      `;
    } catch (error) {
      console.error('Neon career OS write failed:', error.message, { userId });
      throw new Error(`Failed to save career data: ${error.message}`);
    }
    return;
  }

  const existing = await readFilesystemUserData(userId);
  await writeFilesystemUserData(userId, {
    applications: existing.applications,
    labels: existing.labels,
    careerOs,
  });
}
