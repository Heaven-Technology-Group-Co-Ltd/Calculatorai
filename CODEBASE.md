# Codebase Map

Short navigation map for Premium Math Calculator. Operational rules live in `AGENTS.md`, `CLAUDE.md`, and `RULE.md`; this file avoids repeating them.

## Repository layout

- `src/app/` — Next.js App Router pages and route handlers.
  - `src/app/api/` — HTTP routes grouped by domain: `auth`, `users`, `admin`, `analytics`, `finance`, `payments`, `settings`, `stats`, `history`, and `page-views`.
  - Page routes include calculator home, dashboard, login/signup/verification, purchase, and formula demo.
- `src/components/` — UI, organized by shared features and dashboard areas.
- `src/hooks/` — React hooks, including history and page-view behavior.
- `src/lib/` — calculation and formula logic, authentication, Supabase access, rate limiting, validation, and response helpers.
  - `src/lib/formulas/` — formula registry and pure formula helpers.
  - `src/lib/admin/` — admin authorization, session revocation, audit logging, and schemas.
- `src/types/` — shared TypeScript definitions.
- `supabase/migrations/` — database schema changes; migration files are the source of truth for DB evolution.
- `discord-bot/` — separate Discord Gateway process; deployed/run independently from Next.js.
- `math-calculator-vault/` — Obsidian project notes; `Project-Brain-Map.md` indexes architecture and decisions.

## Important seams

- **Calculations:** keep calculation logic pure and outside UI. Main locations: `src/lib/calc-utils.ts`, `src/lib/math-data.ts`, and `src/lib/formulas/`. Follow `CLAUDE.md` and `RULE.md` for governing constraints.
- **Database:** shared Supabase access and schema types live under `src/lib/`; SQL changes belong in `supabase/migrations/`.
- **Admin authorization:** `src/lib/admin/` owns shared policy; route handlers adapt results to HTTP responses. Check the active decision note `math-calculator-vault/01-Decisions/2026-09-27--admin-gate-consolidation.md` before changing this seam.
- **Discord administration:** web app and bot communicate over the admin integration; bot remains a separate process, not part of Next.js route runtime.

## Finding current behavior

- Route behavior is defined by each `src/app/api/**/route.ts` file and shared modules under `src/lib/`.
- UI behavior starts at `src/app/` pages, then feature-specific modules under `src/components/` and `src/hooks/`.
- Database structure and changes are in `supabase/migrations/`; TypeScript DB types are in `src/lib/database.types.ts`.
- Historical design notes may be stale. Verify paths and behavior in source before relying on older notes; use the scoped vault guidance in `CLAUDE.md`.

## Commands

Use `pnpm` (project package manager). Scripts are defined in `package.json`:

- `pnpm dev:web` — run Next.js only.
- `pnpm dev:bot` — run Discord bot only.
- `pnpm dev` — run web and bot together.
- `pnpm type-check` — TypeScript check.
- `pnpm lint` — ESLint.
- `pnpm build` — production build.

## Architecture friction review

This section is a dated snapshot, absorbed from the former `docs/architecture-review.md`. Verify each item against current source before acting; update the section when a candidate is resolved or the code drifts.

_Last reviewed: 2026-09-27_

### 1. Deepen admin session gating — Strong

- **Files:** `src/lib/admin/auth-middleware.ts`, `src/lib/auth.ts`, `src/app/api/auth/admin-check/route.ts`, `src/app/dashboard/page.tsx`
- **Problem:** the admin authentication decision is reimplemented across multiple live callers — divergent rate-limit keys, JWT decode paths, cookie-name fallbacks, revocation checks, and admin lookups.
- **Solution:** one deep module returning a single admin session decision; routes and server pages stay adapters for status/redirect mapping.
- **ADR:** `math-calculator-vault/01-Decisions/2026-09-27--admin-gate-consolidation.md`; implementation plan in `docs/superpowers/plans/2026-09-27-admin-gate.md`.

### 2. Unify the language seam — Worth exploring

- **Files:** `src/lib/LanguageContext.tsx`, `src/lib/translations.ts`, `src/lib/math-data.ts`, `src/components/AppShell.tsx`, `src/app/formulas-demo/page.tsx`
- **Problem:** two parallel language systems — `LanguageContext` persists `TH|EN|CH|JP` to `language`; `AppShell` uses `th|en|jp|ch|ko` persisted to `pref-lang`; `formulas-demo` maps between them locally.
- **Solution:** one canonical language module (shared locale codes, persistence, typed translation access); move callers before deleting duplicates. Caution: `LanguageContext` is live in `layout.tsx` and `formulas-demo/page.tsx`.

### 3. Collapse the orphan formula catalog — Worth exploring

- **Files:** `src/lib/math-data.ts`, `src/types/formulas.ts`, `src/lib/formulas/registry.ts`, `src/lib/calc-utils.ts`, `src/components/formulas/FormulaCard.tsx`
- **Problem:** legacy `data: CalculatorData[]` catalog in `math-data.ts` duplicates the active `FormulaDef` registry; `CalcVar`/`MathSubject` types are duplicated and `calc-utils.ts` imports `CalcVar` from `math-data.ts`.
- **Solution:** confirm no live callers of the legacy catalog, delete the orphan `data` and duplicated types; leave live shared pieces (`uiTranslations`, `departments`, `levels`) until they move behind a clearer i18n/taxonomy module.

### 4. Deepen the finance route scaffold — Speculative

- **Files:** `src/app/api/finance/invoices/route.ts`, `refunds/route.ts`, `subscriptions/route.ts`, `subscriptions/[id]/route.ts`; analytics routes share the same client + error envelope
- **Problem:** three finance routes (plus the update route) repeat client setup, try/catch 500 envelope, GET newest-100, Zod safeParse→422, insert/select, and audit-log orchestration.
- **Solution:** extract only the repeated harness behind small adapters; keep schema, table mapping, defaults, and audit metadata route-owned. Route differences (invoice vs refund vs subscription defaults and start states) are legitimate — do not force one generic data layer.
