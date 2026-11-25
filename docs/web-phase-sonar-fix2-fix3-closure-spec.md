# Phase `WEB-SONAR-FIX2-FIX3` — Final Surgical Closure Specification

## Implementation Metadata

* **Assigned Implementer:** `Luna` (Primary Implementation Agent)
* **Team:** Heaven Technologies (`Heaven Technology Group Co., Ltd.`)
* **Project / Production Target:** `Calculatorai` (`https://calculatorai.click` on Netlify)
* **SonarCloud Project Key:** `Heaven-Technology-Group-Co-Ltd_Calculatorai`
* **Working Branch:** `fix/web-sonar-fix2` (currently at uncommitted working tree over `4cfd0436328c933d03cfa18a381aa8d42f6e14b7`)
* **Pre-Phase Anchor Commit:** `4cfd0436328c933d03cfa18a381aa8d42f6e14b7`
* **Prior Closure Spec:** `docs/web-phase-sonar-fix2-closure-spec.md`
* **Prior Implementation Report:** `reports/web-phase-sonar-fix2-luna-report.md`
* **Triggering Sign-Off Audit Report:** `reports/web-phase-sonar-fix2-signoff-report.md` (Verdict: `FAIL` on `D-1` and `D-2`, plus unverified Automatic Analysis conflict `OBS-3`)
* **Closure Report Output:** `reports/web-phase-sonar-fix2-fix3-luna-report.md`
* **Implementation Scope:** Surgical closure of blocking defects `D-1` (`CRITICAL`) and `D-2` (`MEDIUM`), deterministic resolution of `OBS-3` (`sonar-project.properties` $\rightarrow$ `.sonarcloud.properties`), nested-interactive cleanup in `PurchaseClient.tsx`, and micro-hardening of `OBS-1`, `OBS-7`, `OBS-8`, and `OBS-13`.

---

## Scope Freeze & Zero-Suppression Mandate

1. **Preserve Validated `WEB-SONAR-FIX2` Work:** Do **not** revert or destabilize the already-audited changes in `src/lib/client-ip.ts`, `src/app/api/status/route.ts`, `src/components/AppShell.tsx`, `src/components/login/LoginClient.tsx`, `src/hooks/useHistory.ts`, `scripts/v3/measure.py`, `src/lib/admin/hmac.ts`, `src/lib/calc-utils.ts`, `src/lib/seed-admin.ts`, or `.github/workflows/ci.yml`.
2. **Cross-Boundary Freeze (`$0$`-Touch Mandate):**
   * **Do NOT modify `supabase/migrations/`** (`$0$` files touched).
   * **Do NOT modify `discord-bot/`** (`$0$` files touched).
   * **Do NOT modify `src/proxy.ts`** (`$0$` files touched).
3. **Strict Zero Inline Suppression Rule:** Do **not** add `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, or `// NOSONAR` comments anywhere in source, test, script, or workflow files.
4. **Mandatory Commit Before Report Rule:** Unlike the prior run, all implementation changes **must** be staged and committed onto `fix/web-sonar-fix2` **before** running final status checks and **before** writing `reports/web-phase-sonar-fix2-fix3-luna-report.md`, so Section 1 records the real 40-character post-implementation `HEAD` SHA.

---

## Surgical Closure Checklist (`CLS-F3-01` .. `CLS-F3-04`)

### `CLS-F3-01` — Closure of `D-2`: Eliminate Nested Interactive Controls & Keyboard Swallow in `HistorySidebar.tsx` and `PurchaseClient.tsx` (CRITICAL / MEDIUM)

