# AGENTS.md — Cross-Tool Agent Instructions

This file is read by any coding agent working on this repo — Claude Code,
Opencode (DeepSeek V4 Pro via OpenRouter), or others. It exists because
`CLAUDE.md` is Claude-Code-specific by convention; this file is the
tool-agnostic layer so behavior stays consistent no matter which agent/model
is driving.

Next.js itself has started bundling docs through AGENTS.md as of the 16.3
preview line — if a `next` version in this repo ships its own AGENTS.md
guidance, treat that as **additive** to this file, not a replacement.

## Priority Order When Rules Conflict
1. Direct instruction from the user in the current session
2. This file (AGENTS.md)
3. `CLAUDE.md` (Claude-Code-specific behavior)
4. `RULE.md` (coding standards)
5. Framework defaults / general best practice

## Model Routing Awareness
This project may be worked on via OmniRoute (local LLM gateway) routing to
DeepSeek V4 Pro for cost efficiency, or directly via Claude Code. Agents
should:
- Not assume a specific model is running — write instructions that are
  clear enough for a cheaper/smaller model to follow correctly.
- Avoid overly clever/implicit patterns that only a strong reasoning model
  would infer correctly. Prefer explicit over clever.
- Keep prompts/instructions in skill files token-efficient — this project
  is cost-conscious about token usage by design.

## Session Startup Checklist (every agent, every session)
1. Read `CLAUDE.md` for current phase/scope.
2. Read `RULE.md` for coding standards.
3. Check `Log.txt` for the last few entries — know what happened last
   session before making changes.
4. If working across a monorepo boundary (once backend/bot phases start),
   confirm which package you're actually meant to be working in.

## Multi-Agent Handoff
If one agent (e.g. Opencode) starts a task and another (e.g. Claude Code)
continues it:
- The incoming agent must read `Log.txt` before writing any code.
- Do not silently redo or undo work from the prior session — if something
  looks wrong, ask or log the concern instead of unilaterally reverting.

## Codebase Map
Use `CODEBASE.md` for directory layout and important code seams. It is a
navigation aid, not a rulebook; do not duplicate its rule-like content into
`AGENTS.md` or `CLAUDE.md`.

## Skills
Project-specific methodology lives in `SKILL.md` files. Load relevant
`SKILL.md` content before starting non-trivial tasks, the same way you
would consult a style guide.

## What NOT to do
- Don't install packages outside the agreed stack without flagging it.
- Don't restructure the file tree "for cleanliness" mid-task — propose it
  as a separate step and get confirmation.
- Don't touch `.env*` files' contents in logs, commits, or output.
