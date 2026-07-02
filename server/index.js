import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express';
import { isClerkEnabled } from './clerk.js';
import { readFile, rename } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { getUserApplications, saveUserApplications, migrateUserApplications, loadExampleData } from './userDb.js';
import { optionalAuth, requireAuth } from './middleware.js';
import { parseVoiceDump, applyVoiceDumpResult } from './parser.js';
import { mergeApplicationLists, stripExamples } from './applicationsMerge.js';
import { DEFAULT_APPLICATION, STATUSES, INDUSTRIES, BUSINESS_MODELS, FUNDING_STAGES } from './constants.js';
import { getStorageMode } from './store.js';

const app = express();
const PORT = process.env.PORT || 5001;
const __dirname = dirname(fileURLToPath(import.meta.url));
const LEGACY_DB = join(__dirname, '..', 'db.json');

app.use(cors());
app.use(express.json({ limit: '2mb' }));
if (isClerkEnabled()) {
  app.use(clerkMiddleware());
}

app.get('/', (_req, res) => {
  res.json({
    name: 'Job Hunt Assistant API',
    status: 'ok',
    ui: 'http://localhost:5173',
    storage: 'Local browser storage by default; optional Clerk sign-in for cloud save',
    endpoints: {
      health: '/api/health',
      examples: '/api/examples',
      auth: 'POST /api/auth/sync | GET /api/auth/me',
      applications: 'GET/POST/PUT/DELETE /api/applications (auth required)',
      voiceDump: 'POST /api/voice-dump',
      meta: '/api/meta',
    },
  });
});

app.get('/api/health', (_req, res) => {
  const storage = getStorageMode();
  res.json({
    ok: true,
    aiEnabled: Boolean(process.env.OPENAI_API_KEY),
    authEnabled: isClerkEnabled(),
    storage,
  });
});

app.get('/api/examples', async (_req, res) => {
  const applications = await loadExampleData();
  res.json({ applications, isExampleData: true });
});

app.get('/api/legacy/import', async (_req, res) => {
  if (!existsSync(LEGACY_DB)) {
    return res.json({ applications: [], imported: false });
  }

  try {
    const raw = await readFile(LEGACY_DB, 'utf8');
    const data = JSON.parse(raw);
    const applications = (data.applications || []).map((app) => ({
      ...app,
      isExample: false,
    }));

    await rename(LEGACY_DB, `${LEGACY_DB}.migrated`).catch(() => {});

    res.json({ applications, imported: true });
  } catch {
    res.json({ applications: [], imported: false });
  }
});

app.post('/api/auth/sync', requireAuth, async (req, res) => {
  try {
    const { localApplications } = req.body;
    let applications;

    if (Array.isArray(localApplications) && localApplications.length > 0) {
      applications = await migrateUserApplications(req.user.id, localApplications);
    } else {
      applications = await getUserApplications(req.user.id);
    }

    res.json({ user: req.user, applications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  const applications = await getUserApplications(req.user.id);
  res.json({ user: req.user, applications });
});

app.get('/api/applications', requireAuth, async (req, res) => {
  const applications = await getUserApplications(req.user.id);
  res.json(applications);
});

app.post('/api/applications', requireAuth, async (req, res) => {
  const applications = await getUserApplications(req.user.id);
  const now = new Date().toISOString();
  const application = {
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
    isExample: false,
    ...DEFAULT_APPLICATION,
    ...req.body,
  };
  applications.unshift(application);
  await saveUserApplications(req.user.id, applications);
  res.status(201).json(application);
});

app.put('/api/applications/:id', requireAuth, async (req, res) => {
  const applications = await getUserApplications(req.user.id);
  const index = applications.findIndex((a) => a.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });

  applications[index] = {
    ...applications[index],
    ...req.body,
    isExample: false,
    updatedAt: new Date().toISOString(),
  };
  await saveUserApplications(req.user.id, applications);
  res.json(applications[index]);
});

app.delete('/api/applications/:id', requireAuth, async (req, res) => {
  const applications = await getUserApplications(req.user.id);
  const filtered = applications.filter((a) => a.id !== req.params.id);
  if (filtered.length === applications.length) {
    return res.status(404).json({ error: 'Not found' });
  }
  await saveUserApplications(req.user.id, filtered);
  res.status(204).end();
});

app.post('/api/voice-dump', optionalAuth, async (req, res) => {
  try {
    const { transcript, existingApplications } = req.body;
    if (!transcript?.trim()) {
      return res.status(400).json({ error: 'Transcript is required' });
    }

    let existing = stripExamples(existingApplications || []);
    let storageWarning = null;

    if (req.user) {
      try {
        const dbApps = await getUserApplications(req.user.id);
        existing = mergeApplicationLists(dbApps, existing);
      } catch (error) {
        storageWarning = error.message;
      }
    }

    const result = await parseVoiceDump(transcript.trim(), existing);
    const updated = applyVoiceDumpResult(existing, result).map((app) => ({
      ...app,
      isExample: false,
    }));

    let persisted = false;
    if (req.user) {
      try {
        await saveUserApplications(req.user.id, updated);
        persisted = true;
      } catch (error) {
        storageWarning = storageWarning || error.message;
      }
    }

    res.json({
      summary: result.summary,
      applications: updated,
      affected: result.applications.map((a) => a.id),
      persisted,
      authDetected: Boolean(req.user),
      storageWarning,
      parser: result.parser || 'unknown',
      existingCount: existing.length,
    });
  } catch (error) {
    console.error('Voice dump failed:', error);
    res.status(500).json({ error: error.message || 'Failed to process voice dump' });
  }
});

app.get('/api/meta', (_req, res) => {
  res.json({
    statuses: STATUSES,
    industries: INDUSTRIES,
    businessModels: BUSINESS_MODELS,
    fundingStages: FUNDING_STAGES,
  });
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled API error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

export default app;

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  app.listen(PORT, () => {
    console.log(`Job Assistant API running on http://localhost:${PORT}`);
    console.log(
      process.env.OPENAI_API_KEY
        ? 'AI parsing: enabled (OpenAI)'
        : 'AI parsing: heuristic mode (set OPENAI_API_KEY for smarter parsing)'
    );
    console.log(
      process.env.CLERK_SECRET_KEY
        ? 'Auth: Clerk enabled'
        : 'Auth: set CLERK_SECRET_KEY for sign-in'
    );
  });
}
