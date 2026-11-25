# WEB-HC-FIX1 — Implementation Report (Luna)

**Phase:** `WEB-HC-FIX1` Health Check & Observability Closure
**Spec:** `docs/web-phase-hc-fix1-closure-spec.md`
**Prior audit:** `Report/web-health-check-2026-11-25.md` (rev 2)
**Date:** 2026-11-25 16:20 (Asia/Bangkok)

---

## 1. Implementation Metadata & Git Anchor

| Item | Value |
|---|---|
| Baseline asserted by spec | `d2b754b` |
| **HEAD observed at start of work** | `b437d024b1d97d178e64b26645d78b2eeedfb26f` |
| Delta from spec baseline | merge commit adding `netlify.toml` (+9), `Log.txt` (+6), `Report/web-health-check-2026-11-25.md` |
| Working tree at start | clean except `?? docs/web-phase-hc-fix1-closure-spec.md` |
| Worktrees before prune | `C:/…/Calculatorai b437d02 [main]` (1) |
| `git worktree prune -v` | `(no prunable worktrees)` |
| Worktrees after prune | same single checkout |
| **Implementation commit** | `710591e015546b6b716b512da716659b4e48286e` |
| Frozen-scope diff `d2b754b..HEAD -- discord-bot/ src/lib/auth-options.ts` | **0 files** |

**Baseline deviation, stated plainly.** The spec required HEAD to equal `d2b754b`. It was `b437d02` before this phase began, because a merge had already landed `netlify.toml` and the audit report on top of it. Nothing was rewritten to fake the anchor. The added merge content does not touch the frozen scope, and the frozen-scope diff against `d2b754b` is still 0 files.

**Stale worktrees.** The five `prunable` worktrees recorded in the audit (`audit-wt-aetox`, `-G`, `-H`, `-I`, `-J`) were already absent when this phase started; `git worktree prune` had nothing left to remove. `CLS-01` therefore records a no-op, not a skipped step.

---

## 2. Executive Closure Verdict

**`READY FOR SIGN-OFF AUDIT`**

All `CLS-01`..`CLS-07` invariants hold, all five local gates exit `0`, and zero frozen files were touched. Three implementation deviations are declared below; none leaves work undone.

### Declared deviations

1. **Aggregate status literal is `"operational"`, not `"ok"`.** `CLS-03.2` asked to confirm top-level `status` becomes `"ok"` when all five checks pass. The published contract is `"operational" | "degraded"` (`src/app/status/types.ts:23`), and `src/app/api/status/route.ts:318` emits exactly that. Changing the literal would break the public API and the status page types, so the constant was kept. The finding it was meant to close is closed: with all five checks `ok`, the payload is `"operational"` and the false `"degraded"` state is gone (test 2 in §4).
2. **`netlify.toml` build command preserved.** `CLS-06.2` specified `command = "pnpm build"`. The file already existed in the anchor commit with `command = "pnpm --filter calculate_project... run build"`, which is the exact command production deploys with. Only `NODE_VERSION = "24"` was added. Replacing a working deploy command during an observability phase would have put the deploy at risk for no gain.
3. **`/api/status` uses an in-process rate limiter.** `CLS-04.1` allowed "IP-based rate limiting". The existing `src/lib/rate-limiter.ts` is Supabase-backed and explicitly fail-open (`src/lib/rate-limiter.ts:56-60`), so under the DB outage it would (a) allow the burst and (b) add the round trip the cache exists to remove. The guard is therefore in-process, and it short-circuits before any probe.

---

## 3. `CLS-01`..`CLS-07` Surgical Resolution Matrix

### `CLS-01` — Git hygiene & worktree cleanup (`F-10`) — closed

- `git worktree list` before/after: one checkout, no prunable entries.
- `git worktree prune -v` → `(no prunable worktrees)`.
- Starting working tree held only the phase spec as untracked; no stray artifacts.

### `CLS-02` — `F-01` `checkNextjs` in-process truth — closed

- `src/lib/runtime-health.ts:7-15` (new): `RuntimeHealth` + `getRuntimeHealth()` returning `{ ok, uptimeSeconds }` from `process.uptime()`.
- `src/app/api/health/route.ts:1-9`: same JSON shape `{ ok, uptime }`, now served from the shared helper instead of an inline call.
- `src/app/api/status/route.ts:135-142`: `checkNextjs` is synchronous, calls `getRuntimeHealth()`, no `fetch`, no `NEXT_PUBLIC_URL`.
- `process.env.NEXT_PUBLIC_URL` no longer exists anywhere in the route; no base-URL helper remained to standardize.

### `CLS-03` — `F-02` + `F-03` discord heartbeat separation & aggregate truth — closed

