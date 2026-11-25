# Admin Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate admin authorization into one fail-closed `admin-gate` module, preserve caller-specific rate-limit budgets and response behavior where explicitly decided, and cover security outcomes with Vitest.

**Architecture:** `src/lib/admin/admin-gate.ts` owns rate limiting, NextAuth token decoding and cookie fallback, session revocation, and the database-backed `is_admin` decision. It returns a typed success/failure result so existing admin API routes, `/api/auth/admin-check`, and the dashboard page can map the same decision to HTTP responses or redirects. Rate-limit keys remain caller-specific; the dashboard page skips rate limiting. Revocation and `users.is_admin` are checked in parallel on every request; no privilege cache.

**Tech Stack:** Next.js App Router, TypeScript strict, NextAuth v4, Supabase JS, Vitest, pnpm.

**Spec:** `CODEBASE.md` → Architecture friction review and `math-calculator-vault/01-Decisions/2026-09-27--admin-gate-consolidation.md`: module path `src/lib/admin/admin-gate.ts`; boolean `is_admin`; 401 invalid/revoked/missing-iat, 403 non-admin, 429 exhausted rate limit, 503 verification dependencies unavailable; fail-closed rate-limit and DB behavior; route-specific rate keys; no page rate limit; run revocation and admin lookup concurrently; delete custom `getServerSession` and unused `useDashboardAuth`; all existing admin route handlers map gate failures; Vitest unit tests with mocked adapters.

## Global Constraints

- Use `pnpm`; do not use npm or yarn.
- Keep admin admission grounded in database `users.is_admin`; JWT role claims are not authorization truth.
- Missing `iat` fails closed with 401; do not skip revocation validation.
- Revocation-store, admin-user lookup, and strict rate-limit-store errors fail closed with 503.
- Preserve the two existing rate-limit namespaces: `admin:<ip>` and `admin-check:<ip>`; do not add rate limiting to server-rendered `/dashboard`.
- Do not cache admin privilege or revocation state across requests.
- Do not change rate-limit failure behavior for unrelated endpoints.
- Preserve `/api/auth/admin-check` response envelope `{ success, data }` on success.
- Do not add a database migration or a new production dependency for the gate.

## Review Focus

- Missing token or invalid cookie must yield 401; test the primary and alternate cookie names.
- Missing or invalid `iat` must yield 401 and must not query as a valid session.
- Revoked token must yield 401; a revocation row read error must yield 503.
- Non-admin must yield 403; a `users` lookup error must yield 503, not 401/403.
- Rate limit exhausted must yield 429; rate-limit storage failure must yield 503, without changing other endpoints' current fail-open behavior.

---

## File Map

- Create `src/lib/admin/admin-gate.ts`: typed decision result; one gate implementation; shared client-IP and secure-cookie handling; parallel revocation/admin-user reads.
- Modify `src/lib/admin/session-store.ts`: make revocation lookup distinguish no row (valid) from query failure (throw/fail closed).
- Modify `src/lib/rate-limiter.ts`: retain existing fail-open `checkRateLimit`; add strict counterpart for callers that must treat storage errors as unavailable.
- Modify `src/lib/admin/auth-middleware.ts`: preserve `requireAdmin(request)` import surface for existing call sites, delegate to `admin-gate`, and expose a shared response mapper for gate errors.
- Modify `src/app/api/auth/admin-check/route.ts`: remove duplicate checks; call gate with `admin-check` budget and keep its JSON response contract.
- Modify all `src/app/api/**/route.ts` handlers that call `requireAdmin`: map gate failures to 401/403/429/503 instead of swallowing them as 500 or generic 403.
- Modify `src/app/dashboard/page.tsx`: use the same gate with rate limiting disabled; retain redirect destinations (`/login` unauthenticated, `/` unauthorized); remove redundant direct Supabase query.
- Delete `src/lib/auth.ts`: it has no caller after dashboard migration, and currently synthesizes `role: "admin"`.
- Modify `src/components/dashboard/DashboardProvider.tsx`, `DashboardClient.tsx`, `DashboardGuard.tsx`: remove unused role hierarchy and `initialRole`; retain unrelated dashboard state. Delete `DashboardGuard.tsx` only after verifying it has no importers.
- Delete `src/components/dashboard/hooks/useDashboardAuth.ts`: verified no callers; retain `/api/auth/admin-check` route.
- Create `vitest.config.ts`: resolve `@/` source alias and configure node test environment.
- Modify `package.json`, `pnpm-lock.yaml`: add Vitest dev dependency and `pnpm test` script.
- Create `src/lib/admin/admin-gate.test.ts`: exercise gate results with mocked token, Supabase query, revocation, and rate-limit adapters.
- Create/update tests for strict rate-limit behavior and revocation-store behavior only where module-level outcomes cannot cover the failure distinction.

