---
tags: [frontend, backend, discord-bot, database, decision]
status: active
date: 2026-07-18
---

# Decision: Frontend/Backend/Bot Split for Full Rebuild

## Context
Full rebuild of Premium Math Calculator. Old codebase deleted. Small team
now, possible worldwide scale later. Discord kept from old setup, to be
used as a bot for notifications/system linking (not just community).

## Decision
- Frontend + lightweight backend: **Next.js 16 (App Router)**, fullstack,
  hosted on Vercel.
- Database: **Postgres via Supabase** — shared between web app and bot.
- Discord Bot: **separate long-running process** (discord.js), NOT inside
  Next.js/Vercel — serverless can't hold a persistent Gateway connection.
  Candidate hosts: Railway/Fly.io, or existing VPS if cost-sensitive.
- Bot and web app connect via shared database rather than direct API
  calls to each other — reduces coupling.
- Phase order: **Frontend first**, backend/DB/bot deferred to later
  phases.

## Alternatives Considered
- **Full microservices from day one** — rejected. Team is small; premature
  split adds ops overhead before there's real scale pressure.
- **Discord bot logic inside Next.js API routes** — rejected. Serverless
  functions can't maintain the persistent WebSocket connection Discord's
  Gateway requires.

## Consequences
- Easier: single language (TS) across web + bot, fast initial development,
  cheap to run early.
- Harder: two deploy targets to manage once bot phase starts (Vercel +
  Railway/Fly.io/VPS).
- Revisit when: calculation logic becomes too CPU-heavy for
  Vercel's function timeout, or traffic genuinely requires multi-region
  DB reads — not before.

## Related
- See `02-Architecture/frontend-stack.md` (once created)
