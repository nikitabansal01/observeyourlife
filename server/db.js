import { JSONFilePreset } from 'lowdb/node';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '..', 'db.json');

const defaultData = { applications: [] };

let db;

export async function getDb() {
  if (!db) {
    db = await JSONFilePreset(dbPath, defaultData);
  }
  return db;
}

export async function getApplications() {
  const database = await getDb();
  return database.data.applications.sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
  );
}

export async function saveApplications(applications) {
  const database = await getDb();
  database.data.applications = applications;
  await database.write();
}
