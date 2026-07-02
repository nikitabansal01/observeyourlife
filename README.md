# PA for NB — Personal Assistant

Life design app inspired by Stanford's *Designing Your Life*. Build your structure slowly: start with where you are, set your compass, then grow tools area by area.

## Architecture (Designing Your Life mapping)

```
PA for NB
├── Overview          → HWPL dashboard (Health · Work · Play · Love gauges)
├── Compass           → Workview + Lifeview (philosophy layer)
├── Work              → Career execution
│   ├── Workview      → career philosophy (same data as Compass, Work-only view)
│   └── Job search    → voice dump, pipeline, company browser (V0 MVP)
├── Health            → coming soon
├── Play              → coming soon
└── Love              → coming soon
```

| DYL concept | In this app |
|-------------|-------------|
| HWPL Dashboard | **Overview** — rate each area 0–100%, add notes |
| Workview | **Compass** + **Work → Workview** |
| Lifeview | **Compass** (whole-life meaning, not per-area) |
| Wayfinding / Odyssey / Prototype | Planned for later phases |

**Key design choice:** Career philosophy lives in **Workview**. Everything operational (job pipeline, voice dumps, interviews) lives under the **Work** area — not a separate top-level "Career" tab.

## V0 — Job search (under Work)

- **Voice dump**: speak naturally about interviews, status changes, next steps
- **Smart parsing**: extracts company, role, industry, funding stage, interview dates, follow-ups, prep needs
- **Live dashboard**: color-coded cards with status pipeline, action flags, and next steps
- **Optional sign-in**: data stays in your browser by default; create an account to save to the server
- **Example data**: fictional demo companies on first load — clearly labeled, not your real applications

## Quick start

```bash
npm run install-all
cp .env.example .env
cp client/.env.example client/.env.local   # Clerk publishable key
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:5001

## Deploy on Vercel

The app is configured for Vercel: the Vite client builds to static files, and the Express API runs as a serverless function at `/api/*`.

### Cursor / agent plugin

In Cursor, install the Vercel agent plugin with **`/add-plugin vercel`** (or use the plugin marketplace). The CLI command `npx plugins add vercel/vercel-plugin` is for Claude Code / Codex environments.

### Authentication (Clerk)

Sign-in uses [Clerk](https://clerk.com). Connect Clerk to your Vercel project (Integrations → Clerk), or add keys manually:

| Key | Where | Environments |
|-----|-------|--------------|
| `CLERK_SECRET_KEY` | Server API | Production, Preview, Development |
| `CLERK_PUBLISHABLE_KEY` | Server API (or set `NEXT_PUBLIC_*` — API copies it) | Production, Preview, Development |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Client (Vite reads this name) | Production, Preview, Development |
| `OPENAI_API_KEY` | Server API (optional) | Production, Preview |

Local dev: set `CLERK_SECRET_KEY` in `.env` and `VITE_CLERK_PUBLISHABLE_KEY` in `client/.env.local`.

Reference: [`.env.vercel.example`](.env.vercel.example)

### Troubleshooting "No environment variables were created"

| Cause | What to do |
|-------|------------|
| Bulk import textarea empty or comments only | Add variables **one by one** with Add |
| Duplicate key already exists | Edit the existing variable instead of re-importing |
| `KEY=` with no value | Vercel rejects empty values |
| Branch-scoped var, project not on Git | Link GitHub repo first, or remove branch scope |

### What works on Vercel

| Feature | On Vercel |
|---------|-----------|
| Dashboard, HWPL, compass | Yes (static SPA) |
| Voice dump (not signed in) | Yes — data stays in browser `localStorage` |
| Voice dump parsing | Yes — needs `OPENAI_API_KEY` for AI mode |
| Example companies | Yes — served from bundled JSON |
| Sign-in / cloud save | Yes — **Clerk** for auth; **KV** (optional) for saved applications on Vercel |

### Cloud save on Vercel

Clerk handles sign-in. Saved job applications still need writable storage on Vercel:

1. **Storage** → **Create Database** → **KV** (or Upstash Redis)
2. Connect to this project (`KV_REST_API_URL`, `KV_REST_API_TOKEN` are set automatically)
3. Redeploy

Without KV, sign-in works but saving applications to your account fails on Vercel. Local `npm run dev` uses the `data/` folder on disk.

### Voice dump returns "Failed to process voice dump"

| Cause | What to do |
|-------|------------|
| API returns 500 on all `/api/*` routes | Ensure `CLERK_PUBLISHABLE_KEY` is set on the server, or `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (the API copies it automatically after redeploy). |
| Signed in, no KV database | Voice dump still works — data saves to your browser. Add **Storage → KV** to sync to your account. |
| Missing `OPENAI_API_KEY` | Not required — heuristic parsing is used as fallback. |

Check `https://<your-app>.vercel.app/api/health` — it should return `{"ok":true,...}`, not a 500 error.

## Data & privacy

| Mode | Where your data lives |
|------|----------------------|
| **Not signed in** | Browser `localStorage` on your machine only |
| **Signed in (local)** | Server `data/accounts/<your-id>/` (gitignored, never in the repo) |
| **Signed in (Vercel)** | Vercel KV database linked to your project |
| **First visit** | Fictional **example** companies from `server/example-data.json` |

Your real job applications are **never committed to GitHub**. The repo only ships dummy example data.

## Optional authentication

Sign in or create an account from the header. When you do:

1. Any local (non-example) data in your browser is migrated to your account
2. Future changes sync to your account on the server
3. Sign out returns you to local-only mode

No account required — the app works fully offline-first in your browser.

## AI parsing (recommended)

Add your OpenAI API key in `.env` for smarter voice dump parsing:

```bash
OPENAI_API_KEY=sk-...
```

Without a key, the app uses a basic heuristic parser (still works, just less accurate).

## Example voice dumps

> "I had my recruiter screen at Acme Corp yesterday for a Senior PM role. They're Series D, fintech. Next step is a technical interview next Tuesday — I need to prep system design."

> "Heard back from Notion — moving to onsite! Need to follow up with recruiter to confirm travel."

## Tech stack

- **Frontend**: React + Vite + localStorage
- **Backend**: Express + per-user JSON storage (when signed in)
- **Auth**: Clerk (optional sign-in)
- **Voice**: Web Speech API (Chrome/Safari)
- **Parsing**: OpenAI GPT-4o-mini (optional) with heuristic fallback

## Project structure

```
pa-for-nb/
├── server/
│   ├── example-data.json   # Fictional demo data (committed)
│   ├── middleware.js       # Clerk token verification
│   ├── store.js            # Per-user application storage
│   └── userDb.js           # Application CRUD helpers
├── client/                 # React dashboard
├── data/                   # User accounts (gitignored, local only)
└── .env                    # API keys (gitignored)
```

## Future areas (post-MVP)

Following the DYL sequence, planned additions:

1. **Wayfinding** — Good Time Journal (engagement + energy tracking)
2. **Getting Unstuck** — mind maps, anchor problem reframes
3. **Odyssey Plans** — three 5-year life sketches
4. **Prototyping** — life design interviews, small experiments
5. **Health / Play / Love** — area-specific tools beyond dashboard gauges
