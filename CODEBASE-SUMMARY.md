# Premium Math Calculator — สรุป Codebase / Codebase Summary

> สรุปจากการอ่านซอร์สโค้ดทั้งหมด 231 ไฟล์ (ไม่รวม node_modules, .next, dist, vault)
> Generated: 2026-10-01

---

## 1. ภาพรวมโปรเจกต์ / Project Overview

**ไทย:** โปรเจกต์คำนวณเลขพรีเมียม สร้างใหม่ทั้งระบบ (full-stack rebuild) ประกอบด้วย:
- **Frontend:** Next.js App Router + TypeScript strict mode
- **Backend:** Next.js API Routes + Supabase (Postgres)
- **Discord Bot:** discord.js แยก process ไม่ใช่ serverless
- **ตรรกะคำนวณ:** แยกเป็น pure function ไม่ปน UI (non-negotiable)
- **ทีม:** Heaven Developer Team

**EN:** Premium Math Calculator — full-stack rebuild. Next.js App Router frontend + API routes + Supabase Postgres + separate discord.js bot process. Pure calc logic isolated in `src/lib/calc-utils.ts`, `src/lib/math-data.ts`, `src/lib/formulas/`. No localStorage for persistent state. Team: Heaven Developer Team.

---

## 2. สถาปัตยกรรม / Architecture

**ไทย:**
```
Browser/Bot → Next.js /api/* → auth gate (NextAuth JWT / HMAC / Stripe sig)
  → Zod → Supabase service-role → JSON {success, data/error}

Bot side: Interaction → dual gate (Administrator flag + guild/role)
  → HMAC sign → POST /api/admin/control → embed reply

Background: heartbeat hourly upsert + cron 12h health report → Discord channel
```

**EN:**
Next.js App Router (TypeScript strict) serves UI + `/api/*`. All admin routes share pattern: `requireAdmin` gate + service-role Supabase + Zod validate + `api-response` helpers + `writeAuditLog`. Public routes: `status`, `status/history`, `payments/*`, auth register/verify/forgot/reset, NextAuth handler. Bot runs long-lived outside Vercel (Gateway needs persistent connection). Observability stack: `health_checks` + `bot_heartbeats` + `health_history()` + `health_report()` RPCs.

### สถาปัตยกรรม 3 ชั้น / 3-Layer Architecture

| ชั้น / Layer | เทคโนโลยี / Technology | หน้าที่ / Responsibility |
|---|---|---|
| Frontend | Next.js 16 App Router, React 19, CSS Modules, SWR | UI, auth flows, dashboard, status page |
| Backend | Next.js API Routes, Zod, NextAuth, Stripe SDK | REST endpoints, validation, payments |
| Data | Supabase Postgres, 8 migrations | Users, sessions, analytics, health, finance |

---

## 3. โครงสร้างไฟล์ / File Structure

