# Dashboard Redesign — Premium Math Calculator (v2)

**Date:** 2026-07-23 (revised)
**Status:** Draft (pre-implementation) — v2 addresses auth, pagination, i18n, and perf gaps found in v1 review
**Author:** Hiroshi / Claude Code — reviewed by Yuki
**Stack:** Next.js 16 (App Router) + TypeScript strict + Recharts + SWR + Tailwind CSS + CSS Modules
**Palette:** Ursa — forest dark (#242F35, #1B272C), cream-peach primary (#E8B896), gold (#D4A045)

---

## 1. Objective

Rewrite the existing admin dashboard (5 pages, 15+ components) from scratch for better component isolation, unified data fetching, proper mobile-first responsive design, and cleaner maintenance. Keep the overall 5-tab structure (Overview, Analytics, Finance, Users, Settings).

**Non-goals:** Changing the backend API, changing the color palette, adding new backend features.

**New in v2:** access control model, pagination contract, search debounce, mobile-aware revalidation, i18n key structure, heatmap virtualization, CSS Module split convention.

---

## 2. Architecture

### 2.1 File Structure

```
src/components/dashboard/
├── DashboardProvider.tsx       # Context: activeTab, dateRange, refreshKey
├── DashboardShell.tsx          # Layout shell: sidebar + topbar + content
├── DashboardGuard.tsx          # NEW: role/session check wrapper
├── pages/
│   ├── OverviewPage.tsx
│   ├── AnalyticsPage.tsx
│   ├── FinancePage.tsx
│   ├── UsersPage.tsx
│   └── SettingsPage.tsx
├── blocks/
│   ├── KpiRow.tsx
│   ├── TrafficAreaChart.tsx
│   ├── DevicePieChart.tsx
│   ├── ConversionFunnel.tsx
│   ├── RecentActivityFeed.tsx
│   ├── TopPagesTable.tsx
│   ├── SystemHealth.tsx
│   ├── FormulaHeatmap.tsx      # now virtualized, see 3.6
│   ├── RevenueChart.tsx
│   ├── PlanBreakdown.tsx
│   └── GeographyList.tsx
├── tables/
│   ├── UserTable.tsx           # now paginated, see 3.7
│   ├── InvoiceTable.tsx
│   ├── RefundTable.tsx
│   └── modals/
│       ├── UserDetailModal.tsx
│       ├── MessageModal.tsx
│       ├── BanConfirmModal.tsx
│       └── PlanChangeModal.tsx
├── settings/
│   ├── GeneralSettings.tsx
│   ├── SecuritySettings.tsx    # requires 'admin' role
│   ├── BillingSettings.tsx     # requires 'admin' role, server-side key masking
│   └── WebhookManager.tsx      # requires 'admin' role
├── ui/
│   ├── Panel.tsx
│   ├── KpiCard.tsx
│   ├── Skeleton.tsx
│   ├── EmptyState.tsx
│   ├── ErrorState.tsx
│   └── StatusBadge.tsx
├── hooks/
│   ├── useDashboardStats.ts
│   ├── useTraffic.ts
│   ├── useRevenue.ts
│   ├── useAnalytics.ts
│   ├── useUsers.ts              # now accepts page/pageSize
│   ├── useDebouncedValue.ts     # NEW: generic 300ms debounce
│   └── useDashboardAuth.ts      # NEW: session + role resolver
├── i18n/                        # NEW
│   ├── dashboard.th.json
│   ├── dashboard.en.json
│   └── useDashboardT.ts         # thin wrapper, keys namespaced "dashboard.*"
└── styles/
    ├── dashboard-shell.module.css
    ├── dashboard-blocks.module.css
    ├── dashboard-tables.module.css
    └── dashboard-settings.module.css
```

### 2.2 DashboardProvider (Context)

```tsx
interface DashboardContextValue {
  activeTab: 'overview' | 'analytics' | 'finance' | 'users' | 'settings';
  setActiveTab: (tab: string) => void;
  dateRange: '7d' | '30d' | '90d' | 'custom';
  setDateRange: (range: string) => void;
  customDateRange: { from: Date; to: Date } | null;
  refreshKey: number;
  triggerRefresh: () => void;
  role: 'viewer' | 'editor' | 'admin';   // NEW — sourced from session, read-only in context
}
```

### 2.3 Access Control (NEW — Section 2.3)

- `DashboardGuard.tsx` wraps `DashboardShell` at the route level (`app/dashboard/layout.tsx`), validates session server-side before render — never trust client-only checks for `Settings > Security/Billing/Webhooks`.
- Role check happens in **two places**: (1) server component / route handler rejects unauthorized requests with 403, (2) client hides nav entries the role can't access, purely for UX — not a security boundary.
- `BillingSettings` never receives raw Stripe secret keys in the client bundle. API returns masked values (`sk_live_••••1234`); full key only shown via a separate "reveal" action that re-authenticates.
- Roles: `viewer` (Overview/Analytics read-only), `editor` (+ Users/Finance actions), `admin` (+ Settings).

### 2.4 SWR Data Layer

- Install `swr` (package)
- Each endpoint gets a dedicated hook
- Hooks return standard `{ data, error, isLoading, isValidating, mutate }`
- Global revalidation defaults: `refreshInterval: 30_000` (30s, **Overview tab only**)
- `revalidateOnFocus`: **`true` on desktop, `false` on mobile viewport** (see 2.5) — avoids refetch storms from frequent app-switching on phones
- Error boundaries at block level — one block's error does not crash the page

```tsx
// lib/fetcher.ts
export const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error('API error');
  return r.json();
});

// hooks/useTraffic.ts
export function useTraffic({ days = 7 }: { days?: number } = {}) {
  const { refreshKey } = useDashboardContext();
  const isMobile = useMediaQuery('(max-width: 900px)');
  return useSWR(
    `/api/analytics/traffic?days=${days}&k=${refreshKey}`,
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: !isMobile }
  );
}
```

### 2.5 Mobile Revalidation Policy (NEW)

| Context | `revalidateOnFocus` | `refreshInterval` |
|---|---|---|
| Desktop, Overview tab | `true` | 30s |
| Desktop, other tabs | `true` | off |
| Mobile, Overview tab | `false` | 30s |
| Mobile, other tabs | `false` | off |

Rationale: mobile users background/foreground the app frequently (notifications, calls); focus-triggered revalidation on every hook would cause request bursts and visible layout jank. The 30s interval on Overview still keeps data fresh without focus-spam.

### 2.6 Error & Loading Strategy

Unchanged from v1 — every block handles `error / loading / empty / data` explicitly via `Panel` + `ErrorState` / `Skeleton` / `EmptyState`.

---

## 3. Component Specifications

### 3.1–3.5 (Panel, KpiCard, Skeleton, EmptyState/ErrorState, StatusBadge)

Unchanged from v1 — see original spec. All copy strings now route through `useDashboardT()` instead of hardcoded Thai (see Section 6).

### 3.6 `blocks/FormulaHeatmap.tsx` (NEW spec — was unspecified in v1)

- Data volume: elementary → university formula catalog can realistically reach 500–2000+ entries.
- Use `react-window` (`FixedSizeGrid`) for the cell grid instead of naive `.map()` render.
- Default view: top 50 most-used formulas; "Show all" toggle mounts the virtualized full grid.
- Cell hover/tooltip lazy-renders detail (no eager tooltip mount for off-screen cells).

### 3.7 `tables/UserTable.tsx` (NEW spec — pagination was unspecified in v1)

- **Pagination model:** offset-based, `page` (1-indexed) + `pageSize` (default 25, options: 25/50/100).
- API contract: `GET /api/users?page=1&pageSize=25&search=&status=&plan=` → `{ data: User[], total: number, page: number, pageSize: number }`
- `useUsers({ page, pageSize, search, filter })` returns the above shape; `UserTable` renders numbered pagination controls (prev/next + page input), not infinite scroll — admin tables benefit from jumping to a known page (e.g. "go to page 40 for user X").
- **Search debounce:** `SearchBar` input runs through `useDebouncedValue(input, 300)` before it hits the SWR key, preventing a request per keystroke.

```tsx
// hooks/useDebouncedValue.ts
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
```

### 3.8 `ui/StatusBadge.tsx`

Unchanged from v1.

---

## 4. Layout & Responsive Design

Unchanged from v1 — breakpoint table, desktop/tablet/mobile/small-phone layouts all carry over as-is. See Section 2.5 above for the mobile *data-fetching* behavior that pairs with this layout (separate concern from visual layout).

---

## 5. Page Breakdown

Unchanged from v1 for Overview, Analytics, Finance. Users and Settings updated:

### 5.4 Users (updated)

- **SearchBar + Filters:** by status, plan, date range — search debounced 300ms (3.7)
- **UserTable:** Sortable columns: Name, Email, Plan, Status, Actions — paginated 25/50/100 (3.7)
- **Modals:** UserDetailModal, MessageModal, BanConfirmModal, PlanChangeModal — ban/plan-change actions require `editor` role minimum
- API: `useUsers({ page, pageSize, search, filter })`

### 5.5 Settings (updated)

- **Sidebar sub-navigation:** General, Security, Billing, Webhooks
- **Access:** entire Settings route wrapped by `DashboardGuard` requiring `admin` role (2.3); non-admins never receive the settings bundle, not just a hidden nav item
- **GeneralSettings:** Site name, description, logo upload
- **SecuritySettings:** Password change, 2FA toggle, active sessions list
- **BillingSettings:** Stripe keys **masked by default**, reveal requires re-auth (2.3)
- **WebhookManager:** CRUD webhook endpoints, test button
- API: `useSettings()`, `useWebhooks()`

---

## 6. i18n Strategy (NEW — Section 6)

Target languages: TH, EN, JP, CN, KO (per project roadmap).

- All user-facing strings in dashboard components move to `i18n/dashboard.{locale}.json`, namespaced under `dashboard.*` (e.g. `dashboard.errors.loadFailed`, `dashboard.empty.noDataInRange`).
- `useDashboardT()` is a thin wrapper around the project's existing i18n solution (confirm which library — `next-intl` vs custom — before scaffolding; not decided in this doc).
- v1 mistake being corrected: strings like `"โหลดข้อมูลไม่สำเร็จ"` and `"ไม่มีข้อมูลในช่วงนี้"` were hardcoded directly in `ErrorState`/`EmptyState` call sites. In v2, only the *default* locale file has Thai; components always call `t('dashboard.errors.loadFailed')`.
- Numbers/currency/dates in KPI cards and tables use `Intl.NumberFormat` / `Intl.DateTimeFormat` with the active locale, not hardcoded `th-TH`.

---

## 7. CSS Module Convention (revised — was a loose "300-400 lines" rule in v1)

- One module per structural group, not one per component and not one giant file:
  - `dashboard-shell.module.css` — DashboardShell, sidebar, topbar, drawer, bottom nav
  - `dashboard-blocks.module.css` — KpiRow, charts, funnel, activity feed, system health
  - `dashboard-tables.module.css` — UserTable, InvoiceTable, RefundTable, modals
  - `dashboard-settings.module.css` — settings sub-pages
- No module is shared across the four groups above; if a style is truly global (e.g. shimmer keyframes), it lives in a shared `ui/styles/primitives.module.css` imported by `ui/` components only.
- Soft guideline: if a single module exceeds ~500 lines, split by sub-feature within that group rather than by arbitrary line count.

---

## 8. Data Flow

```
User Action (change date range / tab / refresh / page / search)
       │
       ▼
DashboardProvider (update context: dateRange, refreshKey, page, debounced search)
       │
       ▼
SWR Hook re-fetches (key changed: `/api/...?days=7&page=2&search=alice&k=3`)
       │
       ▼
Block/Table Component receives new data via hook
       │
       ▼
Renders: data ✓ | loading → skeleton | error → ErrorState | empty → EmptyState
```

**No prop drilling:** each block/table calls its own SWR hook. Auth state flows via `DashboardGuard` at the route boundary, not through props.

---

## 9. Implementation Order

1. Scaffold file structure, install `swr` + `react-window`
2. Write `ui/` primitives: Panel, KpiCard, Skeleton, EmptyState, ErrorState, StatusBadge
3. Write `DashboardGuard.tsx` + confirm role model against actual backend session shape
4. Write `DashboardProvider` + `DashboardShell` (layout with responsive sidebar/drawer/bottom-nav)
5. Set up `i18n/` structure + `useDashboardT()`, port existing hardcoded strings
6. Write SWR hooks incl. `useDebouncedValue`, mobile-aware `revalidateOnFocus`
7. Write blocks (KpiRow, TrafficAreaChart, DevicePieChart, virtualized FormulaHeatmap, etc.)
8. Write `UserTable` with pagination + debounced search
9. Compose OverviewPage from blocks
10. Compose remaining pages (Analytics, Finance, Users, Settings — Settings behind guard)
11. Wire up `DashboardClient.tsx` + `app/dashboard/page.tsx`
12. Delete old dashboard files (cleanup)
13. Delete temp mockup HTML files

---

## 10. Future Considerations

- **Backend-driven state:** all data flows through SWR; no localStorage/sessionStorage in the dashboard. Ready for Supabase migration.
- **Testing:** blocks receive data via props + hooks are mockable (`jest.mock('swr')` or `msw`); `DashboardGuard` gets dedicated tests for each role x route combination.
- **Adding new pages:** add tab to DashboardProvider types, create page file, add route in DashboardShell, decide required role.
- **Open question carried over:** confirm i18n library choice (`next-intl` recommended given App Router) before Section 6 work starts.