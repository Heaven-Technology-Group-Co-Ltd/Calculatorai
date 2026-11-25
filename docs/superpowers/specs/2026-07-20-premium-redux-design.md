# Premium Redux — Full System Redesign

**Date:** 2026-07-20
**Project:** Premium Math Calculator
**Team:** Heaven Developer Team Version
**Phase:** Frontend-only (CLAUDE.md Phase 1)

## 1. Design Philosophy

"Premium ≠ decorated. Premium = deliberate."

ทุก pixel มี purpose — ไม่มีองค์ประกอบตกแต่งที่ไม่ได้ใช้งาน ใช้ typography hierarchy, spacing system, และ content-driven design เพื่อสร้างความรู้สึก premium แทนการใช้ effects หรือ gradient มากเกินไป

### Anti-Patterns (ห้ามโดยเด็ดขาด)
- ❌ Gradient ม่วง/น้ำเงิน/ชมพู full-screen
- ❌ Glassmorphism จำนวนมาก (ใช้เฉพาะ floating overlay)
- ❌ Card radius เหมือนกันทุก section
- ❌ Floating orb/blob ตกแต่งพื้นหลัง
- ❌ Glow effect รอบทุก element
- ❌ Icon ในกล่อง gradient
- ❌ Hero = heading + 2 ปุ่ม
- ❌ Grid การ์ด 3 ใบเหมือนกัน
- ❌ Marketing speak / placeholder text
- ❌ Animation ทุก element
- ❌ Border radius ใหญ่เกินจำเป็น
- ❌ Shadow หนัก / accent color มากเกินไป

## 2. Color Palette

| Token | Color | Usage |
|-------|-------|-------|
| `--bg` | #08080D | Deep charcoal — background หลัก |
| `--surface` | #0A0A12 | Sidebar, drawer |
| `--surface-card` | rgba(255,255,255,0.02) | Formula cards |
| `--border` | rgba(255,255,255,0.06) | Subtle borders |
| `--primary` | #D4AF37 | Gold accent — active, focus |
| `--accent` | #FF2F92 | Magenta — secondary accent |
| `--text` | #EDEDEF | Primary text |
| `--text-muted` | rgba(237,237,239,0.35) | Secondary text |
| `--success` | #64C8C8 | Teal — status positive |

## 3. Typography

| Context | Font | Weight | Size |
|---------|------|--------|------|
| Heading | Outfit | 700–900 | 20–28px |
| Body | Inter | 400–600 | 13–15px |
| Formula preview | JetBrains Mono | 400–500 | 12–13px |
| Small/label | Inter | 500 | 10–12px |
| Logo | Outfit | 800 | 17px |

## 4. Radius & Spacing

| Token | Value | Where |
|-------|-------|-------|
| `--radius-sm` | 8px | Buttons, inputs |
| `--radius-md` | 12px | Cards, drawer items |
| `--radius-lg` | 14px | Surface containers |
| `--space-card` | 18px | Card padding |
| `--space-section` | 24px | Section padding |
| `--space-grid` | 14px | Card grid gap |

## 5. Layout Architecture

### 5.1 Desktop (> 1024px)
```
┌─────────────┬──────────────────────────────────────┬──────────┐
│  Sidebar    │  Content Area                        │ History  │
│  (220px)    │                                      │ Drawer   │
│             │  [Top Bar — breadcrumb + actions]    │ (280px)  │
│  ✦ Premium │                                      │          │
│  Calculator │  [Hero — heading, search, stats]     │ ประวัติ  │
│             │                                      │          │
│  ● Calc     │  [Level Tabs — horizontal chips]     │ Item 1   │
│  ○ Formulas │                                      │ Item 2   │
│  ○ History  │  [4-col Formula Card Grid]           │ Item 3   │
│  ───────    │  ▢  ▢  ▢  ▢                         │          │
│  ○ Dashboard│  ▢  ▢  ▢  ▢                         │          │
│  ○ Settings │                                      │          │
│             │  [Footer]                            │          │
└─────────────┴──────────────────────────────────────┴──────────┘
```

