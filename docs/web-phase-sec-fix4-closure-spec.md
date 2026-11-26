# Phase `WEB-SEC-FIX4` — Post-Revalidation Final Security Closure Specification (Rev 4)

## Closure Metadata

* **Assigned Implementer:** `Luna` (Primary Implementation Agent — resume directly from current uncommitted working tree on `fix/web-sec-fix4`)
* **Designated Sign-Off Auditor:** `DeepSeek` (Independent Read-Only Verification Agent)
* **Team:** Heaven Technologies (`Heaven-Technology-Group-Co-Ltd_Calculatorai`)
* **Baseline Commit (`origin/main`):** `c3de9ffe95899f72fa3608e315945afc46268f7c` (merge of PR `#4` / `fb402ee`)
* **Working Branch:** `fix/web-sec-fix4` (**Draft PR ONLY**)
* **Source Audit Reports:**
  * Run 1: `Report/security-audit-2026-11-26.md`
  * Run 2 (Delta Revalidation on current worktree): `Report/security-audit-2026-11-26-fix4-revalidation.md` (`C1`..`C6`, `N1`..`N2`, `§8` Verification Gaps, `§11` Hygiene)
* **Implementation Spec:** `docs/web-phase-sec-fix4-closure-spec.md`
* **Deliverable Implementation Report:** `reports/web-phase-sec-fix4-luna-report.md`
* **Deliverable PR Body:** `reports/web-phase-sec-fix4-pr-body.md`

---

## Engineering Mandate & Strict Boundary Rules

1. **Preserve Verified Run-2 Closures in Current Worktree:**
   * Keep the 9 confirmed Run-1 fixes already verified in your working tree (`authorize()` dual limiter & timing equalizer, `consume_rate_limit` RPC + `reset_at` CAS fallback, `history` quota/bounds, `page-views` bounds, `seed-admin.ts` env migration, `admin/control` fail-closed snowflake allowlist + limiter + cooldown, `forgot-password` `"password_reset"` scoping + `"email_verify"` token type preservation, `analytics/report` webhook URL check, `/api/finance` CSRF + `admin.id` attribution, `site_settings` maintenance mode, `permissions: contents: read` in CI, and removal of dead `AuthGuard`/`AdminGuard`).
2. **Historical Migration Immutability (`001`..`009` Freeze):**
   * **Do NOT modify, rename, or delete `supabase/migrations/001_*.sql` through `009_*.sql`.**
   * Keep all SQL changes in the single idempotent forward migration **`supabase/migrations/010_security_hardening.sql`**, fully aligned with live columns (`rate_limits.reset_at`, `verification_tokens.type = 'email_verify'`, `site_settings`).
   * **Do NOT alter `audit_logs.admin_user_id` to `UUID`**, and **do NOT modify `sanitizeSearchTerm`** (rejected again in Run-2 `§12.1`).
