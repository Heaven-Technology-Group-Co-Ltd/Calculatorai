---
date: 2026-10-18
type: session
tags: [bug-fix, status-page, env-lazy-init, calc-correctness]
---

# 2026-10-18 — Bug-fix batch 3 (status honesty, lazy env, calc correctness)

## Fixed
1. **Status uptime was traffic-shaped** — stats came from `health_checks` rows written only when someone polled /api/status; zero samples showed fake 100%. Now `uptimePct: null` renders "No data" (types null-safe in `src/app/status/types.ts`; UI guarded in StatusClient/KPIBar). Same rule in /api/status/history buckets. **True continuous uptime still needs a cron writer** — flagged as follow-up.
2. **Degraded → HTTP 503** — external monitors read 503 as full outage. Endpoint now always 200 with `data.status` carrying state. Runtime proof: placeholder-supabase → 200.
3. **Env import-time clients** — supabase-adapter/auth-options/rate-limiter/stripe/seed-admin (+payments routes) now lazy like supabase-client. Runtime proof: dev boots with ZERO Supabase/Stripe env, `/` = 200 (was 500 on every request). env-less /api/status = 500 config error (acceptable).
4. **Silent calc corruption** — comma grammar: `-?\d{1,3}(,\d{3})+` = thousands, `-?\d+,\d+` = decimal comma, anything else invalid (was silent "1,5"→15, "1.234,56"→1.23456); tan(90°) = Infinity (was 16331239353195370 as real number); `chk` gained "a-b" difference syntax; guards: breakeven(p-vc), compound(n), bernoulli(rho), stress(A); `formatNum(NaN)` = "—" not "Infinity".

## Verification
tsc 0; vitest 8 files / 42 tests (calc tests red→green, 5 red pre-fix); eslint scoped clean; runtime curls above. Evidence: `verify-evidence/batch3-verification-20261018.md`.

## Not runtime-verified
/status UI null render (needs DB-backed page pass); production boot order.

## Backlog remaining (ranked)
Internal message leaks to clients (users routes + /api/status checks[].details), x-forwarded-for spoofable rate-limit identity, restore-initializer-only bug, debounce flush on pagehide, crypto.randomUUID HTTP-context, impersonate + status UI browser passes with real Supabase.
