---
tags: [session]
date: 2026-07-22
---

# Session: Sidebar Scroll Fix + Premium SidebarSection Styling

**Duration / scope:** ~15 min (scroll fix) + ~20 min (premium styling) — CSS + JSX, sidebar UX polish

## Phase 1: Scroll Fix
- เพิ่ม `.scrollNav` CSS class ใน `Sidebar.module.css` — `flex: 1; overflow-y: auto; min-height: 0;` พร้อม custom scrollbar (thin, Ursa cream-peach tint)
- Wrap `<SidebarSection>` ทั้งสอง (Levels, Departments) ด้วย `<nav className={styles.scrollNav}>` ใน `Sidebar.tsx`
- Header (`sidebar-header`) และ Footer (`sidebar-footer` + `sidebar-bottom-profile`) อยู่กับที่ขณะ scroll

## Phase 2: Premium Visual Polish (2026-07-22 23:55)
**SidebarSection.module.css** — rewritten from scratch:
- `.sectionTrigger`: `border-radius: var(--radius-md)`, transparent border → cream-peach on hover, shimmer sweep `::before` pseudo-element
- `.sectionTriggerOpen`: cream-peach tinted background + border + primary color when expanded
- `.sectionCount`: pill badge (18px, 9px radius), subtle border, transitions to cream-peach on hover/expand
- `.sectionChevron`: staged opacity (0.4 → 0.8 → 1.0) + color transition
- `.sectionContentInner`: `border-left: 1px solid rgba(232,184,150,0.08)` accent line

**SidebarSection.tsx** — enhanced:
- `layout="position"` on trigger button → auto-animates when sibling sections toggle
- `aria-expanded` + `aria-label` for a11y
- `sectionContentInner` wrapper div inside AnimatePresence content
- ChevronDown `strokeWidth={2.5}` bolder

**Sidebar.module.css** — scrollNav polished:
- `scroll-behavior: smooth`
- `::after` sticky bottom fade overlay (gradient transparent → sidebar-bg)
- Webkit scrollbar `margin-block: 4px`, `:hover` + `:active` states
- `border-radius: 999px` (fully rounded thumb)

## Phase 3: Root Cause Fix — auto margin vs flex-grow (2026-07-23 00:01)
**Symptoms:** Scrollbar track โผล่ (จาก `overflow-y: scroll`) แต่ thumb ไม่ขยับ — เลื่อนไม่ได้

**Root cause:** `.sidebar-footer` มี `margin-top: auto` ใน flex container เดียวกับ `.scrollNav` ที่มี `flex: 1`
CSS Flexbox spec ระบุว่า **auto margins ชนะ flex-grow** → `margin-top: auto`
อ้างสิทธิ์พื้นที่ว่างทั้งหมด `flex: 1` scrollNav ไม่ได้ถูกจำกัดขนาด → content fit พอดี → overflow 0

**Fix:**
| เปลี่ยน | จาก | เป็น |
|--------|-----|-----|
| `.sidebar-footer` (globals.css) | `margin-top: auto` | `flex-shrink: 0` |
| `.scrollNav` (Sidebar.module.css) | `overflow-y: scroll` | `overflow-y: auto` |
| `.scrollNav` | (เพิ่ม) | `overscroll-behavior: contain` |
| `.scrollNav` | (เพิ่ม) | `touch-action: pan-y` |

**Final structure:**
```
motion.aside (100vh, flex column, overflow:hidden)
├── sidebar-header              ← sticky
├── <nav .scrollNav>           ← flex:1 1 0%, min-height:0, overflow-y:auto ← SCROLL
│   ├── SidebarSection Levels
│   └── SidebarSection Departments
└── sidebar-footer              ← flex-shrink:0 (NO margin-top:auto!)
```

## Before vs After
```
Before:                           After:
┌────────────┐                    ┌────────────┐
│  Header     │                   │  Header     │ ← sticky
│  Levels     │                   │  ┌────────┐ │
│  (expand)   │                   │  │ Levels  │ │ ← shimmer hover
│  Depts      │ ← ดัน footer หาย  │  │ (scroll)│ │ ← scroll ได้!
│  (expand)   │                   │  │ Depts   │ │ ← pill badges
│  Footer ✗   │                   │  └────────┘ │
└────────────┘                    │  Footer     │ ← sticky
                                  └────────────┘
```

## Anything to remember
- ถ้าเพิ่ม Section ใหม่ใน sidebar ต้องใส่ไว้ใน `<nav className={styles.scrollNav}>` ถึงจะ scroll ได้
- SidebarSection trigger ใช้ `layout="position"` — animation จะ smooth ขึ้นเมื่อ section อื่น toggle
- Section count badge ใช้ `.sectionCount` — pill shape, auto-transitions on hover
- scrollNav `::after` pseudo-element ใช้ `position: sticky` สร้าง fade gradient ที่ bottom
