# PA for NB — Personal Assistant (Job Hunt MVP)

Voice-powered personal assistant for tracking your job search. Dump updates by voice (or text), and watch your pipeline update on a vibrant dashboard.

**Project location:** `Desktop/2026/New Dev Projects/PA for NB`

## MVP V0 — Job area

- **Voice dump**: speak naturally about interviews, status changes, next steps
- **Smart parsing**: extracts company, role, industry, funding stage, interview dates, follow-ups, prep needs
- **Live dashboard**: color-coded cards with status pipeline, action flags, and next steps

## Quick start

```bash
npm run install-all
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:5001

## AI parsing (recommended)

Copy `.env.example` to `.env` and add your OpenAI API key for much smarter voice dump parsing:

```bash
cp .env.example .env
# edit OPENAI_API_KEY=sk-...
```

Without a key, the app uses a basic heuristic parser (still works, just less accurate).

## Example voice dumps

> "I had my recruiter screen at Stripe yesterday for a Senior PM role. They're Series D, fintech. Next step is a technical interview next Tuesday — I need to prep system design."

> "Heard back from Notion — moving to onsite! Need to follow up with recruiter to confirm travel."

> "Rejected from Meta, moving on."

## Tech stack

- **Frontend**: React + Vite
- **Backend**: Express + lowdb (JSON file)
- **Voice**: Web Speech API (Chrome/Safari)
- **Parsing**: OpenAI GPT-4o-mini (optional) with heuristic fallback

## Project structure

```
job-assistant/
├── server/           # Express API + voice dump parser
├── client/           # React dashboard
├── db.json           # Your data (auto-created)
└── .env              # OpenAI key (optional)
```

## Future areas (post-MVP)

This is V0 for the **job** life area. The architecture is designed to add more areas later (health, relationships, learning, etc.) as separate modules.
