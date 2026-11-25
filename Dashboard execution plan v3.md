# Dashboard Redesign — Execution Plan v3 (Task-Mapped + Patched)

**อ้างอิงจาก:**
- `2026-07-23-dashboard-redesign.md` (Task 0-13, full code plan)
- `2026-07-23-dashboard-redesign-v2.md` (spec: auth, pagination, i18n, mobile revalidation)
- Patch: server-side auth fix (Task 3/11), i18n wiring fix (Task 10)

**Legend:**
- 🟢 DeepSeek V4 Flash — งานง่าย/ซ้ำ pattern ชัดเจน
- 🔵 DeepSeek V4 Pro — core logic, ต้อง reasoning
- 🟡 Gemini 3.6 (Antigravity) — agentic scaffold/integration/build-loop
- 🔴 Claude (Free) — review บังคับเฉพาะจุด auth/secret เท่านั้น (เก็บ quota)

---

## File Map

### New files to create (52 files + 1 patched: `src/lib/auth.ts`)

```
src/lib/fetcher.ts                          🟢 Task 1
src/lib/auth.ts                             🔵 Patch Step 1 — server session helper (NEW, not in original plan)
src/hooks/useDebouncedValue.ts              🟢 Task 1
src/components/dashboard/
├── DashboardProvider.tsx                   🔵 Task 3 (patched: initialRole required, no default)
├── DashboardGuard.tsx                      🔵 Task 3 (patched: UX-only, or delete — see Patch Step 6)
├── DashboardShell.tsx                      🔵 Task 4
├── DashboardClient.tsx                     🟡 Task 11 (patched: accepts initialRole prop)
├── i18n/
│   ├── dashboard.th.json                   🟢 Task 1 (patched: + settings.* keys)
│   ├── dashboard.en.json                   🟢 Task 1 (patched: + settings.* keys)
│   └── useDashboardT.ts                    🟢 Task 1
├── hooks/
│   ├── useDashboardStats.ts                🔵 Task 5
│   ├── useTraffic.ts                       🔵 Task 5
│   ├── useRevenue.ts                       🔵 Task 5
│   ├── useAnalytics.ts                     🔵 Task 5
│   ├── useUsers.ts                         🔵 Task 5 (pagination — verified correct)
│   └── useDashboardAuth.ts                 🔵 Task 13 → 🔴 review
├── ui/
│   ├── Panel.tsx                           🟢 Task 2
│   ├── KpiCard.tsx                         🟢 Task 2
│   ├── Skeleton.tsx                        🟢 Task 2
│   ├── EmptyState.tsx                      🟢 Task 2
│   ├── ErrorState.tsx                      🟢 Task 2
│   └── StatusBadge.tsx                     🟢 Task 2
├── blocks/
│   ├── KpiRow.tsx                          🔵 Task 6
│   ├── TrafficAreaChart.tsx                🔵 Task 6
│   ├── DevicePieChart.tsx                  🔵 Task 6
│   ├── ConversionFunnel.tsx                🔵 Task 6
│   ├── RecentActivityFeed.tsx              🔵 Task 6
│   ├── TopPagesTable.tsx                   🔵 Task 6
│   ├── SystemHealth.tsx                    🔵 Task 6
│   ├── FormulaHeatmap.tsx                  🟡 Task 7 (react-window, agent loop)
│   ├── RevenueChart.tsx                    🔵 Task 6
│   ├── PlanBreakdown.tsx                   🟢 Task 7
│   └── GeographyList.tsx                   🟢 Task 7
├── pages/
│   ├── OverviewPage.tsx                    🟡 Task 8
│   ├── AnalyticsPage.tsx                   🟡 Task 8
│   ├── FinancePage.tsx                     🟡 Task 8
│   ├── UsersPage.tsx                       🔵 Task 9
│   └── SettingsPage.tsx                    🔵 Task 9
├── tables/
│   ├── UserTable.tsx                       🔵 Task 9 (pagination — verified correct)
│   ├── InvoiceTable.tsx                    🔵 Task 9
│   ├── RefundTable.tsx                     🔵 Task 9
│   └── modals/
│       ├── UserDetailModal.tsx             🟢 Task 12
│       ├── MessageModal.tsx                🟢 Task 12
│       ├── BanConfirmModal.tsx             🟢 Task 12
│       └── PlanChangeModal.tsx             🟢 Task 12
├── settings/
│   ├── GeneralSettings.tsx                 🔵 Task 10 (patched: + i18n)
│   ├── SecuritySettings.tsx                🔵 Task 10 (patched: + i18n)
│   ├── BillingSettings.tsx                 🔵 Task 10 → 🔴 review (patched: + i18n, no key leak)
│   └── WebhookManager.tsx                  🔵 Task 10 (patched: + i18n)
└── styles/
    ├── dashboard-shell.module.css          🔵 Task 4
    ├── dashboard-blocks.module.css         🔵 Task 5
    ├── dashboard-tables.module.css         🔵 Task 9
    └── dashboard-settings.module.css       🔵 Task 10
```

