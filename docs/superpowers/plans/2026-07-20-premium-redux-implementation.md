# Premium Redux Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Premium Math Calculator frontend — dark platinum theme, gold accents, purposeful animations, responsive 4-breakpoint layout, mobile-first navigation.

**Architecture:** Upgrade existing Obsidian dark theme to Premium Redux by updating CSS tokens first, then migrating components per breakpoint. Desktop uses full sidebar, tablet collapses to icon sidebar, mobile uses bottom tab bar + drawer/bottom sheet. All animations are purposeful (not decorative). Anti-patterns from `memory/design-anti-patterns.md` enforced throughout.

**Tech Stack:** Next.js 16.2.6 · React 19.2.3 · TypeScript strict · Tailwind CSS v4 · Framer Motion · CSS Modules

**Design Spec:** `docs/superpowers/specs/2026-07-20-premium-redux-design.md`
**Anti-Patterns:** `memory/design-anti-patterns.md`
**Backup Tag:** `pre-premium-redux-2026-07-20`

---

### Task 1: Update Design Tokens (globals.css + design-tokens.ts)

**Files:**
- Modify: `src/app/globals.css` — lines 1-100 (CSS variables)
- Modify: `src/lib/design-tokens.ts` — COLORS, RADII, SPACING objects

- [ ] **Step 1: Update CSS variables in globals.css**

