## Summary

Closes `WEB-BIZ-FIX3A` and `WEB-BIZ-FIX3A-FIX2` (`0d552e6..HEAD`) across revenue fulfillment, Discord admin HMAC boundary, session revocation, admin impersonation, and `/status` service de-scoping with **0** `supabase/migrations/` edits:

- **Unified Plans (`src/lib/plans.ts`):** Single source of truth for checkout plan resolution, amounts, and subscription periods.
- **Entitlement-First Stripe Webhook (`src/app/api/payments/webhook/route.ts`):**
  - Grants `users.plan` and active `subscriptions` **before** writing `public.payments`, isolating `42P01` missing-table ledger errors so paid entitlements are never blocked.
  - Enforces `TablesInsert<"payments">` / `TablesUpdate<"payments">` from `src/lib/database.types.ts`.
  - Resolves guest checkouts via normalized `customer_details.email ?? customer_email` fallback and returns `200 { success: true, received: true, unlinked: true }` without releasing the `stripe_events` claim if unlinked.
  - Distinguishes partial vs. full refunds (`charge.refunded`) and preserves active plans when another unrefunded payment or newer active subscription exists.
- **Session Revocation (`src/lib/admin/session-store.ts`):** Removed non-existent `updated_at` from `user_session_revocations` upsert and removed the module-scope `supabase.from()` shim.
- **Impersonation & CSRF Symmetry (`src/app/api/users/[id]/impersonate/route.ts`, `src/proxy.ts`, `UserDetailModal.tsx`, `AppShell.tsx`):**
  - Enforces `isSessionValid` (fail-closed `503` on DB error, `401` + cookie clear on revoked session) when restoring admin backup sessions on `DELETE`.
  - Expands CSRF origin validation in `src/proxy.ts` to all mutating methods (`POST`, `PUT`, `PATCH`, `DELETE`).
  - Adds reachable `"Impersonate"` button in `UserDetailModal.tsx` and `"Exit Impersonation"` banner in `AppShell.tsx`.
- **Bot HMAC Boundary & Hardening (`discord-bot/src/lib/admin-api.ts`, `/api/admin/control`):** Preserves HMAC-authenticated bot control without browser cookies and resolves `getControlUrl()` lazily inside `sendAdminCommand`.
- **Status Service Authority (`src/app/status/constants.ts`, `api/status/route.ts`, `api/status/history/route.ts`):** Single `SERVICES` tuple (`supabase`, `stripe`, `smtp`, `nextjs`) with `discord` de-scoped.

## Verification Gates

| Gate | Result |
|---|---|
| `pnpm type-check` | 0 errors |
| `pnpm lint` | 0 errors (0 added suppressions) |
| `pnpm test` | 28/28 files, 130/130 tests passed |
| `pnpm --dir discord-bot exec tsc --noEmit` | 0 errors |
| `pnpm build` | 0 errors (38 routes) |
| `python scripts/v3/measure.py` | 0 failures (`G11=0`, `raw hex non-globals CSS=0`, `text-role failing=0`) |
| `git diff --name-only 0d552e6..HEAD -- supabase/migrations/` | 0 files |

## Post-Deploy Smoke Checklist

- [ ] Verify Stripe webhook `checkout.session.completed` grants `users.plan` and `subscriptions` and records `payments`.
- [ ] Verify `charge.refunded` partial refund does not downgrade `users.plan`.
- [ ] Verify `/dashboard/users` -> `UserDetailModal` -> `Impersonate` -> `AppShell` `Exit Impersonation` round-trip.
- [ ] Verify `/api/status` and `/api/status/history` return the 4 active services.
