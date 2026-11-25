# Bug-fix verification — 2026-10-18

## Baseline (before fix)
- GET /api/admin/check → HTTP 404 (endpoint never existed; AdminGuard.tsx called it forever)
- POST /api/payments/create-checkout-session with {"productName","amountCents":1,...} → would create a 1-cent Stripe session (schema accepted client price; unit_amount: amountCents at route.ts:68)
- proxy.ts:75 emitted CSP token `frame-ancestors 'none` (missing closing quote → directive dropped by browsers)
- POST /api/history with client payload {calcId,calcTitle,...} → schema required {expression,result} → permanent 400 for every logged-in user
- webhook marked stripe_events processed BEFORE handler, errors swallowed with 200
- auth authorize() never checked is_banned

## After fix (fresh dev server, placeholder env: SUPABASE_URL/_SERVICE_ROLE_KEY, NEXTAUTH_URL/_SECRET, STRIPE_SECRET_KEY/_WEBHOOK_SECRET)
- POST /api/payments/create-checkout-session legacy priced body → HTTP 400 `{"success":false,"error":"Validation failed: Unknown plan"}`
- POST same, planId monthly + foreign successUrl → HTTP 400 `{"success":false,"error":"Redirect URLs must stay on this site"}`
- POST same, valid planId + same-origin URLs → passes both guards, reaches Stripe (HTTP 500 from placeholder key; note: StripeAuthError message lacks literal "Stripe", so the route's catch maps it to 500 instead of 502 — cosmetic, guards unaffected)
- GET /api/auth/admin-check → HTTP 503 with placeholder Supabase (fail-closed, endpoint exists; previously 404 path was the bug)
- GET /api/health → 200

## Gates
- `corepack pnpm type-check` → exit 0
- `corepack pnpm test --run` → Tests 30 passed (30) [27 pre-existing + 3 new history-payload]
- scoped eslint (10 touched files) → 0 errors, 3 pre-existing no-console warnings

## Fixed in
src/lib/history-payload.ts (new), src/lib/history-payload.test.ts (new), src/app/api/history/route.ts, src/hooks/useHistory.ts, src/components/AdminGuard.tsx, src/lib/auth-options.ts, src/app/api/payments/create-checkout-session/route.ts, src/components/purchase/PurchaseClient.tsx, src/app/api/payments/webhook/route.ts, src/proxy.ts

## Known-not-verified at runtime
- Authed history roundtrip end-to-end requires real Supabase (POST is 401 without session by design; contract covered by unit roundtrip test)
- proxy CSP emission requires an authenticated admin session on /dashboard (gate 307-redirects before CSP block otherwise); malformed token vs fixed token verified at source + string level