## Task 1: Add Vitest and pin gate outcomes with failing tests

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `vitest.config.ts`
- Create: `src/lib/admin/admin-gate.test.ts`

**Interfaces:**
- Consumes: planned gate result `AdminGateResult` and `checkAdminGate(request, options)` from Task 2.
- Produces: `pnpm test` command and tests specifying expected security outcomes.

- [ ] **Step 1: Install Vitest and add the test command**

Run: `pnpm add -D vitest`

Add to `package.json` scripts: `"test": "vitest run"`.

- [ ] **Step 2: Configure Vitest alias and environment**

Create `vitest.config.ts`:

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 3: Write failing tests for success and authorization outcomes**

Create tests that mock `next-auth/jwt`, `@/lib/supabase-client`, `@/lib/admin/session-store`, and `@/lib/rate-limiter`; exercise `checkAdminGate` with a real `NextRequest` and cover: valid admin, missing token, missing `iat`, revoked token, non-admin, and exhausted rate limit. Assert exact result discriminants/statuses and that rate limiting uses the supplied key.

- [ ] **Step 4: Write failing tests for fail-closed dependency outcomes and parallel reads**

Cover strict rate-limit storage failure, revocation query failure, and user lookup failure; all must result in `unavailable` (503). Use deferred promises for the two authorization reads and assert the gate starts both before either resolves. This test pins the latency optimization without caching.

- [ ] **Step 5: Run the tests and confirm expected failure**

Run: `pnpm test`

Expected: FAIL because `src/lib/admin/admin-gate.ts` and its exported contract do not exist yet; Vitest loads and resolves the test config successfully.

## Task 2: Implement the deep gate and strict dependency checks

**Files:**
- Create: `src/lib/admin/admin-gate.ts`
- Modify: `src/lib/admin/session-store.ts`
- Modify: `src/lib/rate-limiter.ts`
- Test: `src/lib/admin/admin-gate.test.ts`

**Interfaces:**
- Consumes: `checkRateLimitStrict(key, limit, windowMs)`, `isSessionValid(userId, tokenIat)` that throws on query error, `getSupabaseAdmin()`, and `getToken()`.
- Produces:

```ts
export type AdminGateFailure =
  | { kind: "unauthenticated"; status: 401; message: string }
  | { kind: "forbidden"; status: 403; message: string }
  | { kind: "rate_limited"; status: 429; message: string }
  | { kind: "unavailable"; status: 503; message: string };

export type AdminGateResult =
  | { ok: true; user: AdminUser }
  | { ok: false; failure: AdminGateFailure };

export async function checkAdminGate(
  request: NextRequest,
  options: { rateLimitKey?: string } = {},
): Promise<AdminGateResult>;
```

Omitting `rateLimitKey` means skip rate limiting, used only by server-rendered dashboard. The gate itself derives token decode and cookie fallback from `NEXTAUTH_URL` consistently with the existing middleware.

- [ ] **Step 1: Keep the existing rate limiter fail-open and add strict mode**

Refactor `checkRateLimit` to call a private shared implementation with a `failOpen` policy. Preserve `checkRateLimit(key, limit, windowMs)` as fail-open for existing callers. Add `checkRateLimitStrict(key, limit, windowMs)`: same allowed/remaining/retryAfter result on normal operation; rethrow storage errors so `admin-gate` can return 503. Do not change the upsert/read/update algorithm or unrelated call sites in this task.

- [ ] **Step 2: Make revocation lookup distinguish absence from database failure**