```
/home/project/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── api/                    # 31 API routes
│   │   │   ├── admin/control/       # Discord bot entry (HMAC-signed)
│   │   │   ├── analytics/          # formulas, funnel, report, sessions, traffic
│   │   │   ├── auth/               # NextAuth, register, verify, forgot/reset, admin-check
│   │   │   ├── finance/            # invoices, refunds
│   │   │   ├── payments/           # Stripe checkout, webhook, status
│   │   │   ├── settings/           # site settings + webhook management
│   │   │   ├── stats/              # dashboard stats
│   │   │   ├── status/             # public status page + history
│   │   │   └── users/              # CRUD, ban, impersonate, plan, sessions, message
│   │   ├── dashboard/              # Admin dashboard page
│   │   ├── formulas-demo/          # Formula calculator demo
│   │   ├── login/ signup/ verify/ reset-password/
│   │   ├── purchase/ success/      # Stripe checkout pages
│   │   ├── status/                 # Public status page (client components)
│   │   ├── layout.tsx              # Root layout (SessionProvider + LanguageProvider)
│   │   ├── globals.css             # Design System v3 "Ursa" tokens
│   │   └── page.tsx                # Home (SplashGate + AppShell)
│   ├── components/
│   │   ├── AppShell.tsx            # Main app wrapper (sidebar + content)
│   │   ├── AdminGuard.tsx          # Admin route protection
│   │   ├── AuthGuard.tsx           # Auth route protection
│   │   ├── dashboard/              # Dashboard subsystem
│   │   │   ├── DashboardClient.tsx # Main dashboard orchestrator
│   │   │   ├── DashboardProvider.tsx # Context provider
│   │   │   ├── DashboardShell.tsx  # Layout shell
│   │   │   ├── blocks/             # 11 dashboard blocks (KPI, charts, tables)
│   │   │   ├── hooks/              # 6 data hooks (useAnalytics, useRevenue, etc.)
│   │   │   ├── modals/              # 4 modals (Ban, Message, PlanChange, UserDetail)
│   │   │   ├── pages/              # 5 tab pages (Overview, Analytics, Users, Finance, Settings)
│   │   │   ├── settings/           # 4 settings panels
│   │   │   ├── tables/             # Invoice + Refund tables
│   │   │   ├── ui/                 # Shared UI (KpiCard, Panel, Skeleton, etc.)
│   │   │   └── i18n/               # Thai/English translations
│   │   ├── features/               # Shared feature components
│   │   │   ├── history/            # HistorySidebar
│   │   │   ├── info/               # InfoModal
│   │   │   ├── language/           # LanguageDropdown
│   │   │   └── loading/            # LoadingScreen (SplashGate)
│   │   ├── formulas/               # FormulaCard + FormulaGrid
│   │   ├── sidebar/                # Sidebar navigation
│   │   ├── login/ signup/ verify/  # Auth page clients
│   │   ├── purchase/               # Purchase + Success clients
│   │   └── not-found/              # 404 page
│   ├── lib/
│   │   ├── calc-utils.ts           # Pure calc functions (formatNum, normalizeInput, validateInputs)
│   │   ├── formulas/registry.ts    # 45 formulas (pure data, no React)
│   │   ├── auth-options.ts         # NextAuth config (Google + Credentials, JWT 30min)
│   │   ├── api-response.ts         # Standard API response helpers
│   │   ├── api-constants.ts        # Shared constants (rate limits, pagination, auth)
│   │   ├── design-tokens.ts        # Design tokens (colors, spacing, typography)
│   │   ├── fetcher.ts              # SWR fetcher (auto-unwraps {success, data})
│   │   ├── database.types.ts       # Supabase generated types
│   │   ├── LanguageContext.tsx     # Language provider (TH/EN/CH/JP)
│   │   ├── SessionProvider.tsx     # NextAuth session provider
│   │   ├── supabase-client.ts      # Supabase client singleton
│   │   ├── supabase-adapter.ts     # NextAuth Supabase adapter
│   │   └── admin/                  # Admin subsystem
│   │       ├── admin-gate.ts       # Single admin session decision
│   │       ├── auth-middleware.ts  # Auth middleware
│   │       ├── dashboard-gate-mapping.ts # Gate result → HTTP action
│   │       ├── hmac.ts             # HMAC-SHA256 signer (shared with bot)
│   │       ├── schemas.ts          # Zod schemas for admin routes
│   │       ├── audit.ts            # Audit logging
│   │       ├── log-dispatcher.ts   # Log dispatching
│   │       ├── global-error-catcher.ts # Global error handling
│   │       └── *.test.ts           # Vitest tests
│   ├── proxy.ts                    # Middleware (security headers, CSRF, admin gate)
│   ├── instrumentation.ts          # OpenTelemetry instrumentation
│   └── proxy.test.ts               # Proxy middleware tests
├── discord-bot/src/
│   ├── index.ts                    # Bot entry (login, auto-deploy, event handlers)
│   ├── deploy-commands.ts          # One-shot guild command registration
│   ├── commands/admin.ts           # /admin slash command schema
│   ├── handlers/admin-handler.ts   # Interaction handler (dispatch + embed replies)
│   └── lib/
│       ├── admin-api.ts            # Signed HTTP client → /api/admin/control
│       ├── heartbeat.ts            # Hourly liveness upsert
│       ├── hmac.ts                 # HMAC-SHA256 signer
│       ├── log-scheduler.ts        # 12h cron health report → Discord
│       ├── permissions.ts          # Layer-2 guild/role guard
│       └── supabase.ts             # Service-role Supabase client
├── supabase/migrations/
│   ├── 001_initial_schema.sql      # Core tables (users, sessions, formulas, etc.)
│   ├── 002_calculation_history.sql # Calculation history table
│   ├── 003_fix_schema_mismatch.sql # Schema fixes
│   ├── 004_column_alignment.sql    # Column alignment
│   ├── 005_health_checks.sql       # Health check tables
│   ├── 006_bot_heartbeats.sql     # Bot heartbeat table
│   ├── 007_health_history.sql      # Health history + RPC
│   └── 008_health_report.sql       # Health report RPC
├── package.json                    # Next.js 16.2.6, React 19.2, pnpm
├── next.config.ts                  # Security headers, reactCompiler
├── tsconfig.json                   # Strict mode, @/* path alias
├── vitest.config.mjs               # Test config
├── eslint.config.mjs               # ESLint config
└── ecosystem.config.js             # PM2 config (production)
```

