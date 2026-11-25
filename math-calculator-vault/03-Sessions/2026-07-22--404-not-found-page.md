---
tags: [session]
date: 2026-07-22
---

# Session: 404 Not Found page — calculator-display concept with math pun

**Duration / scope:** Single-task: create responsive 404 page with genuine mobile layout

## What changed
- **Created `src/app/not-found.tsx`** — route page, Next.js auto-detects as 404 fallback
- **Created `src/components/not-found/NotFoundClient.tsx`** — client component with Framer Motion staggered entrance: calc line → 404 result (spring) → ERR:UNDEFINED → ∉ domain tag → description → CTA button
- **Created `src/components/not-found/NotFound.module.css`** — Ursa palette, calculator-display concept, 4-breakpoint responsive mobile-first (≥901px / ≤900px / ≤640px / ≤400px), genuine mobile layout (full-width card, 3rem display, bottom-nav clearance, compact padding)
- **Added 4 translation key groups** to `uiTranslations` (th/en/jp/ch/ko): `notFoundCalc`, `notFoundDomain`, `notFoundDesc`, `notFoundCTA`

## Design decisions
- **Calculator-display concept**: Presentation as "400 + 4 = 404" on a dark display panel, tying the 404 error to the math calculator subject
- **∉ domain pun**: "This page is not in our domain" — a math-domain joke that feels intentional, not generic
- **Ambient ∅ backdrop**: Faint empty-set symbol as decorative background element (40vw scale, 2.5% opacity)
- **No AppShell wrapper**: 404 page is standalone (no sidebar/navbar), matches Next.js convention for error pages
- **Build verified**: `next build` compiled successfully with `/_not-found` route detected automatically

## What's next
- Test 404 page by navigating to an invalid route (e.g. `/xyz`) to confirm rendering and animations
- Consider if other error pages (500, global-error.tsx) should follow the same visual pattern
- Future: add `useLayoutEffect` redirect logic if user session is active? (likely not needed)

## Anything to remember
- `not-found.tsx` at app root is a **Next.js special file** — no need to import/route manually, unmatched routes auto-trigger it
- The calculator-display panel pattern (dark bg, monospace calc line, large result) could be reused for calculator history or expression display in the future
- ∉ symbol renders well across all browsers; no polyfill needed