### 5.2 Tablet Portrait (768–1024px)
- Sidebar → collapsed (56px, icon-only)
- Grid → 3 columns
- History drawer → hidden (use slide panel or bottom sheet)

### 5.3 Tablet Landscape / Small Desktop (480–768px)
- Bottom tab navigation + hamburger
- Grid → 3 columns
- History → bottom sheet
- Search full width

### 5.4 Mobile (< 480px)
- No sidebar → bottom tab bar (5 items)
- Grid → 2 columns (compact cards)
- History → bottom sheet (drag handle, 65% height)
- Hero → compact (no stats)
- Level filter → horizontal scroll chips
- Auth → full screen modal
- Formula expand → new page (not in-place)

## 6. Component Architecture

### 6.1 Formula Card (4 variants)

**A. CalculatorCard** — Desktop formula
- Icon (flat subtle bg, no gradient)
- Title + department
- Formula preview (monospace)
- Tags (level, category)
- Expand on click

**B. HistoryItem** — Compact row
- Title + timestamp (left)
- Result value (right, gold)
- Delete on swipe/click

**C. StatTile** — Dashboard / summary
- Label (uppercase small)
- Value (large, Outfit)
- Change indicator

**D. FeatureRow** — Settings / info
- Icon (flat bg)
- Title + description
- Border-bottom separator

### 6.2 Navigation Components

| Component | Desktop | Tablet | Mobile |
|-----------|---------|--------|--------|
| Sidebar | Full (220px) | Icon-only (56px) | Drawer overlay |
| Top Bar | Breadcrumb + actions | Hamburger + actions | Hamburger + logo |
| Level Tabs | Inline chips | H-scroll chips | H-scroll chips |
| Bottom Nav | Hidden | Hidden | Fixed bottom bar |
| History | Right drawer | Slide panel | Bottom sheet |
| Auth Modal | Centered modal | Centered modal | Full screen |

### 6.3 Animation (Purposeful Only)

| Animation | Where | Type | Duration |
|-----------|-------|------|----------|
| Sidebar open/close | Navigation | Slide + fade | 0.25s |
| Bottom sheet slide | History (mobile) | Slide up (spring) | 0.3s |
| Card enter stagger | Formula grid | Fade up + translate | 0.35s (50ms stagger) |
| Search filter | Results | Opacity transition | 0.15s |
| Button hover | All buttons | Scale 1.02 | 0.12s |
| Card hover | Formula cards | Border-color shift | 0.15s |
| Loading progress | Splash gate | Delta-time progress | Variable |

**DO NOT animate:** Background, decorative elements, every card on screen, logo spin, parallax.

### 6.4 Animated Page Transitions (Framer Motion)

| Transition | From | To | Animation | Duration |
|------------|------|----|-----------|----------|
| Desktop page change | Old content | New content | `AnimatePresence` fade + slide 8px | 0.2s |
| Sidebar toggle | Closed state | Open state | `motion.aside` width + opacity | 0.25s |
| Mobile bottom sheet history | Hidden | Visible | `motion.div` y: "100%" → "0" | 0.3s spring |
| Card grid appear | Empty | Populated | Stagger children each `fadeUp` | 0.35s |
| Level filter change | Old grid | New grid | Crossfade via layoutId | 0.2s |
| Formula expand | Card | Expanded card | LayoutAnimation + height auto | 0.3s |
| Search input focus | Idle | Focused | Border-color + subtle box-shadow | 0.15s |

Easing: `cubic-bezier(0.22, 1, 0.36, 1)` — ease-out-expo equivalent.
Reduced motion: `prefers-reduced-motion: reduce` → remove all enter/exit, keep only functional transforms (sidebar open/close).

### 6.5 Mobile Page Transitions

Mobile navigation uses a stack pattern (not tab switching):
| Action | Transition |
|--------|-----------|
| Tap card → formula page | Slide in from right (push) |
| Back from formula | Slide out to right (pop) |
| Open drawer | Slide in from left, darken content |
| Open bottom sheet | Slide up from bottom, darken background |
| Tab switch (bottom nav) | Instant (no animation, like native iOS tabs) |