---

## 4. ระบบย่อย / Subsystems

### 4.1 Discord Bot — Admin Control & Monitoring (10 files)

**ไทย:** บอท discord.js รันแยก process ยาว ไม่ใช่ serverless เพราะ Discord Gateway ต้องการ persistent connection บอทรับคำสั่ง slash `/admin` ตรวจสิทธิ์สองชั้น (Administrator flag + guild/role) เซ็น HMAC-SHA256 แล้วเรียก Next.js API งานพื้นหลัง: heartbeat ทุกชั่วโมง + รายงานสุขภาพทุก 12 ชม.

**EN:** Separate discord.js process. Schema → dual permission gates → HMAC-signed HTTPS → Next.js `/api/admin/control`. Jobs: hourly heartbeat upsert `bot_heartbeats`, cron health report via `health_report` RPC → embed → log channel + role ping on gap/error.

| ไฟล์ / File | หน้าที่ / Purpose |
|---|---|
| `index.ts` | Bot entry: login, auto-deploy slash commands, route interactions, start heartbeat + log scheduler. Graceful SIGINT/SIGTERM. |
| `commands/admin.ts` | `/admin` slash command schema (stats, maintenance, broadcast subcommands). Schema only. |
| `handlers/admin-handler.ts` | Dispatch interactions, format Discord embeds. Ephemeral defer avoids 3s timeout. |
| `lib/admin-api.ts` | Signed typed HTTP client → `/api/admin/control`. Zod discriminatedUnion. 10s timeout. |
| `lib/heartbeat.ts` | Hourly liveness upsert to `bot_heartbeats`. 2h stale threshold on status page. |
| `lib/hmac.ts` | HMAC-SHA256 signer. Covers payload + callerId + callerTag + timestamp (replay protection). |
| `lib/log-scheduler.ts` | Cron `0 0,12 * * *` (Asia/Bangkok) health report. Pure `buildEmbed` (testable). Never throws outward. |
| `lib/permissions.ts` | Layer-2 guard: guild match + `ADMIN_ROLE_ID`. Embed helpers. |
| `lib/supabase.ts` | Service-role Supabase singleton. No session persistence. |
| `deploy-commands.ts` | One-shot guild command registration. Manual `pnpm deploy-commands`. |

### 4.2 API Routes (31 files)

**ไทย:** ทุก admin route ใช้แพทเทิร์นเดียวกัน: gate → service-role Supabase → Zod validate → `api-response` helpers → audit log ไม่มี business logic ใน route สถานะ maintenance เก็บ in-memory Stripe webhook กันซ้ำผ่านตาราง `stripe_events`

**EN:** Shared pattern: gate + service-role + Zod + helpers + audit. No business logic in routes; in-memory maintenance state in `lib/admin/state`. Stripe webhook idempotent via `stripe_events`.

#### Admin & Control
| Route | Method | Purpose |
|---|---|---|
| `/api/admin/control` | POST | Discord bot entry. Admin+HMAC guard. Actions: get_stats, toggle_maintenance, broadcast. |
| `/api/admin/control` | GET | Admin control panel data. |

#### Analytics
| Route | Method | Purpose |
|---|---|---|
| `/api/analytics/formulas` | GET | Formula heatmap 30d + top 10. |
| `/api/analytics/funnel` | GET | Funnel: Visit → Engaged → Calculated → Returned. |
| `/api/analytics/report` | GET, POST | Weekly report status + trigger Discord send. No PII. |
| `/api/analytics/sessions` | GET | Session metrics 7d. |
| `/api/analytics/traffic` | GET | Traffic 30d: pages, geo, referrals. |