In `isSessionValid`, inspect the Supabase query error. Treat the expected no-row result (`PGRST116` from `.single()`) as no revocation record and return `true`; throw on any other query error. Keep timestamp comparison semantics unchanged. Do not accept a missing/invalid `iat`; the gate validates the claim before calling this function.

- [ ] **Step 3: Implement `checkAdminGate` with typed outcomes**

Implementation order:
1. If `rateLimitKey` exists, use `RATE_LIMIT.ADMIN` with `checkRateLimitStrict`; denied → `rate_limited`, thrown storage error → `unavailable`.
2. Decode JWT with `getToken` using secure-cookie selection from `NEXTAUTH_URL`; if absent, retry using alternate cookie name. No token/sub → `unauthenticated`.
3. Require `iat` to be a finite positive number; otherwise `unauthenticated`.
4. Start `isSessionValid(sub, iat)` and one `users.select("id, name, email, is_admin").eq("id", sub).single()` query in the same `Promise.all`.
5. Any query rejection/error → `unavailable`; revoked → `unauthenticated`; missing user → `unauthenticated`; `is_admin !== true` → `forbidden`; otherwise return `{ ok: true, user }`.

Do not include raw database error messages in the returned client-safe message. Log dependency failures once at the adapter layer, not in both module and caller.

- [ ] **Step 4: Run focused tests and verify pass**

Run: `pnpm test -- src/lib/admin/admin-gate.test.ts`

Expected: all policy, fail-closed, fallback-cookie, and parallel-read tests pass.

## Task 3: Preserve route adapters and map gate failures consistently

**Files:**
- Modify: `src/lib/admin/auth-middleware.ts`
- Modify: `src/app/api/auth/admin-check/route.ts`
- Modify: all API route files found by `rg -l 'requireAdmin\\(' src/app/api`
- Test: `src/lib/admin/admin-gate.test.ts`

**Interfaces:**
- Consumes: `checkAdminGate`, `AdminGateFailure`, and `AdminUser`.
- Produces: existing `requireAdmin(request): Promise<AdminUser>` import surface; `adminGateErrorResponse(error): NextResponse | null` shared catch mapper; `admin-check` success envelope unchanged.

- [ ] **Step 1: Delegate existing `requireAdmin` to the gate**

Replace its local rate/IP/JWT/revocation/DB implementation with `checkAdminGate(request, { rateLimitKey: "admin:<client-ip>" })`. Preserve the current client IP extraction rule. Return user on success; on failure throw a typed `AdminGateError` carrying the failure discriminant, status, and safe message. Keep the existing import path so the 25 API route call sites need no import churn.

- [ ] **Step 2: Add one catch mapper for gate errors**

In `auth-middleware.ts` (or a small adjacent adapter file if importing route helpers creates a cycle), add `adminGateErrorResponse(error)`. Map 401 to `unauthorizedResponse`, 403 to `forbiddenResponse`, 429 to `rateLimitedResponse`, 503 to a new `serviceUnavailableResponse` helper in `src/lib/api-response.ts`. Return `null` for non-gate errors so each route preserves its existing 500 behavior. Never echo raw Supabase error details.

- [ ] **Step 3: Convert `admin-check` route to a thin adapter**

Replace its duplicate IP parsing, rate-limit, token, revocation, and Supabase code with the gate called using `admin-check:<ip>`. On success return the exact existing `successResponse({ id, name, email, is_admin })`. On gate failure use `adminGateErrorResponse`; unexpected failures retain generic 500 response.

- [ ] **Step 4: Update every existing `requireAdmin` route catch**

For each route returned by `rg -l 'requireAdmin\\(' src/app/api`, update the outer catch to return `adminGateErrorResponse(err) ?? existingServerErrorResponse`. Update nested catches that currently turn gate failures into unconditional 403 (for example `src/app/api/users/route.ts`) to use the same mapper. Do not change business-query error responses or response data shapes.

- [ ] **Step 5: Verify all admin route adapters**

Run: `rg -l 'requireAdmin\\(' src/app/api | wc -l` and inspect each matching route for `adminGateErrorResponse` in its catch path.

Run: `pnpm test -- src/lib/admin/admin-gate.test.ts`

Expected: gate tests pass; all 25 route handlers preserve their route-specific success/failure payloads while reporting 401/403/429/503 for gate outcomes.