Replace the `:root` color variable section. New palette: deep charcoal (#08080D), gold (#D4AF37), subtle surface (#0A0A12). Change the variable block at the top of globals.css:

```css
:root {
  /* ── Backgrounds ── */
  --bg: #08080D;
  --surface: #0A0A12;
  --surface-card: rgba(255, 255, 255, 0.02);
  --surface-hover: rgba(255, 255, 255, 0.04);
  --surface-glass: rgba(10, 10, 18, 0.8);

  /* ── Borders ── */
  --border: rgba(255, 255, 255, 0.06);
  --border-hover: rgba(255, 255, 255, 0.1);
  --border-gold: rgba(212, 175, 55, 0.2);
  --border-gold-hover: rgba(212, 175, 55, 0.35);

  /* ── Colors ── */
  --primary: #D4AF37;
  --primary-light: #C9A84C;
  --primary-subtle: rgba(212, 175, 55, 0.08);
  --secondary: #FF2F92;
  --accent-teal: #64C8C8;

  /* ── Text ── */
  --text: #EDEDEF;
  --text-secondary: rgba(237, 237, 239, 0.6);
  --text-muted: rgba(237, 237, 239, 0.35);
  --text-dim: rgba(237, 237, 239, 0.15);

  /* ── Radius ── */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 14px;
  --radius-xl: 16px;
  --radius-full: 100px;

  /* ── Transitions ── */
  --transition-fast: 0.12s ease;
  --transition-base: 0.2s ease;
  --transition-slow: 0.3s ease;
}
```

**Keep** existing keyframes (fadeIn, fadeUp, slideInRight, slideInLeft, pulse-dot, spin).
**Remove** old color variables (surface-old, accent-old if they existed).
**Remove** any color-mix() usage — use rgba() directly.

- [ ] **Step 2: Update design-tokens.ts**

Change `COLORS` object to match new palette:

```typescript
export const COLORS = {
  bg: "#08080D",
  surface: "#0A0A12",
  surfaceCard: "rgba(255, 255, 255, 0.02)",
  border: "rgba(255, 255, 255, 0.06)",
  borderGold: "rgba(212, 175, 55, 0.2)",
  primary: "#D4AF37",
  primaryLight: "#C9A84C",
  secondary: "#FF2F92",
  accentTeal: "#64C8C8",
  text: "#EDEDEF",
  textSecondary: "rgba(237, 237, 239, 0.6)",
  textMuted: "rgba(237, 237, 239, 0.35)",
  error: "#ef4444",
  success: "#64C8C8",
} as const;

export const RADII = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
} as const;

export const SPACING = {
  card: 18,
  section: 24,
  grid: 14,
} as const;
```

- [ ] **Step 3: Verify build still passes**

Run: `cd d:/testtt/Web_project/projectreal/webrebuild && pnpm type-check 2>&1 | head -20`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
cd d:/testtt/Web_project/projectreal/webrebuild
git add src/app/globals.css src/lib/design-tokens.ts
git commit -m "phase1: update design tokens to Premium Redux palette
- New CSS variables: deep charcoal, gold, subtle surface
- Updated design-tokens.ts COLORS, RADII, SPACING
- Removed color-mix(), old accent colors
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: AppShell Responsive Layout

**Files:**
- Modify: `src/components/AppShell.tsx`
- Modify: `src/components/AppShell.module.css`

**Goal:** Make AppShell responsive — desktop: sidebar + content, tablet: icon sidebar, mobile: bottom nav

- [ ] **Step 1: Update AppShell.module.css with responsive grid**

```css
/* ── AppShell Layout ── */
.appShell {
  display: flex;
  min-height: 100vh;
  background: var(--bg);
}

.mainContent {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* Sidebar variants */
.sidebarFull { width: 220px; flex-shrink: 0; }
.sidebarCollapsed { width: 56px; flex-shrink: 0; }

/* Mobile bottom nav — hidden by default */
.mobileBottomNav {
  display: none;
}

@media (max-width: 768px) {
  .sidebarCollapsed { display: none; }
}

@media (max-width: 480px) {
  .mobileBottomNav {
    display: flex;
    position: fixed;
    bottom: 0; left: 0; right: 0;
    background: rgba(10, 10, 18, 0.96);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-top: 1px solid var(--border);
    padding: 6px 0 env(safe-area-inset-bottom, 6px);
    z-index: 50;
    justify-content: space-around;
  }
}

/* History drawer (desktop) */
.historyDrawer {
  width: 280px;
  border-left: 1px solid var(--border);
  background: var(--surface);
  flex-shrink: 0;
  display: none;
}
.historyDrawerOpen {
  display: block;
}
@media (max-width: 1024px) {
  .historyDrawer { display: none; }
}
```

- [ ] **Step 2: Update AppShell.tsx — responsive structure**

Add responsive sidebar state and bottom nav. The key changes:
1. Add `useEffect` with `matchMedia` listeners for breakpoints
2. Sidebar width changes based on viewport
3. Bottom nav shown on mobile
4. History drawer auto-hides on tablet/mobile

```typescript
"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { Menu, Eye, EyeOff } from "lucide-react";
import { uiTranslations, departments, Lang } from "@/lib/math-data";
import { formulas } from "@/lib/formulas/registry";
import { FormulaGrid } from "@/components/formulas/FormulaGrid";
import { HomeHero } from "@/components/HomeHero";
import { HistorySidebar } from "@/components/features/history/HistorySidebar";
import { InfoModal } from "@/components/features/info/InfoModal";
import { LanguageDropdown } from "@/components/features/language/LanguageDropdown";
import { Sidebar } from "@/components/Sidebar";
import { ConfirmModal } from "@/components/ConfirmModal";
import { COLORS } from "@/lib/design-tokens";
import { useHistory } from "@/hooks/useHistory";
import styles from "./AppShell.module.css";

export function AppShell() {
  const [lang, setLang] = useState<Lang>("th");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showModalInfo, setShowModalInfo] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeLevel, setActiveLevel] = useState<"all" | string>("all");
  const [activeDept, setActiveDept] = useState<"all" | string>("all");
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [isTablet, setIsTablet] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const { history, addToHistory, deleteItem, clearAll } = useHistory();
  const restorationInitRef = useRef(false);

  // Responsive breakpoint detection
  useEffect(() => {
    const tabletMq = window.matchMedia("(max-width: 1024px)");
    const mobileMq = window.matchMedia("(max-width: 768px)");
    const handler = () => {
      setIsTablet(tabletMq.matches);
      setIsMobile(mobileMq.matches);
      if (mobileMq.matches) setSidebarOpen(false);
      if (!tabletMq.matches) setSidebarOpen(true);
    };
    handler();
    tabletMq.addEventListener("change", handler);
    mobileMq.addEventListener("change", handler);
    return () => {
      tabletMq.removeEventListener("change", handler);
      mobileMq.removeEventListener("change", handler);
    };
  }, []);

  const t = uiTranslations[lang];

  const filtered = formulas.filter((f) => {
    const matchLevel = activeLevel === "all" || f.level === activeLevel;
    const matchDept = activeDept === "all" || f.department === activeDept;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      f.title.en.toLowerCase().includes(q) ||
      f.title.th.includes(q) ||
      f.levelMeta?.title[lang].toLowerCase().includes(q);
    return matchLevel && matchDept && matchSearch;
  });

  const restoreItem = useCallback((itemId: string) => {
    setRestoreId(itemId);
  }, []);

  const closeModal = useCallback(() => setShowModalInfo(false), []);
  const closeConfirm = useCallback(() => setShowModal(false), []);

  const handleClearAll = useCallback(() => {
    clearAll();
    setShowModal(false);
  }, [clearAll]);

  const handleAddToHistory = useCallback(
    (calcId: string, title: string, inputs: Record<string, string>, result: string, unit: string) => {
      addToHistory(calcId, title, inputs, result, unit);
    },
    [addToHistory]
  );

  const handleToggleHistory = useCallback(() => {
    if (isMobile) {
      // On mobile, bottom sheet will be handled by HistorySidebar
    }
    setShowHistory((prev) => !prev);
  }, [isMobile]);

  return (
    <div className={styles.appShell}>
      {/* Sidebar — desktop: full, tablet: collapsed, mobile: hidden */}
      <div ref={sidebarRef} className={isMobile ? "sidebar-hidden" : isTablet ? styles.sidebarCollapsed : styles.sidebarFull}>
        <Sidebar
          lang={lang}
          activeLevel={activeLevel}
          setActiveLevel={setActiveLevel}
          activeDept={activeDept}
          setActiveDept={setActiveDept}
          collapsed={isTablet && !isMobile}
        />
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Top Bar */}
        <div className="topbar">
          <div className="topbar-left">
            {(isTablet || isMobile) && (
              <button className="tb-btn" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar">
                <Menu size={16} />
              </button>
            )}
            <span className="topbar-breadcrumb">หน้าหลัก / สูตรคณิตศาสตร์</span>
          </div>
          <div className="topbar-right">
            <LanguageDropdown lang={lang} setLang={setLang} />
            <button className="tb-btn" onClick={handleToggleHistory} aria-label="History">
              <Clock size={16} />
            </button>
            <AuthButton lang={lang} />
          </div>
        </div>

        {/* Rest of content — unchanged structure but wrapped in hero/content sections */}
        <HomeHero lang={lang} searchQuery={searchQuery} setSearchQuery={setSearchQuery} isMobile={isMobile} />

        <LevelTabs lang={lang} activeLevel={activeLevel} setActiveLevel={setActiveLevel} />

        <FormulaGrid
          formulas={filtered}
          lang={lang}
          onResult={handleAddToHistory}
          restorationData={restoreId ? { [restoreId]: null } : undefined}
        />

        {/* Footer */}
        <div className="footer">
          <span>© 2026 Premium Math Calculator · Team Heaven Developer Team Version</span>
          <div className="footer-links">
            <a href="#">เงื่อนไขการใช้</a>
            <a href="#">ความเป็นส่วนตัว</a>
            <span className="footer-version">Release v1.1.4</span>
          </div>
        </div>
      </div>

      {/* History Drawer (desktop) or Bottom Sheet (mobile) */}
      <HistorySidebar
        show={showHistory}
        onClose={() => setShowHistory(false)}
        lang={lang}
        history={history}
        onRestore={restoreItem}
        onDelete={deleteItem}
        onClearAll={() => setShowModal(true)}
        isMobile={isMobile}
      />

      <InfoModal show={showModalInfo} onClose={closeModal} lang={lang} />
      <ConfirmModal show={showModal} onClose={closeConfirm} onConfirm={handleClearAll} lang={lang} />

      {/* Mobile Bottom Nav */}
      {isMobile && (
        <div className={styles.mobileBottomNav}>
          <button className="mb-item active"><span className="mb-icon">✦</span>Calc</button>
          <button className="mb-item"><span className="mb-icon">∑</span>Formulas</button>
          <button className="mb-item"><span className="mb-icon">◷</span>History</button>
          <button className="mb-item"><span className="mb-icon">👤</span>Profile</button>
        </div>
      )}
    </div>
  );
}
```

**Note:** This step shows the new responsive structure. We'll refine individual components in later tasks.

- [ ] **Step 3: Verify build**

Run: `cd d:/testtt/Web_project/projectreal/webrebuild && pnpm type-check 2>&1 | head -30`
Expected: 0 errors. If errors about missing CSS classes (`tb-btn`, `topbar`, etc.), note them — they'll be added in subsequent steps.

- [ ] **Step 4: Commit**

```bash
cd d:/testtt/Web_project/projectreal/webrebuild
git add src/components/AppShell.tsx src/components/AppShell.module.css
git commit -m "phase2: AppShell responsive layout with breakpoint detection
- Added matchMedia breakpoints (768px, 1024px)
- Sidebar: full / collapsed / hidden per viewport
- Mobile bottom nav
- History drawer auto-hide on tablet
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Sidebar — Collapsed State + Drawer

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/Sidebar.module.css`

**Goal:** Sidebar works in 3 modes: full (desktop), icon-only (tablet), hidden slide drawer (mobile)

- [ ] **Step 1: Add `collapsed` prop to Sidebar**

```typescript
interface SidebarProps {
  lang: Lang;
  activeLevel: "all" | string;
  setActiveLevel: (level: "all" | string) => void;
  activeDept: "all" | string;
  setActiveDept: (dept: "all" | string) => void;
  collapsed?: boolean;
}
```

In the component, when `collapsed` is true:
- Hide text labels, show only icons (font-size: 0 for nav items, keep icons)
- Reduce padding
- Logo shows as just "✦"

```typescript
// Inside SidebarInner, conditional className:
const sidebarClass = `${styles.sidebar} ${collapsed ? styles.collapsed : ""} ${isOpen ? styles.open : ""}`;

// Nav items when collapsed:
<button className={`${styles.navItem} ${styles.navItemCollapsed}`}>
  <span className={styles.navIcon}>✦</span>
  {!collapsed && <span className={styles.navLabel}>Calculator</span>}
</button>
```

- [ ] **Step 2: Add mobile drawer animation with Framer Motion**

Import `AnimatePresence, motion` and wrap the sidebar:

```typescript
import { motion, AnimatePresence } from "framer-motion";

// Inside sidebar render, as overlay + drawer:
<AnimatePresence>
  {(isMobile && isOpen) && (
    <>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setIsOpen(false)}
      />
      <motion.aside
        className={styles.drawer}
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* full sidebar content with labels */}
      </motion.aside>
    </>
  )}
</AnimatePresence>
```

- [ ] **Step 3: Update Sidebar.module.css**

```css
.sidebar {
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  height: 100vh;
  transition: width var(--transition-base);
}

/* Desktop full */
.sidebar:not(.collapsed) {
  width: 220px;
  padding: 0;
}

/* Tablet collapsed (icon-only) */
.collapsed {
  width: 56px;
  align-items: center;
}
.collapsed .navLabel { display: none; }
.collapsed .navItem { justify-content: center; padding: 9px; }
.collapsed .sidebarHeader { padding: 16px 12px; }
.collapsed .logo { font-size: 18px; }

/* Mobile drawer overlay */
.overlay {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 90;
}

.drawer {
  position: fixed; top: 0; left: 0; bottom: 0;
  width: 280px;
  background: var(--surface);
  border-right: 1px solid var(--border);
  z-index: 91;
  padding: 16px;
  overflow-y: auto;
}

.navItem {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; border-radius: var(--radius-sm);
  font-size: 13px; font-weight: 500;
  color: var(--text-muted);
  margin-bottom: 2px; cursor: pointer;
  border: none; background: none;
  width: 100%; text-align: left;
  transition: all var(--transition-fast);
}
.navItem:hover { background: var(--surface-hover); color: var(--text-secondary); }
.navItem:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
.active { background: var(--primary-subtle); color: var(--primary); }

.navIcon {
  width: 20px; height: 20px; border-radius: 6px;
  background: rgba(255, 255, 255, 0.04); flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px;
}
.active .navIcon { background: rgba(212, 175, 55, 0.12); }
```

- [ ] **Step 4: Add CSS for topbar, breadcrumb, footer in globals.css**

```css
/* Top Bar */
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 24px;
  border-bottom: 1px solid var(--border);
}
.topbar-left { display: flex; align-items: center; gap: 16px; }
.topbar-breadcrumb { font-size: 12px; color: var(--text-dim); }
.topbar-right { display: flex; align-items: center; gap: 8px; }
.tb-btn {
  width: 32px; height: 32px; border-radius: var(--radius-sm);
  background: var(--surface-card); border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; cursor: pointer; color: var(--text-muted);
  transition: all var(--transition-fast);
}
.tb-btn:hover { background: var(--surface-hover); border-color: var(--border-hover); }
.tb-btn:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }

/* Footer */
.footer {
  padding: 16px 24px; border-top: 1px solid var(--border);
  display: flex; justify-content: space-between;
  font-size: 11px; color: var(--text-dim);
  margin-top: auto;
}
.footer a { color: var(--text-dim); text-decoration: none; }
.footer a:hover { color: var(--text-muted); }
.footer-links { display: flex; gap: 16px; }

/* Mobile bottom nav */
.mb-item {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; gap: 2px;
  padding: 6px 0; font-size: 9px;
  color: var(--text-dim); cursor: pointer;
  background: none; border: none;
  transition: color var(--transition-fast);
}
.mb-item.active { color: var(--primary); }
.mb-item:focus-visible { outline: 2px solid var(--primary); outline-offset: -2px; }
.mb-icon { font-size: 18px; }

@media (max-width: 768px) {
  .topbar { padding: 10px 16px; }
  .topbar-breadcrumb { display: none; }
  .footer { flex-direction: column; gap: 8px; text-align: center; padding: 12px 16px; }
}
@media (max-width: 480px) {
  .topbar-breadcrumb { display: none; }
}
```

- [ ] **Step 5: Commit**

```bash
cd d:/testtt/Web_project/projectreal/webrebuild
git add src/components/Sidebar.tsx src/components/Sidebar.module.css src/app/globals.css
git commit -m "phase2b: sidebar responsive (collapsed/drawer) + topbar/footer CSS
- Sidebar: 3 modes (full 220px / icon 56px / mobile drawer)
- Mobile drawer with Framer Motion spring animation
- Topbar breadcrumb + action buttons
- Footer with Team branding
- Mobile bottom nav bar
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: FormulaCard Redesign

**Files:**
- Modify: `src/components/formulas/FormulaCard.tsx`
- Modify: `src/components/formulas/FormulaCard.module.css`
- Modify: `src/components/formulas/FormulaGrid.tsx`

**Goal:** New card design — flat icon background (no gradient), formula preview, tags, responsive 2/3/4-col grid

- [ ] **Step 1: Update FormulaCard.module.css**

```css
.card {
  background: var(--surface-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 18px;
  cursor: pointer;
  transition: border-color var(--transition-base), box-shadow var(--transition-base);
}
.card:hover {
  border-color: var(--border-gold);
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.15);
}
.card:active { transform: scale(0.99); }
.card:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }

