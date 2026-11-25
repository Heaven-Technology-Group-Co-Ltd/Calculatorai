# WEB-SONAR-FIX2 — Sign-Off Audit Report (DeepSeek, read-only)

**Phase:** `WEB-SONAR-FIX2` · **Audit spec:** `docs/web-phase-sonar-fix2-signoff-audit-spec.md`
**Date:** 2026-11-25 17:20 (Asia/Bangkok)
**Mode:** strict read-only. No build, lint, test, type-check, `next start`, `tsc`, `measure.py`, install, or commit.

---

## 1. Audit Metadata & Pre-Audit Git Anchor

| Item | Value |
|---|---|
| `git rev-parse HEAD` | `4cfd0436328c933d03cfa18a381aa8d42f6e14b7` |
| `git branch --show-current` | `fix/web-sonar-fix2` |
| `git merge-base --is-ancestor 710591e HEAD` | exit `0` (holds) |
| `git merge-base --is-ancestor 4cfd043 HEAD` | exit `0` (holds — trivially, HEAD **is** 4cfd043) |
| **`git rev-list --count 4cfd043..HEAD`** | **`0` commits** |
| `git status --porcelain -uall` | **23 modified tracked files**, 8 untracked, **0 staged** |
| `git diff --stat` | 23 files changed, **+147 / −45** |
| `git worktree list` | one checkout, `C:/Users/krmak/Documents/GitHub/Calculatorai 4cfd043 [fix/web-sonar-fix2]`, 0 prunable |
| Untracked | `.github/workflows/ci.yml`, `sonar-project.properties`, `reports/web-phase-sonar-fix2-luna-report.md`, `docs/web-phase-sonar-fix2-closure-spec.md`, `docs/web-phase-sonar-fix2-signoff-audit-spec.md`, + 3 carry-over files from earlier phases |

**The implementation of this phase exists only in the working tree.** All 23 source edits plus both new deliverables (`ci.yml`, `sonar-project.properties`) are uncommitted; the branch has advanced **zero** commits past the pre-phase anchor. Luna's report section 1 never states a post-implementation commit SHA, and this audit confirms why.

---

## 2. Executive Audit Verdict

### **`FAIL`**

Two blocking items, both verifiable from source:

1. **SIG-01 — CRITICAL.** Requirement: HEAD advanced past `4cfd043` with **0** modified/staged tracked files. Actual: `0` commits, 23 modified tracked files. Per the audit spec, this fails `SIG-01` immediately.
2. **SIG-06 — MEDIUM (new defect introduced by this phase).** `HistorySidebar.tsx` now wraps a row that contains a delete `<button>` in a container with `role="button" tabIndex={0} onKeyDown` that fires the *restore* action on Enter/Space. Keyboard activation of the delete button is swallowed by the parent handler, so a keyboard user restoring focus to delete selects/restores the row instead of deleting it. See SIG-06 in section 3 and D-2.

One unverified environment risk is recorded (OBS-3, SonarCloud Automatic Analysis) that cannot be settled without the SonarCloud UI.

Everything else in the phase — the `OBS-8`/`OBS-4`/`OBS-9` carry-overs, the `bcrypt` timing equalizer, the `RegisterSchema` resend trap, the CSPRNG substitutions, the coercion conversions, the `measure.py` regexes, and CI viability — **holds up under static review**.

---

## 3. `SIG-01`..`SIG-09` Verification Matrix

### `SIG-01` — clean committed HEAD, scope freeze — **FAIL (CRITICAL)**

- `git rev-list 4cfd043..HEAD` = `0`; `git status` shows 23 `M` rows and 0 staged paths. The phase is unreviewable as a commit and cannot be merged as-is.
- Scope freeze inside the working diff: `git diff --name-only HEAD -- supabase/migrations/ discord-bot/ src/proxy.ts` → **0 files** (all three protected areas untouched).
- Tracked `.env*` files: **0** (`git ls-files` regex).
- Added inline suppressions across the working diff for `*.ts|*.tsx|*.js|*.py|*.yml` (`eslint-disable|@ts-ignore|@ts-expect-error|NOSONAR`): **0**. The two untracked deliverables were scanned separately: **0**.