## 7. Performance Optimizations (จาก Speed & Substance)

- `will-change: transform` — เฉพาะ animated elements
- `contain: layout style` — สำหรับ card grid container
- `content-visibility: auto` — สำหรับ cards นอกจอ
- GPU transform → ใช้ `transform3d` แทน `opacity` animation
- React.memo → FormulaCard, HistoryItem
- useMemo → filtered formula list
- dynamic import → dashboard components
- useDeferredValue → search input
- `touch-action: manipulation` → ป้องกัน double-tap zoom บน mobile
- `scrollbar-width: none` → h-scroll tabs

## 8. Files to Modify

### Core Components
| File | Change |
|------|--------|
| `src/app/globals.css` | Update CSS variables (colors, radius) |
| `src/lib/design-tokens.ts` | Update TS tokens match new palette |
| `src/components/AppShell.tsx` | Layout restructure, responsive logic |
| `src/components/AppShell.module.css` | Responsive layout styles |
| `src/components/Sidebar.tsx` | Collapsed state (icon-only), responsive |
| `src/components/Sidebar.module.css` | Icon-only variant |
| `src/components/LevelTabs.tsx` | Horizontal scroll variant mobile |
| `src/components/LevelFilter.tsx` | Responsive chip layout |
| `src/components/HomeHero.tsx` | Stats section, responsive compact |
| `src/components/ConfirmModal.tsx` | Full-screen on mobile |

### Formula Components
| File | Change |
|------|--------|
| `src/components/formulas/FormulaCard.tsx` | New design (flat icon bg, tags, formula preview) |
| `src/components/formulas/FormulaCard.module.css` | New card styles |
| `src/components/formulas/FormulaGrid.tsx` | Responsive grid breakpoints |

### History
| File | Change |
|------|--------|
| `src/components/features/history/HistorySidebar.tsx` | Bottom sheet for mobile |
| `src/components/features/history/HistorySidebar.module.css` | Sheet/drawer modes |

### Loading
| File | Change |
|------|--------|
| `src/components/features/loading/LoadingScreen.tsx` | Mobile particle reduction |
| `src/components/features/loading/LoadingScreen.module.css` | Adjust for new palette |
| `src/components/features/loading/LoadingScreen.config.ts` | Mobile config |

### Dashboard (future phase — minimal changes now)
| File | Change |
|------|--------|
| `src/components/dashboard/DashboardLayout.tsx` | Responsive sidebar integration |
| `src/components/dashboard/*.tsx` | Token-based color updates |

### Auth
| File | Change |
|------|--------|
| `src/components/AuthButton.tsx` | Mobile responsive |
| `src/components/AuthGuard.tsx` | Full screen on mobile |
| `src/components/signup/SignUpClient.tsx` | Mobile layout |
| `src/components/purchase/PurchaseClient.tsx` | Mobile layout |

## 9. Implementation Order

1. **Phase 0:** Backup + Git tag (done)
2. **Phase 1:** Design tokens (globals.css, design-tokens.ts)
3. **Phase 2:** AppShell responsive layout (sidebar → icon → bottom nav)
4. **Phase 3:** FormulaCard redesign (flat icons, tags, variants)
5. **Phase 4:** Sidebar responsive (collapsed, drawer, bottom nav)
6. **Phase 5:** Hero + LevelFilter responsive
7. **Phase 6:** History responsive (drawer → bottom sheet)
8. **Phase 7:** Animation integration (purposeful only)
9. **Phase 8:** Mobile auth/purchase pages
10. **Phase 9:** Performance pass (memo, content-visibility, etc.)
11. **Phase 10:** Build verify + Log update + Memory save

## 10. Verification

- `pnpm type-check` — 0 errors
- `pnpm build` — 0 errors
- Responsive: test at 320px, 480px, 768px, 1024px, 1440px
- Anti-pattern audit: checklist from section 1
- Animations: only purposeful, `prefers-reduced-motion` respected
- No inline styles, no `as any`, no `dangerouslySetInnerHTML`
