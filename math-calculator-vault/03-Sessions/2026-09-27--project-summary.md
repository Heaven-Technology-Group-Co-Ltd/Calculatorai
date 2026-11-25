---
tags: [session]
date: 2026-09-27
---

# Session: Premium Math Calculator — project overview

**Duration / scope:** Read-only project summary in Thai; no application code changed.

## What changed
- Summarized current stack, app routes, dashboard, formula system, APIs, database, Discord bot, and developer commands in Thai.
- Verified 36 API route handlers, Next.js 16.2.6, React 19.2.3, and pnpm package manager from repository files.
- Captured the summary in this session note and updated stale stack descriptions in the Brain Map and frontend architecture note.

## What's next
- Keep Brain Map and architecture notes aligned with repository changes.
- Verify the existing formula-count summary against current `math-data.ts` and `registry.ts` before treating counts as canonical.

## Anything to remember
- `package.json` contains no Tailwind dependency; current styling is CSS Modules plus Ursa design tokens.
- `Project-Brain-Map.md` and `frontend-design-direction.md` contained stale Tailwind and `/lib/calculator` descriptions; current calculation paths are `src/lib/calc-utils.ts`, `src/lib/math-data.ts`, and `src/lib/formulas/`.
