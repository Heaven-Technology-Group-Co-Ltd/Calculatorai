---
tags: [architecture, backend, database, auth]
status: active
last-updated: 2026-07-23
---

# Architecture: Backend API & Schema (Phase 2)

## Current State

Full backend phase 2 completed: Supabase database schema (18 tables), API route hardening with `requireAdmin()` guards, shared utility patterns, and auth features (forgot/reset password, show/hide password in SignUp, confirm password).

### Database Schema (18 tables)

```
users ──┬── accounts
         ├── sessions
         ├── verification_tokens
         ├── calculation_history
         ├── payments ──┬── stripe_events
         │              ├── subscriptions
         │              ├── invoices
         │              └── refunds
         ├── page_views
         ├── formula_usage
         ├── site_settings
         ├── admin_audit_log
         ├── discord_webhooks
         ├── admin_messages
         ├── user_session_revocations
         └── rate_limits
```

RLS (Row-Level Security) enabled on every table. Migrations via `supabase/migrations/001–004`.

### API Layer Structure

```
src/app/api/
├── auth/              # register, verify, admin-check, forgot-password, reset-password
│   └── [...nextauth]/ # NextAuth v4 (credentials + Google OAuth)
├── users/             # CRUD, ban/unban, plan, message, sessions
├── settings/          # site_settings + discord_webhooks
├── admin/control/     # system control
├── stats/             # global stats
├── finance/           # revenue, subscriptions, invoices, refunds
├── analytics/         # formulas, funnel, report, sessions, traffic
├── payments/          # create-checkout-session, status, webhook (Stripe)
├── history/           # calculation history
└── page-views/        # anonymous page view tracking
```

All 27+ routes refactored to use shared patterns.

### Shared Patterns (new)

| Pattern | Location | Purpose |
|---|---|---|
| Shared Supabase client | `src/lib/supabase-client.ts` | Singleton `getSupabaseAdmin()`, prevents duplicate clients |
| Standardised responses | `src/lib/api-response.ts` | `successResponse()`, `badRequestResponse()`, `unauthorizedResponse()`, etc. |
| Constants | `src/lib/api-constants.ts` | Time constants, rate-limit configs, auth configs |
| Database types | `src/lib/database.types.ts` | Manual Row/Insert/Update types for all 18 tables |
| Rate limiter | `src/lib/rate-limiter.ts` | Supabase-backed leaky bucket, uses shared client |
| Admin middleware | `src/lib/admin/auth-middleware.ts` | `requireAdmin()` helper for protected routes |

### Auth Flow (JWT + NextAuth v4)

```
Login → POST /api/auth/[...nextauth]
  ├── Credentials: email+password → bcrypt verify → session token
  └── Google OAuth: OAuth callback → create/link account

Forgot Password → POST /api/auth/forgot-password
  └── Rate limited (5/15min) → token in verification_tokens → email via Resend SMTP

Reset Password → POST /api/auth/reset-password
  └── Validate token (expiry: 1h) → bcrypt hash → consume token → revoke sessions

Register → POST /api/auth/register
  └── Zod validation → bcrypt hash (cost 12) → verification email → pending state
```

### Security

| Fix | Detail |
|---|---|
| Admin guards | 22 routes previously open → `requireAdmin()` check |
| Impersonation | Was returning plaintext session token → now httpOnly cookie |
| Audit log | Records actual admin ID, not hardcoded "system" |
| Response format | Standardised `{ success, data/error }` across all routes |
| Password hashing | bcrypt cost 12 |
| Rate limiting | Auth endpoints + admin actions + default tiers |

### Known Technical Notes

- `createClient<Database>` from supabase-js v2 doesn't match the expected generic shape → use `SupabaseClient` without type param for now
- PostgREST schema cache must be refreshed after column renames via `NOTIFY pgrst, 'reload schema'`
- Migration 003's `rate_limits` table rename was incomplete — fixed in migration 004
- SMTP sending via Resend requires `SMTP_FROM` as a verified domain sender

## Key Files / Locations

- `src/lib/supabase-client.ts` — singleton factory
- `src/lib/api-response.ts` — response helpers
- `src/lib/api-constants.ts` — shared constants
- `src/lib/database.types.ts` — type definitions
- `src/lib/rate-limiter.ts` — rate limiting
- `src/lib/admin/auth-middleware.ts` — requireAdmin middleware
- `src/lib/admin/audit.ts` — admin audit logging
- `supabase/migrations/` — SQL migration files (001–004)
- `src/app/api/` — all API route handlers

## Known Limitations

- Supabase typed client doesn't work due to supabase-js v2 generic mismatch — using untyped client for now
- No CI/CD pipeline yet — migrations run manually via Supabase dashboard
- Stripe webhook endpoint exists but not deployed/tested against live Stripe
- TypeScript types in `database.types.ts` are hand-written, not auto-generated from Supabase CLI (requires `SUPABASE_ACCESS_TOKEN`)
- Discord bot not yet started — separate process, not integrated with Next.js

## Change History

- 2026-07-23: Phase 2 complete — schema, API hardening, auth features ([[2026-07-23--backend-phase2-api-schema]])
