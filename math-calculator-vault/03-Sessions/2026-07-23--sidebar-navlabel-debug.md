---
tags: [session]
date: 2026-07-23
---

# Session: Sidebar Nav Label Truncation + Badge Missing Debug

**Duration / scope:** Multi-round debug (CSS specificity → cascade analysis → runtime width investigation) — sidebar department items

## Debug progression (3 wrong theories discarded)
1. ❌ **Chrome button internal override** — `.navLabel { flex: 1 }` specificity not high enough for `<button>` children — wrong, DevTools showed rule fully active
2. ❌ **Framer Motion height animation affecting width** — wrong, animated `height` only
3. ❌ **overflow-x/overflow-y spec promotion** — `overflow-x: hidden` + `overflow-y: auto` — wrong, promotion only triggers when one value is `visible`
4. ✅ **Runtime computed width mismatch** — DevTools confirmed `.dept-nav-item` computed 214.7px vs parent `.sectionContentInner` 195.2px

## Root cause
`<button>` (form control) does NOT stretch to fill parent width by default, unlike `<div>`. Even with `display: flex`, `width: 100%` required. Badge was pushed past visible area and clipped by `.scrollNav { overflow-x: hidden }`.

## Fix
Added `width: 100%` to `.sidebar-nav-item` and `.dept-nav-item` in `src/app/globals.css`

## Key lesson
Static CSS source analysis unreliable for form-control sizing. Must verify via runtime computed widths in DevTools.

## What's next
- Verify width matches parent on all department items after hard refresh
- Monitor for any layout regressions from `width: 100%`