#### Auth
| Route | Method | Purpose |
|---|---|---|
| `/api/auth/[...nextauth]` | GET, POST | NextAuth handler (Google + Credentials). |
| `/api/auth/admin-check` | GET | Return id/name/email/is_admin. Rate-limited. |
| `/api/auth/register` | POST | Hash bcrypt, send verify email. |
| `/api/auth/verify` | POST | Set email_verified, delete token. |
| `/api/auth/forgot-password` | POST | Reset token 1h + SMTP. Always success (anti-enumeration). |
| `/api/auth/reset-password` | POST | Consume token, revoke sessions. |

#### Finance
| Route | Method | Purpose |
|---|---|---|
| `/api/finance/invoices` | GET, POST | List 100 + create (default pending). |
| `/api/finance/refunds` | GET, POST | List 100 + create (status requested). |

#### Payments (Stripe)
| Route | Method | Purpose |
|---|---|---|
| `/api/payments/create-checkout-session` | POST | Stripe Checkout. Guest allowed. |
| `/api/payments/status` | GET | Public status by session_id. Minimal fields only. |
| `/api/payments/webhook` | POST | Raw-body sig verify, idempotency table, re-fetch PaymentIntent. |

#### Settings
| Route | Method | Purpose |
|---|---|---|
| `/api/settings` | GET, POST | Merge DB `site_settings` + in-memory maintenance. |
| `/api/settings/webhooks` | GET, POST | List/create Discord webhooks. |
| `/api/settings/webhooks/[id]` | PUT, DELETE | Partial update / delete. |
| `/api/settings/webhooks/[id]/test` | POST | Test ping. |

#### Stats & Status
| Route | Method | Purpose |
|---|---|---|
| `/api/stats` | GET | Dashboard stats. Real queries only, no fake data. |
| `/api/status` | GET | Public status: supabase/stripe/smtp/discord/nextjs. Cached 60s. |
| `/api/status/history` | GET | Health history with bucket boundary truncation. |

#### Users
| Route | Method | Purpose |
|---|---|---|
| `/api/users` | GET, POST | List (paginated) + create. |
| `/api/users/[id]` | GET, PATCH, DELETE | Read/update/delete. |
| `/api/users/[id]/ban` | POST | Ban user + revoke sessions. |
| `/api/users/[id]/impersonate` | POST | Generate impersonation token. |
| `/api/users/[id]/message` | POST | Send message to user. |
| `/api/users/[id]/plan` | POST | Change user plan. |
| `/api/users/[id]/sessions` | GET | List user sessions. |

### 4.3 Admin Gate Subsystem (13 files)

**ไทย:** ระบบการอนุญาตแบบรวมศูนย์ ทุก route แอดมินเรียก `checkAdminGate()` ซึ่งคืนค่า decision เดียว (allow/deny/redirect/unavailable) แล้ว `mapDashboardGateMapping()` แปลงเป็น HTTP action

**EN:** Centralized admin authorization. Every admin route calls `checkAdminGate()` which returns a single decision (allow/deny/redirect/unavailable), then `mapDashboardGateMapping()` converts to HTTP action.

| ไฟล์ / File | หน้าที่ / Purpose |
|---|---|
| `admin-gate.ts` | Single admin session decision (JWT decode, revocation check, admin lookup). |
| `auth-middleware.ts` | Auth middleware for edge/runtime. |
| `dashboard-gate-mapping.ts` | Gate result → HTTP action (redirect/503/allow). |
| `hmac.ts` | HMAC-SHA256 signer (shared with bot). |
| `schemas.ts` | Zod schemas for admin route validation. |
| `audit.ts` | Audit logging to `audit_logs` table. |
| `log-dispatcher.ts` | Log dispatching (Discord, console). |
| `global-error-catcher.ts` | Global error handling. |
| `admin-gate.test.ts` | Vitest tests for admin gate. |
| `dashboard-gate-mapping.test.ts` | Vitest tests for gate mapping. |

### 4.4 Frontend — Dashboard Subsystem (40+ files)

**ไทย:** Dashboard แอดมินขนาดใหญ่ แบ่งเป็น 5 หน้า (Overview, Analytics, Users, Finance, Settings) มี 11 block component (KPI, charts, tables) 6 data hook (SWR) 4 modal และระบบ i18n สองภาษา

