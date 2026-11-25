# Phase `WEB-SONAR-FIX2` — Final Sign-Off Verification Specification

## Audit Metadata

* **Assigned Auditor:** `DeepSeek` (Read-Only Sign-Off Verification Agent)
* **Team:** Heaven Technologies (`Heaven Technology Group Co., Ltd.`)
* **Project / Production Target:** `Calculatorai` (`https://calculatorai.click` on Netlify)
* **SonarCloud Project Key:** `Heaven-Technology-Group-Co-Ltd_Calculatorai`
* **Target Branch & Commit:** Current `HEAD` on `fix/web-sonar-fix2` (must have advanced cleanly past `4cfd0436328c933d03cfa18a381aa8d42f6e14b7`)
* **Pre-Phase Anchor:** `4cfd0436328c933d03cfa18a381aa8d42f6e14b7` (post-`WEB-HC-FIX1` implementation `710591e015546b6b716b512da716659b4e48286e`)
* **Implementation Spec:** `docs/web-phase-sonar-fix2-closure-spec.md`
* **Implementation Report:** `reports/web-phase-sonar-fix2-luna-report.md`
* **Prior Sign-Off Audit Report:** `reports/web-phase-hc-fix1-signoff-report.md`
* **Audit Scope:** Strict read-only surgical verification of `git diff 4cfd0436328c933d03cfa18a381aa8d42f6e14b7..HEAD` closing carry-over items (`OBS-8`, `OBS-4`, `OBS-9`), all `$20$` SonarCloud `OPEN` issues (`SNR-02`..`SNR-06`), `sonar-project.properties` (`SNR-07`), and `.github/workflows/ci.yml` (`SNR-08`).

---

## Read-Only Mandate (Strict Zero-Mutation Rules)

1. **Do NOT modify, stage, or commit any source, test, workflow, config, or lock file.**
2. **Do NOT execute mutating or build commands** (no `pnpm install`, `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm type-check`, `next start`, `tsc`, `python scripts/v3/measure.py`, or `git worktree prune`).
3. **Do NOT issue live network bursts or SonarCloud API mutations.**
4. **Permitted read-only commands:** `git rev-parse`, `git merge-base`, `git status --porcelain -uall`, `git worktree list`, `git log`, `git diff`, `git ls-files`, and PowerShell `Select-String` / `Get-Content` static source reads.
5. **Capture Git anchor BEFORE writing your report:** Record `git rev-parse HEAD`, `git branch --show-current`, `git status --porcelain -uall`, and `git worktree list` at the very start of the audit. Note that Luna's report (`§1`) omitted the post-implementation commit SHA — verify that all phase changes are actually committed to `HEAD` on `fix/web-sonar-fix2` and not sitting uncommitted in the working tree. Write only `reports/web-phase-sonar-fix2-signoff-report.md` at the end and leave it untracked.
6. **Do NOT write to `MCP second-brain`** (reserved for Closeout after human approval).

---

## Surgical Sign-Off Checklist (`SIG-01` .. `SIG-09`)

### `SIG-01` — Clean Git State, Committed `HEAD` Anchor & Scope Freeze (CRITICAL)

