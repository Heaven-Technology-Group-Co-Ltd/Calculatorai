# Phase `WEB-SONAR-FIX2` — Security Triage, SonarCloud Zero-Debt & CI Hardening Specification

## Implementation Metadata

* **Assigned Implementer:** `Luna` (Primary Implementation Agent)
* **Team:** Heaven Technologies (`Heaven Technology Group Co., Ltd.`)
* **Project / Production Target:** `Calculatorai` (`https://calculatorai.click` on Netlify)
* **SonarCloud Project Key:** `Heaven-Technology-Group-Co-Ltd_Calculatorai`
* **Baseline Commit:** Post-PR-#2 `HEAD` on `main` (must contain merged `WEB-HC-FIX1` implementation `710591e015546b6b716b512da716659b4e48286e` / `4cfd0436328c933d03cfa18a381aa8d42f6e14b7`)
* **Prior Sign-Off Audit Report:** `reports/web-phase-hc-fix1-signoff-report.md` (`PASS WITH ISSUES`)
* **Implementation Spec:** `docs/web-phase-sonar-fix2-closure-spec.md`
* **Required Implementation Report:** `reports/web-phase-sonar-fix2-luna-report.md`
* **Next Pipeline Stage:** `docs/web-phase-sonar-fix2-signoff-audit-spec.md` (Read-Only Sign-Off Audit)
* **Closure Scope:** Surgical closure of high-value carry-over observations (`OBS-8`, `OBS-4`, `OBS-9`, and `§5` missing CI pipeline) from `WEB-HC-FIX1` Sign-Off, plus complete triage and code-level resolution of all `$20$` `OPEN` / `CONFIRMED` SonarCloud issues (`src/lib/auth-options.ts:14` Blocker, `src/components/login/LoginClient.tsx:94`, `src/hooks/useHistory.ts:143`, `scripts/v3/measure.py`, and the remaining `$16$` open issues) and elimination of the `$1$` SonarCloud analysis warning.

---

## Execution Mandate & Strict Scope Freeze Rules

1. **Capture Pre-Work Git Anchor FIRST:** Record `git rev-parse HEAD` on `main` (confirming `710591e` is an ancestor via `git merge-base --is-ancestor 710591e HEAD`), `git status --porcelain -uall`, and `git worktree list` before modifying any file. Create a dedicated feature branch `fix/web-sonar-fix2`.
2. **Controlled Scope Unfreeze & Freeze Boundaries:**
   * **`src/lib/auth-options.ts` is UNFROZEN strictly for `SNR-02`** (resolving the `L14` `bcrypt` Blocker). Do NOT alter session cookie names, JWT token shape, OAuth providers, or admin role checks.
   * **Database Migrations Freeze (`$0$`-Touch Mandate):** Touch **`$0$` files** inside `supabase/migrations/` (`001_initial_schema` .. `009_verification_token_types`).
   * **`discord-bot/` Conditional Freeze:** Touch **`$0$` files** inside `discord-bot/` **unless** one or more of the `$20$` SonarCloud `OPEN`/`CONFIRMED` issues explicitly targets a file inside `discord-bot/`. Every touched file in `discord-bot/` (if any) must cite its exact SonarCloud rule/issue in the report.
3. **Zero Suppression Mandate:**
   * Do NOT add `// NOSONAR`, `# NOSONAR`, `eslint-disable`, `@ts-ignore`, or `@ts-expect-error` anywhere in the codebase to mask static analysis or lint findings.
   * Fix every genuine finding in code so SonarCloud's scanner clears it naturally on the next scan. If any SonarCloud finding is provably an irreducible False Positive that cannot be refactored without breaking functionality, leave `$0$` inline suppressions and document its exact `file:line`, rule key, and justification in the report's **Manual SonarCloud UI Triage Table** for human sign-off.
4. **Preserve `WEB-HC-FIX1` Invariants:** Keep `pnpm.cmd lint` errors at literally **`$0$`** (per `Log.txt` ceiling `0`), keep `poweredByHeader: false`, keep `/api/[...path]` JSON `404` precedence, and preserve all CSRF / Auth / Security Header invariants in `src/proxy.ts`.
5. **Windows PowerShell Execution Rule:** Invoke toolchain shims via `.cmd` (`pnpm.cmd`, `.\node_modules\.bin\tsc.cmd`) where PowerShell `ExecutionPolicy` applies.
6. **Do NOT write to `MCP second-brain`** (reserved for Closeout after human approval and Sign-Off Audit `PASS`).

