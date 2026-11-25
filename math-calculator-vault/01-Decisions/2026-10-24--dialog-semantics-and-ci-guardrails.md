---
type: decision
date: 2026-10-24
status: accepted
tags:
  - decision
  - adr
  - a11y
  - dialog
  - guardrails
---

# ADR: Native Dialog Elements, Focus & Motion Standards, and CI Guardrails (G8-G11)

## Context
Modals previously relied on custom `div` overlays with hand-crafted JavaScript event listeners for keyboard Tab trapping and Escape keys. This introduced inconsistency across user and admin modals, risk of focus leaking, lack of `inert` semantics for background content, and boilerplate code. Furthermore, global accessibility lacked explicit `:focus-visible` rings and OS motion preference support, and CI lacked automated enforcement of quality gates G8–G11.

## Decision
1. **Native `<dialog>` + `showModal()` Standard:**
   - Migrate all 8 modals (4 user-facing, 4 admin dashboard) to the HTML5 `<dialog>` element.
   - Use browser-native `.showModal()` to gain free focus trapping, `Escape` dismissal, and background `inert` semantics.
   - Style native `::backdrop` instead of custom `div.overlay` wrapper elements.
2. **Global A11y Standards:**
   - Define high-contrast keyboard focus indicators via `:focus-visible` in `globals.css` (2px solid `var(--primary)`).
   - Define global `@media (prefers-reduced-motion: reduce)` rules suppressing animations/transitions.
   - Enforce distinct, informative metadata titles and descriptions across all 10 route pages.
3. **Automated CI Quality Gates (G8–G11):**
   - Implement test suite in `src/lib/quality-gates.test.ts` executed on every CI test run (`npm test` / `npm run guardrails`).
   - G8: 0 raw hex in non-globals CSS.
   - G9: WCAG 2.2 AA contrast ratios validated mathematically for all theme tokens.
   - G10: All 8 modals statically asserted for `<dialog>`, `role="dialog"`, `aria-modal="true"`, and `showModal()`.
   - G11: Dead CSS ratchet locked at <= 2 unused classes.

## Consequences
- **Positive:** Browser-level accessibility compliance (WCAG 2.2 AA), elimination of custom focus-trap libraries, automated CI regression prevention, smaller bundle size, improved SEO and browser tab clarity across all 10 pages.
- **Negative:** Requires defensive check `typeof dialog.showModal === "function"` when running in non-browser unit test environments without DOM polyfills.