1. Confirm `HEAD` on `fix/web-sonar-fix2` has advanced cleanly past `4cfd0436328c933d03cfa18a381aa8d42f6e14b7` (`git merge-base --is-ancestor 710591e HEAD` and `git merge-base --is-ancestor 4cfd043 HEAD` both hold) and `git status --porcelain -uall` shows **`$0$` modified or staged tracked files** (only untracked docs/reports allowed). If Luna left implementation edits uncommitted, fail `SIG-01` immediately as `CRITICAL`.
2. Confirm cross-boundary freeze across `git diff --name-only 4cfd043..HEAD`:
   * `supabase/migrations/` $\rightarrow$ **`$0$` files touched**.
   * `discord-bot/` $\rightarrow$ **`$0$` files touched** (confirming Luna's claim that `$0$` of the `$20$` SonarCloud issues resided in `discord-bot/`).
   * `src/proxy.ts` $\rightarrow$ **`$0$` files touched** (preserving all CSRF, auth, and security header gates).
3. Confirm `$0$` `.env*` secret files are tracked (`git ls-files` regex check) and `$0$` inline suppressions (`eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `NOSONAR`) exist in added source lines across `4cfd043..HEAD` under `*.ts`, `*.tsx`, `*.js`, `*.py`, and `*.yml`.

### `SIG-02` — Closure of Carry-Over Hardening (`OBS-8`, `OBS-4`, `OBS-9`) (HIGH)

1. **`OBS-8` (`src/lib/client-ip.ts` & `src/lib/client-ip.test.ts`):**
   * Verify `getClientIpFromHeaders` checks `x-nf-client-connection-ip` **before** `x-forwarded-for` and `x-real-ip`, falling back to `"unknown"`.
   * Inspect the port-stripping / sanitization helper line-by-line:
     * Confirm comma-separated lists take the **last** non-empty token (so client-prepended hops cannot spoof).
     * Confirm IPv4 `:port` (`1.2.3.4:5678` $\rightarrow$ `1.2.3.4`) and bracketed IPv6 `[2001:db8::1]:443` $\rightarrow$ `2001:db8::1` strip cleanly **without** truncating unbracketed IPv6 addresses (`2001:db8::1` or `::ffff:192.0.2.1`, which contains both colons and dots!). Check specifically whether IPv4-mapped IPv6 `::ffff:1.2.3.4` is corrupted by the IPv4 `:port` regex.
2. **`OBS-4` (`src/app/api/status/route.ts:161-165`):**
   * Confirm `Number.isNaN(seenMs)` returns `{ status: "error", latencyMs, message: "Invalid bot heartbeat timestamp" }` before threshold comparison, and verify the new test in `src/app/api/status/route.test.ts` genuinely exercises a malformed timestamp string.
3. **`OBS-9` (`src/components/AppShell.tsx:317` & `InfoModal.tsx`):**
   * Inspect `{showModal && <InfoModal ... />}` in `AppShell.tsx` alongside `InfoModal`'s own `open` / `isOpen` prop handling and close animation (if any). Confirm unmounting when `showModal` is `false` resets `tabChoice` cleanly without breaking focus return, Escape-key listeners, or prop contracts.

### `SIG-03` — `SNR-02`: `auth-options.ts` `bcrypt` Blocker & Timing-Oracle Safety (CRITICAL)

1. Inspect `src/lib/auth-options.ts` (`L1`..`L75`) in full:
   * Independently verify Luna's **Path A** forensic classification: confirm the prior `$2b$12$` hash was used **solely** in the non-existent / passwordless user branch and never granted a session.
   * Run a regex scan across the entire `src/` directory for `\$2[aby]\$\d{2}\$` and confirm **`$0$` matches** in production code (and check test files as well).
   * **Singleton Caching vs `2x`-Cost Timing-Oracle Check (CRITICAL):** Inspect `getTimingEqualizerHash()` (`src/lib/auth-options.ts:15-20`, `59`):
     * Confirm the `bcrypt.hash(randomUUID(), 12)` promise is **memoized once at module scope** (e.g., `timingEqualizerPromise ??= bcrypt.hash(...)`) rather than re-running `bcrypt.hash` on **every** failed login! (If `bcrypt.hash` ran on every unknown-email login followed by `bcrypt.compare`, unknown emails would take $\sim 2\times$ cost-12 latency $\approx 200\text{ ms}$ vs $\sim 100\text{ ms}$ for real emails — re-introducing a reverse timing oracle and doubling CPU DoS amplification!)
     * Verify what happens if `bcrypt.hash` were ever to reject once (does a rejected promise stay permanently cached, or is it safe?).
   * Confirm session strategy, JWT callbacks, OAuth providers, and admin role checks in `auth-options.ts` are untouched.
   * Inspect `src/lib/auth-options.test.ts:12-56` to verify the updated anti-enumeration test asserts real behavior rather than tautological mocks.

### `SIG-04` — `SNR-03`: `LoginClient.tsx:94` Resend-Verification Schema Compatibility Trap (CRITICAL)

1. **High-Risk Functional Regression Check:** Luna replaced `"ResendVerification1!"` at `src/components/login/LoginClient.tsx:94` inside `handleResend` with `crypto.randomUUID()`.
2. Trace the full request path from `LoginClient.tsx` (`handleResend`) $\rightarrow$ the target API route (e.g., `src/app/api/auth/register/route.ts` or resend endpoint) $\rightarrow$ its Zod validation schema (`RegisterSchema` or password validator):
   * Inspect the exact password regex / refinement rules on `RegisterSchema`!
   * Note that `crypto.randomUUID()` produces **only** lowercase hex digits and hyphens (`[0-9a-f-]`, length `36`) — it contains **`$0$` uppercase letters (`[A-Z]`)** and no `!`/`@` symbols!
   * Verify what happens in the API handler when `handleResend` posts `{ email, password: crypto.randomUUID() }`:
     * Does Zod schema validation run **before** checking whether the existing unverified account already exists, AND does `RegisterSchema` require uppercase (`/[A-Z]/`) or special characters not satisfied by UUIDv4?
     * **If `crypto.randomUUID()` fails `RegisterSchema` validation, `handleResend` is broken (`400 Bad Request`) in production — flag this immediately as a `HIGH` / `CRITICAL` regression!**
   * Also check whether `crypto.randomUUID()` is guarded or safe in non-secure HTTP local dev contexts (`http://localhost` is a secure context in browsers, whereas `http://192.168.x.x` is not).

### `SIG-05` — `SNR-04` & `SNR-05`: `useHistory.ts` CSPRNG & `measure.py` Regex Equivalence (MEDIUM)

1. **`src/hooks/useHistory.ts:85, 141-147` (Issues #13 & #14):**
   * Confirm `Math.random()` is completely removed from `useHistory.ts` and replaced with `crypto.randomUUID()` + `crypto.getRandomValues(new Uint8Array(8))` hex fallback.
   * Confirm changing `Promise.reject()` at `L85` to `Promise.reject(new Error(...))` does not break any caller `catch` block expecting `undefined` or specific error shapes.
2. **`scripts/v3/measure.py:138, 470` (Issues #1 & #2):**
   * Inspect both refactored regular expressions (`[ \t]*:([^;{}]+)` at `L138` and `:([^)]+)` at `L470`).
   * Confirm neither expression exhibits super-linear backtracking ($O(n)$ worst-case runtime) AND verify whether changing `\s*:` to `[ \t]*:` at `L138` preserves multi-line CSS declaration matching (or check whether downstream code strips leading whitespace from group `1` now that `\s*` after `:` was removed!).

### `SIG-06` — `SNR-06`: Accessibility & Logic Audit of Remaining `$16$` Issues (HIGH)

1. **Keyboard Event Bubbling & Nested Interactive Controls Check (Issues #3..#8, #10):**
   * Inspect every UI component modified for `typescript:S6848` / `typescript:S6852`:
     * `src/app/status/StatusClient.tsx:221` (`role="tablist"` + `tabIndex={0}`)
     * `src/components/dashboard/DashboardShell.tsx:133-145` (drawer overlay `role="button"`)
     * `src/components/dashboard/blocks/FormulaHeatmap.tsx:69-77` (`<span>` $\rightarrow$ `<button type="button">`)
     * `src/components/features/history/HistorySidebar.tsx:31-42` (`role="button"` container with nested delete `<button>`)
     * `src/components/features/info/InfoModal.tsx:138` (`role="tablist"` + `tabIndex={0}`)
     * `src/components/features/language/LanguageDropdown.tsx:102` (`role="listbox"` + `tabIndex={0}`)
     * `src/components/purchase/PurchaseClient.tsx:158-168` (plan card `role="button"`)
   * **Check specifically in `HistorySidebar.tsx` and `PurchaseClient.tsx`:**
     1. When a user focuses a **nested child `<button>`** (such as the delete icon button inside a history row, or a checkout CTA button inside a plan card) and presses `Enter` or `Space`, does the `onKeyDown` event bubble up to the outer `<div role="button">` and fire the parent click handler simultaneously (e.g., selecting a deleted history item or double-triggering plan selection)? Verify whether `e.target !== e.currentTarget` is ignored or child propagation is stopped!
     2. Does pressing `Space` on the `role="button"` element call `e.preventDefault()` so the viewport does not scroll down?
     3. In `FormulaHeatmap.tsx:69-77`, confirm converting `<span>` to `<button type="button">` resets default browser button border, padding, background, and font inheritance so heatmap cells do not visually deform.
     4. Confirm adding `role="button"` around a nested `<button>` in `HistorySidebar.tsx` does not trigger a **new** SonarCloud rule (`typescript:S6819` / interactive-supports-focus or nested interactive control violation)!
2. **Remaining Logic & Number-Global Refactors (Issues #11, #12, #15, #17..#20):**
   * `SidebarNavItem.tsx:108` (`{badge}`): Confirm `badge` cannot be numeric `0` (in React, `{0 && 0}` and `{0}` both render `"0"`, verify `badge` prop type).
   * `VerifyClient.tsx:51` (`void (async () => ...)`): Confirm internal `try/catch` handles rejections so `void` does not cause unhandled promise rejections in the browser.
   * `src/lib/admin/hmac.ts:99` & `src/lib/calc-utils.ts:5, 6, 57`: **CRITICAL COERCION CHECK!** Global `isNaN(x)` and `isFinite(x)` coerce strings/nulls to numbers first (`isFinite("42") === true`, `Number.isFinite("42") === false`!). Inspect the exact parameter types and runtime callers of `hmac.ts:99` and `calc-utils.ts:5, 6, 57` to confirm `ts`, `n`, and `val` are guaranteed `number` primitives at runtime and never numeric strings whose behavior silently flipped from `true` to `false`!
   * `src/lib/seed-admin.ts:74-77`: Confirm `seedAdmin()` is a standalone CLI entrypoint and never imported by Next.js runtime routes (where `process.exit(1)` would kill a serverless worker).

### `SIG-07` — `SNR-07`: `sonar-project.properties` Scanner Validity (MEDIUM)

1. Inspect `sonar-project.properties` line-by-line:
   * Confirm `sonar.projectKey=Heaven-Technology-Group-Co-Ltd_Calculatorai` matches character-for-character.
   * **Organization Key Casing Check:** Check the exact value of `sonar.organization`. On SonarCloud, organization keys are strictly lowercase slugs (typically `heaven-technology-group-co-ltd`). Verify whether the configured `sonar.organization` matches existing repo references or risks breaking Automatic Analysis / CI scanner.
   * Check whether SonarCloud **Automatic Analysis** is enabled on this repo (note that SonarCloud Automatic Analysis rejects repositories containing `sonar-project.properties` unless custom `.sonarcloud.properties` is used or CI-based analysis runs — evaluate whether adding `sonar-project.properties` without a SonarCloud GitHub Action breaks SonarCloud Automatic Analysis!).
   * Verify `sonar.sources`, `sonar.tests`, `sonar.test.inclusions`, `sonar.exclusions`, and `sonar.typescript.tsconfigPath` point to real directories/files in the repo.

### `SIG-08` — `SNR-08`: `.github/workflows/ci.yml` Cold-Runner Viability (HIGH)

1. Inspect `.github/workflows/ci.yml`, root `package.json`, `pnpm-workspace.yaml` (if present), and `discord-bot/package.json`:
   * **Workspace Dependency Trap Check:** In step 5, CI runs `pnpm --dir discord-bot exec tsc --noEmit` after a single root `pnpm install --frozen-lockfile`. Check whether `discord-bot` is declared inside `pnpm-workspace.yaml`! If `discord-bot` is **not** part of the pnpm workspace, root `pnpm install` will **not** install `discord-bot/node_modules`, causing `tsc` in step 5 to fail immediately on GitHub Actions!
   * **Env-less `pnpm build` Check:** Inspect `next.config.ts` and any module-top-level `process.env` checks in prerendered pages/routes (`16` static routes / `38` pages) to confirm `pnpm build` in `.github/workflows/ci.yml` will not crash on `ubuntu-latest` when no `.env` secrets are present.
   * Confirm `pnpm/action-setup@v4` will not fail due to dual-version specification (if `package.json` already has `"packageManager": "pnpm@..."` AND `ci.yml` also hardcodes `version: 11`, `pnpm/action-setup@v4` throws an error unless `packageManager` is absent or only one is set — check both files!).

### `SIG-09` — Literal Report & Ledger Accuracy (LOW)

1. Verify every `file:line` coordinate in `§3` and `§4` (`#1`..`#20`) of `reports/web-phase-sonar-fix2-luna-report.md` against actual file contents at `HEAD`.
2. Verify all `$6$` new/updated test case names listed in `§5` of Luna's report exist **character-for-character** in `src/lib/client-ip.test.ts`, `src/app/api/status/route.test.ts`, and `src/lib/auth-options.test.ts`.

---

## Verification Requirements

* Every finding or pass statement must cite verifiable `file:line` spans or read-only git command outputs.
* Zero speculative claims — trace actual types, schemas, workspace manifests, and regex behavior directly in source files.
* Clearly separate blocking defects (`CRITICAL` / `HIGH` / `MEDIUM`) from non-blocking polish observations (`LOW`).
* Explicitly document gates not re-executed due to the read-only mandate.

---

## Audit Verdict & Required Report Structure

* **`PASS`**: All `SIG-01`..`SIG-09` checks hold with `$0$` blocking (`CRITICAL` / `HIGH` / `MEDIUM`) defects. `fix/web-sonar-fix2` is ready to merge into `main`.
* **`PASS WITH ISSUES`**: All security, runtime, schema, and CI invariants hold; only minor (`LOW`) non-blocking observations remain.
* **`FAIL`**: Any `CRITICAL`, `HIGH`, or `MEDIUM` defect is confirmed (such as uncommitted `HEAD`, `RegisterSchema` rejecting `crypto.randomUUID()` on resend, `2x` bcrypt timing leak, broken `Number.isFinite` string coercion, broken CI workflow config, or SonarCloud Automatic Analysis conflict).

Write the concise report to `reports/web-phase-sonar-fix2-signoff-report.md` with sections:
1. Audit Metadata & Pre-Audit Git Anchor (`HEAD` SHA, commit cleanliness, `4cfd043..HEAD` diff summary)
2. Executive Audit Verdict (`PASS` / `PASS WITH ISSUES` / `FAIL`)
3. `SIG-01`..`SIG-09` Verification Matrix
4. Confirmed Defects (if any) & Non-Blocking Observations
5. Gates Not Re-Executed (Read-Only Mandate)
