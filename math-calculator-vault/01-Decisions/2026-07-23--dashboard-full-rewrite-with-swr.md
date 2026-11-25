---
tags: [decision]
status: active
date: 2026-07-23
---

# Decision: Dashboard Full Rewrite with SWR

## Context
Existing admin dashboard had grown unwieldy: OverviewPage ~450+ lines, no proper mobile layout, mixed inline/CSS styles, inconsistent error handling, no data caching strategy. The codebase needed a clean foundation for maintenance.

## Decision
Rewrite the entire dashboard from scratch with a focused component tree (ui/blocks/pages/hooks), SWR for data fetching, mobile-first responsive design, and built-in i18n support.

## Alternatives Considered
- **Extend existing code** — fastest path (1-2 days) but leaves architectural debt, no improvement to component isolation
- **Redesign (keep sub-components)** — balanced approach (2-4 days) but existing components still carry old patterns

## Consequences
- Clean component boundaries: blocks are pure (receive data via props), hooks own data fetching, UI primitives are reusable
- SWR provides caching, dedup, auto-revalidation, retry for free — critical for dashboard with 5+ simultaneous API calls
- Mobile-first layout means proper drawer sidebar + bottom tab nav (not just responsive shrinking)
- Implementation is ~5-7 days of work (13 tasks, 52 new files)
- Legacy dashboard files (DashboardLayout, old CSS module) will be deleted in final task

## Related
- [[2026-07-23--dashboard-redesign-planning]]
- [[ursa-palette-redesign]]