### `SIG-02` — carry-over hardening (OBS-8, OBS-4, OBS-9) — **PASS**

**OBS-8 (`client-ip.ts:1-34`):**
- Priority order is exactly `x-nf-client-connection-ip` → `x-forwarded-for` → `x-real-ip` → `"unknown"` (`:27-33`).
- Comma lists: `split(",").map(trim).filter(Boolean)` then `tokens[tokens.length - 1]` (`:3-8`) — last non-empty token, so a client-prepended first hop cannot become the key.
- IPv4 `:port` strip is anchored: `/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/` (`:13-16`). It cannot touch `::ffff:1.2.3.4` because that string does not start with a digit — **the IPv4-mapped IPv6 form is preserved, not corrupted**.
- Bracketed IPv6 `:port`: `/^\[([^\]]+)\](?::\d+)?$/` → `[2001:db8::1]:443` becomes `2001:db8::1` (`:19-22`). Unbracketed `2001:db8::1` matches neither regex and is returned unchanged.
- Whitespace-only headers collapse to `null` → `"unknown"` (`:2, 5-7`).
- Tests (`client-ip.test.ts`): NF-priority over spoofed XFF (`:9`), rightmost XFF when NF absent (`:22`), IPv4 `:port` + IPv6 preservation (`:30`), all-empty → unknown (`:39`). **Not covered:** bracketed IPv6 *with* port and `::ffff:1.2.3.4` — both verified safe by reading the regexes, neither pinned by a test (OBS-4).

**OBS-4 (`status/route.ts:158-165`):** `const seenMs = new Date(...).getTime()` → `if (Number.isNaN(seenMs))` → `{ status: "error", message: "Invalid bot heartbeat timestamp" }` before the threshold comparison. Test `route.test.ts:121-130` sets `heartbeat = { last_seen: "not-a-timestamp" }` and asserts status `error`, the exact message, and `degraded` aggregate — a genuine malformed-string exercise, not a mock tautology.

**OBS-9 (`AppShell.tsx:317`):** `{showModal && <InfoModal show={showModal} onClose={closeModal} lang={lang} />}`. Unmounting resets `tabChoice` (`InfoModal.tsx:47`) and re-derives the tab from the viewport on the next mount. The dialog open/close effect (`InfoModal.tsx:56-73`) still runs on mount and its cleanup calls `dialog.close()` when open. Escape handling (`onCancel`) still works while mounted. **Unverified:** native focus return after unmount — no browser available under this mandate (OBS-5).

### `SIG-03` — `SNR-02` bcrypt blocker & timing safety — **PASS**

- **Path A confirmed.** In the pre-phase code the `$2b$12$…` literal was reached only after `if (error || !user || !user.password_hash)` and was followed by `return null`; it never granted a session. The current diff replaces it (`auth-options.ts:11-20, 55`) with `getTimingEqualizerHash()`.
- **Literal scan:** `\$2[aby]\$\d{2}\$` across all `src/**/*.ts|tsx` → **0 matches**.
- **Memoized, not per-request.** `let timingEqualizerHashPromise: Promise<string> | null = null;` + `timingEqualizerHashPromise ??= bcrypt.hash(randomUUID(), 12)` (`auth-options.ts:15-20`). The cost-12 hash runs **once per module instance**; every failed unknown-email login then costs a single `bcrypt.compare` against the cached hash — the same ~100 ms as a real compare. The `2x` timing oracle the spec warns about does **not** exist.
- **Cold-start nuance:** the first unknown-email login on a cold instance pays hash+compare (~200 ms) once. A real-email login on the same cold instance pays compare only. Single-sample, not statistically usable, and the alternative (static hash) was the blocker being removed → OBS-6 (LOW).
- **Rejection caching:** if `bcrypt.hash` ever rejected, `??=` leaves the rejected promise memoized forever, so every later unknown-email login would throw instead of returning `null`. `bcrypt.hash` with a valid cost rejects only on invalid input, which cannot happen here → OBS-7 (LOW, hardening).
- Session strategy, JWT callback, Google provider and admin role checks are untouched: the diff is exactly `+import randomUUID`, the hash helper, the `??=` line, and the one `compare` call.
- Test `auth-options.test.ts:36-56` asserts `bcrypt.hash` called with `(expect.any(String), 12)` and `bcrypt.compare` called with `("any_password", "runtime_dummy_hash")` — it asserts the real call contract, not a tautology. It does **not** assert single-call memoization (OBS-8, LOW).

