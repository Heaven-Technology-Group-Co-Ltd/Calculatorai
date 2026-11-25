# Phase `WEB-HC-FIX1` — Final Sign-Off Verification Specification

## Audit Metadata

* **Assigned Auditor:** `DeepSeek` (Read-Only Sign-Off Auditor)
* **Team:** Heaven Technologies (`Heaven Technology Group Co., Ltd.`)
* **Target Commit:** `710591e015546b6b716b512da716659b4e48286e` (current `HEAD` on `main` / PR branch)
* **Pre-Phase Merge Anchor:** `b437d024b1d97d178e64b26645d78b2eeedfb26f` (Original Health Audit anchor: `d2b754b`)
* **Implementation Spec:** `docs/web-phase-hc-fix1-closure-spec.md`
* **Implementation Report:** `reports/web-phase-hc-fix1-luna-report.md`
* **PR Summary Artifact:** `web-phase-hc-fix1-pr-body.md` (if present locally)
* **Prior Health Audit Report:** `Report/web-health-check-2026-11-25.md` (rev 2)
* **Audit Scope:** Surgical read-only verification of `git diff b437d024b1d97d178e64b26645d78b2eeedfb26f..710591e015546b6b716b512da716659b4e48286e` (and full boundary-freeze check across `d2b754b..710591e015546b6b716b512da716659b4e48286e`) closing `F-01` through `F-10` and auditing Luna's `$3$` declared deviations.

---

## Read-Only Mandate (Strict Zero-Mutation Rules)

1. **Do NOT modify, stage, format, or commit any source, test, config, migration, or `Log.txt` file.**
2. **Do NOT run commands that mutate `.next/`, `node_modules/`, `dist/`, lockfiles, or Git worktrees** (no `pnpm install`, `pnpm build`, `pnpm test`, `pnpm lint --fix`, `next start`, or `git worktree prune`).
3. **Permitted read-only commands:** `git rev-parse`, `git status --porcelain -uall`, `git log`, `git show`, `git diff`, `git worktree list`, and PowerShell `Select-String` / `Get-Content` / SHA-256 file reads.
4. **Do NOT probe live production (`https://calculatorai.click`) with burst or rate-limit traffic** during static code sign-off (production smoke tests are reserved for post-merge deployment verification).
5. **Capture Git anchor BEFORE writing your report:** Record `git rev-parse HEAD` and `git status --porcelain -uall` at the very start of the audit. Only `docs/web-phase-hc-fix1-signoff-audit-spec.md` (and `docs/web-phase-hc-fix1-closure-spec.md` if still untracked) may appear untracked. Write only `reports/web-phase-hc-fix1-signoff-report.md` at the end and leave it untracked.
6. **Do NOT write to `MCP second-brain`** (reserved for Closeout after human approval).

---

## Surgical Sign-Off Checklist (`SIG-01` .. `SIG-08`)

### `SIG-01` — Clean Git State, `b437d02` Anchor Audit & Cross-Boundary Freeze (CRITICAL)

1. Confirm `HEAD` equals `710591e015546b6b716b512da716659b4e48286e`, `git worktree list` shows `$1$` active checkout with `$0$` prunable entries, and `git status --porcelain -uall` has `$0$` modified files.
2. **Audit the pre-phase anchor delta (`d2b754b..b437d024b1d97d178e64b26645d78b2eeedfb26f`):** Verify Luna's baseline statement by inspecting `git diff --stat d2b754b..b437d024b1d97d178e64b26645d78b2eeedfb26f` and confirming it touched **only** `netlify.toml`, `Log.txt`, and `Report/web-health-check-2026-11-25.md` with `$0$` hidden application changes.
3. **Cross-boundary freeze verification:** Confirm `git diff --name-only d2b754b..710591e015546b6b716b512da716659b4e48286e -- discord-bot/ src/lib/auth-options.ts supabase/migrations/` touches **`$0$` files**.
4. Confirm `$0$` `.env*` files are tracked and `Select-String -Pattern "DISCORD_BOT_TOKEN" -Path src/*` returns **`$0$` matches**.

### `SIG-02` — Closure of `F-01` (`getRuntimeHealth` In-Process Truth & Zero Self-HTTP Fetch) (CRITICAL)

1. Inspect `src/lib/runtime-health.ts` (`L7`..`L15`), `src/app/api/health/route.ts` (`L1`..`L9`), and `src/app/api/status/route.ts` (`L135`..`L142`):
   * Confirm `checkNextjs` invokes `getRuntimeHealth()` synchronously in-process with **`$0$` outbound `fetch()` calls**.
   * Confirm `process.env.NEXT_PUBLIC_URL` does not appear anywhere in `src/` (`$0$` matches).
   * Confirm `/api/health/route.ts` preserves the exact response contract `{ ok: true, uptime: <number> }` (`200` JSON).

### `SIG-03` — Closure of `F-02` & `F-03` (`checkDiscord` `.maybeSingle()` Safety, `NaN` Edge Case & Deviation 1) (CRITICAL)

