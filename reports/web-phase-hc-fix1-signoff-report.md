# WEB-HC-FIX1 — Sign-Off Audit Report (DeepSeek, read-only)

**Phase:** `WEB-HC-FIX1` · **Audit spec:** `docs/web-phase-hc-fix1-signoff-audit-spec.md`
**Date:** 2026-11-25 16:35 (Asia/Bangkok)
**Mode:** strict read-only. No build, no lint, no test, no server start, no install, no commit.

---

## 1. Audit Metadata & Pre-Audit Git Anchor

| Item | Value |
|---|---|
| `git rev-parse HEAD` at audit start | `4cfd0436328c933d03cfa18a381aa8d42f6e14b7` |
| Spec-expected target | `710591e015546b6b716b512da716659b4e48286e` |
| Delta target→HEAD | **1 file**, `reports/web-phase-hc-fix1-luna-report.md` (docs only) — `git diff --name-only 710591e..HEAD` |
| Branch | `fix/web-hc-fix1` (PR #2, open, mergeable) |
| `git status --porcelain -uall` at start | `?? docs/web-phase-hc-fix1-signoff-audit-spec.md`, `?? reports/web-phase-hc-fix1-pr-body.md` |
| Modified tracked files | **0** |
| `git worktree list` | `C:/…/Calculatorai 4cfd043 [fix/web-hc-fix1]` — 1 checkout, 0 prunable |
| Pre-phase anchor delta `d2b754b..b437d02` | `Log.txt` (+6), `Report/web-health-check-2026-11-25.md` (+257), `netlify.toml` (+9) — **exactly the 3 files Luna declared**, 0 application changes |
| Cross-boundary freeze `d2b754b..710591e` | `discord-bot/`, `src/lib/auth-options.ts`, `supabase/migrations/` → **0 files** |
| Tracked `.env*` files | **0** (`git ls-files` + regex) |

Audited content equals `710591e`: the only difference to HEAD is the report file itself, so every `file:line` citation below is valid for the target commit.

---

## 2. Executive Audit Verdict

### **`PASS WITH ISSUES`**

- **CRITICAL: 0.** **HIGH: 0.** **MEDIUM confirmed defect: 0.**
- 11 non-blocking `LOW` observations, one of which (OBS-8) is an **unverified environment risk** that must be settled by a single post-deploy observation, not by static review.
- All three of Luna's declared deviations **stand up** (`2.1).
- Phase `WEB-HC-FIX1` at `710591e` is approved for merge and deploy, **with OBS-8 checked before the phase is called closed.**

### 2.1 Deviation sign-off

| # | Declared deviation | Audit result |
|---|---|---|
| 1 | Aggregate literal stays `"operational"`, not `"ok"` | **Upheld.** `src/app/status/types.ts:23` defines `"operational" | "degraded"`; `src/app/api/status/route.ts:327-331` computes `allOk` from all five `SERVICES` plus `!maintenanceMode`. Changing the literal would have been a breaking API change for no observability gain. |
| 2 | `netlify.toml` build command preserved, only `NODE_VERSION` added | **Upheld.** `git diff b437d02..710591e -- netlify.toml` = `+ NODE_VERSION = "24"` only; `command`, `publish`, `SECRETS_SCAN_OMIT_KEYS` and `@netlify/plugin-nextjs` intact (`netlify.toml:1-10`). Replacing a command that deploys was the riskier option. |
| 3 | In-process per-IP limiter instead of the Supabase limiter | **Upheld.** `src/lib/rate-limiter.ts:53-60` fails open and needs a DB round trip; the mandate was a guard that short-circuits **before** probes. The chosen guard does (`route.ts:286-292` runs before `route.ts:295`). Its new risk is recorded as OBS-8. |

---

## 3. `SIG-01`..`SIG-08` Verification Matrix

### `SIG-01` — Git state, anchor audit, freeze — **PASS**

- HEAD is `4cfd043`, not `710591e`; delta is the report file only (table above). The code under audit is byte-identical to the target. Recorded as OBS-1, not a defect.
- Anchor delta `d2b754b..b437d02` = 3 files, exactly as declared, 0 hidden app changes.
- Frozen scope = 0 files. Tracked `.env*` = 0.
- `DISCORD_BOT_TOKEN` in `src/`: 3 matches, all in `src/app/api/status/route.test.ts:47,95` (assertions that the var is absent). **0 executable references in production code.** See OBS-2.

### `SIG-02` — `getRuntimeHealth` in-process truth — **PASS**

- `src/lib/runtime-health.ts:7-15`: `RuntimeHealth` + `getRuntimeHealth()` over `process.uptime()`.
- `src/app/api/status/route.ts:135-141`: `checkNextjs` is synchronous, calls `getRuntimeHealth()`, contains no `fetch` and no URL resolution.
- `src/app/api/health/route.ts:1-9`: contract preserved — `{ ok, uptime }` with `uptime` numeric (`:7-8`). `ok` is now computed instead of hard-coded `true`, which is the point of the finding.
- `process.env.NEXT_PUBLIC_URL`: 0 executable matches in `src/`; 1 comment reference (`route.ts:134`) and 2 test assertions (`route.test.ts:48`). See OBS-2.
- Test proof that nothing is fetched: `route.test.ts:78-86` spies `globalThis.fetch` and asserts `not.toHaveBeenCalled()`.

### `SIG-03` — heartbeat separation, cardinality, NaN, deviation 1 — **PASS**

- Web token gate and Discord REST probe are gone: `route.ts:145-173` contains no `DISCORD_BOT_TOKEN` and no `discord.com` call.
- **Cardinality is safe.** `supabase/migrations/006_bot_heartbeats.sql:10-11`: `service TEXT PRIMARY KEY`, `last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()`. `route.ts:153` filters `.eq("service","discord")` on that primary key, so `.maybeSingle()` cannot see multiple rows and a PostgREST `PGRST116` multi-row error is unreachable.
- **DB errors surface cleanly.** `route.ts:157` rethrows `hb.error`; `route.ts:170-172` maps it to `fail(..., "Discord heartbeat check failed")` → `status: "error"` with a static message only.
- Empty table → `route.ts:158-160` `"No bot heartbeat recorded"`; stale → `route.ts:162-168` `Bot last seen Nh ago`.
- **`NaN` edge:** `route.ts:161` computes `new Date(last_seen).getTime()`. A malformed `last_seen` yields `NaN`, and `NaN > 2h` is `false` — i.e. `"ok"`. Unreachable with the shipped schema (`NOT NULL TIMESTAMPTZ` always serialises to ISO-8601). Recorded as OBS-4 (defensive hardening), **not** a live defect.
- Deviation 1 verified (`2.1).

### `SIG-04` — guard ordering, bounds, IP trust, cache — **PASS**

- Ordering: `takeStatusSlot` at `route.ts:286`; `getSupabaseAdmin` at `route.ts:295`; 429 return at `route.ts:287-292` with a `Retry-After` header.
- Bound & eviction: `route.ts:246-266`. Expired timestamps are filtered on every access (`:252`); at `RATE_LIMIT_MAX_CLIENTS = 5_000` a **new** key evicts only the oldest inserted key (`:259-263`). There is **no** `map.clear()`, so IP rotation cannot reset other clients' windows, and 5 000 historic visitors cannot lock a new IP out permanently — each new key displaces exactly one stale entry.
- IP source: `src/lib/client-ip.ts:5-16` takes the **rightmost** `x-forwarded-for` hop, then `x-real-ip`, then `"unknown"`. A client-supplied first hop does **not** control the key, so first-hop spoofing cannot bypass the limiter. OBS-8 covers the `"unknown"` collapse.
- Cache: a warm hit returns before `route.ts:302`, so it performs 0 Supabase/Stripe/SMTP calls and 0 `health_checks` inserts (the insert sits inside the `if (!snapshot)` block, `:305-312`).
- **No in-flight coalescing** (`INFLIGHT_REFS=0`): concurrent cold requests each run the full probe set until one populates the cache. Bounded by the 30/min/IP guard → OBS-5.
- Transient failures: `collectChecks` never throws (each checker catches), so an all-failure snapshot is cached for 30 s → recovery visibility lags ≤30 s (OBS-6).
- Test quality: `route.test.ts` mocks only the four I/O boundaries (`:11-14`), asserts observable API output, and resets module-level caches per test via `vi.resetModules()` (`:37-40`). The 429 test asserts that `mocks.from` call count does not grow after the limit (`:142-150`). Not tautological.

### `SIG-05` — JSON 404 contract & security invariants — **PASS**

- `src/app/api/[...path]/route.ts:10-19`: `GET/POST/PUT/PATCH/DELETE/OPTIONS` → `{ error: "Not found" }` at `404`; `HEAD` → `404`, null body. Tests: `route.test.ts:6-15` (loop over 6 methods) and `:17-22` (HEAD).
- `git diff --name-only b437d02..710591e -- src/proxy.ts` → **0**. CSRF origin gate, admin/auth gates and security headers untouched. `src/lib/client-ip.ts` is also unchanged by this phase.

### `SIG-06` — `poweredByHeader`, headers, IaC, deviation 2 — **PASS**

- `next.config.ts:5` sets `poweredByHeader: false`; the whole-file diff is **+1 line**, so **0** CSP/HSTS/`X-Frame-Options`/`Referrer-Policy` directives were removed.
- `.nvmrc:1` = `24`; `package.json:6-9` `engines` = `>=24.0.0 <25.0.0` / `>=11.0.0`.
- Deviation 2 verified (`2.1).

### `SIG-07` — zero suppressions & runtime safety of the 6 refactors — **PASS**

- Added lines under `*.ts`/`*.tsx` in `b437d02..710591e` matching `eslint-disable|@ts-ignore|@ts-expect-error`: **0**. Across all file types the diff has 4 matches, all prose in `Log.txt` and the phase spec.
- The 4 pre-existing suppressions exist at the cited lines, and their files are absent from the phase diff: `FormulaCard.tsx:130`, `VerifyClient.tsx:72`, `SplashGate.tsx:22`, `useHistory.ts:96`.
- **`StatusClient.tsx`:** keys at `:33` (`/api/status`) and `:41` (`/api/status/history?range=`), both through `fetcher`. `src/lib/fetcher.ts:11` throws on `!res.ok`, so a `429` or `500` surfaces as an SWR error and never reaches render as `StatusData`; `:23-25` throws on `success:false`. The error branch is guarded by `statusError && !status`, and `keepPreviousData` keeps the last good payload on screen.
- **`UserDetailModal.tsx:39-42`:** key `/api/users/<id>`. A null key is unnecessary because the modal is only mounted when a user is selected — `src/components/dashboard/pages/UsersPage.tsx:183` (`{selectedUser && activeModal === "detail" && …}`) — and the `user` prop is required (`:32-34`). No `/api/users/undefined` path exists.
- **`InvoiceTable.tsx:21` / `RefundTable.tsx:20`:** keys are fixed endpoints. Neither table had pagination, search, filter or mutation callbacks before this phase, so nothing was dropped; retry is wired to `mutate()`.
- **`InfoModal.tsx:42-48`:** `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` with all three arguments, server snapshot `false` (`:35-37`), so SSR/hydration cannot throw `Missing getServerSnapshot`. The manual pick lives in `tabChoice` and clears only on close (`:51-54`), so unrelated re-renders do not reset it.
- **`LanguageContext.tsx:33-37` + `locale-storage.ts:20-48`:** `getServerSnapshot` returns `"en"` (`:38-40`); storage reads and writes sit inside `try/catch` (`:29-33`, `:44-46`), which also covers a missing `window`; `setLocale` notifies subscribers synchronously (`:47`). Cross-tab `storage` events are not handled, but the store is `sessionStorage` (per-tab by definition) and the pre-phase code had no listener either — not a regression (OBS-11).
- `Log.txt` ceiling is updated to 0 in the appended phase entry.

### `SIG-08` — report accuracy — **PASS (with span drift)**

- **13/13 test names match character-for-character.** `route.test.ts:77, 90, 100, 111, 121, 136`; `[...path]/route.test.ts:8` (template producing `GET/POST/PUT/PATCH/DELETE/OPTIONS`) and `:17` for HEAD. The report reproduces them exactly, in order.
- **Cited spans: 2 material drifts.** `BOT_HEARTBEAT_THRESHOLD_MS` is at `route.ts:143`; the report says `145`. The `allOk`/`"operational"` computation is at `route.ts:327-331`; the report says `316-320`. Two further spans are loose but contain the code: `probesCache` `236-241` (cited `236-244`) and `takeStatusSlot` `251-266` (cited `246-270`). All other cited spans verified correct: `runtime-health.ts:7-15`, `health/route.ts:1-9`, `route.ts:135-141`, `next.config.ts:5`, `package.json:6-9`, `netlify.toml:6`, `StatusClient.tsx:33,41,57`, `UserDetailModal.tsx:39`, `InvoiceTable.tsx:21`, `RefundTable.tsx:20`, `InfoModal.tsx:42-48,51-54`, `locale-storage.ts:14-48`, `LanguageContext.tsx:33-37`. See OBS-3.

---

## 4. Confirmed Defects & Non-Blocking Observations

**Confirmed blocking defects (CRITICAL / HIGH / MEDIUM): none.**

| # | Sev | Observation | Evidence |
|---|---|---|---|
| OBS-1 | LOW | HEAD is `4cfd043`, not the audited `710591e`; the delta is the implementation report only. `reports/web-phase-hc-fix1-pr-body.md` is also untracked beyond the spec's allowlist. | `git diff --name-only 710591e..HEAD`; `git status` |
| OBS-2 | LOW | The spec asked for literally 0 occurrences of `NEXT_PUBLIC_URL` / `DISCORD_BOT_TOKEN` in `src/`. Reality: 1 comment (`route.ts:134`) and 3 test assertions (`route.test.ts:47,48,95`). Zero executable references. | grep evidence in `3 |
| OBS-3 | LOW | `reports/web-phase-hc-fix1-luna-report.md` `3 cites 2 materially wrong line spans (143→145, 327-331→316-320) and 2 loose ones. Content correct, coordinates drift. | `3 SIG-08 |
| OBS-4 | LOW | `NaN` hardening: a malformed `last_seen` evaluates `NaN > 2h === false` and reports `ok`. Unreachable today (`NOT NULL TIMESTAMPTZ`); a `Number.isNaN` guard would make it impossible. | `route.ts:161`; `006_bot_heartbeats.sql:11` |
| OBS-5 | LOW | No in-flight coalescing: N concurrent cold requests run N full probe sets before the first writes the cache. Bounded by 30 req/min/IP and by instance count. | `INFLIGHT_REFS=0`; `route.ts:300-321` |
| OBS-6 | LOW | An all-services-down snapshot is cached for 30 s, so recovery can be up to 30 s late on the status page. Consistent with the TTL mandate; flagged so nobody reads it as a stuck page. | `route.ts:300-320` |
| OBS-7 | LOW | A `/api/status` 429 reaches SWR as `API error: 429` (because `fetcher` throws before parsing the body), not as the server's `"Too many requests"` string. Cosmetic. | `fetcher.ts:11`; `route.ts:287-292` |
| **OBS-8** | **MEDIUM if it materialises (unverified)** | `client-ip.ts` reads only `x-forwarded-for` / `x-real-ip`; it never reads Netlify's `x-nf-client-connection-ip`. If Netlify populates neither header for Functions, every visitor collapses to the key `"unknown"` and the whole site shares one 30 req/60 s bucket — a self-inflicted 429 storm on `/status`. **The static consequence is certain; whether the header is present is not verifiable under this read-only mandate** (spec `4 forbids burst probing). | `client-ip.ts:5-16`; `route.ts:286` |
| OBS-9 | LOW | `InfoModal` resets the device tab only through its own close handler; `AppShell.tsx:325` closes the modal with `setShowModal(false)` directly, so after that path the last manual tab persists into the next open (pre-phase behaviour re-derived it on every open). | `InfoModal.tsx:51-54`; `AppShell.tsx:325` |
| OBS-10 | LOW | "Updated HH:MM:SS" on `/status` now derives from the server `timestamp`, which can be up to 30 s old because of `probesCache`. Previously it was client clock at fetch time. | `StatusClient.tsx:50`; `route.ts:341` |
| OBS-11 | LOW | No cross-tab locale sync. `sessionStorage` is per-tab and the pre-phase code had no `storage` listener either, so this is unchanged behaviour rather than a regression. | `locale-storage.ts:42-48` |

**Required before the phase is closed:** one post-deploy observation for OBS-8. Send a single request from a known IP and confirm the deployed status endpoint still answers 200 for a second distinct client while a third IP is throttled, or read the function logs for the resolved rate-limit key. Do **not** open with the 31-request burst against production.

---

## 5. Tests Not Re-Executed (Read-Only Mandate)

Per audit spec `2, none of the following were run, so this audit does **not** independently verify them:

| Command | Luna's recorded result | Audit status |
|---|---|---|
| `pnpm type-check` | exit 0 | not executed |
| `pnpm lint` | exit 0, 0 errors / 15 warnings | not executed (static diff confirms 0 suppressions added) |
| `pnpm test` | exit 0, 21 files / 100 tests | not executed (test bodies read in full) |
| `pnpm build` | exit 0, `/api/[...path]` built | not executed |
| `cd discord-bot; tsc --noEmit` | exit 0 | not executed |
| `next start` smoke, 24 endpoints | routing / CSRF / header probes | not executed (production smoke reserved for post-deploy) |

Context: the repository has no `.github/` directory, so no CI run corroborates those exit codes either. Every claim in this report comes from source reads and git read-only commands executed at `4cfd043` (code identical to `710591e`).