1. **Fix `D-2` in `src/components/features/history/HistorySidebar.tsx` (`L30-58`):**
   * **Root cause:** Adding `role="button"`, `tabIndex={0}`, and `onKeyDown` to the outer `div.hs-item` while keeping a child `<button>` for deletion caused `Enter`/`Space` on the delete button to bubble up, hit `e.preventDefault()`, cancel deletion, and fire the restore action instead — breaking keyboard deletion and violating WCAG 4.1.2 (nested interactive controls).
   * **Required DOM refactor:**
     1. Restore the outer `div.hs-item` to a **non-interactive layout container** (remove `role="button"`, `tabIndex={0}`, `onClick`, and `onKeyDown` from the outer `<div>`).
     2. Wrap the primary row content (expression / result / timestamp area) inside a native `<button type="button">` positioned as a **sibling** (never an ancestor) of the delete `<button type="button">`.
     3. Reset native button styling on the primary row button (`background: none`, `border: none`, `padding: 0`, `font: inherit`, `color: inherit`, `text-align: left`, `flex: 1`, `min-width: 0`, `cursor: pointer`) so visual appearance, hover states, text truncation, and layout match the pre-refactor row pixel-for-pixel.
     4. Remove any now-unnecessary `e.stopPropagation()` mouse hack if the two `<button type="button">` elements are true siblings, or keep clean independent handlers so clicking or pressing `Enter`/`Space` on Delete triggers **only** deletion and clicking or pressing `Enter`/`Space` on the item body triggers **only** selection/restoration.
2. **Eliminate companion nested-interactive pattern in `src/components/purchase/PurchaseClient.tsx` (`L157-257`):**
   * Inspect the plan card container (`role="button"` added in `WEB-SONAR-FIX2`) and its inner button (`L241-257`):
     * Ensure **zero** `<button>` or `[role="button"]` element wraps another `<button>` or `[role="button"]`, **and** ensure **zero** non-interactive `<div>`/`<span>` carries `onClick`/`onKeyDown` (`typescript:S6848`).
     * Cleanest pattern: if the inner element at `L241-257` performs the **exact same** plan-selection action (`setSelectedPlan(pkg.id)`) as the card itself and has no independent secondary action, render the outer card (or a stretched background sibling `<button type="button">`) as the single native interactive control and render the inner visual CTA pill as a `<span aria-hidden="true">` (or keep two sibling `<button type="button">` elements via `position: relative` / stretched overlay `position: absolute; inset: 0` if they perform distinct actions). Verify visual styling remains unchanged.
3. **Add focused component regression test (`src/components/features/history/HistorySidebar.test.tsx`):**
   * Verify that clicking / activating the primary history item button invokes the select/restore callback `$1$` time and the delete callback `$0$` times.
   * Verify that clicking / pressing keyboard activation on the delete button invokes the delete callback `$1$` time and the select/restore callback **`$0$` times**.
   * Assert via DOM query that `$0$` `button` or `[role="button"]` elements exist as ancestors of another `button`.

### `CLS-F3-02` — Deterministic Closure of `OBS-3`: Replace `sonar-project.properties` with `.sonarcloud.properties` (HIGH)

1. **Architectural Determination:** Prior repository history had no `.github/` workflows while SonarQube Cloud actively analyzed `main`, proving **SonarQube Cloud Automatic Analysis** is enabled. Under Automatic Analysis, committing `sonar-project.properties` aborts Automatic Analysis, whereas `.sonarcloud.properties` is natively honored.
2. **Required Action:**
   * Delete `sonar-project.properties` from the working tree (confirm it is neither tracked nor untracked).
   * Create `.sonarcloud.properties` at the repository root containing Automatic-Analysis-supported scope configuration:
     ```properties
     sonar.sources=src,discord-bot/src
     sonar.tests=src
     sonar.test.inclusions=**/*.test.ts,**/*.test.tsx,**/*.spec.ts,**/*.spec.tsx
     sonar.exclusions=**/node_modules/**,**/.next/**,**/discord-bot/dist/**,**/coverage/**,**/reports/**,**/Report/**,**/docs/**,**/scripts/**,**/math-calculator-vault/**
     ```
   * Note: Do **not** put `sonar.projectKey` or `sonar.organization` inside `.sonarcloud.properties` if not needed, or keep only properties supported by SonarQube Cloud Automatic Analysis so `.sonarcloud.properties` parses cleanly without warnings.

### `CLS-F3-03` — Micro-Hardening of Audit Observations (`OBS-1`, `OBS-7`, `OBS-8`, `OBS-13`) (LOW)

1. **`OBS-1` (`src/lib/client-ip.test.ts`):**
   * Add explicit assertions covering bracketed IPv6 with port (`"[2001:db8::1]:443"` $\rightarrow$ `"2001:db8::1"`) and IPv4-mapped IPv6 (`"::ffff:1.2.3.4"` $\rightarrow$ `"::ffff:1.2.3.4"`).
