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
import {
  getUserApplications,
  saveUserApplications,
  migrateUserApplications,
  loadExampleData,
  getUserLabels,
  migrateUserLabels,
  createUserLabel,
  updateUserLabel,
  deleteUserLabel,
} from './userDb.js';
import { optionalAuth, requireAuth } from './middleware.js';
import { parseVoiceDump, applyVoiceDumpResult } from './parser.js';
import { mergeApplicationLists, stripExamples } from './applicationsMerge.js';
import { DEFAULT_APPLICATION, STATUSES, INDUSTRIES, BUSINESS_MODELS, FUNDING_STAGES } from './constants.js';
import { getStorageMode } from './store.js';
import {
  isGoogleConfigured,
  createOAuthState,
  verifyOAuthState,
  buildGoogleAuthUrl,
  exchangeCodeForTokens,
  getValidAccessToken,
  fetchJobCandidateEvents,
  filterJobRelatedEvents,
  revokeGoogleToken,
  getClientRedirectBase,
} from './google.js';
import {
  readGoogleTokens,
  writeGoogleTokens,
  deleteGoogleTokens,
  publicGoogleStatus,
} from './googleStore.js';
import { buildCalendarSyncPlan, applyCalendarSyncPlan } from './calendarSync.js';

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
      labels: 'GET/POST/PUT/DELETE /api/labels (auth required)',
      voiceDump: 'POST /api/voice-dump',
      google: 'GET /api/google/status | /api/google/connect | POST /api/google/sync | DELETE /api/google/disconnect',
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
    googleCalendarEnabled: isGoogleConfigured(),
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
    const { localApplications, localLabels } = req.body;
    let applications;
    let labels;

    if (Array.isArray(localApplications) && localApplications.length > 0) {
      applications = await migrateUserApplications(req.user.id, localApplications);
    } else {
      applications = await getUserApplications(req.user.id);
    }

    if (Array.isArray(localLabels) && localLabels.length > 0) {
      labels = await migrateUserLabels(req.user.id, localLabels);
    } else {
      labels = await getUserLabels(req.user.id);
    }

    res.json({ user: req.user, applications, labels });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  const applications = await getUserApplications(req.user.id);
  const labels = await getUserLabels(req.user.id);
  res.json({ user: req.user, applications, labels });
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

