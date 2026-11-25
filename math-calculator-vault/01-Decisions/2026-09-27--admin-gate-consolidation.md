---
tags: [decision, auth, security, backend]
status: active
date: 2026-09-27
---

# Decision: Consolidate Admin Authorization into a Fail-Closed `admin-gate` Module

## Context

Admin authorization was implemented at four call sites with divergent behavior:
`src/lib/admin/auth-middleware.ts` (`requireAdmin`),
`src/app/api/auth/admin-check/route.ts`, `src/lib/auth.ts` (`getServerSession`),
and `src/app/dashboard/page.tsx`. Each had its own rate-limit key, JWT decode,
cookie-name fallback, revocation check, and Supabase `users` lookup.
Status codes, secure-cookie selection, and database-error handling differed,
so no single test surface could pin the security policy.

## Decision

Consolidate admin authorization into one module:
`src/lib/admin/admin-gate.ts` (`checkAdminGate` + `AdminGateResult` /
`AdminGateFailure`). One policy, fail-closed, no privilege caching.

- **Adapters, not new callers**: `requireAdmin`, `/api/auth/admin-check`,
  and `src/app/dashboard/page.tsx` all call the same gate; the dashboard
  page runs with rate limiting disabled.
- **Status contract**: 401 unauthenticated/revoked/missing `iat`;
  403 non-admin; 429 rate-limited; 503 when a dependency (rate-limit store,
  revocation store, or user lookup) is unavailable.
- **Boolean model**: keep the authorization fact as `users.is_admin: boolean`;
  remove the unused `viewer/editor/admin` role hierarchy from the dashboard.
- **Rate-limit budgets**: preserve the existing `admin:` and `admin-check:`
  budgets via an optional `rateLimitKey`; do not add rate limiting to the
  server-rendered dashboard page.
- **Fail-closed**: a database or rate-limit-store error denies access with
  503 instead of failing open or falling through; a missing `iat` is
  rejected with 401 rather than skipped.
- **No caching**: revocation and `is_admin` are re-queried per request so a
  revocation is effective immediately; no persistent or per-process cache.
- **Tests**: pin the policy with Vitest unit tests against a mocked token,
  Supabase, and rate-limit adapters.

## Alternatives Considered

- **Keep the four implementations and just tidy each** — rejected: the
  divergence is the risk; there is still no single test surface, and the
  two libraries pick different secure-cookie names and map DB errors to
  different status codes.
- **Cache privileges** — rejected: revocations would stop being immediate.
  A short TTL was allowed; a persistent or process-wide cache is not,
  because immediate revocation is the security property.
- **Introduce a Postgres `user_roles` table for the hierarchy** — deferred:
  no non-admin role data exists yet, and the binary `is_admin` fully
  encodes today's authorization.

## Consequences

- Easier: one module owns the security rule; status codes are consistent
  across admin routes and the dashboard gate; the policy is unit-testable.
- Harder / traded: more code churn (route catches, dashboard page, and the
  deleted helper/hook need updating together); a temporary 503 window if
  Supabase is down for admin checks.
- Revisit when: a `user_roles`/permissions table lands, or a dashboard page
  must call the gate without an HTTP request object (the dashboard adapter
  currently uses a mock request built from `next/headers`).

## Implementation Notes (2026-09-28)

- The **dashboard gate runs in `src/proxy.ts`**, not the page component: an
  App Router page cannot return a `NextResponse` or set a 503 status, so the
  proxy is the only layer that can. `src/app/dashboard/page.tsx` renders only
  `<DashboardClient />`; redirects and the 503 JSON come from the proxy.
- `checkRateLimit` (fail-open) is preserved for non-admin callers;
  `checkRateLimitStrict` rethrows storage errors so admin paths return 503.
- `users.single()` returns `PGRST116` when the row is absent — the gate maps
  that to 401 "missing user", reserving 503 for real query failures.
- Vitest 5 + `pnpm test`; config is `vitest.config.mjs` (no `type: module` in
  the root package).

## Related

- `docs/superpowers/plans/2026-09-27-admin-gate.md` — implementation plan
- `CODEBASE.md` → Architecture friction review — candidate #1
- `[[03-Sessions/2026-09-28--admin-gate-consolidation]]`
- `[[01-Decisions/2026-07-18--frontend-backend-bot-split]]`
