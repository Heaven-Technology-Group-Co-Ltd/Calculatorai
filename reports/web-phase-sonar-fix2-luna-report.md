# Phase `WEB-SONAR-FIX2` — Implementation Report (`Luna`)

## 1. Implementation Metadata & Git Anchor

* **Implementer:** `Luna` (Primary Implementation Agent)
* **Project:** `Calculatorai` (`Heaven-Technology-Group-Co-Ltd_Calculatorai`)
* **Pre-Work Anchor (`fix/web-hc-fix1` / post-`710591e`):** `4cfd0436328c933d03cfa18a381aa8d42f6e14b7` (`git merge-base --is-ancestor 710591e HEAD` verified `0`)
* **Working Branch:** `fix/web-sonar-fix2`
* **Worktree:** Single worktree `C:/Users/krmak/Documents/GitHub/Calculatorai`
* **Scope Freeze Verification:**
  * `supabase/migrations/` diff: **`0` files**
  * `discord-bot/` diff: **`0` files** (`0` SonarCloud issues targeted `discord-bot/`)
  * Inline suppressions added (`eslint-disable|@ts-ignore|@ts-expect-error|NOSONAR`): **`0`**

---

## 2. Executive Closure Verdict & `auth-options.ts:14` Forensic Classification

* **Verdict:** **`READY FOR SIGN-OFF AUDIT`**
* **Live SonarCloud Enumeration:** Succeeded via `https://sonarcloud.io/api/issues/search?componentKeys=Heaven-Technology-Group-Co-Ltd_Calculatorai&issueStatuses=OPEN,CONFIRMED&ps=100` (`20` `OPEN` issues, `0` `TO_REVIEW` security hotspots).
* **`src/lib/auth-options.ts:14` Forensic Classification (`SNR-02`):**
  * **Classification:** **Path A — Anti-Timing / Anti-Enumeration Dummy Hash** (NOT a real or fallback credential).
  * **Evidence:** Previously `TIMING_EQUALIZER_HASH` at `src/lib/auth-options.ts:14` was used exclusively on `L49` inside `if (error || !user || !user.password_hash)` to equalize `bcrypt.compare` latency (~100ms at cost 12) before returning `null`.
  * **Resolution:** Replaced the static `$2b$12$...` literal with a lazy runtime-generated hash `getTimingEqualizerHash()` using `randomUUID()` from `"crypto"` and `bcrypt.hash(randomUUID(), 12)` (`src/lib/auth-options.ts:15-20`, `59`). Zero `$2[aby]$` literals remain in source; constant-time behavior is preserved. **No credential rotation required.**

---

## 3. `SNR-01`..`SNR-08` Surgical Resolution Matrix

| ID | Scope | `file:line` Span | Resolution Summary |
|---|---|---|---|
| `SNR-01` (`OBS-8`) | Client IP resolution | `src/lib/client-ip.ts:1-34`, `src/lib/client-ip.test.ts:8-44` | Inspects `x-nf-client-connection-ip` first, then rightmost `x-forwarded-for`, then `x-real-ip`, then `"unknown"`; trims, extracts last comma-delimited token, strips IPv4 `:port` and bracketed IPv6 `[...]:port` without corrupting unbracketed IPv6. |
| `SNR-01` (`OBS-4`) | `NaN` timestamp guard | `src/app/api/status/route.ts:161-165`, `src/app/api/status/route.test.ts:121-130` | Guards `seenMs = new Date(hb.data.last_seen as string).getTime()` with `Number.isNaN(seenMs)` returning `{ status: "error", latencyMs, message: "Invalid bot heartbeat timestamp" }`. |
| `SNR-01` (`OBS-9`) | Modal close tab reset | `src/components/AppShell.tsx:317` | Conditionally mounts `{showModal && <InfoModal ... />}` so closing via `AppShell.tsx:325` (`setShowModal(false)`) unmounts `InfoModal` and resets `tabChoice` cleanly without `useEffect`. |
| `SNR-02` | `bcrypt` Blocker | `src/lib/auth-options.ts:1-20,59`, `src/lib/auth-options.test.ts:12-56` | Replaced static `$2b$12$...` literal with lazy `getTimingEqualizerHash()` (`bcrypt.hash(randomUUID(), 12)`); updated `auth-options.test.ts` to verify `bcrypt.hash` and `bcrypt.compare` with the runtime hash. |
| `SNR-03` | Hard-coded password check | `src/components/login/LoginClient.tsx:94` | Replaced `"ResendVerification1!"` placeholder in `handleResend` with `crypto.randomUUID()` (satisfies `RegisterSchema` length for existing unverified accounts without any static credential literal). |
| `SNR-04` | Safe cryptographic ID | `src/hooks/useHistory.ts:141-147` | Replaced `Math.random()` fallback with `crypto.getRandomValues(new Uint8Array(8))` hex encoding when `crypto.randomUUID` is unavailable. |
| `SNR-05` | Linear-time regex | `scripts/v3/measure.py:138,470` | Eliminated `\s*` / `[^;{}]+` and `\s*` / `[^)]+` backtracking overlaps (`DECL_RE` and `@media` width extraction); verified `python scripts/v3/measure.py` exits `0` with identical metrics. |
| `SNR-06` | Remaining 16 SonarCloud issues | See `§4` Ledger | Resolved all 16 remaining `OPEN` issues cleanly in source code with `0` suppressions. |
| `SNR-07` | Sonar config & warning | `sonar-project.properties:1-10` | Configured `sonar.projectKey`, `sonar.organization`, `sonar.sources`, `sonar.tests`, `sonar.test.inclusions`, `sonar.exclusions`, and `sonar.typescript.tsconfigPath=tsconfig.json`. |
| `SNR-08` | Deterministic CI pipeline | `.github/workflows/ci.yml:1-43` | Added GitHub Actions workflow (`ubuntu-latest`, `fetch-depth: 0`, `pnpm/action-setup@v4`, Node from `.nvmrc`) running `type-check`, `lint`, `test`, `build`, and `pnpm --dir discord-bot exec tsc --noEmit`. |