2. **`OBS-7` & `OBS-8` (`src/lib/auth-options.ts` & `src/lib/auth-options.test.ts`):**
   * In `src/lib/auth-options.ts` (`getTimingEqualizerHash`), attach a rejection reset on the memoized promise:
     ```ts
     timingEqualizerHashPromise ??= bcrypt.hash(randomUUID(), 12).catch((err) => {
       timingEqualizerHashPromise = null;
       throw err;
     });
     ```
   * In `src/lib/auth-options.test.ts`, assert single-call memoization across two consecutive unknown-email `authorize` calls within the same module instance: `bcrypt.hash` is called **`$1$` time** while `bcrypt.compare` is called **`$2$` times**.
3. **`OBS-13` (Line Coordinate Precision):**
   * Re-verify every `file:line` citation after final formatting (specifically `src/lib/auth-options.ts` around `L55-62`) so zero coordinate drift appears in the new report.

### `CLS-F3-04` — Closure of `D-1`: Full Gate Execution, Clean Git Commit & Hygiene (CRITICAL)

1. Execute all mandatory verification gates locally and confirm exit code `$0$`:
   * `pnpm.cmd type-check` $\rightarrow$ exit `$0$` (`$0$` errors)
   * `pnpm.cmd lint` $\rightarrow$ exit `$0$` (`$0$` errors, `$0$` added suppressions)
   * `pnpm.cmd test` $\rightarrow$ exit `$0$` (all test files including new `HistorySidebar` and updated `client-ip` / `auth-options` tests pass)
   * `pnpm.cmd build` $\rightarrow$ exit `$0$`
   * `pushd discord-bot; .\node_modules\.bin\tsc.cmd --noEmit; popd` $\rightarrow$ exit `$0$`
   * `python scripts/v3/measure.py` $\rightarrow$ exit `$0$`
2. **Stage and Commit on `fix/web-sonar-fix2`:**
   * Stage all modified and new deliverable files (`src/**`, `scripts/v3/measure.py`, `.github/workflows/ci.yml`, `.sonarcloud.properties`, plus phase docs/reports if following the `fix/web-hc-fix1` convention, while leaving only the final `fix3` report untracked or committed cleanly — ensure **zero** modified tracked files remain!).
   * Confirm `sonar-project.properties` does **not** exist in `git ls-files` or on disk.
   * Create a clean atomic commit on `fix/web-sonar-fix2` (e.g., `fix(sonar): close 20 SonarCloud issues, carry-over hardening, and CI gates (WEB-SONAR-FIX2)`).
   * Verify `git rev-list --count 4cfd0436328c933d03cfa18a381aa8d42f6e14b7..HEAD` is $\ge 1$ and `git status --porcelain -uall` shows **`$0$` modified (`M`) or staged (`A`/`M`/`D`) tracked files**.

---

## Required Implementation Report

Write a concise closure report to `reports/web-phase-sonar-fix2-fix3-luna-report.md` containing:

1. **Implementation Metadata & Committed Git Anchor:** Exact 40-char `git rev-parse HEAD` SHA, `git rev-list --count 4cfd043..HEAD`, `git diff --stat 4cfd043..HEAD`, `git status --porcelain -uall` output confirming `$0$` modified/staged tracked files, and cross-boundary `$0$`-diff proof (`supabase/migrations/`, `discord-bot/`, `src/proxy.ts`).
2. **Executive Closure Verdict:** `READY FOR FINAL SIGN-OFF AUDIT`.
3. **`CLS-F3-01`..`CLS-F3-04` Resolution Matrix:** Exact `file:line` spans at the committed `HEAD` SHA closing `D-1`, `D-2`, `OBS-3`, `PurchaseClient.tsx` nested-interactive cleanup, and `OBS-1`/`OBS-7`/`OBS-8`/`OBS-13`.
4. **Verification Gate Results & Exact New/Updated Test Case Names:** Exit codes, total file/test counts, and **character-for-character** names of every new or updated test case across `4cfd043..HEAD`.