/* HEAD */
.cardHead {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 10px;
}
.cardIcon {
  width: 32px; height: 32px; border-radius: var(--radius-sm);
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; flex-shrink: 0;
  /* NO GRADIENT — flat background passed via inline style */
}
.cardTitle { font-size: 14px; font-weight: 600; }

/* Formula preview (monospace) */
.cardFormula {
  font-size: 12px; color: var(--text-muted);
  font-family: "JetBrains Mono", monospace;
  margin-bottom: 10px; line-height: 1.5;
  padding: 8px 0;
}

/* Tags row */
.cardTags { display: flex; gap: 6px; flex-wrap: wrap; }
.cardTag {
  font-size: 10px; padding: 2px 10px; border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border);
  color: var(--text-dim);
}

/* Expanded state */
.expanded {
  border-color: var(--border-gold);
  background: rgba(255, 255, 255, 0.03);
}
```

- [ ] **Step 2: Update FormulaCard.tsx — remove gradient, add formula preview**

```typescript
// Inside component, change the icon rendering:
<div
  className={styles.cardIcon}
  style={{ background: getIconBg(formula.department) }}
>
  {getIcon(formula.department)}
</div>

// Add formula preview
<div className={styles.cardFormula}>
  {formula.formula || formula.description?.en?.substring(0, 40) + "…"}
