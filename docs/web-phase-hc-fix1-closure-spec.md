# Phase `WEB-HC-FIX1` — Health Check & Observability Closure Specification

## Implementation Metadata

* **Assigned Implementer:** `Luna` (Primary Implementation Agent)
* **Team:** Heaven Technologies (`Heaven Technology Group Co., Ltd.`)
* **Project / Production Target:** `Calculatorai` (`https://calculatorai.click` on Netlify)
* **Baseline Commit:** `d2b754b` (`main`, single-commit baseline anchor; working tree clean)
* **Prior Health Audit Report:** `web-health-check-2026-11-25.md` (rev 2)
* **Implementation Spec:** `plan/web-phase-hc-fix1-closure-spec.md`
* **Required Implementation Report:** `reports/web-phase-hc-fix1-luna-report.md`
* **Next Pipeline Stage:** `plan/web-phase-hc-fix1-signoff-audit-spec.md` (Read-Only Sign-Off Audit)
* **Closure Scope:** Surgical resolution of findings `F-01` through `F-10` from `web-health-check-2026-11-25.md` (`2.1`..`2.10`): restoring `/api/status` truth, eliminating serverless self-HTTP anti-patterns, decoupling Discord heartbeat checks from web secrets, hardening `/api/status` against amplification, enforcing JSON `404` on `/api/*`, locking Netlify IaC, and driving ESLint errors from `$6$` down to literally `$0$`.

---

## Execution Mandate & Strict Scope Freeze Rules

1. **Capture Pre-Work Git Anchor FIRST:** Before modifying any file, record `git rev-parse HEAD` (must match `d2b754b`), `git status --porcelain -uall`, and `git worktree list`.
2. **Upstream & Cross-Boundary Freeze (`$0$`-Touch Mandate):**
   * Touch **`$0$` files** inside `discord-bot/` (bot runtime and Gateway logic are strictly out of scope for this phase).
   * Touch **`$0$` files** inside database migrations (`001_initial_schema` .. `009_verification_token_types`).
   * Touch **`$0$` lines** in `src/lib/auth-options.ts` (reserved exclusively for Phase `WEB-SONAR-FIX2` security triage so authentication invariants remain untouched during observability fixes).
3. **Security Invariant Preservation:** Do NOT weaken CSRF origin validation in `src/proxy.ts`, admin/session auth gates (`401` on `/api/stats`, `/api/users`, `/api/history`, `/api/settings`, `/api/finance/revenue`, `/api/analytics/traffic`, `/api/auth/admin-check`), Stripe webhook signature verification (`400` on missing signature), or existing CSP / HSTS / `X-Frame-Options` headers.
4. **Secret Hygiene:** Do NOT add `DISCORD_BOT_TOKEN` to web environment configs or `.env.example` for web, and do NOT commit any `.env*` file.
5. **Windows PowerShell Execution Rule:** Where PowerShell `ExecutionPolicy` blocks `.ps1` shims, invoke toolchain commands via `.cmd` binaries (`pnpm.cmd`, `.\node_modules\.bin\tsc.cmd`).
6. **Zero Lint-Suppression Rule:** Do NOT add `eslint-disable`, `@ts-ignore`, or `@ts-expect-error` anywhere in the diff to silence the `$6$` ESLint errors.
7. **Do NOT write to `MCP second-brain`** (reserved for Closeout after human approval and Sign-Off Audit `PASS`).

---

## Surgical Closure Checklist (`CLS-01` .. `CLS-07`)

### `CLS-01` — Baseline Git Hygiene & Stale Worktree Cleanup (`F-10`) (CRITICAL)

1. Inspect `git worktree list` and prune the `$5$` stale prunable worktrees (`audit-wt-aetox`, `audit-wt-G`, `audit-wt-H`, `audit-wt-I`, `audit-wt-J`) via `git worktree prune`.
2. Confirm post-prune `git worktree list` shows only the active main checkout and `git status --porcelain -uall` has `$0$` untracked/modified artifacts prior to code edits (excluding `plan/web-phase-hc-fix1-closure-spec.md` if placed locally).

### `CLS-02` — Closure of `F-01` (`checkNextjs` In-Process Health Truth & Env Alignment) (CRITICAL)