**EN:** Large admin dashboard with 5 tabs (Overview, Analytics, Users, Finance, Settings), 11 block components (KPI, charts, tables), 6 data hooks (SWR), 4 modals, and Thai/English i18n.

#### Pages (5 tabs)
| ไฟล์ / File | หน้า / Page |
|---|---|
| `OverviewPage.tsx` | Dashboard overview (KPIs, recent activity) |
| `AnalyticsPage.tsx` | Analytics (traffic, funnel, formulas, geography) |
| `UsersPage.tsx` | User management (list, search, ban, plan change) |
| `FinancePage.tsx` | Finance (invoices, refunds) |
| `SettingsPage.tsx` | Settings (general, billing, security, webhooks) |

#### Blocks (11 components)
`KpiRow`, `RevenueChart`, `ConversionFunnel`, `DevicePieChart`, `FormulaHeatmap`, `GeographyList`, `PlanBreakdown`, `RecentActivityFeed`, `SystemHealth`, `TopPagesTable`

#### Hooks (6)
`useAnalytics`, `useDashboardStats`, `useDateRangeParams`, `useRevenue`, `useTraffic`, `useUsers`

#### Modals (4)
`BanConfirmModal`, `MessageModal`, `PlanChangeModal`, `UserDetailModal`

#### Settings Panels (4)
`GeneralSettings`, `BillingSettings`, `SecuritySettings`, `WebhookManager`

### 4.5 Frontend — Auth & Public Pages (15+ files)

| ไฟล์ / File | หน้าที่ / Purpose |
|---|---|
| `login/LoginClient.tsx` | Login page (email/password + Google OAuth) |
| `signup/SignUpClient.tsx` | Signup page |
| `verify/VerifyClient.tsx` | Email verification page |
| `reset-password/page.tsx` | Reset password page |
| `purchase/PurchaseClient.tsx` | Purchase/checkout page |
| `purchase/PurchaseSuccessClient.tsx` | Purchase success page |
| `formulas-demo/page.tsx` | Formula calculator demo (45 formulas) |
| `status/StatusClient.tsx` | Public status page (real-time) |
| `status/components/` | Charts, IncidentTimeline, KPIBar, ServiceCard, SystemInfo |
| `not-found/NotFoundClient.tsx` | 404 page |

### 4.6 Formula Engine (45 formulas)

**ไทย:** ระบบสูตรคำนวณ 45 สูตร แยกเป็น pure data registry ไม่มี React แต่ละสูตรมี: id, level (elementary/middleSchool/highSchool/university), category, subject, title (5 ภาษา), variables, formula string, และ compute function

**EN:** 45 formulas in a pure data registry (no React). Each formula has: id, level, category, subject, title (5 languages), variables, formula string, and compute function.

#### Formula Distribution
| ระดับ / Level | จำนวน / Count | ตัวอย่าง / Examples |
|---|---|---|
| Elementary | 8 | Square/Rectangle/Triangle/Circle Area, Cube Volume, Percentage |
| Middle School | 2 | Pythagoras, Linear Equation |
| High School | 2 | Trig (sin/cos/tan), Derivative (Power Rule) |
| University | 33 | Dot Product, Compound Interest, NPV, Break-Even, Elasticity, Depreciation, Flexural Stress, Euler Buckling, Bernoulli, Darcy's Law, Concrete Mix, Stress-Strain, Ohm's Law, Binary Search, Reynolds, EOQ, Lift, Dilution, Newton's 2nd Law, Std Dev, Molarity, Population Growth, ROI, GDP, Current Ratio, NPV, Gini, Z-Score, GPA, Golden Ratio, Sigmoid, Dosage |

#### Formula Registry Utilities
- `getFormulasByLevel(level)` — filter by education level
- `getFormulasByCategory(label)` — filter by category
- `getFormulaById(id)` — lookup by ID
- `getFormulaCountByDepartment(subjects)` — count by department
- `getGroupedFormulas()` — group by category (preserves first-seen order)

### 4.7 Calculation Utilities

| ไฟล์ / File | หน้าที่ / Purpose |
|---|---|
| `calc-utils.ts` | Pure functions: `formatNum` (number formatting), `normalizeInput` (input cleaning), `validateInputs` (validation with div-by-zero check) |