### `SIG-04` — `SNR-03` resend schema compatibility — **PASS (no regression)**

Traced end to end:

1. `LoginClient.tsx:94` posts `{ email, password: crypto.randomUUID(), name: "" }` to `/api/auth/register`.
2. `RegisterSchema` (`src/app/api/auth/register/route.ts:30-37`) constrains `password` **only** by `.min(AUTH.MIN_PASSWORD_LENGTH)` and `.max(AUTH.MAX_PASSWORD_LENGTH)`. `src/lib/api-constants.ts:39-40` gives `MAX_PASSWORD_LENGTH: 128`, `MIN_PASSWORD_LENGTH: 8`. **There is no uppercase requirement and no special-character regex anywhere in the schema.**
3. A UUIDv4 is 36 characters → `8 ≤ 36 ≤ 128` → **validation passes**.
4. The handler never compares or stores that password on the resend path: `route.ts:137-156` burns one `bcrypt.hash` for timing, resends the verification mail when `!existing.email_verified`, and returns the same generic success.

So `handleResend` is **not** broken. The spec's suspected `HIGH/CRITICAL` regression does not exist.

Browser-context note: `crypto.randomUUID()` needs a secure context; the call sits **inside** the `try` (`LoginClient.tsx:90-101`), so on an insecure origin it throws into the existing `catch`. The catch then sets `resendSent = true` — the failure is swallowed and shown as success (pre-existing shape, now reachable by a new throw path) → OBS-9 (LOW). The same handler also ignores the HTTP status, so any `400`/`429` is invisible to the user (pre-existing, unchanged).

Separate pre-existing behaviour worth naming: for an **unknown** address this endpoint creates an account whose password hash is the random value (`route.ts:158-166`), i.e. a "resend" on a typo'd address creates an unloggable account. Not introduced by this phase (the old literal had the same effect) → OBS-10 (LOW).

### `SIG-05` — `SNR-04` / `SNR-05` CSPRNG & regex equivalence — **PASS**

- `useHistory.ts:85`: `Promise.reject(new Error(`History fetch failed: ${r.status}`))`. Every downstream consumer is a `.catch` that ignores the argument (the chain only sets an error flag), so passing an `Error` instead of `undefined` changes no branch.
- `useHistory.ts:141-147`: `Math.random()` is gone; the fallback is `Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, "0")).join("")` — 64 bits of CSPRNG entropy, and `crypto.getRandomValues` is available in **non**-secure contexts, so the fallback behaves even where `randomUUID` is unavailable. Correct layering.
- `measure.py:138`: `(--[A-Za-z0-9_-]+)[ \t]*:([^;{}]+);`. Neither quantifier nests, and `[^;{}]+` cannot pass the `;` that terminates the match → no exponential backtracking; worst case is a bounded forward scan per candidate (OBS-11, LOW, not the Sonar class being fixed).
- **Semantic preservation verified:** the captured value is `m.group(2).strip()` (`measure.py:142`), so dropping `\s*` after the colon cannot pollute token values, and a declaration whose value starts on the next line still matches because the newline lands inside group 2. The `:root` block contains **0** declarations that split the colon onto its own line (`globals.css` scan for name-only lines → 0), so nothing that used to match can stop matching.
- `measure.py:470-471`: `:([^)]+)` is bounded by `)`, and the result is `q.strip()` before counting — identical output.

### `SIG-06` — `SNR-06` accessibility & logic — **FAIL (MEDIUM) on one item, PASS elsewhere**