1. Inspect `src/app/api/status/route.ts` (around `L133`) and `src/app/api/health/route.ts`:
   * **Delete the self-HTTP anti-pattern:** Remove the outbound `fetch` from `checkNextjs` to `${base}/api/health` and remove the erroneous `process.env.NEXT_PUBLIC_URL` lookup.
   * **In-process check:** Extract or invoke shared in-process runtime health logic directly (verifying Node/Next runtime liveness and `process.uptime()`) and return `{ status: "ok", latencyMs }` without spawning a nested serverless HTTP invocation.
   * **URL env standardization:** If any helper or metadata field in `src/app/api/status/route.ts` still resolves the public base URL, standardize strictly to `process.env.NEXT_PUBLIC_APP_URL ?? process.env.URL ?? "http://localhost:3000"` to match the rest of `src/`.
2. Add/update unit tests in the status test suite asserting that `checks.nextjs.status === "ok"` when `NEXT_PUBLIC_URL` is `undefined` and no network `fetch` is issued for `nextjs`.

### `CLS-03` — Closure of `F-02` & `F-03` (`checkDiscord` Heartbeat-Only Separation & Aggregate Status Truth) (CRITICAL)

1. Inspect `src/app/api/status/route.ts` (`L156`..`L183`):
   * **Delete the web-token gate:** Completely remove `if (!process.env.DISCORD_BOT_TOKEN) { return { status: "error", message: "Bot token not configured" }; }` and any direct Discord REST API probe from the web route.
   * **Heartbeat-only evaluation:** Query `bot_heartbeats` (`006_bot_heartbeats.sql`) directly for `last_seen` and evaluate against the existing `$2\text{h}$` ($7{,}200{,}000\text{ ms}$) threshold:
     * Fresh row (`age <= 2h`) $\rightarrow$ `status: "ok"` with query `latencyMs`.
     * Stale row (`age > 2h`) $\rightarrow$ `status: "error"` (or `"degraded"` per existing schema contract) with concise stale-heartbeat message (no sensitive internal identifiers leaked).
     * Empty table (`$0$` rows) $\rightarrow$ `status: "error"` with `"No bot heartbeat recorded"`.
2. Verify aggregate top-level `status` computation in `src/app/api/status/route.ts`: confirm that when `supabase`, `stripe`, `smtp`, `nextjs`, and `discord` are `"ok"`, top-level `status` is `"ok"` (eliminating the false `"degraded"` state and synthetic incident inflation reported in `2.3`).
3. Write unit tests exercising all `$3$` `bot_heartbeats` states (fresh $\le 2\text{h}$, stale $> 2\text{h}$, and empty `$0$` rows) with `process.env.DISCORD_BOT_TOKEN` unset.

### `CLS-04` — Closure of `F-05` (`/api/status` Short-Lived Cache & Amplification Rate Limit) (HIGH)

1. Inspect `src/app/api/status/route.ts` and existing rate-limit utilities in `src/`:
   * **Server-side TTL Cache ($30\text{--}60\text{s}$):** Cache the resolved status payload in module memory (for warm serverless reuse) and/or reuse the latest `health_history` snapshot if its timestamp is younger than the TTL, preventing repeated $\sim 1.4\text{s}$ fan-out probes to Supabase, Stripe, and SMTP on concurrent or burst requests (note: `src/proxy.ts` sets `Cache-Control: no-store`, so server-side caching is mandatory).
   * **Per-IP Rate Limiting:** Wrap `GET /api/status` with IP-based rate limiting (e.g., max `$20\text{--}30$` requests per `$60\text{s}$` window per client IP extracted safely from Netlify/proxy headers). Excess requests must short-circuit **before** running any health checks and return HTTP `429` JSON (`{ "error": "Too many requests" }`) with `Retry-After`.
2. Add unit tests verifying:
   * Back-to-back `GET /api/status` calls within the TTL execute upstream Supabase/Stripe/SMTP probes **only `$1$` time**.
   * Exceeding the per-IP burst threshold returns HTTP `429` JSON with `$0$` additional upstream probes triggered.

### `CLS-05` — Closure of `F-04` (Catch-All `/api/*` JSON `404` Contract & Route Precedence Safety) (MEDIUM)

1. Create `src/app/api/[...path]/route.ts`:
   * Export handlers for `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`, and `HEAD`.
   * Return HTTP `404` with `NextResponse.json({ error: "Not found" }, { status: 404 })` (`HEAD` may return status `404` with empty body or standard Next JSON response handling) so API clients calling `res.json()` never receive the `9351`-byte App Router HTML page.