</div>

// Add tags
<div className={styles.cardTags}>
  <span className={styles.cardTag}>{formula.levelMeta?.title[lang]}</span>
  {formula.department && (
    <span className={styles.cardTag}>
      {departments.find(d => d.id === formula.department)?.title[lang]}
    </span>
  )}
</div>
```

Add a helper function outside the component:
```typescript
const DEPT_COLORS: Record<string, string> = {
  algebra: "rgba(212, 175, 55, 0.08)",
  geometry: "rgba(255, 47, 146, 0.08)",
  calculus: "rgba(100, 200, 200, 0.08)",
  trigonometry: "rgba(212, 175, 55, 0.08)",
  statistics: "rgba(100, 200, 200, 0.08)",
  finance: "rgba(212, 175, 55, 0.08)",
  engineering: "rgba(255, 47, 146, 0.08)",
  science: "rgba(100, 200, 200, 0.08)",
};

function getIconBg(dept?: string): string {
  return dept ? DEPT_COLORS[dept] || "rgba(255, 255, 255, 0.04)" : "rgba(255, 255, 255, 0.04)";
}
```

- [ ] **Step 3: Update FormulaGrid.tsx — responsive grid classes**

Replace the `calc-grid-premium` className with a responsive grid:

```typescript
// Import styles
import styles from "./FormulaGrid.module.css";

