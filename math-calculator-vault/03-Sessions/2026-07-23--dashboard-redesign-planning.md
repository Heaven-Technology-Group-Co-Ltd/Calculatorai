---
tags: [session]
date: 2026-07-23
---

# Session: Dashboard Redesign Planning & Design Doc

**Duration / scope:** Full dashboard redesign planning — brainstorming → design doc → implementation plan. Approved spec v2 with access control, i18n, pagination, virtualized heatmap.

## What changed
- Brainstormed 3 approaches (extend / redesign / rewrite) → chose **full rewrite**
- Designed complete component tree: `ui/`, `blocks/`, `pages/`, `tables/`, `settings/`, `hooks/`, `i18n/`
- Decided on SWR for data fetching layer (caching, dedup, auto-revalidate, mobile-aware revalidation policy)
- Mobile-first responsive: drawer sidebar + bottom tab nav + horizontal KPI scroll
- Access control: DashboardGuard with viewer/editor/admin roles
- Paginated UserTable (offset-based, 25/50/100 pageSize, 300ms debounced search)
- Virtualized FormulaHeatmap via react-window FixedSizeGrid
- i18n with th/en JSON files + useDashboardT() hook
- CSS Modules split into 4 files (shell, blocks, tables, settings)
- Created design spec at `docs/superpowers/specs/2026-07-23-dashboard-redesign.md`
- Created implementation plan at `docs/superpowers/plans/2026-07-23-dashboard-redesign.md` (13 tasks, 52 files)

## What's next
- Execute implementation plan (user still needs to choose subagent-driven vs inline execution)
- Tasks 0→13 in order: deps → utilities → UI primitives → context → layout → hooks → blocks → pages → tables → settings → wire-up → modals → auth hook

## Anything to remember
- user revised spec to v2 themselves, adding detail on access control, pagination contract (offset-based with page/pageSize), formula heatmap virtualization, CSS Module split, and mobile revalidation policy
- user wants lucide-react icons throughout (not emoji placeholders)
- temp mockup HTML files to be deleted in Task 11 cleanup