app.get('/api/labels', requireAuth, async (req, res) => {
  try {
    const labels = await getUserLabels(req.user.id);
    res.json(labels);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/labels', requireAuth, async (req, res) => {
  try {
    const label = await createUserLabel(req.user.id, req.body?.name);
    res.status(201).json(label);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/labels/:id', requireAuth, async (req, res) => {
  try {
    const label = await updateUserLabel(req.user.id, req.params.id, req.body?.name);
    if (!label) return res.status(404).json({ error: 'Not found' });
    res.json(label);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/labels/:id', requireAuth, async (req, res) => {
  try {
    const deleted = await deleteUserLabel(req.user.id, req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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

app.get('/api/google/status', requireAuth, async (req, res) => {
  try {
    if (!isGoogleConfigured()) {
      return res.json({ configured: false, connected: false });
    }
    const tokens = await readGoogleTokens(req.user.id);
    res.json({ configured: true, ...publicGoogleStatus(tokens) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/google/connect', requireAuth, async (req, res) => {
  try {
    if (!isGoogleConfigured()) {
      return res.status(503).json({ error: 'Google Calendar is not configured on this server' });
    }
    const state = createOAuthState(req.user.id);
    const url = buildGoogleAuthUrl(state);
    res.json({ url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/google/callback', async (req, res) => {
  const clientBase = getClientRedirectBase();
  try {
    const { code, state, error } = req.query;
    if (error) {
      return res.redirect(`${clientBase}/?google=error&reason=${encodeURIComponent(String(error))}`);
    }
    if (!code || !state) {
      return res.redirect(`${clientBase}/?google=error&reason=missing_code`);
    }

    const { userId } = verifyOAuthState(String(state));
    const tokens = await exchangeCodeForTokens(String(code));
    if (!tokens.refreshToken) {
      const existing = await readGoogleTokens(userId);
      if (!existing?.refreshToken) {
        return res.redirect(`${clientBase}/?google=error&reason=missing_refresh_token`);
      }
      tokens.refreshToken = existing.refreshToken;
    }

    await writeGoogleTokens(userId, {
      ...tokens,
      connectedAt: new Date().toISOString(),
    });

    res.redirect(`${clientBase}/?google=connected`);
  } catch (error) {
    console.error('Google OAuth callback failed:', error);
    res.redirect(
      `${clientBase}/?google=error&reason=${encodeURIComponent(error.message || 'oauth_failed')}`
    );
  }
});

app.get('/api/google/events', requireAuth, async (req, res) => {
  try {
    if (!isGoogleConfigured()) {
      return res.status(503).json({ error: 'Google Calendar is not configured on this server' });
    }

    const stored = await readGoogleTokens(req.user.id);
    if (!stored?.refreshToken && !stored?.accessToken) {
      return res.status(400).json({ error: 'Connect Google Calendar first' });
    }

    const accessToken = await getValidAccessToken(stored, async (next) => {
      await writeGoogleTokens(req.user.id, next);
    });

    const applications = await getUserApplications(req.user.id);
    const { candidates, queriesRun } = await fetchJobCandidateEvents(accessToken, applications);
    const events = filterJobRelatedEvents(candidates, applications);
    candidates.length = 0;

    res.json({
      events,
      matched: events.length,
      queriesRun,
      window: { daysBack: 7, daysForward: 21 },
      filter: 'google-q-search-then-local-match',
      privacy: 'no-full-calendar-list-no-event-storage-no-llm',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/google/sync', requireAuth, async (req, res) => {
  try {
    if (!isGoogleConfigured()) {
      return res.status(503).json({ error: 'Google Calendar is not configured on this server' });
    }

    const stored = await readGoogleTokens(req.user.id);
    if (!stored?.refreshToken && !stored?.accessToken) {
      return res.status(400).json({ error: 'Connect Google Calendar first' });
    }

    const accessToken = await getValidAccessToken(stored, async (next) => {
      await writeGoogleTokens(req.user.id, next);
    });

    const existing = await getUserApplications(req.user.id);
    const { candidates, queriesRun } = await fetchJobCandidateEvents(accessToken, existing);
    const events = filterJobRelatedEvents(candidates, existing);
    candidates.length = 0;

    const plan = await buildCalendarSyncPlan(events, existing);
    const { applications, applied, skipped, groups, cleanup, intelligenceMode } = applyCalendarSyncPlan(existing, plan);
    await saveUserApplications(req.user.id, applications);

    res.json({
      events,
      matched: events.length,
      queriesRun,
      applied,
      skipped: skipped || [],
      groups: groups || [],
      cleanup: cleanup || [],
      updatedCount: applied.filter((item) => !item.created && item.kind !== 'cleanup').length,
      createdCount: applied.filter((item) => item.created).length,
      cleanupCount: applied.filter((item) => item.kind === 'cleanup').length,
      skippedCount: (skipped || []).length,
      classifier: intelligenceMode || (process.env.OPENAI_API_KEY ? 'llm' : 'heuristic'),
      applications,
      window: { daysBack: 7, daysForward: 21 },
      filter: 'google-q-search-then-intelligence',
      privacy: 'no-full-calendar-list-no-event-storage-intelligence-on-filtered-events-only',
    });
  } catch (error) {
    console.error('Google calendar sync failed:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/google/disconnect', requireAuth, async (req, res) => {
  try {
    const stored = await readGoogleTokens(req.user.id);
    if (stored) {
      await revokeGoogleToken(stored.refreshToken || stored.accessToken);
      await deleteGoogleTokens(req.user.id);
    }
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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