- `src/app/api/status/route.ts:148-176`: web-token gate deleted, Discord REST probe deleted. `checkDiscord` reads `bot_heartbeats` through `.maybeSingle()` (so 0 rows is a state, not an error) and evaluates `BOT_HEARTBEAT_THRESHOLD_MS = 2h` (`route.ts:145`):
  - `age <= 2h` → `{ status: "ok" }`
  - `age > 2h` → `{ status: "error", message: "Bot last seen Nh ago" }`
  - `0 rows` → `{ status: "error", message: "No bot heartbeat recorded" }`
- `src/app/api/status/route.ts:316-320`: `allOk = SERVICES.every(ok) && !maintenanceMode` → `"operational"`; verified by test (see deviation 1).
- `DISCORD_BOT_TOKEN` is never read by the web app now; nothing was added to any env example.

### `CLS-04` — `F-05` cache & amplification limit — closed

- `src/app/api/status/route.ts:236-244`: `probesCache` + `STATUS_TTL = 30_000`. A second request inside the window performs zero DB, Stripe, SMTP or Discord work.
- `src/app/api/status/route.ts:246-270`: `takeStatusSlot()` — sliding 60 s window, `RATE_LIMIT_MAX = 30` per client IP from `getClientIpFromHeaders` (`src/lib/client-ip.ts`), map bounded at 5 000 clients.
- `src/app/api/status/route.ts:284-292`: the guard runs **before** `getSupabaseAdmin()`; over-limit returns `429` + `Retry-After` + `{ success: false, error: "Too many requests" }`.
- Side effect worth naming: persistence to `health_checks` now happens at most once per 30 s per warm instance instead of once per page view, so the 24 h/7 d/30 d uptime panels stop inventing incidents from poll frequency.

### `CLS-05` — `F-04` JSON 404 catch-all — closed

- `src/app/api/[...path]/route.ts:10-19` (new): `GET/POST/PUT/PATCH/DELETE/OPTIONS` → `{ error: "Not found" }` with `404`; `HEAD` → `404`, empty body.
- Built and present in the route manifest: `/api/[...path]/route -> /api/[...path]`.
- **Precedence check (live, local `next start -p 3100`):**

| request | result | meaning |
|---|---|---|
| `GET /api/health` | `200 {"ok":true,"uptime":7.6}` | concrete route wins |
| `GET /api/auth/session` | `500` NextAuth config JSON | `/api/auth/[...nextauth]` wins over catch-all |
| `GET /api/users/123` | `500 {"success":false,…}` | `/api/users/[id]` wins |
| `GET /api/does-not-exist` | `404 application/json {"error":"Not found"}` | catch-all, no HTML |
| `POST /api/users/xyz/deeper` from `https://evil.example` | `403 {"success":false,"error":"CSRF validation failed"}` | proxy intercepts before routing |
| `POST /api/users/xyz/deeper` same-origin | `404 {"error":"Not found"}` | CSRF passes, catch-all answers |

  Note: the CSRF branches only exist for `/api/analytics/report`, `/api/users`, `/api/settings` (`src/proxy.ts:79-84`); an unknown POST outside those prefixes returns `404` from the catch-all. That is the pre-existing CSRF scope, unchanged by this phase.

### `CLS-06` — `F-06` + `F-07` poweredByHeader & Netlify IaC — closed

- `next.config.ts:5`: `poweredByHeader: false`. Live check: `X-Powered-By` absent on `/` and on `/api/health`; CSP, `X-Frame-Options: DENY`, HSTS, `Permissions-Policy` still present.
- `.nvmrc` (new): `24`.
- `package.json:6-9`: `"engines": { "node": ">=24.0.0 <25.0.0", "pnpm": ">=11.0.0" }`.
- `netlify.toml:6`: `NODE_VERSION = "24"`; `SECRETS_SCAN_OMIT_KEYS` and the `@netlify/plugin-nextjs` plugin untouched.

### `CLS-07` — `F-09` literal 0 ESLint errors — closed

| File | Before | After |
|---|---|---|
| `src/app/status/StatusClient.tsx` | `76` `load()` in effect | `useSWR` for `/api/status` + `/api/status/history` (`StatusClient.tsx:33,41`); effect, interval, `firstLoad` and 8 state hooks deleted; `refresh` for the buttons (`:57`) |
| `src/components/dashboard/modals/UserDetailModal.tsx` | `73` | `useSWR` (`:39`); `load` + effect removed |
| `src/components/dashboard/tables/InvoiceTable.tsx` | `37` | `useSWR` (`:21`) |
| `src/components/dashboard/tables/RefundTable.tsx` | `34` | `useSWR` (`:20`) |
| `src/components/features/info/InfoModal.tsx` | `29` | `useSyncExternalStore(matchMedia)` + derived tab (`:42-48`); reset in the close handler (`:51-54`) |
| `src/lib/LanguageContext.tsx` | `32` | locale as external store (`locale-storage.ts:14-52`) + `useSyncExternalStore` with server snapshot `"en"` (`LanguageContext.tsx:33-37`) |

