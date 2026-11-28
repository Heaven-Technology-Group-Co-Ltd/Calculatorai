# CLAUDE.md — Premium Math Calculator

This file governs how Claude Code (and compatible agents, e.g. Opencode)
behave in this repository. Read this FIRST, every session, before touching
any code.

## Project Identity
- **Name:** Premium Math Calculator
- **Team:** Heaven Developer Team
- **Status:** Full rebuild (previous codebase deleted, starting clean)
- **Phase:** Full-stack. Frontend (Next.js), backend (API routes + Supabase),
  and Discord bot all active. Scope guardrails below still apply.

## Stack (keep this section updated — see "Version Watch" below)
- Next.js — **App Router**, TypeScript strict mode
- Styling: CSS Modules (`.module.css` per component) + token-based design
  system in `src/app/globals.css` (Design System v3 "Ursa")
- Database: Postgres via Supabase (`src/lib/supabase-client.ts`,
  `src/lib/supabase-adapter.ts`, `src/lib/database.types.ts`)
- Bot: discord.js, runs as a separate long-running process in `discord-bot/`
  (NOT inside Next.js/Vercel — serverless can't hold a persistent Gateway
  connection)

## Version Watch (self-updating — do not let this go stale)
Before starting any significant task, or if it has been more than ~2 weeks
since this file was last touched, run a quick check:
1. `npm view next version` — compare against the version pinned in
   package.json and in this file.
2. If a new **major** version of Next.js, React, or Tailwind has shipped,
   flag it to the user before upgrading. Do not silently major-bump.
3. Update the "Last verified" line below whenever you check.

**Last verified:** 2026-11-28 — Next.js 16.2.6 pinned in package.json;
latest is 16.4.6 (same major — no major-bump flag; check again next session).
React 19.2, Turbopack default, async params, proxy.ts middleware naming.

## Core Behavior Rules
1. **Language mirroring:** If the user writes in Thai, respond in Thai
   (technical terms in English are fine/expected). If they write in
   English, respond in English.
2. **Don't assume missing critical info.** If a task is ambiguous in a way
   that changes the implementation (not just cosmetic), ask — don't guess
   silently and ship it.
3. **Stay in scope.** Do not:
   - scaffold new backend services or new API routes without confirming the
     phase boundary with the user
   - use localStorage/sessionStorage for anything meant to be persistent
     (it will conflict with backend-driven state)
4. **Isolate calculation logic.** All math/calculation logic lives in
   `src/lib/calc-utils.ts`, `src/lib/math-data.ts`, and `src/lib/formulas/`
   as pure functions with no UI code mixed in. This is non-negotiable —
   it's what makes backend integration painless later.
5. **Before generating a large batch of files:** summarize the planned
   file structure and any non-obvious decisions (e.g. accent color,
   library choices) and get a quick confirmation first.
6. **Update Obsidian vault on completion:** Every time a task completes,
   sync to Obsidian vault: update `03-Sessions/` with a session summary,
   `01-Decisions/` if a decision was made, `02-Architecture/` if structure
   changed. The vault is the long-term brain — keep it current.

## Logging Protocol (see also RULE.md → Quality Gates)
- Log meaningful progress to `Log.txt` **mid-task**, not just at the end.
  If a session gets interrupted, the log should make it obvious what was
  done and what's next.
- Log format:
  ```
  [YYYY-MM-DD HH:MM] <what changed> — <why> — <files touched>
  ```
- Keep entries short. This is a working log, not a changelog for users.

## Self-Updating Memory Loop
At the end of a session where meaningful architectural decisions were made
(new library adopted, pattern changed, convention established), propose an
update to this file (or AGENTS.md / RULE.md, whichever is the right home)
rather than letting the decision live only in chat history or code
comments. Ask before committing the update.

## Backup Exclusions
When backing up or archiving this project, always exclude:
- `.next/`
- `node_modules/`
- `.env*` (never back these up in plaintext — secrets)

## SecondBrain (Obsidian Vault)
- **Location:** `./math-calculator-vault/`
- **Dashboard:** open `Vault-Dashboard.base` for full overview (8 views)
- **Brain Map:** `Project-Brain-Map.md` — MOC เชื่อมทุกอย่าง
- **System Bridges:** `05-Bridges/System-Bridges.md` — เชื่อม Log.txt, CLAUDE.md, AGENTS.md, RULE.md, Claude Memory
- **After sessions** with real architectural decisions made, propose a new note in `01-Decisions/` using `04-Templates/Decision-Template.md`.
- **Every session end:** update `03-Sessions/` with summary. Check if architecture needs update in `02-Architecture/`.
- **Do not** load the entire vault. Do not follow the graph/backlinks
  organically from note to note — that pulls in unrelated sessions and
  templates and burns tokens for no benefit. Use the explicit task→path
  map below instead of exploring.

### Before Starting Any Task — Scoped Vault Read
Read only what the task type below calls for. Nothing else, unless the
user names a specific note.

| Task type | Read this (and only this) |
|---|---|
| Any task (baseline) | `Project-Brain-Map.md` (top-level index only — don't follow every link out) |
| Feature / architecture work | `02-Architecture/frontend-design-direction.md` |
| Resuming an interrupted session | latest file in `03-Sessions/` by date, + `Log.txt` tail |
| Decision affects existing convention | most recent relevant note in `01-Decisions/` (match by filename keyword, not full folder scan) |
| Writing a new decision/session note | matching template in `04-Templates/` (`Decision-Template.md` or `Session-Summary-Template.md`) |
| Cross-file consistency check (Log.txt/CLAUDE.md/AGENTS.md/RULE.md in sync?) | `05-Bridges/System-Bridges.md` |

If a task doesn't clearly map to a row above, ask the user which note is
relevant rather than searching the whole vault.

## Related Files
- `AGENTS.md` — cross-tool agent instructions (Claude Code, Opencode, etc.)
- `RULE.md` — coding standards & quality gates
- `Log.txt` — running session log
- `math-calculator-vault/` — Obsidian second brain (long-term memory)