3. **Zero-Suppression & Clean Worktree Mandate:**
   * Do **NOT** add `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, or `NOSONAR`.
   * Remove any untracked scratch credential/token scripts in the worktree (specifically check for and delete untracked **`get-token.ts`** flagged in Run-2 `§10.14` / `§11` so it is never committed).
4. **Draft PR Mode Mandate:**
   * Commit cleanly on `fix/web-sec-fix4`, push to `origin`, and open **ONLY a Draft Pull Request (`--draft`)** (or provide the exact ready-to-run `--draft` CLI command if `gh` is unauthenticated).

---

## Final Delta Closure Checklist (`R2-01` .. `R2-07`)

### `R2-01` — Last-Administrator & Self-Lockout Invariant Across All User Mutations (Run-2 `C1` — MEDIUM)

1. **Shared Guard Module (`src/lib/admin/user-guard.ts`):**
   * Create a single shared guard used by **both** `POST /api/users/[id]/ban/route.ts` and `PUT /api/users/[id]/route.ts`:
     * **Self-protection:** If `targetId === admin.id` and the mutation sets `is_banned === true` or `is_admin === false`, reject with `403` (`"Cannot ban or demote your own administrator account"`).
     * **Last-active-admin invariant:** Fetch the target user's current `is_admin` and `is_banned` state. Whenever a mutation would transition an currently active administrator (`target.is_admin === true && target.is_banned === false`) into a banned (`change.is_banned === true`) or non-admin (`change.is_admin === false`) state, query `public.users` for active administrators (`is_admin = true` and `is_banned = false`). If the count of active administrators is $\le 1$ (or only `targetId` remains), reject with `403` (`"Refusing to ban or demote the last active administrator"`).
   * Note: `POST /api/users/[id]/unban` restores access (`is_banned: false`) and must remain allowed for valid admins.

### `R2-02` — Explicit Proxy-Header Trust Anchor for Rate Limiting (Run-2 `N1` — Top Strategic Lead)

1. **Environment-Driven Trusted Header Selection (`src/lib/client-ip.ts`):**
   * Introduce explicit proxy trust scoping via `process.env.TRUSTED_IP_HEADER` (`"x-nf-client-connection-ip" | "x-forwarded-for" | "x-real-ip" | "none"`):
     * `"none"`: ignore all request IP headers and return `"unknown"` immediately (prevents header spoofing when a Node/PM2 server is exposed without a header-overwriting reverse proxy).
     * `"x-nf-client-connection-ip"`: inspect **only** `x-nf-client-connection-ip` (never falling back to spoofable `x-forwarded-for` or `x-real-ip`).
     * `"x-forwarded-for"`: inspect **only** the rightmost hop of `x-forwarded-for` (ignoring spoofed `x-nf-client-connection-ip`).
     * `"x-real-ip"`: inspect **only** `x-real-ip`.
     * When `TRUSTED_IP_HEADER` is unset: if `process.env.NETLIFY === "true"`, trust **only** `x-nf-client-connection-ip`; in `NODE_ENV === "production"` when `NETLIFY !== "true"`, default safely to `"none"` unless configured; in test/dev (`NODE_ENV !== "production"` and `NETLIFY !== "true"`), preserve the existing multi-header fallback order so existing local unit tests remain green.
2. **Pin Deployment Configs (`netlify.toml` & `ecosystem.config.js`):**
   * Set `TRUSTED_IP_HEADER = "x-nf-client-connection-ip"` in `netlify.toml` `[build.environment]`.
   * Set `TRUSTED_IP_HEADER: "none"` (with a clear comment explaining how to switch to `"x-forwarded-for"` once behind nginx/Cloudflare) in `ecosystem.config.js` if `ecosystem.config.js` is tracked in the repo.

### `R2-03` — Bootstrap Account Neutralization Without Sole-Admin Lockout (Run-2 `C2` — MEDIUM)

1. **Forward Neutralization in `supabase/migrations/010_security_hardening.sql`:**
   * Do **NOT** place any password literal inside `010_security_hardening.sql`, and do **NOT** touch `003_fix_schema_mismatch.sql`.
   * Append an idempotent `DO $$ ... $$` block to `010_security_hardening.sql` that:
     * Updates `public.users` setting `password_hash = NULL, email_verified = NULL, is_admin = FALSE` where `lower(email) = 'admin@calculatorai.click'` **AND** (`is_admin = FALSE` **OR** another active unbanned admin exists with `lower(email) <> 'admin@calculatorai.click'`).
     * Emits `RAISE WARNING` if `admin@calculatorai.click` is currently the sole active admin in `public.users`, instructing the operator to rotate its password and provision a dedicated admin email immediately.

### `R2-04` — Write-Ahead Audit Ordering & Fail-Closed Recovery Limiters (Run-2 `C3`, `C4` — LOW)

1. **Write-Ahead Audit Helper (`src/lib/admin/audit.ts` + Admin Mutating Routes, `C3`):**
   * Eliminate the post-mutation audit gap where a DB mutation commits before `writeAuditLog` throws `500`.
   * Provide `withAuditLog(entry, mutateFn)` (or reorder call sites) using the exact live audit table schema in `src/lib/admin/audit.ts`:
     1. Insert the audit row **before** running the privileged mutation (throwing immediately if the audit insert fails, so **zero** state mutation occurs).
     2. Execute `await mutateFn()`.
     3. If `mutateFn()` throws, attempt a best-effort compensating `.delete().eq("id", insertedAuditId)` on the pre-written audit row (if `id` is returned) and rethrow the original error.
   * Apply across privileged admin mutating handlers (`users/[id]`, `ban`, `unban`, `plan`, `settings`, `finance/**`).
2. **Strict Rate Limiting on Credential-Recovery Paths (`C4`):**
   * Switch `src/app/api/auth/verify/route.ts`, `src/app/api/auth/reset-password/route.ts`, and the per-IP tier of `src/app/api/auth/forgot-password/route.ts` from fail-open `checkRateLimit` to **`checkRateLimitStrict`**, returning `503` when the rate-limit backend fails unexpectedly and `429` when quota is exhausted.

### `R2-05` — Status Privacy Cleanup, 72-Byte Password Cap & Prototype-Safe Lookup (Run-2 `C5`, `C6`, `§11`)

1. **Remove `lastCommandAt` & Add Bounded `health_checks` Retention (`C5`):**
   * Remove `lastCommandAt` (alongside the already-removed `lastCommand` and `lastCommandBy`) from public `GET /api/status` (`src/app/api/status/route.ts`), `src/app/status/types.ts`, and `src/components/status/SystemInfo.tsx`.
   * In `010_security_hardening.sql`, add a non-superuser-safe helper or opportunistic cleanup inside `consume_rate_limit` / status maintenance (or `public.prune_old_health_checks()` callable by `service_role` + invoked at most once per hour from `/api/status` cache refresh) deleting `health_checks` rows older than $35\text{ days}$ so `health_checks` cannot grow without bound even when `pg_cron` is unavailable.
2. **Enforce 72-UTF8-Byte Bcrypt Ceiling on New Passwords (`C6`):**
   * Update `AUTH.MAX_PASSWORD_LENGTH` in `src/lib/api-constants.ts` from `128` to `72`.
   * In `RegisterSchema` (`src/app/api/auth/register/route.ts`) and `ResetPasswordSchema` (`src/app/api/auth/reset-password/route.ts`), enforce `new TextEncoder().encode(val).length <= 72` with a clear validation message (`"Password must not exceed 72 UTF-8 bytes"`) so multi-byte characters (such as Thai script) are never silently truncated by `bcryptjs`.
   * Keep `LoginClient.tsx` resend (`crypto.randomUUID()`, $36\text{ bytes}$) compatible, and do **not** reject $>72$-byte inputs at login before `bcrypt.compare` if not already gated.
3. **Prototype-Property Fix on `/api/status/history` (`§11`):**
   * Replace `rangeParam in RANGES` in `src/app/api/status/history/route.ts` with `Object.hasOwn(RANGES, rangeParam)` so `?range=toString` or `?range=constructor` cleanly returns `400` instead of `500`.

### `R2-06` — Complete All Missing Regression Test Suites (Run-2 `§8.1`..`§8.3`)

Every single test file flagged missing in Run-2 `§8` MUST exist and pass in `pnpm test`:

1. **`src/app/api/auth/forgot-password/route.test.ts` (new):**
   * Deletes only `type = "password_reset"` tokens while leaving `type = "email_verify"` tokens untouched.
   * Enforces per-recipient cap (`3 / 15 min`) returning generic `200` without sending mail, and uses `checkRateLimitStrict` (`503` on limiter backend failure).
2. **`src/app/api/history/route.test.ts` (new):**
   * Returns `429` with `Retry-After` when `RATE_LIMIT.HISTORY` is exceeded.
   * Returns `400` on oversized `result` ($>4096$) or oversized `inputs`.
   * Returns `503` when `maintenance_mode` is active.
3. **`src/app/api/users/[id]/route.test.ts` (new):**
   * `GET` returns explicit user fields and **never** includes `password_hash`.
   * `PUT` rejects unknown properties (`.strict()`), rejects self-ban/self-demotion (`403`), and rejects demoting/banning the last active admin (`403`).
4. **`src/app/api/users/[id]/ban/route.test.ts` (expand):**
   * Rejects self-ban (`403`), rejects banning the last active admin (`403`), allows banning a second admin when $\ge 2$ active admins exist (`200`), and aborts before mutating `users` when `audit_logs` write fails (`C3`).
5. **`src/lib/auth-options.test.ts` & `src/lib/client-ip.test.ts` (expand):**
   * `auth-options.test.ts`: rejects the 11th login attempt for the same `(ip, email)` with timing-equalized `bcrypt.compare`, does not lock out another IP, normalizes uppercase/whitespace email, and revokes deleted-user JWTs (`dbUser === null`).
   * `client-ip.test.ts`: tests `TRUSTED_IP_HEADER="x-nf-client-connection-ip"`, `"x-forwarded-for"` (ignoring spoofed `x-nf-client-connection-ip`), and `"none"` (`"unknown"`).
6. **Maintenance Mode & 72-Byte Password Tests:**
   * Assert `503` during maintenance mode on `register` and `create-checkout-session` (while webhook/admin remain exempt), and `400` on $>72$ UTF-8 byte Thai/ASCII passwords in `register` / `reset-password`.

### `R2-07` — Full Verification Gates, Hygiene Sweep, Commit & Draft PR

1. Confirm untracked `get-token.ts` does **not** exist in the worktree (delete if present).
2. Execute all 6 local verification gates after the final edit; every gate MUST exit `$0$`:
   * `pnpm type-check`
   * `pnpm lint` ($0$ errors, $0$ added suppressions)
   * `pnpm test`
   * `pnpm --dir discord-bot exec tsc --noEmit`
   * `pnpm build`
   * `python scripts/v3/measure.py` (restore `audit-data/metrics.json` via `git checkout --` if modified)
   * Verify `0` touched files across `supabase/migrations/001*`..`009*`.
3. Update `Log.txt`, write `reports/web-phase-sec-fix4-pr-body.md` and `reports/web-phase-sec-fix4-luna-report.md`, commit all phase deliverables cleanly on `fix/web-sec-fix4`, push to `origin`, and open **ONLY a Draft PR (`--draft`)** (or record the exact `gh pr create --draft` command if `gh` CLI is unauthenticated).

---

## Deliverable Report Structure (`reports/web-phase-sec-fix4-luna-report.md`)

1. **Implementation Metadata, Committed Git Anchor & Draft PR Status** (`origin/main` baseline `c3de9ffe`, committed `HEAD` SHA, `0`-diff proof on `001`..`009`, confirmation that `get-token.ts` is absent, Draft PR URL/command)
2. **Complete Run-1 + Run-2 Closure Ledger** (Run-1 `C1`..`C12` + `N1`..`N5`, and Run-2 `C1`..`C6` + `N1`..`N2` + `§8` + `§11`)
3. **`R2-01`..`R2-07` Surgical Resolution Matrix** (with exact committed `file:line` spans)
4. **Verification Gate Results & Exact New/Updated Test Case Names** (character-for-character across all test files)
5. **Operator Production Runbook** (`010_security_hardening.sql` execution & verification queries, sole-admin rotation check for `admin@calculatorai.click`, `TRUSTED_IP_HEADER` & `DISCORD_ADMIN_IDS` checks, and post-deploy smoke plan)