// In the render
<div className={styles.grid}>
  {formulas.map((f, i) => (
    <FormulaCard
      key={f.id}
      formula={f}
      lang={lang}
      showFormula={showFormula}
      onResult={onResult}
      restorationData={restorationData?.[f.id] ?? null}
    />
  ))}
</div>
```

Create `FormulaGrid.module.css`:
```css
.grid {
  display: grid;
  gap: 14px;
  padding: 8px 24px 24px;
  grid-template-columns: repeat(4, 1fr);
}

@media (max-width: 1024px) {
  .grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 768px) {
  .grid { grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 8px 16px 16px; }
}
@media (max-width: 480px) {
  .grid { gap: 8px; padding: 8px 12px 60px; }
}

/* Empty state */
.gridEmpty {
  padding: 48px 24px;
  text-align: center;
  color: var(--text-dim);
  font-size: 14px;
}
```

- [ ] **Step 4: Build verify**

Run: `cd d:/testtt/Web_project/projectreal/webrebuild && pnpm type-check 2>&1 | head -30`
Expected: 0 type errors. Fix any missing CSS module imports.

- [ ] **Step 5: Commit**

```bash
cd d:/testtt/Web_project/projectreal/webrebuild
git add src/components/formulas/FormulaCard.tsx src/components/formulas/FormulaCard.module.css src/components/formulas/FormulaGrid.tsx src/components/formulas/FormulaGrid.module.css
git commit -m "phase3: FormulaCard redesign + responsive grid
- Flat icon backgrounds (no gradient boxes)
- Formula preview with monospace font
- Department + level tags
- Responsive grid: 4→3→2 columns
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: LevelTabs — Horizontal Scroll Chip Design

**Files:**
- Modify: `src/components/LevelTabs.tsx`
- Modify: `src/components/LevelTabs.module.css`

**Goal:** Chips ที่ scroll แนวนอนได้บน mobile (ไม่ใช่ grid ปกติ)

- [ ] **Step 1: Update LevelTabs.module.css**

```css
/* Horizontal chip scroll (mobile) */
.tabsRow {
  display: flex;
  gap: 6px;
  padding: 0 24px;
  margin-bottom: 16px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.tabsRow::-webkit-scrollbar { display: none; }

.chip {
  white-space: nowrap;
  padding: 6px 16px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border);
  color: var(--text-muted);
  cursor: pointer;
  flex-shrink: 0;
  transition: all var(--transition-fast);
  font-family: inherit;
}
.chip:hover { border-color: var(--border-hover); color: var(--text-secondary); }
.chip:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
.chipActive {
  background: var(--primary-subtle);
  border-color: var(--border-gold);
  color: var(--primary);
}

/* Icon wrapper */
.icon { display: inline-flex; vertical-align: middle; margin-right: 6px; }
```

- [ ] **Step 2: Update LevelTabs.tsx — use chips instead of grid**

```typescript
export function LevelTabs({ lang, activeLevel, setActiveLevel }: LevelTabsProps) {
  return (
    <div className={styles.tabsRow}>
      <button
        className={`${styles.chip} ${activeLevel === "all" ? styles.chipActive : ""}`}
        onClick={() => setActiveLevel("all")}
        aria-pressed={activeLevel === "all"}
      >
        {uiTranslations.allLevels[lang]}
      </button>
      {levelData.map(lv => (
        <button
          key={lv.id}
          className={`${styles.chip} ${activeLevel === lv.id ? styles.chipActive : ""}`}
          onClick={() => setActiveLevel(lv.id)}
          aria-pressed={activeLevel === lv.id}
        >
          {lv.title[lang]}
        </button>
      ))}
    </div>
  );
}
```

**Note:** Remove the icon from chips on mobile for compactness. On desktop they'll work as-is.

- [ ] **Step 3: Commit**

```bash
cd d:/testtt/Web_project/projectreal/webrebuild
git add src/components/LevelTabs.tsx src/components/LevelTabs.module.css
git commit -m "phase4: LevelTabs horizontal scroll chip design
- Chips with overflow-x: auto for mobile
- Active state with gold border/background
- Removed icon per chip for compactness
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: HomeHero — Stats + Responsive Compact

**Files:**
- Modify: `src/components/HomeHero.tsx`
- Modify: `src/app/globals.css` (add hero styles)

**Goal:** Hero with search bar, stats, responsive — compact on mobile

- [ ] **Step 1: Add hero CSS to globals.css**

```css
.hero {
  padding: 32px 24px 16px;
}
.hero h1 {
  font-family: "Outfit", sans-serif;
  font-size: 28px;
  font-weight: 800;
  margin-bottom: 6px;
  letter-spacing: -0.3px;
}
.hero p {
  font-size: 14px;
  color: var(--text-muted);
  margin-bottom: 16px;
}
.hero-stats {
  display: flex;
  gap: 28px;
  margin-top: 12px;
}
.hero-stat {
  font-size: 12px;
  color: var(--text-dim);
}
.hero-stat strong {
  color: var(--text);
  font-weight: 600;
}

