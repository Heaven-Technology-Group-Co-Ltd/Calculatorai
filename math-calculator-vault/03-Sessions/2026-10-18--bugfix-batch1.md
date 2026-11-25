---
date: 2026-10-18
type: session
tags: [bug-fix, security, payments, history]
---

# 2026-10-18 — Bug-fix batch 1: 6 confirmed bugs from full-repo audit

## Context
Full-repo investigation (4 read-only explorers) surfaced ~55 findings; this session fixed the confirmed critical set.

## Fixed
1. **Authed history contract broken** — client sent `{calcId,calcTitle,inputs,result,unit}`; server zod required `{expression,result}`. Every logged-in POST 400'd; GET mapped nonexistent columns. New pure module `src/lib/history-payload.ts` encodes payload into the existing `expression` column; `mapApiRow` decodes and reads the real `timestamp` column.
2. **Checkout trusted client price** — `amountCents` came from request body (comment claimed server-side). Now `planId` enum + server-side `PLAN_CATALOG` (999/7999/19900) + same-origin redirect guard.
3. **AdminGuard called nonexistent `POST /api/admin/check`** → now `GET /api/auth/admin-check`.
4. **`is_banned` never enforced** — `authorize()` rejects banned logins now.
5. **Stripe webhook marked processed before handler + swallowed errors with 200** — handler first, mark after, 500 → Stripe retries.
6. **proxy.ts** — CSP `frame-ancestors 'none` missing closing quote fixed; CSRF substring `origin.includes(host)` (bypassable via `evil-host.com` subdomains) replaced with URL host equality.

## Verification
Runtime curl repros on dev server (placeholder env); gates: tsc 0, vitest 30/30, scoped eslint 0 errors. Evidence: `verify-evidence/bugfix-verification-20261018.md`.

## Not runtime-verified
Authed history E2E roundtrip (needs real Supabase); proxy CSP emission (needs admin session on /dashboard).

## Open findings backlog (ranked)
HMAC timestamp unsigned (replay), impersonate writes UUID into JWT cookie (breaks both), status uptime = traffic-shaped, debounce/customUUID HTTP context, restore-initializer-only, email-verification token reuse across reset/verify, x-forwarded-for trusted.
