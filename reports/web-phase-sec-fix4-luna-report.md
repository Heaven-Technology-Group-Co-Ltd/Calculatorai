# WEB-SEC-FIX4 Rev4 — Implementation and Review Report

## 1. Metadata and Git anchor

- Baseline: `c3de9ffe95899f72fa3608e315945afc46268f7c` (`origin/main`); implementation commit: `6e126ce` on `fix/web-sec-fix4`.
- Migration `001`–`009` diff against baseline: zero files; `get-token.ts` was untracked and removed per spec. The report is in a separate commit after the implementation commit.
- Draft PR: create with `gh pr create --draft --base main --head fix/web-sec-fix4 --title "Harden security controls" --body-file reports/web-phase-sec-fix4-pr-body.md`. No independent sign-off or production deployment is claimed.

## 2. Run-1 and Run-2 closure ledger

| Finding | Status / evidence |
|---|---|
| Run 1 C1 | Login dual limiter, normalization and equalizer implemented; tests in `src/lib/auth-options.test.ts`. |
| C2 / N2 | Atomic rate RPC plus pre-migration fallback in `src/lib/rate-limiter.ts`; pre-migration concurrent inserts are not atomic. |
| C3 | Scoped reset deletion, per-recipient quota and strict recovery limiter. |
| C4 | Bounded history fields and strict quota. |
| C5 | Env-only seed; migration neutralizes historical bootstrap account subject to sole-admin protection. Operator must rotate and verify. |
| C6 | Maintenance stored in site settings with cache and guarded endpoints. |
| C7 | Last command fields removed from public status. |
| C8 / C9 | Write-ahead audit and authenticated finance attribution; multi-step writes remain non-transactional. |
| C10 | Admin-control allowlist, quota and failed-auth cooldown. |
| C11 | Page-view path and user-agent bounded. |
| C12 | Explicit user projection, strict update schema and administrator guard. |
| N1 | Not independently validated; see original audit for deployment context. |
| N3 | Status history burst limiter and cache. |
| N4 | Analytics webhook destinations validated before fetch. |
| N5 | Payments creation in migration; actual production schema and application are unverified. |
| Run 2 C1 | Guard checks self and last active admin in ban and user update. Count and mutation are separate: simultaneous requests can race; invariant is not concurrency-safe. |
| C2 | Conditional bootstrap neutralization with sole-admin warning in migration. |
| C3 | Audit inserted before mutation with best-effort deletion on failure; no transaction across multi-step mutations and compensation may erase evidence of a partial mutation. |
| C4 | Verify, reset and forgot recovery IP limits fail closed with 503 on limiter failure. |
| C5 | Command timestamp removed; service-role retention RPC added and called on cache refresh. |
| C6 | Password creation and reset enforce 72 UTF-8 bytes. Existing login behavior preserved. |
| N1 | Explicit trusted proxy header configuration; actual proxy behavior and origin exposure remain deployment facts. |
| N2 | RLS/users self-update policy remains unverified; Rev4 did not specify a policy migration. Review against live database before deployment. |
| §8 / §11 | Added regression suites; removed untracked token script and fixed prototype range lookup. Tests use mocks; database and concurrency behavior are not proven. |
| Rejected §12.1 | `sanitizeSearchTerm` and existing tests unchanged; no `audit_logs.admin_user_id` UUID change. |

## 3. R2 resolution matrix

- R2-01: `src/lib/admin/user-guard.ts:3`, `src/app/api/users/[id]/ban/route.ts:31`, `src/app/api/users/[id]/route.ts:81`; concurrency caveat above.
- R2-02: `src/lib/client-ip.ts`, `netlify.toml`, `ecosystem.config.js`.
- R2-03: `supabase/migrations/010_security_hardening.sql` bootstrap DO block.
- R2-04: `src/lib/admin/audit.ts`, user, settings, and finance mutation routes; strict recovery rate limits in auth routes.
- R2-05: `src/app/api/status/route.ts`, status UI, `010_security_hardening.sql`, password schemas, status history range guard.
- R2-06: new and updated test suites listed below. Concurrent last-admin, actual Postgres execution and full production smoke remain unverified.
- R2-07: local checks passed; draft PR for independent review only.

## 4. Local verification

- `pnpm type-check`: PASS; `pnpm lint`: PASS, 0 errors and 7 warnings; `pnpm test`: PASS, 40 files / 167 tests.
- `pnpm --dir discord-bot exec tsc --noEmit`: PASS; `pnpm build`: PASS; `python scripts/v3/measure.py`: PASS (G11=0, text-role failures=0, non-global CSS raw hex=0). Metrics file restored.
- `010` was not executed against PostgreSQL: no local `psql` or Docker runtime was found. No CI/SonarCloud outcome is asserted for this commit until remote checks finish.

