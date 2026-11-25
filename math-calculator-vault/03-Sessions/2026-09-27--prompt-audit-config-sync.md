---
tags: [session]
date: 2026-09-27
---

# Session: Prompt audit — CLAUDE.md/AGENTS.md/RULE.md synced to reality

**Duration / scope:** `/claude-api prompt-audit` over the Claude Code config
surface (project CLAUDE.md/AGENTS.md/RULE.md, user ~/.claude/CLAUDE.md,
graphify skill). No app code touched.

## What changed
- 8 stale facts corrected: instruction files still described a
  frontend-only, Tailwind, `/lib/calculator` codebase; repo is full-stack
  (Supabase, Stripe, Discord bot) with CSS Modules + Ursa token system.
- CLAUDE.md: stack section, phase, "Stay in scope" prohibitions,
  calculation-logic path (`src/lib/calc-utils.ts` + `math-data.ts` + `formulas/`).
- RULE.md: code organization (real component domains), styling (CSS
  Modules, not Tailwind), build gate `npm run build` → `pnpm build`.
- AGENTS.md: removed dangling "Fable 5" SKILL.md reference.
- No Group-1 dated-prompt findings at all — files were free of model-era
  scaffolding; all findings were stale repo facts.
- Pre-edit backups (files were uncommitted): `/tmp/prompt-audit-backup-20260927/`.

## What's next
- Commit CLAUDE.md/AGENTS.md/RULE.md (still uncommitted) + this vault update.
- Verify or delete `AGENTS.md:9-11` (Next.js 16.3 AGENTS.md-bundling claim,
  unverified).
- Version Watch line in CLAUDE.md is stale ("Last verified: 2026-07-18",
  >2 weeks old) — re-run `npm view next version` next significant task.

## Anything to remember
- `npm view` in Version Watch conflicts with the pnpm-only rule in practice;
  the check itself works with any registry client, but prefer `pnpm view next version`.
