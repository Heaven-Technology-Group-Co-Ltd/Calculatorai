---
tags: [meta, map-of-content, brain]
status: active
last-updated: 2026-10-22
---

# 🧠 Project Brain Map

> **MOC (Map of Content)** — จุดเริ่มต้นสำหรับทุกคน (มนุษย์และ AI)
> ที่ต้องการเข้าใจ Premium Math Calculator ทั้งระบบ

---

## 🎯 Core Identity

| Aspect | Detail |
|---|---|
| **Project** | Premium Math Calculator |
| **Team** | Heaven Developer Team |
| **Phase** | Full-stack: Next.js app, Supabase backend, Stripe integration, separate Discord bot |
| **Stack** | Next.js 16 App Router + TypeScript strict + CSS Modules + Ursa tokens + Supabase + NextAuth v4 + Stripe + Discord bot |
| **Next** | Sprint A ตาม `PROJECT-HEALTH.md` §6 (rate-limiter RPC + migration `010`, bot auth model, session revocation) → แล้วค่อย Stripe live + CI/CD |

→ ดูเพิ่ม: [[02-Architecture/frontend-design-direction]], [[02-Architecture/backend-api-schema]], [[02-Architecture/locale-system]], [[02-Architecture/departments-formulas-system]], [[02-Architecture/2026-10-22--project-health]]

---

## 🏛️ Decisions (ADR)

| Decision | Status | Key Point |
|---|---|---|
| [[01-Decisions/2026-07-18--frontend-backend-bot-split\|Frontend/Backend/Bot Split]] | 🟢 Active | Next.js fullstack → separate Discord bot process |
| [[01-Decisions/2026-07-22--404-not-found-page\|404 Not Found Page]] | 🟢 Active | Calculator display "400 + 4 = 404", domain ∉ pun, standalone |
| [[01-Decisions/2026-07-22--login-page\|Login Page]] | 🟢 Active | ACCESS: display strip, credentials + Google OAuth, standalone |
| [[01-Decisions/2026-07-22--purchase-page-responsive\|Purchase Page Responsive]] | 🟢 Active | 4-breakpoint grid, sidebar purchase link, CSS module migration |
| [[01-Decisions/2026-09-27--admin-gate-consolidation\|Admin Gate Consolidation]] | 🟢 Implemented | One fail-closed admin gate; dashboard enforced in `src/proxy.ts`; 401/403/429/503 contract pinned by 27 Vitest tests |
| [[01-Decisions/2026-10-24--design-system-consolidation\|Design System Consolidation]] | 🟢 Active | globals.css as single source of truth, delete design-tokens.ts, next/font, 6-step type scale, 5-layer z-index, strict LucideIcon |
| [[01-Decisions/2026-10-22--heaven-technologies-maintenance-charter\|Heaven Technologies Maintenance Charter]] | 🟢 Active | Gate 3 ตัว + Definition of Done 7 ข้อ + โดเมน frontend/backend/memory; รายงานรอบที่ 1 = `PROJECT-HEALTH.md` |
| [[01-Decisions/2026-07-22--departments-subject-type-change\|departments subject type change]] | 🟡 Active | session note — ดูไฟล์ |
| [[01-Decisions/2026-07-23--dashboard-full-rewrite-with-swr\|dashboard full rewrite with swr]] | 🟡 Active | session note — ดูไฟล์ |
| [[01-Decisions/2026-09-27--instruction-files-state-current-facts\|instruction files state current facts]] | 🟡 Active | session note — ดูไฟล์ |

**Related Claude Memory:** `memory/project-architecture.md`, `memory/discord-bot-azura-live.md`, `memory/404-not-found-page.md`, `memory/login-page-design.md`, `memory/purchase-page-responsive.md`

---

## 🎨 Design System

| Topic | Key Info |
|---|---|
| **Palette** | Ursa: forest dark `#242F35`, cream-peach `#E8B896`, sidebar darkest `#1B272C` · Single Source of Truth: `globals.css` (tokens: Colors, Status, Type Scale `--fs-1..6`, Z-Index `--z-base/sticky/drawer/modal/toast`) |
| **Previous Palette** | Premium Redux (superseded by Ursa) |
| **Design Anti-Patterns** | No gradient-on-gradient, no bright neons, no glossy 3D |