/* Search bar */
.search-row {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 480px;
  background: var(--surface-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  margin-bottom: 12px;
  transition: border-color var(--transition-fast);
}
.search-row:focus-within {
  border-color: var(--border-gold);
}
.search-row input {
  flex: 1;
  background: none;
  border: none;
  color: var(--text);
  font-size: 14px;
  font-family: "Inter", sans-serif;
  outline: none;
}
.search-row input::placeholder { color: var(--text-dim); }

.search-kbd {
  font-size: 10px; padding: 2px 7px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border);
  color: var(--text-dim);
  font-family: "JetBrains Mono", monospace;
}

@media (max-width: 768px) {
  .hero { padding: 20px 16px 12px; }
  .hero h1 { font-size: 22px; }
  .hero-stats { gap: 16px; flex-wrap: wrap; }
}
@media (max-width: 480px) {
  .hero h1 { font-size: 20px; }
  .hero-stats { display: none; }
  .search-row { max-width: 100%; }
}
```

- [ ] **Step 2: Update HomeHero.tsx — add stats + mobile prop**

```typescript
interface HomeHeroProps {
  lang: Lang;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isMobile?: boolean;
}

export const HomeHero: React.FC<HomeHeroProps> = ({
  lang,
  searchQuery,
  setSearchQuery,
  isMobile,
}) => {
  const isThai = lang === "th";
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  return (
    <section className="hero">
      <h1>{isThai ? "สูตรคณิตศาสตร์" : "Math Formulas"}</h1>
      <p>
        {isThai
          ? "220+ สูตรครอบคลุมทุกระดับชั้น จากประถมถึงมหาวิทยาลัย คำนวณพร้อมแสดงผลทันที"
          : "220+ formulas across all levels. Calculate instantly."}
      </p>
      <div className="search-row">
        <span style={{ color: "var(--text-dim)" }}>🔍</span>
        <input
          type="text"
          placeholder={
            isThai
              ? "ค้นหาสูตร, ระดับชั้น, หรือหัวข้อ…"
              : "Search formulas, levels, topics…"
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
        />
        {!isMobile && <span className="search-kbd">/</span>}
      </div>
      {!isMobile && (
        <div className="hero-stats">
          <div className="hero-stat"><strong>220+</strong> {isThai ? "สูตร" : "Formulas"}</div>
          <div className="hero-stat"><strong>5</strong> {isThai ? "ระดับชั้น" : "Levels"}</div>
          <div className="hero-stat"><strong>12</strong> {isThai ? "หมวดหมู่" : "Categories"}</div>
        </div>
      )}
    </section>
  );
};
```

- [ ] **Step 3: Commit**

```bash
cd d:/testtt/Web_project/projectreal/webrebuild
git add src/components/HomeHero.tsx src/app/globals.css
git commit -m "phase5: HomeHero stats section + responsive compact
- Stats row (220+ formulas, 5 levels, 12 categories)
- Search bar with gold focus ring
- Compact mode on mobile (no stats)
- Keyboard shortcut hint (/)
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: LevelFilter — Responsive Chips

**Files:**
- Modify: `src/components/LevelFilter.tsx`
- Modify: `src/components/LevelFilter.module.css`

**Goal:** Make LevelFilter use chip style consistent with LevelTabs, responsive

- [ ] **Step 1: Update LevelFilter.module.css**

```css
.filterRow {
  display: flex;
  gap: 8px;
  padding: 8px 24px;
  flex-wrap: wrap;
}
@media (max-width: 768px) {
  .filterRow {
    padding: 8px 16px;
    overflow-x: auto;
    flex-wrap: nowrap;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .filterRow::-webkit-scrollbar { display: none; }
}

.filterChip {
  white-space: nowrap;
  padding: 8px 16px;
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border);
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all var(--transition-fast);
  font-family: inherit;
}
.filterChip:hover { border-color: var(--border-hover); }
.filterChip:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
.filterChipActive {
  background: var(--primary-subtle);
  border-color: var(--border-gold);
  color: var(--primary);
}

.icon { display: inline-flex; }
```

- [ ] **Step 2: Commit**

```bash
cd d:/testtt/Web_project/projectreal/webrebuild
git add src/components/LevelFilter.tsx src/components/LevelFilter.module.css
git commit -m "phase5b: LevelFilter responsive chip style
- Consistent chip style with LevelTabs
- Horizontal scroll on mobile
- Active gold state
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: History — Bottom Sheet for Mobile

**Files:**
- Modify: `src/components/features/history/HistorySidebar.tsx`
- Modify: `src/components/features/history/HistorySidebar.module.css`

**Goal:** History becomes bottom sheet on mobile (480px), stays as drawer/sidebar on desktop/tablet

- [ ] **Step 1: Update HistorySidebar — add `isMobile` prop + bottom sheet**

```typescript
interface HistorySidebarProps {
  show: boolean;
  onClose: () => void;
  lang: Lang;
  history: HistoryItemData[];
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  isMobile?: boolean;
}
```

When `isMobile`, render as a bottom sheet with drag handle:

```typescript
import { motion, AnimatePresence } from "framer-motion";

// In the render, when isMobile:
{isMobile ? (
  <AnimatePresence>
    {show && (
      <>
        <motion.div
          className={styles.sheetOverlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
        <motion.div
          className={styles.bottomSheet}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
        >
          <div className={styles.sheetHandle} />
          <div className={styles.sheetHeader}>
            <span className={styles.sheetTitle}>{t.history}</span>
            <button className={styles.clearBtn} onClick={onClearAll}>{t.clearAll}</button>
          </div>
          <div className={styles.sheetContent}>
            {history.length === 0 ? (
              <div className={styles.empty}>{t.noHistory}</div>
            ) : (
              history.map((item) => (
                <div key={item.id} className={styles.sheetItem}>
                  {/* item content */}
                </div>
              ))
            )}
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
) : (
  // Desktop sidebar drawer — existing code
  <div className={`${styles.drawer} ${show ? styles.drawerOpen : ""}`}>
    {/* existing desktop history */}
  </div>
)}
```

- [ ] **Step 2: Add bottom sheet CSS to HistorySidebar.module.css**

```css
/* Bottom Sheet (mobile) */
.sheetOverlay {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 80;
}
.bottomSheet {
  position: fixed; bottom: 0; left: 0; right: 0;
  max-height: 65vh;
  background: var(--surface-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid var(--border);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  z-index: 81;
  padding: 16px;
  padding-bottom: env(safe-area-inset-bottom, 16px);
}
.sheetHandle {
  width: 40px; height: 4px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: var(--radius-full);
  margin: 0 auto 16px;
}
.sheetHeader {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 14px;
}
.sheetTitle { font-size: 14px; font-weight: 600; }
.sheetContent { overflow-y: auto; max-height: calc(65vh - 80px); }

/* Desktop drawer */
.drawer {
  width: 0; overflow: hidden;
  border-left: 1px solid var(--border);
  background: var(--surface);
  transition: width var(--transition-slow);
  flex-shrink: 0;
}
.drawerOpen { width: 280px; }
.drawerInner {
  width: 280px; padding: 16px;
}

/* History item (shared) */
.item {
  /* existing history item styles, update to use CSS variables */
}
```

- [ ] **Step 3: Commit**

```bash
cd d:/testtt/Web_project/projectreal/webrebuild
git add src/components/features/history/HistorySidebar.tsx src/components/features/history/HistorySidebar.module.css
git commit -m "phase6: History bottom sheet for mobile + drawer for desktop
- Bottom sheet with spring animation on mobile
- Desktop stays as right drawer
- Shared history item styles
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: Purposeful Animation Integration

**Files:**
- Modify: `src/components/AppShell.tsx` (add AnimatePresence + card stagger)
- Modify: `src/components/formulas/FormulaCard.tsx` (add mount animation)
- Modify: `src/components/features/loading/LoadingScreen.tsx` (mobile optimization)
- Modify: `src/components/features/loading/LoadingScreen.config.ts` (mobile config)

**Goal:** Add purposeful animations only — no decorative motion

- [ ] **Step 1: Add card stagger animation to FormulaGrid**

In `FormulaGrid.tsx`, wrap cards with staggered animation:

```typescript
import { motion, AnimatePresence } from "framer-motion";

// In render:
<motion.div
  className={styles.grid}
  initial="hidden"
  animate="visible"
  variants={{
    hidden: {},
    visible: { transition: { staggerChildren: 0.05 } },
  }}
>
  <AnimatePresence mode="popLayout">
    {formulas.map((f, i) => (
      <motion.div
        key={f.id}
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <FormulaCard ... />
      </motion.div>
    ))}
  </AnimatePresence>
</motion.div>
```

- [ ] **Step 2: Reduce mobile particles in LoadingScreen**

In `LoadingScreen.config.ts`, add mobile config:

```typescript
export const getParticleCount = (isMobile: boolean) => isMobile ? 2 : 4;

// In LoadingScreen.tsx, read mobile state:
const [isMobile, setIsMobile] = useState(false);
useEffect(() => {
  setIsMobile(window.innerWidth < 480);
}, []);
// Use getParticleCount(isMobile) for particle arrays
```

- [ ] **Step 3: Add `prefers-reduced-motion` support**

```typescript
// In AppShell, add a media query watcher:
const [reducedMotion, setReducedMotion] = useState(false);
useEffect(() => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  setReducedMotion(mq.matches);
  const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}, []);

// Pass reducedMotion down or use in Framer Motion:
// <motion.div animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }} />
```

- [ ] **Step 4: Commit**

```bash
cd d:/testtt/Web_project/projectreal/webrebuild
git add src/components/formulas/FormulaGrid.tsx src/components/formulas/FormulaCard.tsx src/components/features/loading/LoadingScreen.tsx src/components/features/loading/LoadingScreen.config.ts
git commit -m "phase7: purposeful animations integration
- Card stagger enter animation (0.05s stagger)
- Layout animation with AnimatePresence
- Mobile particle reduction (4→2)
- prefers-reduced-motion support
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 10: Mobile Auth/Purchase Pages

**Files:**
- Modify: `src/components/AuthButton.tsx`
- Modify: `src/components/AuthGuard.tsx`
- Modify: `src/components/AuthButton.module.css` (if exists)
- Modify: `src/components/AuthGuard.module.css` (if exists)

**Goal:** Auth modal = full screen on mobile, centered modal on desktop

- [ ] **Step 1: Add responsive auth modal CSS**

```css
/* In existing AuthGuard.module.css or add to globals.css */
.authOverlay {
  position: fixed; inset: 0; z-index: 100;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0, 0, 0, 0.6);
}
.authModal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 32px;
  width: 100%; max-width: 420px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.4);
}

@media (max-width: 480px) {
  .authOverlay { align-items: flex-end; }
  .authModal {
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    max-width: 100%; padding: 24px;
    margin-top: auto;
    min-height: 60vh;
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd d:/testtt/Web_project/projectreal/webrebuild
git add src/components/AuthGuard.tsx src/components/AuthGuard.module.css
git commit -m "phase8: mobile auth full-screen modal
- Auth modal: centered on desktop, bottom sheet on mobile
- Responsive overlay and modal sizes
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 11: Performance Pass

**Files:**
- Modify: `src/components/formulas/FormulaCard.tsx` (add React.memo)
- Modify: `src/components/LevelTabs.tsx` (add React.memo)
- Modify: `src/components/HomeHero.tsx` (add useMemo)

**Goal:** Performance optimization checklist from design doc

- [ ] **Step 1: Add React.memo to FormulaCard**

```typescript
export const FormulaCard = React.memo(FormulaCardInner);
// Rename inner function to FormulaCardInner
```

- [ ] **Step 2: Add React.memo to LevelTabs**

```typescript
export const LevelTabs = React.memo(LevelTabsInner);
```

- [ ] **Step 3: Add content-visibility to card grid CSS**

```css
/* In FormulaGrid.module.css */
.card { content-visibility: auto; contain-intrinsic-size: 160px; }
```

- [ ] **Step 4: Add will-change to animated elements**

```css
/* In Sidebar.module.css — add to drawer that slides */
.drawer { will-change: transform; }

/* In HistorySidebar.module.css — add to bottom sheet */
.bottomSheet { will-change: transform; }
```

- [ ] **Step 5: Commit**

```bash
cd d:/testtt/Web_project/projectreal/webrebuild
git add src/components/formulas/FormulaCard.tsx src/components/LevelTabs.tsx src/components/formulas/FormulaGrid.module.css
git commit -m "phase9: performance optimizations
- React.memo on FormulaCard, LevelTabs
- content-visibility: auto on cards
- will-change: transform on animated elements
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 12: Final Build Verify + Log + Memory

**Files:**
- Modify: `Log.txt`
- Create: `memory/premium-redux-design.md` (if not already saved)

**Goal:** 0 type errors, 0 ESLint errors, log progress

- [ ] **Step 1: Run full type-check**

```bash
cd d:/testtt/Web_project/projectreal/webrebuild && pnpm type-check 2>&1
```
Expected: 0 errors. If errors, fix them.

- [ ] **Step 2: Run full build**

```bash
cd d:/testtt/Web_project/projectreal/webrebuild && pnpm build 2>&1 | tail -30
```
Expected: "✓ Build completed" with 0 errors.

- [ ] **Step 3: Run ESLint**

```bash
cd d:/testtt/Web_project/projectreal/webrebuild && pnpm lint 2>&1
```
Expected: 0 errors. Warnings acceptable if pre-existing.

- [ ] **Step 4: Log progress to Log.txt**

```bash
echo "[2026-07-20 $(date +%H:%M)] Premium Redux redesign complete — new palette (deep charcoal + gold), responsive breakpoints (4 layouts), mobile bottom nav + bottom sheet, flat icon cards, purposeful animations, anti-pattern compliant. All 11 phases done. — globals.css, design-tokens.ts, AppShell.tsx+module.css, Sidebar.tsx+module.css, FormulaCard.tsx+module.css, FormulaGrid.tsx+module.css, LevelTabs.tsx+module.css, LevelFilter.tsx+module.css, HomeHero.tsx, HistorySidebar.tsx+module.css, AuthGuard.tsx+module.css, LoadingScreen.tsx+config.ts, Log.txt" >> Log.txt
```

- [ ] **Step 5: Final commit**

```bash
cd d:/testtt/Web_project/projectreal/webrebuild
git add -A
git commit -m "Premium Redux complete — full redesign
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Appendix: Anti-Pattern Audit Checklist

Mark each item as verified during implementation:

- [ ] No purple/blue/pink full-screen gradients
- [ ] No excessive glassmorphism (only on mobile overlays)
- [ ] Not all cards have same border-radius (varies per component)
- [ ] No floating orbs/blobs
- [ ] No glow effect around every element
- [ ] No hero with just heading + 2 buttons
- [ ] Card grid has varied content (not 3 identical cards)
- [ ] No generic dashboard mockup
- [ ] No "Revolutionize workflow" marketing text
- [ ] No icons in gradient square boxes (flat backgrounds only)
- [ ] Not every element has animation
- [ ] Border-radius is purposeful (not oversized)
- [ ] No heavy shadows or excess accent color
- [ ] No filler elements without purpose
- [ ] Sections have varied structure
- [ ] No Lorem Ipsum or placeholder text
- [ ] No `as any`, no inline styles (except dynamic CSS vars), no dangerouslySetInnerHTML
