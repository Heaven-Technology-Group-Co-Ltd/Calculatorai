---
tags: [decision, design-system, architecture]
status: active
date: 2026-10-24
---

# Decision: Design System Consolidation & Token Unification

## Context
Design constants were duplicated across four places without ownership (`globals.css` with 12 variables + 58 raw hex, `lib/design-tokens.ts` with 129 lines of mostly unused exports, and `math-data.ts` with conflicting level colors). The type scale had 57 distinct values, z-index jumped arbitrarily up to 10000 across 22 distinct values, 144 dead CSS classes polluted bundle size, and font loading blocked rendering via Google Fonts `@import`.

## Decision
Design System v3 (Ursa) is consolidated with `src/app/globals.css` as the sole single source of truth for all CSS variables. `src/lib/design-tokens.ts` and `src/app/page.module.css` are deleted, type scale is standardized to 6 steps (`--fs-1` to `--fs-6`), z-index is standardized to 5 tiers (`--z-base`, `--z-sticky`, `--z-drawer`, `--z-modal`, `--z-toast`), fonts are migrated to self-hosted `next/font/google`, and icon data properties are strictly typed as `LucideIcon`.

## Alternatives Considered
- **Maintain dual TS/CSS tokens** — Rejected: TS tokens (`design-tokens.ts`) drifted continuously, had only 1 consumer in the entire app, and created 3 conflicting answers for "what color is elementary school".
- **Keep Google Fonts @import in globals.css** — Rejected: Render-blocking round-trips to external Google Fonts CDN harmed Core Web Vitals (FCP/LCP).
- **Keep string icon names (`icon: string`)** — Rejected: Permitted invalid FontAwesome strings (`fa-*`) that were impossible to render with Lucide.

## Consequences
- Guaranteed zero raw hex in non-globals CSS (enforced by `design-system-gate.test.ts`).
- Elimination of render-blocking font requests via Next.js self-hosted fonts.
- Compile-time icon type safety preventing runtime icon render failures.
- Single place to change theme tokens (`globals.css`).

## Related
- `[[03-Sessions/2026-10-24--design-system-consolidation]]`
- `[[02-Architecture/frontend-design-direction]]`