### 4.8 Design System

| ไฟล์ / File | หน้าที่ / Purpose |
|---|---|
| `design-tokens.ts` | TypeScript design tokens (colors, spacing, radius, typography, shadows, transitions, level colors, loading config) |
| `globals.css` | CSS custom properties (Design System v3 "Ursa") |
| `*.module.css` | Per-component CSS Modules |

**Color Palette (Obsidian Edition):**
- Background: `#242F35`
- Surface: `#2F3D44`
- Primary: `#E8B896` (warm gold)
- Text: `#F2E6DA`
- Error: `#ef4444`

### 4.9 Middleware & Security

| ไฟล์ / File | หน้าที่ / Purpose |
|---|---|
| `proxy.ts` | Next.js middleware: security headers (CSP, HSTS, X-Frame-Options), CSRF protection for admin POST, admin path gate |
| `next.config.ts` | Security headers (duplicate of proxy.ts for edge), reactCompiler |
| `api-response.ts` | Standard API response helpers (`{success, data/error}`) |
| `api-constants.ts` | Rate limits, pagination defaults, auth constants |

---

## 5. ฐานข้อมูล / Database

**ไทย:** Supabase Postgres 8 migrations ตารางหลัก:

**EN:** Supabase Postgres, 8 migrations. Key tables:

| ตาราง / Table | ใช้งาน / Purpose |
|---|---|
| `users` | User accounts (email, password_hash, plan, email_verified, is_admin) |
| `sessions` | User sessions |
| `verification_tokens` | Email verification tokens |
| `password_reset_tokens` | Password reset tokens |
| `calculation_history` | Calculation history |
| `health_checks` | Health check results |
| `bot_heartbeats` | Bot liveness heartbeats |
| `stripe_events` | Stripe webhook idempotency |
| `site_settings` | Site settings (key-value) |
| `audit_logs` | Admin audit logs |
| `invoices` | Invoices |
| `refunds` | Refunds |
| `analytics_events` | Analytics events (page views, sessions) |
| `formula_usage` | Formula usage tracking |

### Migrations
| ไฟล์ / File | เนื้อหา / Content |
|---|---|
| `001_initial_schema.sql` | Core tables |
| `002_calculation_history.sql` | Calculation history |
| `003_fix_schema_mismatch.sql` | Schema fixes |
| `004_column_alignment.sql` | Column alignment |
| `005_health_checks.sql` | Health check tables |
| `006_bot_heartbeats.sql` | Bot heartbeat table |
| `007_health_history.sql` | Health history + RPC |
| `008_health_report.sql` | Health report RPC |

---

## 6. การไหลของข้อมูล / Data Flow

### 6.1 User Request Flow
```
Browser → Next.js page → SWR fetcher → /api/* route
  → auth gate (NextAuth JWT / HMAC / Stripe sig)
  → Zod validation
  → Supabase service-role
  → {success: true, data} | {success: false, error}
  → SWR auto-unwrap → UI render
```

### 6.2 Discord Bot Flow
```
Discord User → /admin slash command
  → permissions.ts (guild + role check)
  → admin-handler.ts (defer + dispatch)
  → admin-api.ts (HMAC sign + POST)
  → /api/admin/control (verify HMAC + admin gate)
  → execute action (get_stats / toggle_maintenance / broadcast)
  → embed reply to Discord
```

### 6.3 Background Jobs Flow
```
Heartbeat (hourly):
  bot → upsert bot_heartbeats → status page reads → stale if >2h

Log Scheduler (12h cron):
  bot → health_report() RPC → buildEmbed() → send to Discord channel
  → role ping on gap/error
```

### 6.4 Auth Flow
```
Register → bcrypt hash → insert user → send verify email
Verify → set email_verified → delete token
Login → NextAuth (Google OAuth or Credentials) → JWT (30min) → session
Forgot Password → reset token (1h) → SMTP → reset password → revoke sessions
```

### 6.5 Payment Flow
```
Checkout → Stripe Checkout Session → redirect to /purchase/success
Webhook → verify signature → idempotency check → update user plan
```

---

## 7. เทคโนโลยี / Tech Stack

