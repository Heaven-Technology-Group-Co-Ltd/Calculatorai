---
tags: [session, git, repository-health]
date: 2026-09-29
---

# Session: Git History Missing Tree Object

**Duration / scope:** Diagnose repository object warning; record verified scope before continuing commit separation.

## What changed
- Recorded missing tree object `497f90b4d2bb64f0295315da6c8e96f9f1072fac`, referenced by commit `9da7dd6` (`docs(homepage): add redesign spec for architecture + performance overhaul`).
- Fresh `git fsck --connectivity-only` confirms one broken commit→tree link and one missing tree; `git ls-tree 9da7dd6` fails with `fatal: not a tree object`.
- Verified trees for commits `6e5272e`, `c90c2fe`, `5305802`, and current HEAD are valid.
- Git auto-repack warns and stops; `.git/gc.log` records `fatal: bad tree object ...`.

## What's next
- RESOLVED 2026-09-29: chose option 1 (leave as-is + disable auto-gc). `gc.auto=0`, removed `.git/gc.log`. Commit works normally. Accept `git log -- <path>` broken + fsck dirty + loose objects accumulate. Fix later if source repo found.

## Anything to remember
- Do not run `git gc`, `git prune`, history rewrite, or checkout the damaged commit until recovery path is established.
- Earlier diagnostic mentioned `.next` ownership, but no evidence links it to this missing Git tree; cause remains unknown.
- Source repo: https://github.com/Hiroshi002/calculate_project (private, no token) — if token obtained, can fetch missing objects and fully repair without SHA changes.
- Missing objects: `497f90b4` (root tree) + ~18 objects under May-27/28 snapshots (`.npmrc`, `pnpm-workspace.yaml`, `src/lib`, `src/app/api/auth`, `src/app/signup`, `HeroSection.tsx`, `Sidebar.tsx`, `AuthButton.tsx`, `CalculatorCard.tsx`, `.claude`, `CLAUDE.md`, `src/app`, `src/components/dashboard`, dashboard settings old versions).
