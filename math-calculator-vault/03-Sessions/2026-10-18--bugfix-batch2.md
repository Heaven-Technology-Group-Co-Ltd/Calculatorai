---
date: 2026-10-18
type: session
tags: [bug-fix, security, hmac, impersonation, i18n-search]
---

# 2026-10-18 — Bug-fix batch 2 (HMAC replay, impersonate, token types, locale search)

## Fixed
1. **HMAC replay** — `x-timestamp` was freshness-checked but not signed. A captured valid request replayed with a fresh timestamp passed verification forever. Now the timestamp is bound into the signedData on both sides (`src/lib/admin/hmac.ts`, `discord-bot/src/lib/hmac.ts`); freshness check rejects future timestamps. Failing-first test proved the forgery pre-fix.
   **Deploy constraint: bot and server must ship together.**
2. **Impersonate** — wrote a bare UUID into the `next-auth.session-token` cookie while auth strategy is JWT: undecodable, impersonation never worked, and it destroyed the admin's session. Now mints a real JWT via `next-auth/jwt encode()` with `impersonatedBy` claim, 15-min maxAge, cookie name follows the auth-options convention. `sessions` table insert removed.
3. **Token type separation** — one `verification_tokens` table served both flows; email-verify tokens redeemed as password resets. Migration `009_verification_token_types.sql` adds `type` column; all four auth routes scope lookups and consume-deletes by type.
   **Deploy constraint: run 009 before deploying the code.** Old rows default to `email_verify` — outstanding reset links become unusable (acceptable).
4. **Locale search** — AppShell filter matched only title.en/title.th/cat.en and didn't trim. Now trims and matches title + cat across th/en/jp/ch/ko plus fStr.

## Verification
- tsc 0; vitest 34/34 (4 new HMAC tests, red→green proven).
- Browser drive on live dev server: search "正方形の面積" → Square Area card; "기하학" → geometry cards only; "zzzz_no_match" → 0 cards.
- Not runtime-verifiable from this repo: impersonation E2E and token flows need real Supabase + admin session.

## Commits
194e5da (batch 2) on top of the batch-1 tree.

## Backlog remaining (ranked)
status uptime traffic-shaped + 503-on-degraded, env import-time reads (lazy init), formatNum locale silent corruption ("1,5"→15), tan(90°) displayed as real number, division-by-zero in 35/45 formulas, restore-initializer-only, debounce flush on pagehide, x-forwarded-for spoofable.