### Files to modify

| File | Change | ตัวที่ใช้ |
|---|---|---|
| `src/app/dashboard/page.tsx` | Server component + `getServerSession()` + `redirect` — **patched**, was client-only before | 🔵 Patch Step 2 → 🔴 review |
| `src/app/api/settings/general/route.ts` | Add server-side role check (403 if not admin) | 🔵 Patch Step 5 → 🔴 review |
| `src/app/api/settings/security/route.ts` | Add server-side role check | 🔵 Patch Step 5 → 🔴 review |
| `src/app/api/settings/billing/route.ts` | Add server-side role check | 🔵 Patch Step 5 → 🔴 review |
| `src/app/api/settings/webhooks/route.ts` | Add server-side role check | 🔵 Patch Step 5 → 🔴 review |
| `package.json` | Add `swr`, `react-window` deps | 🟡 Task 0 |

### Files to delete (old dashboard)

| File | ตัวที่ใช้ |
|---|---|
| `src/components/dashboard/DashboardLayout.tsx` | 🟡 Task 11 |
| `src/components/dashboard/dashboard.module.css` | 🟡 Task 11 |
| `temp-dashboard-layout-mockup.html` | 🟡 Task 11 |
| `temp-dashboard-mobile-mockup.html` | 🟡 Task 11 |

---

## Task-to-Tool Mapping (สรุปตาราง)

| Task | เนื้องาน | ตัวที่ใช้ | Review บังคับ? |
|---|---|---|---|
| Task 0 | Install deps | 🟡 Gemini 3.6 Low | ไม่ |
| Task 1 | fetcher, debounce, i18n json | 🟢 DeepSeek V4 Flash | ไม่ |
| Task 2 | UI primitives | 🟢 DeepSeek V4 Flash | ไม่ |
| **Task 3** | Provider + Guard | 🔵 DeepSeek V4 Pro | **✅ ใช่ (auth)** |
| Task 4 | Shell layout | 🔵 DeepSeek V4 Pro | ไม่ (manual QA breakpoint) |
| Task 5 | CSS + SWR hooks | 🔵 DeepSeek V4 Pro | ไม่ |
| Task 6 | Overview blocks | 🔵 DeepSeek V4 Pro | ไม่ |
| Task 7 | Heatmap / Plan / Geo | 🟡 Gemini (Heatmap) + 🟢 Flash (อื่นๆ) | ไม่ |
| Task 8 | Compose pages (O/A/F) | 🟡 Gemini 3.6 Medium | ไม่ |
| Task 9 | Users/Settings pages + tables | 🔵 DeepSeek V4 Pro | ไม่ |
| **Task 10** | Settings sub-pages + modals | 🔵 DeepSeek V4 Pro | **✅ ใช่ (Billing เท่านั้น)** |
| **Task 11** | Wire route + delete old | 🟡 Gemini 3.6 Medium | **✅ ใช่ (route auth)** |
| Task 12 | Table modals | 🟢 DeepSeek V4 Flash | ไม่ |
| **Task 13** | useDashboardAuth | 🔵 DeepSeek V4 Pro | **✅ ใช่ (role resolution)** |
| **Patch 1-6** | Server-side auth fix | 🔵 DeepSeek V4 Pro | **✅ ใช่ (ทั้งหมด)** |
| **Patch 7** | i18n wiring fix | 🔵 DeepSeek V4 Pro | ไม่ (ตรวจด้วย grep พอ) |

---

## Patch — Server-side Auth (ทำแทน Task 3 + Task 11 เดิม)

> ปัญหาที่เจอ: `DashboardGuard.tsx` เดิมเป็น `"use client"` ที่ fetch แล้วเช็ค state ก่อน render — ไม่ใช่การกันข้อมูลจริง เพราะ bundle ทั้งหมดถูกส่งไป client อยู่ดี และ `page.tsx` ไม่มี server check เลย