## Task 4: Use the gate in dashboard page and remove fictitious role flow

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/components/dashboard/DashboardClient.tsx`
- Modify: `src/components/dashboard/DashboardProvider.tsx`
- Delete: `src/lib/auth.ts`
- Retain: `src/lib/admin/auth-middleware.ts` as a compatibility adapter exposing `requireAdmin` and `adminGateErrorResponse`; do not delete the file.
- Delete: `src/components/dashboard/hooks/useDashboardAuth.ts`
- Delete: `src/components/dashboard/DashboardGuard.tsx` after confirming no importers

**Interfaces:**
- Consumes: `checkAdminGate(request)` without `rateLimitKey`, `is_admin` user result, and existing dashboard provider state.
- Produces: dashboard page redirects unauthenticated/revoked requests to `/login`, non-admin to `/`, dependency failure surfaces as `503`; `DashboardClient` requires no auth-role prop.

- [ ] **Step 1: Add page-adapter tests for redirects and unavailable responses**

Add a focused test for dashboard gate mapping, or factor a pure private mapping helper and test it. Pin: unauthenticated → `/login`; forbidden → `/`; unavailable → `503` response rather than redirecting a database outage to login/home; success renders the dashboard client. Ensure no rate-limit adapter is called for this page.

- [ ] **Step 2: Replace dashboard page's custom session + DB checks**

Call `checkAdminGate` with no rate-limit key. Replace `getServerSession()` and the second direct user query with result mapping. Do not use JWT role claims. Keep `/login` and `/` redirects for their established cases; return a generic service-unavailable response for 503 so infrastructure failure is not misreported as an account denial.

- [ ] **Step 3: Remove the role hierarchy from dashboard state**

Remove exported `Role`, `initialRole`, and `role` context value from `DashboardProvider`; remove `DashboardClient` role prop and simplify its provider use. Delete unused `DashboardGuard.tsx` after confirming no imports. Keep role translation JSON keys unless a real UI usage audit proves them unused; do not mix translation cleanup into the auth change.

- [ ] **Step 4: Remove dead helpers and hook**

Delete `src/lib/auth.ts` and `src/components/dashboard/hooks/useDashboardAuth.ts`. Verify `rg -n 'from "@/lib/auth"|useDashboardAuth|initialRole|roleMeetsMinimum|export type Role' src` has no live matches (comments may be updated or removed).

- [ ] **Step 5: Run auth tests and type-check**

Run: `pnpm test`

Run: `pnpm type-check`

Expected: tests pass; TypeScript reports no remaining dashboard role or custom-session references.

## Task 5: Verify package, routes, and full build

**Files:**
- Verify only: `package.json`, `pnpm-lock.yaml`, all changed `src/**` files.

- [ ] **Step 1: Run the security test suite**

Run: `pnpm test`

Expected: all gate and failure-mode tests pass.

- [ ] **Step 2: Run lint and type checks**

Run: `pnpm lint`

Run: `pnpm type-check`

Expected: no new ESLint or TypeScript errors.

- [ ] **Step 3: Run production build**

Run: `pnpm build`

Expected: Next.js production build completes. If environment configuration blocks build, report exact blocker; do not claim success.

- [ ] **Step 4: Review the final diff for security-policy drift**

Check `git diff --check`; verify no raw DB errors enter client responses, no unprotected admin route was added, no unrelated rate-limit behavior changed, and each required gate failure maps to its decided status.

## Plan Self-Review

- **Spec coverage:** shared gate, bool admin truth, cookie fallback consistency, strict failures, missing-iat rejection, parallel DB reads, no cache, caller rate-key preservation, API response mapping across admin routes, dashboard page adapter, removal of old helper/dead hook/role hierarchy, Vitest tests, type-check/lint/build all have explicit tasks.
- **Placeholder scan:** no TODO/TBD or generic “handle errors” task remains; exact statuses, helpers, call sites, commands, and assertions are named.
- **Type consistency:** `checkAdminGate` returns `AdminGateResult`; `requireAdmin` retains `Promise<AdminUser>`; adapter errors are discriminated and mapped by status; dashboard consumes result directly.
- **Review focus:** all five specified failure classes have tests in Tasks 1–2; page-specific status mapping is pinned in Task 4.