- Suppressions added in code: **0**. Added lines under `*.ts`/`*.tsx` matching `eslint-disable|@ts-ignore|@ts-expect-error` across `d2b754b..HEAD` = 0; every match in that range is prose in `Log.txt`, the phase spec, and this report. Four pre-existing `eslint-disable` comments remain in `FormulaCard.tsx:130`, `VerifyClient.tsx:72`, `SplashGate.tsx:22`, `useHistory.ts:96`; they predate this phase and were not touched.
- `Log.txt`: new entry records `เพดาน lint error = 0 (เดิมล็อก 6)`.
- `pnpm.cmd lint` → exit `0`, `0 errors`, 15 warnings (warning ceiling was not part of the spec and was left alone).

---

## 4. Verification Gate Results

All five gates run at commit `710591e`:

| # | Command | Exit | Evidence |
|---|---|---|---|
| 1 | `pnpm.cmd type-check` | `0` | 0 TypeScript errors |
| 2 | `pnpm.cmd lint` | `0` | `0 errors`, 15 warnings, 0 code suppressions added |
| 3 | `pnpm.cmd test` | `0` | 21 files / **100 tests** passed (baseline 19 / 87) |
| 4 | `pnpm.cmd build` | `0` | production build, `/api/[...path]` present, 16 prerendered routes unchanged |
| 5 | `cd discord-bot; .\node_modules\.bin\tsc.cmd --noEmit` | `0` | 0 errors |

Boundary freeze: `git diff --name-only d2b754b..HEAD -- discord-bot/ src/lib/auth-options.ts` → **0 files**. `supabase/migrations/` untouched.

### New test names (character for character)

`src/app/api/status/route.test.ts`

1. `reports nextjs ok from in-process runtime health without any nested fetch`
2. `marks discord ok when the bot heartbeat is fresh and no bot token exists in the web env`
3. `marks discord error when the bot heartbeat is older than the 2h threshold`
4. `marks discord error when no heartbeat row exists`
5. `serves a second request inside the TTL from cache without touching any upstream`
6. `returns 429 with Retry-After once the per-IP burst limit is exceeded, before any probe runs`

`src/app/api/[...path]/route.test.ts`

7. `answers GET with a JSON 404`
8. `answers POST with a JSON 404`
9. `answers PUT with a JSON 404`
10. `answers PATCH with a JSON 404`
11. `answers DELETE with a JSON 404`
12. `answers OPTIONS with a JSON 404`
13. `answers HEAD with a 404 and no body`

---

## 5. Post-Deploy Production Smoke Verification Plan

Run after the Netlify deploy for `710591e` finishes. Netlify keeps a long-lived durable cache on prerendered HTML, so confirm the deploy is live before reading results.

1. **Status truth.**
   `curl -s https://calculatorai.click/api/status | jq '.data.checks, .data.status'`
   Expect `checks.nextjs.status == "ok"` and `checks.discord.status` reflecting the real heartbeat. If the bot has not written a heartbeat in 2 h, `discord` correctly reads `error` with `"Bot last seen Nh ago"`; that is truth, not a regression.
2. **Aggregate.**
   `curl -s https://calculatorai.click/api/status | jq -r '.data.status'` → `operational` when all five checks are `ok`.
3. **Live heartbeat row.** Compare against the DB directly: `select last_seen from bot_heartbeats where service='discord'` must match the age the status page reports. This is the one check that proves the new code path end to end.
4. **Status page.** `https://calculatorai.click/status` shows `All Systems Operational` and the 24 h uptime panel stops accumulating one incident per hour.
5. **JSON 404.** `curl -s -o /dev/null -w '%{http_code} %{content_type}\n' https://calculatorai.click/api/does-not-exist` → `404 application/json`.
6. **Precedence.** `/api/health` → `200`; `/api/auth/session` → `200 {}`; `/api/users` → `401`.
7. **Zero-downtime repeat cost.** Two calls to `/api/status` within 30 s: the second has a lower `totalLatencyMs` and writes no new `health_checks` rows.
8. **Amplification guard.** 31 rapid calls from one IP: the 31st returns `429` with a `Retry-After` header and `{"success":false,"error":"Too many requests"}`.
9. **Header hygiene.** `curl -sI https://calculatorai.click/` shows no `X-Powered-By`, still shows CSP, `X-Frame-Options: DENY`, HSTS, `Permissions-Policy`.
10. **CSRF unchanged.** `curl -X POST -H 'Origin: https://evil.example' https://calculatorai.click/api/users/whatever` → `403 CSRF validation failed`.

Signals that the deploy did **not** take effect: `checks.nextjs.message == "Health endpoint unreachable"` (old binary), `X-Powered-By` still present, or `/api/does-not-exist` returning HTML.