### Patch Step 1 — `src/lib/auth.ts` (ไฟล์ใหม่)

```ts
import { cookies } from "next/headers";

export interface Session {
  userId: string;
  role: "viewer" | "editor" | "admin";
}

export async function getServerSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  return session;
}

async function verifySessionToken(token: string): Promise<Session | null> {
  // TODO: ต่อกับระบบ auth จริงของ Premium Math Calculator
  throw new Error("verifySessionToken not implemented — wire this to your auth system");
}
```

⚠️ ต้องต่อกับ session system จริงก่อน ไม่งั้น compile ผ่านแต่ใช้งานไม่ได้

### Patch Step 2 — `src/app/dashboard/page.tsx`

```tsx
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return <DashboardClient initialRole={session.role} />;
}
```

### Patch Step 3 — `DashboardProvider.tsx`: `initialRole` ต้อง required

```tsx
interface DashboardProviderProps {
  children: ReactNode;
  initialRole: Role;   // required — ห้าม default เป็น "admin"
}
export function DashboardProvider({ children, initialRole }: DashboardProviderProps) { ... }
```

### Patch Step 4 — `DashboardClient.tsx`: รับ + ส่งต่อ role

```tsx
interface DashboardClientProps {
  initialRole: "viewer" | "editor" | "admin";
}
export function DashboardClient({ initialRole }: DashboardClientProps) {
  return (
    <DashboardProvider initialRole={initialRole}>
      <DashboardShell><DashboardRouter /></DashboardShell>
    </DashboardProvider>
  );
}
```
(และใน `DashboardRouter`: เช็ค `if (role !== "admin") return <OverviewPage />` ก่อน render `SettingsPage` — เป็นแค่ UX guard เสริม ไม่ใช่ security boundary)

### Patch Step 5 — ทุก `/api/settings/*` route ต้องเช็ค role เอง

```ts
// ตัวอย่าง: src/app/api/settings/webhooks/route.ts
import { getServerSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // ... existing logic
}
```
ทำซ้ำแบบเดียวกันกับ `general`, `security`, `billing`, `webhooks` — 4 endpoint

### Patch Step 6 — ลบหรือลดบทบาท `DashboardGuard.tsx`

```tsx
// เหลือแค่ UX-only wrapper, comment กำกับชัดว่าไม่ใช่ security layer
"use client";
import { type ReactNode } from "react";
export function DashboardGuard({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
```
หรือลบไฟล์ทิ้งเลยแล้วเอา `DashboardClient` วางตรงใน `page.tsx` (แนะนำ — ลด confusion)

---

## Patch — i18n wiring (ทำแทน Task 10 ส่วน settings)

### Patch Step 7 — เพิ่ม key ใน `dashboard.th.json` / `dashboard.en.json`

```json
{
  "dashboard.settings.security.title": "...",
  "dashboard.settings.security.currentPassword": "...",
  "dashboard.settings.security.newPassword": "...",
  "dashboard.settings.security.update": "...",
  "dashboard.settings.billing.title": "...",
  "dashboard.settings.billing.stripeKey": "...",
  "dashboard.settings.billing.maskedHint": "...",
  "dashboard.settings.billing.save": "..."
}
```

แล้วแก้ `SecuritySettings.tsx`, `BillingSettings.tsx`, `GeneralSettings.tsx`, `WebhookManager.tsx` ให้เรียก `useDashboardT()` แทน hardcoded string ทุกจุด

---

## Checkpoint สุดท้ายก่อน merge

```bash
# 1. ไม่มี hardcoded string หลุดใน settings
grep -rn "Security Settings\|Billing Settings\|Update Password" src/components/dashboard/settings/

# 2. ไม่มี default admin role หลุด
grep -rn 'initialRole = "admin"' src/

# 3. ทุก settings API route มี role check
grep -rL "getServerSession" src/app/api/settings/*/route.ts

# 4. type check
npx tsc --noEmit
```

ข้อ 1, 2, 3 ต้องได้ผลลัพธ์ว่างเปล่า (no match) — ข้อ 4 ต้องผ่านไม่มี error ถึงจะ merge ได้

**จุดที่ต้องมี 🔴 Claude review บังคับ (ห้ามข้าม):** Task 3, Task 10 (เฉพาะ Billing), Task 11, Task 13, และ Patch ทั้ง 6 step ของ auth — เพราะแตะ auth/role/secret โดยตรงทั้งหมด