---

## Surgical Closure Checklist (`SNR-01` .. `SNR-08`)

### `SNR-01` — Carry-Over Hardening from `WEB-HC-FIX1` (`OBS-8`, `OBS-4`, `OBS-9`) (HIGH)

1. **`OBS-8` — Netlify-Authoritative Client IP Resolution (`src/lib/client-ip.ts`):**
   * Update `getClientIpFromHeaders` to inspect `x-nf-client-connection-ip` **first** (Netlify's authoritative single-IP connection header for Serverless Functions), before falling back to the rightmost hop of `x-forwarded-for`, then `x-real-ip`, then `"unknown"`.
   * Sanitize the extracted candidate string: trim whitespace, take the last comma-delimited token if a local emulator forwards a list, strip any trailing IPv4 `:port` suffix (without corrupting IPv6 addresses), and reject empty strings so malformed local dev headers never poison rate-limit buckets.
   * Add unit tests in `src/lib/client-ip.test.ts` (or existing test file) covering:
     1. `x-nf-client-connection-ip` present alongside spoofed `x-forwarded-for` $\rightarrow$ returns `x-nf-client-connection-ip`.
     2. `x-nf-client-connection-ip` absent $\rightarrow$ returns rightmost `x-forwarded-for` hop.
     3. IPv4 with port (`1.2.3.4:5678`) and IPv6 (`2001:db8::1`) normalization.
     4. All IP headers absent $\rightarrow$ returns `"unknown"`.
2. **`OBS-4` — `NaN` Timestamp Guard (`src/app/api/status/route.ts`):**
   * In `checkDiscord` (around `L161`), guard `const seenMs = new Date(last_seen).getTime();` with `if (Number.isNaN(seenMs))` returning `{ status: "error", latencyMs, message: "Invalid bot heartbeat timestamp" }` so a corrupted timestamp can never evaluate `NaN > threshold === false` and falsely report `"ok"`.
   * Add `$1$` unit test in `src/app/api/status/route.test.ts` asserting malformed `last_seen` $\rightarrow$ `status: "error"`.
3. **`OBS-9` — External Modal Close Tab Reset (`src/components/features/info/InfoModal.tsx` & `AppShell.tsx:325`):**
   * Ensure manual `tabChoice` in `InfoModal` resets cleanly whenever the modal re-opens or unmounts/closes via `AppShell.tsx:325` (e.g., by conditionally mounting `InfoModal` when open, passing a `key`, or scoping `tabChoice` to the open session without triggering `react-hooks/set-state-in-effect`).

### `SNR-02` — Forensic Triage & Zero-Literal Closure of `src/lib/auth-options.ts:14` (`bcrypt` Blocker) (CRITICAL)

1. Inspect `src/lib/auth-options.ts` (`L1`..`L60`) and classify the hardcoded `bcrypt` hash at `L14`:
   * **Path A — Anti-Timing / Anti-Enumeration Dummy Hash:** If the `$2a$`/`$2b$` literal is used solely as a fallback target for `bcrypt.compare(...)` when a user lookup returns `null` (or has no password hash):
     * **Preserve the timing-attack defense** (`bcrypt.compare` MUST still execute with the same cost factor on non-existent accounts).
     * **Eliminate the hardcoded hash literal from source code:** Replace the static `$2a$`/`$2b$` string literal with a module-scoped runtime-generated dummy hash computed once from `crypto.randomUUID()` (e.g., `const DUMMY_PASSWORD_HASH = bcrypt.hashSync(crypto.randomUUID(), 10);` or lazy singleton promise `getDummyPasswordHash()`), so `$0$` `bcrypt` hash literals exist in git tracked code, SonarCloud's secret/hash rule clears with `$0$` suppressions, and no input password can ever accidentally match the dummy hash.
   * **Path B — Real / Fallback Account Credential:** If the hash can ever authenticate a session (e.g., fallback admin login):
     * Delete the fallback authentication branch immediately (fail closed).
     * Flag **`CRITICAL SECRET ROTATION REQUIRED`** prominently in `§2` of the implementation report so production DB credentials and `NEXTAUTH_SECRET` are rotated immediately.
2. Add/update unit tests for `auth-options.ts` proving:
   * Login with an unknown email still invokes `bcrypt.compare` (constant-time path preserved) and rejects authentication (`null`).
   * Valid user authentication continues to pass unchanged.

### `SNR-03` — Closure of `src/components/login/LoginClient.tsx:94` (Hard-Coded Password Check) (HIGH)

1. Inspect `src/components/login/LoginClient.tsx` around `L94` (*"Review this potentially hard-coded password"*):
   * Verify whether `L94` contains an actual test/demo credential or a false-positive identifier (such as a translation/error message constant, Zod field message, or input attribute pattern triggering Sonar rule `typescript:S2068`).
   * If a real/demo credential exists in client code, remove it completely.
   * If a naming/literal pattern triggered `S2068` (e.g., `const PASSWORD_ERROR = "..."` or object literal `{ password: "..." }`), refactor the variable/structure idiomatically so neither credentials nor S2068 heuristic triggers remain in `LoginClient.tsx`.

### `SNR-04` — Closure of `src/hooks/useHistory.ts:143` (Safe Cryptographic ID Generation) (MEDIUM)

1. Inspect `src/hooks/useHistory.ts` around `L143` (*"Make sure that using this pseudorandom number generator is safe here"*):
   * Replace `Math.random()` ID/nonce generation with `crypto.randomUUID()` (with a `crypto.getRandomValues` fallback only if an environment in the test runner lacks `randomUUID`, though Node 24 and modern browsers provide `globalThis.crypto.randomUUID()` natively).
   * Verify existing `useHistory` tests still pass and IDs remain collision-free strings compatible with downstream API/storage schemas.

### `SNR-05` — Closure of `scripts/v3/measure.py` (Linear-Time Regex Refactoring) (MEDIUM)

1. Inspect `scripts/v3/measure.py` (*"Simplify this regular expression to reduce its runtime, as it has super-linear performance due to backtracking"*):
   * Refactor all nested, ambiguous, or overlapping quantifiers (ReDoS patterns) into deterministic linear-time `$O(n)$` expressions (or simple string splitting/parsing where cleaner).
   * Confirm script behavior on sample inputs remains identical.

### `SNR-06` — Complete Enumeration & Closure of Remaining `$16$` SonarCloud Issues (MEDIUM)

1. Discover and list all `$20$` `OPEN` / `CONFIRMED` issues across the repository:
   * If `SONAR_TOKEN` or public SonarCloud API access (`https://sonarcloud.io/api/issues/search?componentKeys=Heaven-Technology-Group-Co-Ltd_Calculatorai&issueStatuses=OPEN,CONFIRMED&ps=100`) is available in the environment, fetch the authoritative `$20$`-item list directly.
   * If the SonarCloud project requires private auth unavailable in the local shell, run a comprehensive static sweep matching SonarJS / SonarTS / SonarPython high-impact rules across `src/`, `discord-bot/`, and `scripts/` (unused variables/imports, cognitive complexity, nested ternaries, redundant type assertions, unhandled promises, duplicate string literals, accessibility/JSX keys, regex backtracking, and security hotspots) AND explicitly report whether live SonarCloud API enumeration succeeded or requires the human operator's exported `sonar-issues.json`.
2. Resolve every confirmed issue cleanly in source code with `$0$` regressions and `$0$` lint suppressions.

### `SNR-07` — `sonar-project.properties` & Analysis Warning Closure (LOW)

1. Inspect repository root for `sonar-project.properties` / `.sonarcloud.properties`:
   * Create or refine `sonar-project.properties` for `Heaven-Technology-Group-Co-Ltd_Calculatorai` (`sonar.organization=heaven-technology-group-co-ltd` — verify exact org key from repo config if present, otherwise omit `sonar.organization` if bound via UI and configure scanner paths cleanly):
     * Explicitly declare `sonar.sources=src,discord-bot/src` (adjusting to actual directory layout).
     * Explicitly declare `sonar.tests=src` with `sonar.test.inclusions=**/*.test.ts,**/*.test.tsx,**/*.spec.ts,**/*.spec.tsx`.
     * Exclude non-production build/report/tooling noise (`node_modules/**`, `.next/**`, `coverage/**`, `reports/**`, `Report/**`, `docs/**`, `scripts/**` if `scripts/v3` is one-off offline benchmarking — **after** still fixing `measure.py` in `SNR-05` so nothing is swept under the rug).
     * Point `sonar.typescript.tsconfigPath=tsconfig.json` (eliminating the common TypeScript / SCM / shallow-clone / unindexed-file `analysis warning` shown on SonarCloud).

### `SNR-08` — Deterministic GitHub Actions CI Pipeline (`.github/workflows/ci.yml`) (MEDIUM)

1. Close Audit Report `§5` (*"the repository has no `.github/` directory, so no CI run corroborates those exit codes"*):
   * Create `.github/workflows/ci.yml` triggered on `push` to `main` and `pull_request`:
     * Runner: `ubuntu-latest`, `actions/checkout@v4` (`fetch-depth: 0` so SonarCloud blame works cleanly).
     * Setup `pnpm` (`>=11`, reading `packageManager` or `version: 11`) and `actions/setup-node@v4` with `node-version-file: '.nvmrc'` and `cache: 'pnpm'`.
     * Run `pnpm install --frozen-lockfile`.
     * Execute all `$5$` mandatory verification gates sequentially:
       1. `pnpm type-check`
       2. `pnpm lint`
       3. `pnpm test`
       4. `pnpm build` (providing safe dummy build-time public placeholders only if `next build` requires them, never real secrets)
       5. `pnpm --dir discord-bot exec tsc --noEmit` (or equivalent `discord-bot` install + `tsc --noEmit` matching repo workspace structure).

---

## Verification Requirements

* Every item in `reports/web-phase-sonar-fix2-luna-report.md` must cite exact `file:line` spans and verbatim command exit codes.
* Run and record all `$6$` mandatory local verification gates:
  1. `pnpm.cmd type-check` $\rightarrow$ exit `$0$` (`$0$` TypeScript errors)
  2. `pnpm.cmd lint` $\rightarrow$ exit `$0$` (`$0$` errors; `$0$` added `eslint-disable|@ts-ignore|@ts-expect-error|NOSONAR` across `git diff main..HEAD`)
  3. `pnpm.cmd test` $\rightarrow$ exit `$0$` (all `100` prior tests + new `SNR-01`/`SNR-02` tests passing)
  4. `pnpm.cmd build` $\rightarrow$ exit `$0$`
  5. `cd discord-bot; .\node_modules\.bin\tsc.cmd --noEmit` $\rightarrow$ exit `$0$`
  6. Regex scan across `src/lib/auth-options.ts` for `\$2[aby]\$\d{2}\$` $\rightarrow$ literally **`$0$` matches**.
* Run boundary-freeze check:
  * `git diff --name-only main..HEAD -- supabase/migrations/` $\rightarrow$ **`$0$` files**.

---

## Closure Verdict & Required Report Structure

* **`READY FOR SIGN-OFF AUDIT`**: All `SNR-01`..`SNR-08` invariants hold, all `$6$` local gates exit `$0$`, `$0$` `bcrypt` literals remain in `auth-options.ts`, and all `$20$` SonarCloud items are accounted for.
* **`PARTIAL / BLOCKED`**: If private SonarCloud API authentication prevents fetching the exact `$16$` unpictured issue keys, complete `SNR-01`..`SNR-05`, `SNR-07`, and `SNR-08` in full, mark status **`PARTIAL — AWAITING SONAR JSON FOR REMAINING 16`**, and provide the exact `curl` / export command needed.

Write the concise implementation report to `reports/web-phase-sonar-fix2-luna-report.md` with sections:
1. Implementation Metadata & Git Anchor (`main` baseline $\rightarrow$ `fix/web-sonar-fix2` `HEAD` SHA)
2. Executive Closure Verdict & `auth-options.ts:14` Forensic Classification (`Dummy Timing Hash` vs `Real Credential — Rotation Required`)
3. `SNR-01`..`SNR-08` Surgical Resolution Matrix (`file:line` spans)
4. Complete `$20$`-Issue SonarCloud Ledger (Rule, `file:line`, Resolution or Manual UI Triage Justification)
5. Verification Gate Results & Exact New Test Function Names (character-for-character)
