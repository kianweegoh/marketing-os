# Kalo AI Marketing OS

A multi-agent marketing operations platform. Seven specialist AI agents — each with its own system
prompt, persistent memory, and workspace — can be run individually or orchestrated together toward a
single business goal. Every agent is grounded in a shared company knowledge base, can search the live
web, streams output token-by-token, learns from every run, and can push results to Google Docs,
Google Calendar, and Telegram.

## Pluggable company context

The architecture originated from an internal marketing system built for a real pre-launch mobile app.
The company knowledge layer is **data, not code**: it lives in the database and is edited through the
Settings UI. Swapping it re-points the entire seven-agent team at a different product without touching
a single file.

The repo ships with a complete fictional demo company — **Verda**, a plant care and identification
subscription app for Southeast Asia — so a fresh clone runs end to end out of the box.

## Status

Under active construction. Built in batches per `KALO_AI_MARKETING_OS_BUILD_SPEC.md`.

- [x] Batch 1 — repo strategy, scaffold, theme, database, authentication
- [ ] Batch 2 — agent registry, prompts, execution engine, agent pages
- [ ] Batch 3 — orchestrator, metrics dashboard, output library
- [ ] Batch 4 — integrations, settings, polish, docs

## Getting started

```bash
npm install
cp .env.example .env.local     # then fill in ANTHROPIC_API_KEY and AUTH_PASSWORD
npx prisma db push
npm run db:seed
npm run dev
```

Open http://localhost:3000 and sign in with `AUTH_PASSWORD`.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript, strict mode |
| Styling | Tailwind CSS + `@tailwindcss/typography` |
| Database | Prisma ORM + SQLite (Postgres-compatible schema) |
| AI | Anthropic SDK |
| Icons | lucide-react |
| Dates | date-fns |
| Google | googleapis |

_Full README — architecture diagram, feature list, memory system, orchestration model — lands in the
final batch._
