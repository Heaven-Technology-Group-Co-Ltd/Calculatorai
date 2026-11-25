---
tags: [frontend, scaffold, phase1]
status: active
date: 2026-07-18
---

# Session: Frontend Scaffold — Phase 1 Complete

## What Changed
- **Stack initialized**: Next.js 16.2.10, React 19.2.7, Tailwind CSS v4.3.3, TypeScript 5.9.3 strict
- **Component library**: shadcn/ui (Base UI v1) — button, card, separator
- **Accent color**: Amber-500 (#F59E0B) — premium, restrained, scientific-instrument feel
- **Theme**: Dark baseline (not a toggle) — `--color-surface: #1c1c1e`
- **Calculation engine**: Pure functions in `/lib/calculator` — shunting-yard expression evaluator, trig, log, powers, memory, formatting
- **Calculator UI**: `useReducer` state machine with scientific functions (sin/cos/tan/log/ln/√/∛/xʸ/eˣ/x!), memory (MC/MR/M+/M-/MS), parentheses
- **Layout**: Sidebar navigation (responsive, collapsible on mobile), header, footer
- **History Page**: Separate `/history` route with static mock data (stub for Phase 2)

## Key Decisions
| Decision | Choice | Rationale |
|---|---|---|
| Accent color | Amber-500 | Premium, not flashy; pairs with dark theme |
| Component lib | shadcn/ui | Confirmed by user |
| History | Separate page | Confirmed by user |
| State mgmt | useReducer | Better than useState for complex calc state |
| Calc logic isolation | /lib/calculator | Zero UI imports — ensures painless backend integration later |

## Architecture Notes
- 3 routes: `/` (calculator), `/history` (stub), `/_not-found`
- `pnpm build` passes with 0 type errors
- All RULE.md Quality Gates met (build, responsive, pure logic isolation)

## Next Steps (Phase 2+)
- Connect history to real state (shared context or Supabase)
- "Premium" gated features (graphing, export)
- Backend/API layer
- Discord bot integration

## Related
- [[2026-07-18--frontend-backend-bot-split]] — broader system architecture
- `02-Architecture/frontend-design-direction.md` — design direction
