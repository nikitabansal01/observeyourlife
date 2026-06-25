import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { getApplications, saveApplications } from './db.js';
import { parseVoiceDump, applyVoiceDumpResult } from './parser.js';
import { DEFAULT_APPLICATION, STATUSES, INDUSTRIES, BUSINESS_MODELS, FUNDING_STAGES } from './constants.js';

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({
    name: 'Job Hunt Assistant API',
    status: 'ok',
    ui: 'http://localhost:5173',
    endpoints: {
      health: '/api/health',
      applications: '/api/applications',
      voiceDump: 'POST /api/voice-dump',
      meta: '/api/meta',
    },
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, aiEnabled: Boolean(process.env.OPENAI_API_KEY) });
});

app.get('/api/applications', async (_req, res) => {
  const applications = await getApplications();
  res.json(applications);
});

app.post('/api/applications', async (req, res) => {
  const applications = await getApplications();
  const now = new Date().toISOString();
  const application = {
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
    ...DEFAULT_APPLICATION,
    ...req.body,
  };
  applications.unshift(application);
  await saveApplications(applications);
  res.status(201).json(application);
});

app.put('/api/applications/:id', async (req, res) => {
  const applications = await getApplications();
  const index = applications.findIndex((a) => a.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });

  applications[index] = {
    ...applications[index],
    ...req.body,
    updatedAt: new Date().toISOString(),
  };
  await saveApplications(applications);
  res.json(applications[index]);
});

app.delete('/api/applications/:id', async (req, res) => {
  const applications = await getApplications();
  const filtered = applications.filter((a) => a.id !== req.params.id);
  if (filtered.length === applications.length) {
    return res.status(404).json({ error: 'Not found' });
  }
  await saveApplications(filtered);
  res.status(204).end();
});

app.post('/api/voice-dump', async (req, res) => {
  const { transcript } = req.body;
  if (!transcript?.trim()) {
    return res.status(400).json({ error: 'Transcript is required' });
  }

  const existing = await getApplications();
  const result = await parseVoiceDump(transcript.trim(), existing);
  const updated = applyVoiceDumpResult(existing, result);
  await saveApplications(updated);

  res.json({
    summary: result.summary,
    applications: updated,
    affected: result.applications.map((a) => a.id),
  });
});

app.get('/api/meta', (_req, res) => {
  res.json({
    statuses: STATUSES,
    industries: INDUSTRIES,
    businessModels: BUSINESS_MODELS,
    fundingStages: FUNDING_STAGES,
  });
});

app.listen(PORT, () => {
  console.log(`Job Assistant API running on http://localhost:${PORT}`);
  console.log(
    process.env.OPENAI_API_KEY
      ? 'AI parsing: enabled (OpenAI)'
      : 'AI parsing: heuristic mode (set OPENAI_API_KEY for smarter parsing)'
  );
});