→ ดูเพิ่ม: [[ursa-palette-redesign]]
→ Claude Memory: `memory/ursa-palette-redesign.md`, `memory/premium-redux-redesign.md`, `memory/design-anti-patterns.md`

---

## 🏗️ Architecture

| Component | Status | Note |
|---|---|---|
| Dashboard Responsive | ✅ Complete | Bottom tab nav on mobile, drawer sidebar |
| Sidebar Layout | ✅ Resolved | Toggle animation, topbar/LevelFilter integration |
| Loading Screen + SplashGate | ✅ Complete | CSS-only animations, session auth redirect check |
| Formula Library | ✅ Complete | Generic FormulaCard + pure-data registry |
| History Persistence | ✅ Complete | Dual-mode: auth→API, anon→sessionStorage |
| 404 Not Found Page | ✅ Complete | Calculator display "400 + 4 = 404", ∉ pun, standalone no-AppShell |
| Purchase Page | ✅ Complete | 4-breakpoint responsive grid, Stripe checkout, sidebar link |
| Login Page | ✅ Complete | ACCESS: display strip, credentials + Google OAuth, standalone |
| SignUp / Verify | ✅ Complete | Email + redirect form, standalone auth layout |
| Backend Schema & API | ⚠️ Drift | 23 tables / 39 routes / 9 migrations — `database.types.ts` ไม่ตรง migrations (ดู `PROJECT-HEALTH.md` §4) |
| Auth System | ✅ Complete | NextAuth v4 (30-min maxAge), forgot/reset password, password show/confirm |
| Project Health & Quality | ⚠️ 2026-10-22 | [[02-Architecture/2026-10-22--project-health\|Health report Q4]] — tsc 0 ✅ · vitest 51/51 ✅ · eslint 6 error (ของเดิม) · P0 3 จุด (bot control ตาย, rate-limiter หลุด, revocation พัง) |

→ Claude Memory: `memory/dashboard-responsive-redesign.md`, `memory/sidebar-layout-resolution.md`, `memory/loading-screen-splashgate.md`, `memory/formula-library-architecture.md`, `memory/history-persistence-dual-mode.md`, `memory/404-not-found-page.md`, `memory/purchase-page-responsive.md`, `memory/login-page-design.md`, `memory/backend-phase2-impl.md`

---

## ✅ Code Quality

| Fix | Files Touched |
|---|---|
| Code Quality 2026-07-21 | CSS `:global()` fix, dead hooks removed, `localStorage→sessionStorage` |
| Department Filtering | Department buttons + real formula counts |

→ Claude Memory: `memory/code-quality-fixes-2026-07-21.md`, `memory/department-filtering-implemented.md`

---

## 📝 Sessions