| หมวด / Category | เทคโนโลยี / Technology | เวอร์ชัน / Version |
|---|---|---|
| Framework | Next.js | 16.2.6 |
| UI Library | React | 19.2.3 |
| Language | TypeScript | ^5 |
| Styling | CSS Modules + Design Tokens | — |
| Database | Supabase (Postgres) | — |
| Auth | NextAuth | ^4.24.14 |
| Validation | Zod | ^4.4.3 |
| Payments | Stripe | ^22.2.0 |
| Data Fetching | SWR | ^2.4.2 |
| Charts | Recharts | ^2.15.3 |
| Math | mathjs | ^15.1.1 |
| Bot | discord.js | — |
| Email | nodemailer | ^8.0.7 |
| Hashing | bcryptjs | ^3.0.3 |
| Testing | Vitest | ^5.0.2 |
| Linting | ESLint | ^9 |
| Package Manager | pnpm | 11.0.9 |
| Process Manager | PM2 | — |
| Deployment | Vercel (Next.js) + Separate (Bot) | — |

---

## 8. หมายเหตุ / Notes

### 8.1 Design Decisions
- **Pure calc logic:** ตรรกะคำนวณทั้งหมดอยู่ใน `src/lib/calc-utils.ts`, `src/lib/math-data.ts`, `src/lib/formulas/` เป็น pure function ไม่ปน UI
- **No localStorage:** ไม่ใช้ localStorage เก็บข้อมูลถาวร เพราะจะขัดแย้งกับ backend-driven state
- **Bot separate process:** Discord bot รันแยกจาก Next.js เพราะ serverless ไม่สามารถถือ persistent Gateway connection
- **Standard API format:** ทุก API route ใช้ `{success: true, data}` หรือ `{success: false, error}` เป็นมาตรฐานเดียวกัน
- **Admin gate centralized:** ทุก admin route ใช้ `checkAdminGate()` เป็น decision เดียว ไม่มีการ reimplement

### 8.2 Known Issues (from CODEBASE.md)
1. **Admin session gating** — มีการ reimplement หลายจุด (แก้ไขแล้วผ่าน `admin-gate.ts`)
2. **Language seam** — มี 2 ระบบภาษา (LanguageContext + AppShell) ยังไม่ unify
3. **Orphan formula catalog** — `math-data.ts` มี legacy catalog ซ้ำกับ `formulas/registry.ts`
4. **Finance route scaffold** — finance routes มี pattern ซ้ำกัน (speculative)

### 8.3 Security
- CSP, HSTS, X-Frame-Options, X-Content-Type-Options headers
- CSRF protection for admin POST requests
- HMAC-SHA256 for bot-to-server communication
- bcrypt (12 rounds) for password hashing
- Rate limiting on auth endpoints
- Stripe webhook signature verification
- Idempotency table for Stripe events

### 8.4 Testing
- Vitest for unit tests
- Test files: `admin-gate.test.ts`, `dashboard-gate-mapping.test.ts`, `proxy.test.ts`
- Run: `pnpm test`

### 8.5 Commands
| Command | Purpose |
|---|---|
| `pnpm dev` | Run Next.js + bot together |
| `pnpm dev:web` | Run Next.js only |
| `pnpm dev:bot` | Run Discord bot only |
| `pnpm build` | Production build |
| `pnpm start` | Production start (Next.js + bot) |
| `pnpm lint` | ESLint |
| `pnpm type-check` | TypeScript check |
| `pnpm test` | Vitest |

---

## 9. สรุปตาราง / Summary Tables

### File Count by Subsystem
| ระบบ / Subsystem | จำนวนไฟล์ / Files |
|---|---|
| API Routes | 31 |
| Components (Dashboard) | 40+ |
| Components (Features) | 15+ |
| Components (Auth/Public) | 15+ |
| Lib (Core) | 12 |
| Lib (Admin) | 13 |
| Discord Bot | 10 |
| Supabase Migrations | 8 |
| App Pages | 10 |
| Config/Root | 10+ |
| **Total** | **~231** |

### API Route Count by Domain
| Domain | Routes |
|---|---|
| Auth | 6 |
| Users | 7 |
| Analytics | 5 |
| Payments | 3 |
| Settings | 4 |
| Finance | 2 |
| Admin | 1 |
| Stats | 1 |
| Status | 2 |
| **Total** | **31** |

---

*End of Codebase Summary*
