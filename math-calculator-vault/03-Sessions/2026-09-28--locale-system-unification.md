---
tags: [session]
date: 2026-09-28
---

# Session: Locale System Unification

**Duration / scope:** Full-stack locale state and catalog consolidation.

## What changed
- Added canonical five-locale `Lang`/`Translation` types and a shared typed UI catalog.
- Added safe locale restore/migration from legacy `language` to `pref-lang`; provider now owns runtime locale state.
- Migrated app shell, standalone pages, and locale/type/catalog importers; removed duplicate locale state and compatibility exports.
- Added locale storage self-check; self-check, `pnpm type-check`, and `pnpm build` passed.
- Added [[02-Architecture/locale-system]] documenting ownership, storage key, fallback, and error behavior.

## What's next
- None for locale unification. Keep future UI locale state behind `useLanguage()`.

## Anything to remember
- Node 22 native TypeScript stripping emits a harmless module-type warning for the `.ts` helper import; self-check passed.