---

## 4. Complete `20`-Issue SonarCloud Ledger

All 20 `OPEN` issues fetched from SonarCloud (`0` `CONFIRMED`, `0` `TO_REVIEW` hotspots):

| # | Sonar Key | Rule | Severity | `file:line` | Resolution |
|---|---|---|---|---|---|
| 1 | `AaIR3TMdqggJLYU_fEh-` | `python:S8786` | MAJOR | `scripts/v3/measure.py:138` | Replaced `\s*:\s*([^;{}]+)` with `[ \t]*:([^;{}]+)` (eliminates `\s*`/`[^;{}]+` overlap). |
| 2 | `AaIR3TMdqggJLYU_fEh_` | `python:S8786` | MAJOR | `scripts/v3/measure.py:470` | Replaced `:\s*([^)]+)` with `:([^)]+)` (eliminates `\s*`/`[^)]+` overlap; `.strip()` already applied). |
| 3 | `AaIR3TJxqggJLYU_fEhs` | `typescript:S6852` | MAJOR | `src/app/status/StatusClient.tsx:221` | Added `tabIndex={0}` to `role="tablist"` container. |
| 4 | `AaIR3TLYqggJLYU_fEht` | `typescript:S6848` | MAJOR | `src/components/dashboard/DashboardShell.tsx:133-145` | Added `role="button"`, `tabIndex={0}`, `aria-label`, and `onKeyDown` (`Enter`/`Space`) to drawer overlay. |
| 5 | `AaIR3TLfqggJLYU_fEhu` | `typescript:S6848` | MAJOR | `src/components/dashboard/blocks/FormulaHeatmap.tsx:69-77` | Converted clickable `<span>` to native `<button type="button">` with unstyled button reset. |
| 6 | `AaIR3TLvqggJLYU_fEhy` | `typescript:S6848` | MAJOR | `src/components/features/history/HistorySidebar.tsx:31-42` | Added `role="button"`, `tabIndex={0}`, and `onKeyDown` (`Enter`/`Space`) (contains nested delete `<button>`). |
| 7 | `AaIR3TLsqggJLYU_fEhx` | `typescript:S6852` | MAJOR | `src/components/features/info/InfoModal.tsx:138` | Added `tabIndex={0}` to `role="tablist"` container. |
| 8 | `AaIR3TLpqggJLYU_fEhw` | `typescript:S6852` | MAJOR | `src/components/features/language/LanguageDropdown.tsx:102` | Added `tabIndex={0}` to `role="listbox"` container. |
| 9 | `AaIR3TL_qggJLYU_fEh1` | `typescript:S2068` | MAJOR | `src/components/login/LoginClient.tsx:94` | Replaced `"ResendVerification1!"` with `crypto.randomUUID()`. |
| 10 | `AaIR3TL3qggJLYU_fEh0` | `typescript:S6848` | MAJOR | `src/components/purchase/PurchaseClient.tsx:158-168` | Added `role="button"`, `tabIndex={0}`, and `onKeyDown` (`Enter`/`Space`) to plan card container. |
| 11 | `AaIR3TLnqggJLYU_fEhv` | `typescript:S1764` | MAJOR | `src/components/sidebar/SidebarNavItem.tsx:108` | Simplified `{badge && badge}` to `{badge}`. |
| 12 | `AaIR3TLyqggJLYU_fEhz` | `typescript:S9383` | MAJOR | `src/components/verify/VerifyClient.tsx:51` | Prefixed async IIFE with `void`. |
| 13 | `AaIR3TMDqggJLYU_fEh2` | `typescript:S6671` | MAJOR | `src/hooks/useHistory.ts:85` | Replaced `Promise.reject()` with `Promise.reject(new Error(\`History fetch failed: ${r.status}\`))`. |
| 14 | `AaIR3TMDqggJLYU_fEh3` | `typescript:S2245` | MAJOR | `src/hooks/useHistory.ts:141-147` | Replaced `Math.random()` fallback with `crypto.getRandomValues(new Uint8Array(8))`. |
| 15 | `AaIR3TMGqggJLYU_fEh5` | `typescript:S7773` | MINOR | `src/lib/admin/hmac.ts:99` | Replaced `isNaN(ts)` with `Number.isNaN(ts)`. |
| 16 | `AaIR3TMMqggJLYU_fEh6` | `secrets:S8215` | BLOCKER | `src/lib/auth-options.ts:14` | Replaced static `$2b$12$...` literal with lazy `bcrypt.hash(randomUUID(), 12)`. |
| 17 | `AaIR3TMRqggJLYU_fEh7` | `typescript:S7773` | MINOR | `src/lib/calc-utils.ts:5` | Replaced `isFinite(n)` with `Number.isFinite(n)`. |
| 18 | `AaIR3TMRqggJLYU_fEh8` | `typescript:S7773` | MINOR | `src/lib/calc-utils.ts:6` | Replaced `parseFloat(...)` with `Number.parseFloat(...)`. |
| 19 | `AaIR3TMRqggJLYU_fEh9` | `typescript:S7773` | MINOR | `src/lib/calc-utils.ts:57` | Replaced `isNaN(val)` with `Number.isNaN(val)`. |
| 20 | `AaIR3TMEqggJLYU_fEh4` | `typescript:S9383` | MAJOR | `src/lib/seed-admin.ts:74-77` | Attached `.catch((err) => { ... process.exit(1); })` to `seedAdmin()`. |