2. **Side-effect & route-precedence check:**
   * Verify Next.js App Router specificity rules hold: existing concrete and dynamic API routes (`/api/health`, `/api/status`, `/api/users/[id]`, `/api/history/[id]`, `/api/auth/[...nextauth]`) must take precedence over `/api/[...path]`.
   * Confirm `POST` to an unknown or non-POST API path from `Origin: https://evil.example` is still intercepted first by `src/proxy.ts` CSRF validation (`403 {"error":"CSRF validation failed"}`).
3. Add unit tests for `/api/[...path]/route.ts` asserting `404` + `application/json` across `GET` and `POST`.

### `CLS-06` — Closure of `F-06` & `F-07` (`poweredByHeader: false` & Reproducible Netlify IaC) (LOW)

1. Inspect `next.config.ts`:
   * Set `poweredByHeader: false` so `X-Powered-By: Next.js` is suppressed on all responses.
   * Confirm existing security headers in `next.config.ts` and `src/proxy.ts` remain intact (`$0$` removed directives).
2. Add reproducible Infrastructure-as-Code files at repository root:
   * `.nvmrc`: pin Node major `24` (matching audit baseline `v24.21.0`).
   * `package.json`: add `"engines": { "node": ">=24.0.0 <25.0.0", "pnpm": ">=11.0.0" }`.
   * `netlify.toml`: codify `[build]` (`command = "pnpm build"`) and `[build.environment]` (`NODE_VERSION = "24"`) compatible with Netlify's Next.js 16 runtime adapter (`2.7` & `2.8` Durable cache behavior).

### `CLS-07` — Closure of `F-09` (Literal `$0$` ESLint Errors Across All `$6$` Files) (LOW)

1. Refactor all `$6$` `react-hooks/set-state-in-effect` violations without `eslint-disable`:
   * `StatusClient.tsx:76`
   * `UserDetailModal.tsx:73`
   * `InvoiceTable.tsx:37`
   * `RefundTable.tsx:34`
   * `InfoModal.tsx:29`
   * `LanguageContext.tsx:32`
2. Apply idiomatic React 19 / Next.js 16 patterns (derived state during render, parent `key` reset on modal target/filter change, or `useSyncExternalStore` / SSR-safe state initialization for `LanguageContext.tsx` without hydration mismatch).
3. Inspect `Log.txt` (if present in repo as noted in `2.9`): if a lint-error ceiling counter is recorded there, update its ceiling to `$0$`.
4. Confirm `pnpm.cmd lint` exits `$0$` with literally **`$0$` errors**.

---

## Verification Requirements

* Every item in the implementation report must cite exact `file:line` spans and verbatim local command exit statuses.
* Run and record all `$5$` mandatory local verification gates:
  1. `pnpm.cmd type-check` $\rightarrow$ exit `$0$` (`$0$` TypeScript errors)
  2. `pnpm.cmd lint` $\rightarrow$ exit `$0$` (`$0$` errors; regex scan across diff for `eslint-disable|@ts-ignore|@ts-expect-error` must equal **`$0$`**)
  3. `pnpm.cmd test` $\rightarrow$ exit `$0$` (all `$87$` baseline tests + newly added tests passing, `$0$` skipped regressions)
  4. `pnpm.cmd build` $\rightarrow$ exit `$0$` (clean production build including `/api/[...path]` and all prerendered routes)
  5. `cd discord-bot; .\node_modules\.bin\tsc.cmd --noEmit` $\rightarrow$ exit `$0$` (`$0$` errors)
* Run boundary-freeze checks:
  * `git diff --name-only d2b754b..HEAD -- discord-bot/ src/lib/auth-options.ts` must output **`$0$` files**.

---

## Closure Verdict & Required Report Structure

* **`READY FOR SIGN-OFF AUDIT`**: All `CLS-01`..`CLS-07` invariants hold, all `$5$` local build/test/lint gates exit `$0$`, and `$0$` frozen files were touched.
* **`PARTIAL / BLOCKED`**: Any gate fails, any frozen file was modified, or an unresolvable schema mismatch is discovered (must stop and document exact `file:line` blocker).

Write the concise implementation report to `reports/web-phase-hc-fix1-luna-report.md` with sections:
1. Implementation Metadata & Git Anchor (`d2b754b` $\rightarrow$ Target `HEAD` SHA, worktree prune result)
2. Executive Closure Verdict (`READY FOR SIGN-OFF AUDIT` / `BLOCKED`)
3. `CLS-01`..`CLS-07` Surgical Resolution Matrix (`file:line` changes & side-effect checks)
4. Verification Gate Results & Exact New Test Function Names (character-for-character)
5. Post-Deploy Production Smoke Verification Plan (including live `bot_heartbeats` truth check on Netlify)
