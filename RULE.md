# RULE.md — Coding Standards & Quality Gates

## Language & Types
- TypeScript strict mode. No `any` unless justified with a comment
  explaining why (and ideally a TODO to remove it).
- Prefer explicit return types on exported functions.

## Code Organization
- `src/app` — routes only (App Router). Keep route files thin.
- `src/components` — split by domain: `dashboard`, `features`, `formulas`,
  `login`, `purchase`, `sidebar`, `signup`, `verify`
- `src/lib` — pure logic, no React/JSX. Calculation logic lives in
  `src/lib/calc-utils.ts`, `src/lib/math-data.ts`, and `src/lib/formulas/`.
- `src/types` — shared TypeScript types/interfaces.

## Clean Code / SOLID (applied pragmatically, not dogmatically)
- Single Responsibility: a component either renders UI or holds logic
  orchestration — not both doing heavy lifting.
- Don't abstract prematurely. Two similar-looking components don't need a
  shared abstraction until a third one shows up with the same pattern.
- Prefer composition over deep prop-drilling — but don't reach for global
  state management until there's an actual cross-cutting need.

## Security Baseline
- Never commit secrets, API keys, or tokens. `.env.local` only, always
  gitignored.
- Validate/sanitize any user input before it touches calculation logic
  (even client-side-only for now — habit matters once backend arrives).
- No `dangerouslySetInnerHTML` without explicit justification.

## Styling
- CSS Modules (`.module.css` per component) + token-based design system
  in `src/app/globals.css` (Design System v3 "Ursa"). No Tailwind, no
  separate CSS-in-JS system.
- One accent color (Cream-Peach), defined as CSS custom properties in
  `src/app/globals.css`. Dark theme (`--bg: #242F35`) is the baseline.
- Transitions: 150–200ms, consistent across interactive elements.

## Quality Gates (before considering a task "done")
1. `pnpm build` passes with no type errors.
2. No console errors/warnings in dev mode for the touched flow.
3. Responsive check: works at mobile width (not just desktop).
4. Calculation logic in `/lib/calculator` has no UI imports — verify this
   wasn't accidentally violated.
5. `Log.txt` updated with what was done.

## Commit Hygiene (if/when git is used in-session)
- Small, scoped commits over one giant commit.
- Commit message: `<area>: <what changed>` — e.g.
  `calculator: add scientific function panel`

## When Rules and Speed Conflict
Flag it, don't silently skip a rule. E.g. "I'm skipping strict typing here
to move fast on the prototype — should I circle back before backend
integration?" is fine. Silently ignoring the rule is not.