1. Inspect `src/app/api/status/route.ts` (`L145`..`L176`, `L316`..`L320`), `src/app/status/types.ts` (`L23`), and `supabase/migrations/006_bot_heartbeats.sql`:
   * Confirm the web `DISCORD_BOT_TOKEN` check and any Discord REST API fetch are **completely deleted**.
   * **`.maybeSingle()` cardinality & DB-error guard check:** Verify how `checkDiscord` queries `bot_heartbeats` before calling `.maybeSingle()`. Confirm whether the query filters by a unique key (e.g., `.eq("service", "discord")` or primary key in `006_bot_heartbeats.sql`) or applies `.order("last_seen", { ascending: false }).limit(1)` so multiple rows in `bot_heartbeats` cannot trigger a PostgREST `PGRST116` multi-row error, and confirm Supabase query errors (`error !== null`) return `status: "error"` cleanly.
   * **Timestamp parsing (`NaN`) edge-case check:** Verify what happens if `last_seen` is `null` or malformed (`Number.isNaN(parsedMs)`). Confirm `NaN` cannot slip past `age > BOT_HEARTBEAT_THRESHOLD_MS` to return `status: "ok"` or render `"Bot last seen NaNh ago"`.
   * **Audit Declared Deviation 1 (`"operational"` literal):** Verify `src/app/status/types.ts:23` defines `"operational" | "degraded"` and confirm `route.ts:316-320` computes `"operational"` when all `$5$` `SERVICES` checks are `"ok"` and `!maintenanceMode`.

### `SIG-04` — Closure of `F-05` (`takeStatusSlot` `$5{,}000$`-Client Bound, IP Header Trust & `probesCache` Behavior) (HIGH)

1. Inspect `src/app/api/status/route.ts` (`L236`..`L292`), `src/lib/client-ip.ts`, and `src/app/api/status/route.test.ts`:
   * Confirm `takeStatusSlot()` executes **before** `getSupabaseAdmin()` and before any upstream probe, returning HTTP `429` JSON with a valid `Retry-After` header once `RATE_LIMIT_MAX = 30` within `60s` is exceeded.
   * **Bounded-map eviction & DoS edge-case check (`$5{,}000$` clients):** Inspect what `takeStatusSlot()` does when the client map reaches `$5{,}000$` entries:
     * Verify an attacker spoofing or rotating IPs cannot trigger a blanket `map.clear()` that resets active rate limits, AND verify `$5{,}000$` historical visitors do not permanently lock out new legitimate IPs without sweeping expired `$60\text{s}$` windows or evicting the oldest key.
     * Inspect `src/lib/client-ip.ts` (`getClientIpFromHeaders`) and record which header takes priority on Netlify (whether spoofable `x-forwarded-for` first-hop can bypass per-IP limiting).
   * **Cache stampede & `health_checks` write-rate check:** Inspect `probesCache` (`STATUS_TTL = 30_000`):
     * Verify a warm cache hit performs `$0$` Supabase/Stripe/SMTP queries and `$0$` `health_checks` inserts.
     * Check whether concurrent cold requests coalesce onto an in-flight `Promise` or run parallel probes until the first resolves, and check whether transient full-outage failures are cached or retried (classify accurately as defect vs non-blocking observation).
   * Inspect `src/app/api/status/route.test.ts` and confirm all `$6$` scenarios genuinely assert behavior (not tautological mocks) and reset module-level cache/rate-limit state cleanly between tests.

### `SIG-05` — Closure of `F-04` (`/api/[...path]` JSON `404` Contract & `src/proxy.ts` Invariant Check) (MEDIUM)