*Manual SonarCloud UI Triage Table:* **0 entries** (every issue was resolved directly in code).

---

## 5. Verification Gate Results & Exact New Test Function Names

All 6 mandatory local verification gates and boundary checks passed after the final code edit:

1. `pnpm.cmd type-check` -> **exit `0`** (`0` TypeScript errors)
2. `pnpm.cmd lint` -> **exit `0`** (`0` errors, `15` pre-existing warnings; `0` added suppressions)
3. `pnpm.cmd test` -> **exit `0`** (`21` test files passed, `103` tests passed)
4. `pnpm.cmd build` -> **exit `0`** (Next.js `16.2.6` Turbopack production build, `38/38` static pages)
5. `pushd discord-bot; .\node_modules\.bin\tsc.cmd --noEmit; popd` -> **exit `0`** (`0` errors)
6. Regex scan across `src/lib/auth-options.ts` for `\$2[aby]\$\d{2}\$` -> **`0` matches**
7. Boundary checks: `supabase/migrations/` diff = **`0`**, `discord-bot/` diff = **`0`**, `python scripts/v3/measure.py` -> **exit `0`**

### Exact New / Updated Test Case Names

* **`src/lib/client-ip.test.ts`** (`describe("getClientIpFromHeaders", ...)`):
  * `prefers x-nf-client-connection-ip over spoofed x-forwarded-for`
  * `takes the rightmost XFF hop when x-nf-client-connection-ip is absent`
  * `normalizes IPv4 with port and preserves IPv6 addresses`
  * `returns unknown when all IP headers are absent or empty`
* **`src/app/api/status/route.test.ts`** (`describe("GET /api/status", ...)`):
  * `marks discord error when the bot heartbeat timestamp is malformed`
* **`src/lib/auth-options.test.ts`** (`describe("authOptions.authorize error segregation (F-11)", ...)`):
  * `returns null for non-existent email (anti-enumeration)` (updated to assert `expect(bcrypt.hash).toHaveBeenCalledWith(expect.any(String), 12)` and `expect(bcrypt.compare).toHaveBeenCalledWith("any_password", "runtime_dummy_hash")`)