| Session | Date | Scope |
|---|---|---|
| [[03-Sessions/2026-07-18--frontend-scaffold-phase1\|Frontend Scaffold Phase 1]] | 2026-07-18 | Design tokens, AppShell, HomeHero, Sidebar, auth scaffold |
| [[03-Sessions/2026-07-22--obsidian-second-brain-integration\|Obsidian Second Brain Integration]] | 2026-07-22 | Vault setup, Vault-Dashboard, System-Bridges, Brain Map |
| [[03-Sessions/2026-07-22--signup-status-check\|SignUp Status Check]] | 2026-07-22 | SignUpClient fix, user status rework, sidebar guard |
| [[03-Sessions/2026-07-22--404-not-found-page\|404 Not Found Page]] | 2026-07-22 | Calculator-display 404, domain pun, 4-breakpoint responsive |
| [[03-Sessions/2026-07-22--login-page\|Login Page]] | 2026-07-22 | ACCESS: display strip, credentials + Google OAuth, standalone |
| [[03-Sessions/2026-07-23--backend-phase2-api-schema\|Backend Phase 2 — Schema, API, Auth]] | 2026-07-23 | Database schema, API hardening, forgot/reset password, sidebar user |
| [[03-Sessions/2026-07-23--splashgate-auth-redirect-and-session-timeout\|SplashGate Auth Redirect & Session Timeout]] | 2026-07-23 | SplashGate auth redirect on EXPLORE, NextAuth 30-min maxAge session cap |
| [[03-Sessions/2026-07-24--dashboard-date-range-swr-integration\|Dashboard Date Range SWR Integration]] | 2026-07-24 | Connected UI date range chips to SWR hooks & API query parameters |
| [[03-Sessions/2026-07-24--checkout-endpoint-and-stripe-api-fix\|Checkout Endpoint & Stripe API Fix]] | 2026-07-24 | Fixed 404 checkout endpoint, invalid Stripe apiVersion, and TypeScript global declaration |
| [[03-Sessions/2026-09-27--prompt-audit-config-sync\|Prompt Audit & Config Sync]] | 2026-09-27 | Corrected stale CLAUDE.md/AGENTS.md/RULE.md repo facts; switched quality gate to pnpm |
| [[03-Sessions/2026-09-27--project-summary\|Project Summary]] | 2026-09-27 | Read-only Thai project overview; corrected stale Tailwind, `/lib/calculator`, and phase facts in Brain Map + frontend architecture |
| [[03-Sessions/2026-09-27--architecture-review\|Architecture Review]] | 2026-09-27 | Admin-gate design decisions; implementation plan saved, awaiting review |
| [[03-Sessions/2026-09-28--formula-catalog-consolidation\|Formula Catalog Consolidation]] | 2026-09-28 | Removed legacy formula catalog and duplicate types from math-data; registry remains sole catalog |
| [[03-Sessions/2026-09-28--locale-system-unification\|Locale System Unification]] | 2026-09-28 | Unified UI locale state in LanguageProvider; canonical types/catalog; pref-lang migration |
| [[03-Sessions/2026-09-28--admin-gate-consolidation\|Admin Gate Consolidation]] | 2026-09-28 | Unified fail-closed admin auth; strict admin rate-limit path; dashboard proxy gate; 27 tests |
| [[03-Sessions/2026-09-29--git-history-object-issue\|Git History Missing Tree Object]] | 2026-09-29 | `9da7dd6` → missing tree `497f90b4…`; `fsck` confirms, HEAD valid; no repair attempted |
| [[03-Sessions/2026-10-22--full-project-analysis\|Full Project Analysis]] | 2026-10-22 | ตรวจทั้ง repo + เขียน `PROJECT-HEALTH.md`; P0 3 จุด, P1 5 จุด, roadmap 4 sprint; ตั้ง charter |
| [[03-Sessions/2026-07-22--departments-phase1\|Departments phase1]] | 2026-07-22 | session note — ดูไฟล์ |
| [[03-Sessions/2026-07-22--sidebar-scroll-fix\|Sidebar scroll fix]] | 2026-07-22 | session note — ดูไฟล์ |
| [[03-Sessions/2026-07-22--sidebar-scroll-integration\|Sidebar scroll integration]] | 2026-07-22 | session note — ดูไฟล์ |
| [[03-Sessions/2026-07-23--dashboard-redesign-execution\|Dashboard redesign execution]] | 2026-07-23 | session note — ดูไฟล์ |
| [[03-Sessions/2026-07-23--dashboard-redesign-planning\|Dashboard redesign planning]] | 2026-07-23 | session note — ดูไฟล์ |
| [[03-Sessions/2026-07-23--dashboard-redesign-task-0-deps\|Dashboard redesign task 0 deps]] | 2026-07-23 | session note — ดูไฟล์ |
| [[03-Sessions/2026-07-23--sidebar-navlabel-debug\|Sidebar navlabel debug]] | 2026-07-23 | session note — ดูไฟล์ |
| [[03-Sessions/2026-07-23--sidebar-per-section-scroll\|Sidebar per section scroll]] | 2026-07-23 | session note — ดูไฟล์ |
| [[03-Sessions/2026-07-23--sidebar-scrollnav-gap\|Sidebar scrollnav gap]] | 2026-07-23 | session note — ดูไฟล์ |
| [[03-Sessions/2026-07-23--sidebar-section-spacing\|Sidebar section spacing]] | 2026-07-23 | session note — ดูไฟล์ |
| [[03-Sessions/2026-07-24--webhook-manager-typeerror-fix\|Webhook manager typeerror fix]] | 2026-07-24 | session note — ดูไฟล์ |
| [[03-Sessions/2026-09-29--group5-docs-commit\|Group5 docs commit]] | 2026-09-29 | session note — ดูไฟล์ |
| [[03-Sessions/2026-09-30--status-page-redesign\|Status page redesign]] | 2026-09-30 | session note — ดูไฟล์ |
| [[03-Sessions/2026-10-18--auth-hardening\|Auth hardening]] | 2026-10-18 | session note — ดูไฟล์ |
| [[03-Sessions/2026-10-18--bugfix-batch1\|Bugfix batch1]] | 2026-10-18 | session note — ดูไฟล์ |
| [[03-Sessions/2026-10-18--bugfix-batch2\|Bugfix batch2]] | 2026-10-18 | session note — ดูไฟล์ |
| [[03-Sessions/2026-10-18--bugfix-batch3\|Bugfix batch3]] | 2026-10-18 | session note — ดูไฟล์ |
| [[03-Sessions/2026-10-18--bugfix-batch4\|Bugfix batch4]] | 2026-10-18 | session note — ดูไฟล์ |
| [[03-Sessions/2026-10-18--security-hardening-filters\|Security hardening filters]] | 2026-10-18 | session note — ดูไฟล์ |
| [[03-Sessions/2026-10-19--security-hardening-and-lazy-init-sweep\|Security hardening and lazy init sweep]] | 2026-10-19 | session note — ดูไฟล์ |
| [[03-Sessions/2026-10-25--ui-ux-audit-v3-final-review\|UI/UX Audit v3 Final Independent Review]] | 2026-10-25 | ตรวจอิสระด่านสุดท้าย 42 findings, gates G8-G14, measure.py deterministic, เตือน 127 ไฟล์ conflict security-wip |
| [[03-Sessions/2026-10-26--gate-mutations-and-verification-evidence\|Gate Mutations & Verification Evidence]] | 2026-10-26 | บันทึกผล Clean-Room verification, mutation G8-G14 ครบทุกทิศทาง, git show commit check, ตาราง ENV rule |