Exact names of tests in new or updated suites:

- `src/lib/admin/audit.test.ts`: `does not mutate when the audit insert fails`; `removes the audit record and rethrows when the mutation fails`
- `src/lib/admin/user-guard.test.ts`: `refuses self ban or demotion`; `refuses removal of the last active administrator`; `allows removal when another active administrator exists`
- `src/lib/client-ip.test.ts`: `prefers x-nf-client-connection-ip over spoofed x-forwarded-for`; `takes the rightmost XFF hop when x-nf-client-connection-ip is absent`; `single-hop XFF works`; `normalizes IPv4 with port and preserves IPv6 addresses`; `strips port from bracketed IPv6 and preserves IPv4-mapped IPv6 addresses`; `falls back to x-real-ip`; `returns unknown when all IP headers are absent or empty`; `uses only the configured Netlify header`; `uses only the rightmost configured forwarded-for hop`; `ignores all headers when trust is disabled`
- `src/lib/auth-options.test.ts`: `returns null for non-existent email (anti-enumeration)`; `memoizes timing equalizer hash across consecutive unknown-email calls`; `returns null for wrong password even if account is banned or unverified`; `throws USER_BANNED only when password is correct`; `throws EMAIL_UNVERIFIED only when password is correct and not banned`; `returns user object when password is correct, verified, and not banned`; `blocks the eleventh attempt with a timing comparison without blocking another IP`; `revokes a JWT when its user has been deleted`
- `src/lib/rate-limiter.test.ts`: `strict rate limiting propagates read failures instead of resetting the counter`; `legacy rate limiting stays fail-open on read failures`; `uses the atomic RPC when present`; `uses the newest legacy row when the RPC is unavailable`
- `src/app/api/auth/forgot-password/route.test.ts`: `deletes password reset tokens without deleting verification tokens`; `returns the generic success when the recipient cap is reached`; `returns 503 when the rate limiter fails`
- `src/app/api/history/route.test.ts`: `returns 429 and Retry-After when the quota is exhausted`; `rejects oversized result and inputs`; `returns 503 during maintenance`
- `src/app/api/users/[id]/route.test.ts`: `rejects unknown fields`; `rejects self-ban and last-admin demotion through the shared guard`; `uses a projection that excludes password_hash`
- `src/app/api/users/[id]/ban/route.test.ts`: `bans user and immediately revokes all active sessions`; `rejects self-ban and the last active administrator`; `does not mutate when audit creation fails`
- `src/app/api/auth/register/route.test.ts`: `rejects passwords exceeding 72 UTF-8 bytes`; `rejects registration during maintenance`
- `src/app/api/auth/reset-password/route.test.ts`: `rejects passwords exceeding 72 UTF-8 bytes`
- `src/app/api/payments/create-checkout-session/route.test.ts`: `rejects checkout during maintenance`; `rejects redirect URLs that only match an attacker-supplied Host header`; `fails closed when the app origin is not configured`; `accepts successUrl with Stripe template variable {CHECKOUT_SESSION_ID}`; `accepts redirect URLs on the configured app origin`
- `src/app/api/admin/control/route.test.ts`: `succeeds (200) for valid Bot HMAC request without any browser cookie`; `returns 403 for invalid HMAC signature or unauthorized x-caller-id`; `returns 401 for unauthenticated request with neither HMAC nor admin cookie`; `limits bursts before HMAC verification`; `throttles audit dispatch for unauthenticated bursts`

## 5. Operator runbook (not executed)

1. Review and apply `supabase/migrations/010_security_hardening.sql` on a backed-up, representative staging database first, then on the approved production target. Inspect SQL notices and verify RPC grants (`consume_rate_limit`, `prune_old_health_checks`), `idx_rate_limits_identifier_unique`, payment duplicates and RLS. Verify a deployment before migration still uses the fallback.
2. Check bootstrap status: `SELECT id, email, is_admin, is_banned FROM public.users WHERE lower(email) = 'admin@calculatorai.click';`. If it is the sole active admin, heed the warning: rotate through the approved password-reset process and create a dedicated active administrator before rerunning the neutralization. Do not put plaintext passwords into SQL history.
3. Verify `TRUSTED_IP_HEADER` matches the actual trusted proxy (Netlify: `x-nf-client-connection-ip`; direct PM2: `none`) and confirm the edge overwrites that header. Confirm `DISCORD_ADMIN_IDS` or `ADMIN_DISCORD_IDS` has the intended snowflake IDs.
4. Smoke-test login throttling and timing, password-reset and verification links, admin ban/demotion protection, write-ahead audit failure, maintenance and exempt Stripe webhook, history quota, status privacy/retention, and allowed/blocked Discord targets. Independently validate concurrent administrator changes and transactional needs before production.
