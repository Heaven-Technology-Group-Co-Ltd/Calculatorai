---
tags: [conventions, agents-md, claude-md, decision]
status: active
date: 2026-09-27
---

# Decision: Instruction files state current facts only (prompt-audit pass)

## Context
`CLAUDE.md`, `AGENTS.md`, and `RULE.md` accumulated phase-1 assumptions
("FRONTEND-ONLY", "Tailwind", "`/lib/calculator`", "future phase" for
Supabase/bot) that the code shipped past months ago. Nothing re-checked
them, so every session loaded a description of a codebase that no longer
exists — and agents kept getting scope prohibitions the repo itself
violated.

## Decision
A prompt audit (2026-09-27) rewrote the three files to state only
verifiable current facts. Standing convention going forward: when code
ships past a claim in an instruction file (phase, path, library, command),
the file is updated in the same task that invalidates it — the "Self-Updating
Memory Loop" in CLAUDE.md applies to *facts*, not just decisions.

## Alternatives Considered
- **Leave phase language as history** ("frontend-first, then backend") —
  rejected; instruction files are read as current law by every fresh
  session, not as changelogs. History lives in `Log.txt` and `03-Sessions/`.
- **Delete the prohibitions entirely** — rejected; the localStorage rule
  and "confirm before new API routes" still encode real constraints,
  only the Supabase/bot bans were contradicted by shipped code.

## Consequences
- Easier: agents no longer reconcile "FRONTEND-ONLY" against an existing
  `/api/*` tree; build gate now matches pnpm-only convention.
- Harder: phase-boundary guardrail is now "confirm with the user" instead
  of a hard ban — slightly weaker, deliberate tradeoff.
- Revisit when: entering a new phase, at each model release, or when any
  named path/command in the three files stops resolving.

## Related
- `[[2026-07-18--frontend-backend-bot-split]]` — the decision whose
  "deferred phases" framing these files failed to retire.
- `03-Sessions/2026-09-27--prompt-audit-config-sync.md`
- `05-Bridges/System-Bridges.md`