---

## 🔧 CLI & Tools

| Tool | Model |
|---|---|
| CLI Model | `/kc/stepfun/step-3.7-flash:free` |

→ Claude Memory: `memory/cli-model-set-to-step37flash.md`

---

## 🌉 System Bridges

| Bridge | Links To | Purpose |
|---|---|---|
| [[05-Bridges/System-Bridges\|System Bridges]] 🆕 | Log.txt, CLAUDE.md, AGENTS.md, RULE.md, Claude Memory | External system reference hub |
| `../Log.txt` | — | Working session log |
| `../CLAUDE.md` | — | AI agent behavior rules |
| `../AGENTS.md` | — | Cross-tool agent instructions |
| `../RULE.md` | — | Coding standards & quality gates |
| `.claude/memory/MEMORY.md` | — | AI context memory index |

**Sync rule:** ทำอะไรเสร็จ → อัปเดต Obsidian vault ให้ตรงกับสถานะปัจจุบัน

---

## 📐 Working Principles

| Principle | Source |
|---|---|
| Senior Engineer Identity | `memory/user-senior-engineer-identity.md` |
| Working Principles | `memory/feedback-working-principles.md` |
| Quality Standards | `memory/feedback-quality-standards.md` |

---

## 🔗 Links

- [[Vault-Dashboard.base]] ← **Dashboard หลัก**
- [[05-Bridges/System-Bridges]] ← 🌉 เชื่อมทุก external system
- [[04-Templates/Decision-Template]] ← Template สำหรับ decision ใหม่
- [[04-Templates/Session-Summary-Template]] ← Template สำหรับ session note
- [[04-Templates/Architecture-Template]] ← Template สำหรับ architecture doc

---

> 💡 **Maintainer Note:** อัปเดต MOC นี้ทุกครั้งที่มี decision ใหม่หรือ architecture เปลี่ยน
> เพิ่ม `[[links]]` ไปยัง notes ที่เกี่ยวข้องเพื่อให้เครือข่ายความรู้แน่นขึ้น