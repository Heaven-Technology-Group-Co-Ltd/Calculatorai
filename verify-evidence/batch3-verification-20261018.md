# Batch 3 verification — 2026-10-18

## Status endpoint honesty
- /api/status with unreachable Supabase: HTTP **200** (was 503), body `data.status` carries degraded state; per-service `uptimePct: null, checks: 0` (was fake 100) — null renders "No data" in StatusClient/KPIBar.
- Same null rule applied to /api/status/history buckets.

## Lazy env init
- Dev server booted with NO SUPABASE/STRIPE env: `GET /` → 200, `GET /api/health` → 200 (before: 500 on every request from middleware import chain).
- All createClient/new Stripe hits now inside lazy getters (grep proof in delegate report; no module-top-level client construction outside supabase-client pattern).
- env-less /api/status → 500 config error (endpoint cannot check anything) — hard-config case, acceptable.

## Calc correctness (TDD, red→green)
Pre-fix red (verbatim):
- "1,5" → expected 1.5, got 15
- "1.234,56" → expected invalid, silently became 1.23456
- tan(90°) → huge finite number (16331239353195370), not Infinity
- biz_breakeven p==vc → expected divByZero, got Infinity
- formatNum(NaN) → "Infinity", now "—"
Post-fix: 42/42 tests. Comma grammar: thousands `-?\d{1,3}(,\d{3})+` strips commas; single decimal comma `-?\d+,\d+` → dot; any other comma form → invalid input. chk gains "a-b" difference syntax (breakeven p-vc); extensions: biz_breakeven(p-vc), biz_compound_interest(n), ce_bernoulli(rho), me_stress_strain(A). Deliberate non-additions with rationale (biz_npv/fi_npv r=0 valid; elasticity/gini expression-level divisors).

## Gates
tsc 0 · vitest 8 files / 42 tests passed · scoped eslint clean (1 pre-existing StatusClient set-state error outside batch scope).

## Not runtime-verified
status UI null-render (needs browser pass on /status with DB), production env boot order.