1. Inspect `src/app/api/[...path]/route.ts` (`L1`..`L19`), `src/app/api/[...path]/route.test.ts`, and `src/proxy.ts`:
   * Confirm `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, and `OPTIONS` return HTTP `404` with `application/json` body `{ "error": "Not found" }`, and `HEAD` returns HTTP `404` with empty body.
   * Confirm `git diff d2b754b..710591e015546b6b716b512da716659b4e48286e -- src/proxy.ts` did not weaken any CSRF origin gate, admin/auth gate, or security header.

### `SIG-06` — Closure of `F-06` & `F-07` (`poweredByHeader: false`, Security Headers & Deviation 2 `netlify.toml`) (LOW)

1. Inspect `next.config.ts`, `.nvmrc`, `package.json`, and `netlify.toml`:
   * Confirm `poweredByHeader: false` is configured at top level of `nextConfig` in `next.config.ts` and `$0$` existing CSP / HSTS / `X-Frame-Options` / `Referrer-Policy` headers were removed.
   * Confirm `.nvmrc` pins `24` and `package.json` specifies `"engines": { "node": ">=24.0.0 <25.0.0", "pnpm": ">=11.0.0" }`.
   * **Audit Declared Deviation 2:** Confirm `netlify.toml` adds `NODE_VERSION = "24"` while preserving the working production workspace command (`pnpm --filter calculate_project... run build`), `SECRETS_SCAN_OMIT_KEYS`, and `@netlify/plugin-nextjs`.

### `SIG-07` — Closure of `F-09` (Zero Suppressions & SWR / `useSyncExternalStore` Runtime Safety) (HIGH)

1. **Literal zero-suppression check:** Run a live regex check across added lines in `git diff b437d024b1d97d178e64b26645d78b2eeedfb26f..710591e015546b6b716b512da716659b4e48286e -- "*.ts" "*.tsx"` for `eslint-disable|@ts-ignore|@ts-expect-error` and verify the added count in source/test code is **literally `$0$`**. Confirm the `$4$` pre-existing `eslint-disable` lines (`FormulaCard.tsx:130`, `VerifyClient.tsx:72`, `SplashGate.tsx:22`, `useHistory.ts:96`) truly predate this phase.
2. **Side-effect & runtime regression audit across all `$6$` refactored components + `locale-storage.ts`:**
   * **`src/app/status/StatusClient.tsx` (`L33`, `L41`, `L57`):** Inspect how `useSWR` fetches `/api/status` and `/api/status/history`. Specifically verify what happens when `/api/status` returns HTTP `429` (`{ success: false, error: "Too many requests" }`) or HTTP `500` — confirm the fetcher checks `!res.ok` / `!json.success` and throws or surfaces error state safely rather than passing an error object as `StatusData` and crashing render on `data.checks`.
   * **`src/components/dashboard/modals/UserDetailModal.tsx` (`L39`), `InvoiceTable.tsx` (`L21`), `RefundTable.tsx` (`L20`):**
     * Confirm `UserDetailModal` passes a `null` SWR key when closed or when no user is selected (preventing spurious `/api/users/undefined` requests).
     * Confirm pagination, search, status filter, or mutation callbacks (`mutate()`) in `InvoiceTable`, `RefundTable`, and `UserDetailModal` are wired into the SWR key and action handlers so table updates and page changes still refetch immediately.
   * **`src/components/features/info/InfoModal.tsx` (`L42`..`L54`):** Confirm `useSyncExternalStore` supplies all `$3$` arguments (`subscribe`, `getSnapshot`, and deterministic SSR `getServerSnapshot`) so Next.js SSR/hydration never throws `Missing getServerSnapshot`, and verify manual tab selection is not overwritten on unrelated re-renders.
   * **`src/lib/LanguageContext.tsx` (`L33`..`L37`) & `src/lib/locale-storage.ts` (`L14`..`L52`):** Confirm `getServerSnapshot` returns `"en"`, `localStorage` access is guarded against SSR/`SecurityError`, and calling `setLanguage`/`setLocale` notifies in-tab subscribers synchronously while preserving cross-tab `storage` updates.
3. Confirm `Log.txt` updates the lint error ceiling to `$0$`.

### `SIG-08` — Literal Report Accuracy (`13` Test Names & Cited `file:line` Spans) (LOW)

1. Verify every single one of the `$13$` test names quoted in `reports/web-phase-hc-fix1-luna-report.md` (§4) exists **character-for-character** in `src/app/api/status/route.test.ts` (`1`..`6`) and `src/app/api/[...path]/route.test.ts` (`7`..`13`).
2. Verify cited `file:line` spans in `reports/web-phase-hc-fix1-luna-report.md` (§3) match actual line numbers at commit `710591e015546b6b716b512da716659b4e48286e`.

---

## Verification Requirements

* Findings must include verifiable `file:line` spans or verbatim read-only command outputs.
* No speculative findings — read the actual implementation and test bodies in full.
* Distinguish confirmed blocking defects (`CRITICAL` / `HIGH` / `MEDIUM`) from non-blocking `LOW` polish observations.
* Explicitly record build/lint/test commands (`pnpm type-check`, `pnpm lint`, `pnpm test`, `pnpm build`, `discord-bot` `tsc`) that were not re-executed under the strict read-only zero-mutation mandate.

---

## Audit Verdict

* **`PASS`**: All `SIG-01`..`SIG-08` checks hold with `$0$` blocking (`CRITICAL` / `HIGH` / `MEDIUM`) findings. Phase `WEB-HC-FIX1` (`710591e`) is approved to merge and deploy to Netlify.
* **`PASS WITH ISSUES`**: Core observability, security, and UI invariants hold; only minor (`LOW`) non-blocking observations remain.
* **`FAIL`**: Any `CRITICAL`, `HIGH`, or `MEDIUM` defect or regression is found in `710591e` (triggers `WEB-HC-FIX2` surgical closure before merge).

Write the concise sign-off report to `reports/web-phase-hc-fix1-signoff-report.md` with sections:
1. Audit Metadata & Pre-Audit Git Anchor
2. Executive Audit Verdict (`PASS` / `PASS WITH ISSUES` / `FAIL`) & Deviation Sign-Off Summary
3. `SIG-01`..`SIG-08` Verification Matrix (`file:line` & read-only command evidence)
4. Confirmed Defects (if any) & Non-Blocking Observations
5. Tests Not Re-Executed (Read-Only Mandate)
