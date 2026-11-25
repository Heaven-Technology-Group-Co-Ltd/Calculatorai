---
tags: [frontend, design, architecture]
status: active
last-updated: 2026-09-27
---

# Architecture: Frontend Design Direction

## Current State
- Stack: Next.js 16 App Router + TypeScript strict + CSS Modules + Ursa
  design tokens. No Tailwind dependency.
- Backend: Supabase (PostgreSQL) + NextAuth v4 + Stripe + Resend SMTP
- Theme: Ursa palette — forest dark (#242F35), cream-peach primary (#E8B896)
- **Phase: Full-stack** — dashboard, Supabase backend, Stripe payments,
  and a separate Discord bot process are active.
- Calculation logic is isolated in `src/lib/calc-utils.ts`,
  `src/lib/math-data.ts`, and `src/lib/formulas/` as pure functions with
  no UI imports. This remains a hard rule (see RULE.md).

## Key Files / Locations
- `src/app/` — App Router pages and API routes
- `src/components/` — feature and dashboard UI components
- `src/lib/calc-utils.ts`, `src/lib/math-data.ts`, `src/lib/formulas/` — pure calculation/formula logic
- `src/types/locale.ts`, `src/lib/translations.ts`, `src/lib/locale-storage.ts`, `src/lib/LanguageContext.tsx` — locale types, catalog, migration, and provider; see [[locale-system]]
- `src/lib/` — Supabase, auth, API helpers, and shared types
- `src/lib/admin/admin-gate.ts` — the single fail-closed admin authorization gate; every admin API route and the `/dashboard` proxy go through it. Status contract 401/403/429/503; DB is the only admin truth. See [[01-Decisions/2026-09-27--admin-gate-consolidation]]
- `src/proxy.ts` — security middleware; also enforces the dashboard admin gate (a page cannot return a response, so the gate lives here)
- `discord-bot/` — separate long-running Discord bot process

## Known Limitations
- History persistence supports authenticated API storage and anonymous `sessionStorage`.
- Stripe webhook and live-payment behavior require production configuration and validation.
- Supabase DB types are hand-written; migrations run manually (see [[backend-api-schema]]).

## Change History
- 2026-07-18 (scaffold): Initial frontend scaffold and Ursa design direction.
- 2026-07-23: Phase 2 Backend complete — database schema, API hardening, auth features. See [[backend-api-schema]].
- 2026-09-27: Updated stack, code paths, and status to match full-stack repository; removed stale Tailwind and `/lib/calculator` references.
- 2026-09-28: Admin-gate consolidation — one fail-closed gate module, strict/fail-open rate-limiter split, dashboard gate moved to `src/proxy.ts`, role hierarchy deleted. See [[03-Sessions/2026-09-28--admin-gate-consolidation]].