**D-2 — `HistorySidebar.tsx:30-58` (MEDIUM, new defect).** The row is now `div.hs-item[role="button"][tabIndex=0]` whose `onKeyDown` (`:36-41`) calls `e.preventDefault()` and then the **restore** handler for Enter/Space. Inside it sits the delete `<button onClick={onDeleteClick}>` (`:45-51`), whose handler stops only **mouse** propagation (`:24`) — there is no keydown guard and no `e.target !== e.currentTarget` check. With focus on the delete button, Enter's default activation is cancelled by the ancestor's `preventDefault()` and the ancestor's restore fires instead. Net effect: **keyboard users cannot delete a history row; pressing Enter/Space on the delete button restores the row.** Additionally, `role="button"` wrapping a real `<button>` is the nested-interactive pattern (WCAG 4.1.2), i.e. the fix trades one `S6848` finding for a new violation.

**`PurchaseClient.tsx:157-173` (LOW).** The plan card also wraps a nested `<button>` (`:241-257`), but the inner button and the card handler perform the **same** action (`setSelectedPlan(pkg.id)`), so the swallowed activation is harmless; only the nested-interactive pattern remains.

Everything else in `SIG-06` holds:

- `Space` scrolling is prevented on all three new `role="button"` handlers (`HistorySidebar.tsx:38`, `PurchaseClient.tsx:165`, `DashboardShell.tsx:141`).
- `FormulaHeatmap.tsx:69-77` converted to `<button type="button">` with `background: none; border: none; padding: 0; font: inherit` — no visual deformation.
- `DashboardShell.tsx:133-145` overlay: `role="button"`, `tabIndex={0}`, `aria-label`, Enter/Space → close, no nested interactive child.
- `StatusClient.tsx:221`, `InfoModal.tsx:138`, `LanguageDropdown.tsx:102` added `tabIndex={0}` to their `tablist`/`listbox` containers, which is the ARIA authoring pattern (roving `tabIndex` on the items themselves is unchanged).
- `SidebarNavItem.tsx:108` `{badge}`: prop is `React.ReactNode` (`:21`) and the only caller passes a JSX element (`SidebarFooter.tsx:55-58`), never a bare number, so no stray `"0"` can render; the old `badge && badge` was a no-op guard. Correct simplification.
- `VerifyClient.tsx:51` `void (async …)()`: the IIFE body is fully wrapped in `try/catch` (`:52-70`) and both failure paths call `setStatus`, so no unhandled rejection escapes.
- **Coercion audit (the spec's CRITICAL check) — all three conversions are safe:**
  - `hmac.ts:98-99`: `const ts = Number(timestamp)` converts the header string before the check, so `Number.isNaN(ts)` sees a number — identical semantics to `isNaN(ts)` for numbers.
  - `calc-utils.ts:5`: `n: number`, and `n.toPrecision(10)` on the next line would throw for a string, so the runtime value is a number.
  - `calc-utils.ts:55-57`: `const val = Number(normalized)` precedes the check, so `Number.isNaN(val)` also sees a number; the `raw === ""` branch is tested first.
  - No caller passes a numeric string into these three sites (`grep` across `src/` finds no other `isNaN`/`isFinite` remappings).
- `seed-admin.ts:74-77`: `seedAdmin().catch(err => { console.error(...); process.exit(1); })`. `grep` across `src/` finds **no** import of `seed-admin` anywhere, so it can only run as a CLI entrypoint — `process.exit` cannot kill a serverless worker.

### `SIG-07` — `SNR-07` `sonar-project.properties` — **PASS WITH UNVERIFIED RISK**

- `sonar.projectKey=Heaven-Technology-Group-Co-Ltd_Calculatorai` (`:1`) matches the spec string character-for-character.
- `sonar.organization=heaven-technology-group-co-ltd` (`:2`) is a lowercase slug, consistent with SonarCloud's rule. No other `sonar` reference exists in the repo (0 matches across `README.md`, `package.json`, `Log.txt`, `.github/`) to corroborate it → OBS-12 (unverifiable offline).
- Paths are real: `sonar.sources=src,discord-bot/src`, `sonar.tests=src`, test inclusions cover `*.test.ts(x)`/`*.spec.ts(x)`, exclusions name directories that all exist (`node_modules`, `.next`, `discord-bot/dist`, `coverage`, `reports`, `Report`, `docs`, `scripts`, `math-calculator-vault`), `sonar.typescript.tsconfigPath=tsconfig.json` exists.
- **OBS-3 (MEDIUM if it materialises, unverified):** the repo now ships a scanner config while `.github/workflows/ci.yml` contains **no** sonar step (`0` matches for "sonar" in `.github/`) and no `.sonarcloud.properties` exists. If SonarCloud **Automatic Analysis** is enabled for this project, the presence of `sonar-project.properties` can stop analysis. Settling this needs the SonarCloud UI (Administration → Analysis Method), which is outside a read-only repo audit.

### `SIG-08` — `SNR-08` CI cold-runner viability — **PASS**

- **Workspace trap cleared:** `pnpm-workspace.yaml` lists `"."` and `"discord-bot"`, so root `pnpm install --frozen-lockfile` populates `discord-bot/node_modules` and step 5 (`pnpm --dir discord-bot exec tsc --noEmit`) resolves a real `tsc` — `discord-bot/tsconfig.json` exists and `typescript` is in `discord-bot/package.json`.
- **Env-less build:** `pnpm build` was executed in this very repo earlier in the session with **no** `.env*` present and exited `0`, producing a build (prerendered pages included). That is direct evidence the CI build step does not require secrets. `SIG-07` of the previous phase also confirmed no `.env*` is tracked.
- **pnpm version duplication:** `.github/workflows/ci.yml:18-19` uses `pnpm/action-setup@v4` **without** `version:`; `package.json:5` carries `"packageManager": "pnpm@11.0.9"`. Only one source is specified, so the `action-setup` dual-specification error does not apply.
- Node comes from `node-version-file: .nvmrc` = `24` (`.nvmrc:1`), consistent with `engines` (`package.json:6-9`).
- `fetch-depth: 0` is set (`:16`), so history-dependent steps later on are not truncated.

### `SIG-09` — literal report accuracy — **PASS (with low drift)**

- **6/6 new and updated test names match character-for-character:** `client-ip.test.ts:9, 22, 30, 39`; `status/route.test.ts:121`; `auth-options.test.ts:36`. Luna's section 5 list omits `single-hop XFF works` and `falls back to x-real-ip` — correctly, they predate the phase.
- `3 / `4 coordinates checked against source: `client-ip.ts:1-34` (file is 34 lines) ✓, `route.ts:161-165` (guard at `:162`) ✓, `route.test.ts:121-130` ✓, `AppShell.tsx:317` ✓, `LoginClient.tsx:94` ✓, `useHistory.ts:85` and `:141-147` (`getRandomValues` at `:144`) ✓, `measure.py:138,470` ✓, `StatusClient.tsx:221` ✓, `DashboardShell.tsx:133-145` ✓, `FormulaHeatmap.tsx:69-77` ✓, `HistorySidebar.tsx:31-42` ✓, `InfoModal.tsx:138` ✓, `LanguageDropdown.tsx:102` ✓, `PurchaseClient.tsx:158-168` ✓, `SidebarNavItem.tsx:108` ✓, `VerifyClient.tsx:51` ✓, `hmac.ts:99` ✓, `calc-utils.ts:5,6,57` ✓, `seed-admin.ts:74-77` (`process.exit` at `:76`) ✓, `sonar-project.properties:1-10` ✓, `ci.yml:1-43` (file is 43 lines) ✓.
- **One drift:** `auth-options.ts` compare call is cited as `:59` but is at `:55` (``3 and `4 row 16`). Content correct, coordinate off by 4 → OBS-13.

---

## 4. Confirmed Defects & Non-Blocking Observations

### Blocking

| # | Sev | Defect | Evidence |
|---|---|---|---|
| **D-1** | **CRITICAL** | Phase work is entirely uncommitted: 0 commits past `4cfd043`, 23 modified tracked files, 2 untracked implementation deliverables. SIG-01 fails by definition; the branch cannot be reviewed or merged as a commit. | `git rev-list 4cfd043..HEAD = 0`; `git status --porcelain -uall` |
| **D-2** | **MEDIUM** | `HistorySidebar` row handler intercepts Enter/Space from the nested delete button: `e.preventDefault()` cancels the button's activation and the ancestor's restore runs. Keyboard users restore instead of deleting, and the row becomes a nested-interactive violation (WCAG 4.1.2). | `HistorySidebar.tsx:36-41`, `:45-51`, `:22-28` |

### Non-blocking (LOW)

| # | Observation | Evidence |
|---|---|---|
| OBS-1 | No test pins bracketed-IPv6-with-port or `::ffff:1.2.3.4`; both verified safe only by reading the regexes. | `client-ip.ts:13-22` |
| OBS-2 | Luna's section 5 claims 103 tests and 38/38 static pages; not re-executed here (mandate) and unverifiable from source. | — |
| OBS-3 | `sonar-project.properties` exists with no SonarCloud CI step; if Automatic Analysis is enabled, analysis may stop. Unverified (needs SonarCloud UI). | `sonar-project.properties:1-10`; `.github/` = 0 sonar matches |
| OBS-4 | header trust inversion risk: if Netlify forward a client-supplied `x-nf-client-connection-ip` instead of overwriting it, the rate-limit key becomes spoofable. Cannot be verified from the repo (same class as the previous phase's OBS-8). | `client-ip.ts:27-33` |
| OBS-5 | Focus return after `InfoModal` unmount is unverified without a browser. | `AppShell.tsx:317`; `InfoModal.tsx:56-73` |
| OBS-6 | First unknown-email login on a cold instance pays hash+compare; single sample, not a usable oracle. | `auth-options.ts:15-20,55` |
| OBS-7 | A rejected `bcrypt.hash` would stay memoized forever under `??=`. | `auth-options.ts:18` |
| OBS-8 | The anti-enumeration test proves the call contract but not the single-call memoization. | `auth-options.test.ts:48-53` |
| OBS-9 | `handleResend` swallows every failure (insecure-context throw, 400, 429) and shows "sent". Pre-existing shape, one new throw path. | `LoginClient.tsx:90-101` |
| OBS-10 | Resending to an unknown address creates an unloggable account (random password hash). Pre-existing. | `register/route.ts:158-166` |
| OBS-11 | `measure.py` regexes are linear per attempt but can rescan a long unterminated tail; not exponential. | `measure.py:138,470` |
| OBS-12 | `sonar.organization` cannot be corroborated offline (0 other sonar references in the repo). | `sonar-project.properties:2` |
| OBS-13 | Report cites `auth-options.ts:59`; the compare is at `:55`. | `auth-options.ts:55` |
| OBS-14 | `seed-admin.ts:20` points at `src/lib/seed-admin-run.ts`, which does not exist. | `seed-admin.ts:20` |
| OBS-15 | `pnpm`/`engines` and CI are consistent, but CI has never run (no `.github` history on the default branch). | `ci.yml` |

### Required to clear the phase

1. Commit the working tree on `fix/web-sonar-fix2` (code + `ci.yml` + `sonar-project.properties` + the Luna report), push, and re-run this audit against the new SHA.
2. Fix D-2: drop `role="button"`/`tabIndex`/`onKeyDown` from the row container and instead make the row a `<button>` *or* keep the container non-interactive and add a dedicated restore button; either way the nested delete button must keep its own keyboard activation (`e.stopPropagation()` on keydown is not enough — the parent must check `e.target === e.currentTarget`).
3. Decide OBS-3 explicitly: either enable CI-based analysis and keep the properties file, or delete the file so Automatic Analysis stays valid.

---

## 5. Gates Not Re-Executed (Read-Only Mandate)

Per audit spec section 2, none of the following were run, so this audit verifies them **statically only, not by execution**:

| Command | Luna's recorded result | Audit status |
|---|---|---|
| `pnpm type-check` | exit 0 | not executed |
| `pnpm lint` | exit 0, 0 errors / 15 warnings | not executed (static scan: 0 added suppressions) |
| `pnpm test` | exit 0, 21 files / 103 tests | not executed (all new test bodies read) |
| `pnpm build` | exit 0, 38/38 static pages | not executed (an env-less build succeeded earlier in this session, which is why SIG-08 env-lessness is rated pass) |
| `cd discord-bot; tsc --noEmit` | exit 0 | not executed |
| `python scripts/v3/measure.py` | exit 0, identical metrics | not executed |
| SonarCloud issue re-scan | 20 OPEN closed | not executed (no API access, no mutations permitted) |

Every statement in this report rests on source reads and read-only git commands executed against the working tree at `4cfd043` + 23 uncommitted edits.
