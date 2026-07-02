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
  schemaReady = true;
}

function parseApplications(raw) {
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
    return parseApplications(rows[0]?.applications);
  }

  const userDir = join(USERS_DATA_DIR, userId);
  await mkdir(userDir, { recursive: true });
  const dbPath = join(userDir, 'db.json');
  try {
    const raw = await readFile(dbPath, 'utf8');
    const data = JSON.parse(raw);
    return data.applications || [];
  } catch {
    return [];
  }
}

export async function writeUserApplications(userId, applications) {
  assertStorageReady();

  if (usePostgresStorage()) {
    await ensureSchema();
    const sql = getSql();
    const payload = JSON.stringify(applications);

    try {
      await sql`
        INSERT INTO user_applications (user_id, applications, updated_at)
        VALUES (${userId}, ${payload}::jsonb, NOW())
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

  const userDir = join(USERS_DATA_DIR, userId);
  await mkdir(userDir, { recursive: true });
  const dbPath = join(userDir, 'db.json');
  await writeFile(dbPath, JSON.stringify({ applications }, null, 2));
}
