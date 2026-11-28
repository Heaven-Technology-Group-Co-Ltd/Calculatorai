"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Menu, Eye, EyeOff, Clock, Info, Calculator, Activity } from "lucide-react";
import { departments } from "@/lib/math-data";
import { uiTranslations } from "@/lib/translations";
import type { Lang } from "@/types/locale";
import { useLanguage } from "@/lib/LanguageContext";
import { formulas, getFormulaById } from "@/lib/formulas/registry";
import { FormulaGrid } from "@/components/formulas/FormulaGrid";
import { HomeHero } from "@/components/HomeHero";
import { HistorySidebar } from "@/components/features/history/HistorySidebar";
import { InfoModal } from "@/components/features/info/InfoModal";
import { LanguageDropdown } from "@/components/features/language/LanguageDropdown";
import { Sidebar } from "@/components/Sidebar";
import { LevelFilter } from "@/components/LevelFilter";
import { ConfirmModal } from "@/components/ConfirmModal";
import pkg from "../../package.json";
import { apiDelete, ClientApiError } from "@/lib/api-client";
import { useHistory } from "@/hooks/useHistory";
import styles from "./AppShell.module.css";

export function AppShell() {
  const { language: lang, setLanguage: setLang } = useLanguage();
  const { data: session } = useSession();
  const sessionUser = session?.user as
    | { id?: string; email?: string | null; name?: string | null; impersonatedBy?: string }
    | undefined;
  const isImpersonating = Boolean(sessionUser?.impersonatedBy);
  const [exitingImpersonation, setExitingImpersonation] = useState(false);
  const [impersonationError, setImpersonationError] = useState<string | null>(null);

  const handleExitImpersonation = useCallback(async () => {
    if (!sessionUser?.id) return;
    setExitingImpersonation(true);
    setImpersonationError(null);
    try {
      await apiDelete(`/api/users/${sessionUser.id}/impersonate`);
      window.location.assign("/dashboard/users");
      return;
    } catch (error) {
      setImpersonationError(error instanceof ClientApiError ? error.message : (lang === "th" ? "ไม่สามารถเชื่อมต่อเครือข่ายได้" : "Network error. Please try again."));
    } finally {
      setExitingImpersonation(false);
    }
  }, [sessionUser, lang]);

  const [search, setSearch] = useState("");
  const [legacyFormulaId, setLegacyFormulaId] = useState<string | null>(null);
  const [activeLevel, setActiveLevel] = useState<string>("all");
  const [activeDepartment, setActiveDepartment] = useState<string>("all");
  const [showFormulas, setShowFormulas] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [restoration, setRestoration] = useState<Record<string, Record<string, string> | null>>({});
  const [isTablet, setIsTablet] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const { history, addToHistory, deleteItem, clearAll } = useHistory();

  // ── Responsive breakpoint detection ──
  useEffect(() => {
    const tabletMq = window.matchMedia("(max-width: 900px)");
    const mobileMq = window.matchMedia("(max-width: 900px)");
    const handler = () => {
      setIsTablet(tabletMq.matches);
      setIsMobile(mobileMq.matches);
      if (tabletMq.matches) setShowSidebar(false);
    };
    handler();
    tabletMq.addEventListener("change", handler);
    mobileMq.addEventListener("change", handler);
    return () => {
      tabletMq.removeEventListener("change", handler);
      mobileMq.removeEventListener("change", handler);
    };
  }, []);

  // ── Keyboard shortcuts (⌘K or / to search, Escape to close modals) ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape") {
        setShowHistory(false);
        setShowModal(false);
        setShowConfirm(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleSidebar = useCallback(() => setShowSidebar(v => !v), []);
  const closeHistory = useCallback(() => setShowHistory(false), []);
  const closeModal = useCallback(() => setShowModal(false), []);
  const closeConfirm = useCallback(() => setShowConfirm(false), []);
  const openConfirm = useCallback(() => setShowConfirm(true), []);

  // Rebuild restoration map from history on first load
  const restorationInitRef = useRef(false);

  useEffect(() => {
    if (history.length > 0 && !restorationInitRef.current) {
      restorationInitRef.current = true;
      const rest: Record<string, Record<string, string> | null> = {};
      for (const item of history) {
        rest[item.calcId] = item.inputs;
      }
      setRestoration(rest);
    }
  }, [history]);

  // Lock body scroll when mobile sidebar, history drawer, or info modal is open
  useEffect(() => {
    const shouldLock = (isTablet && showSidebar) || showHistory || showModal || showConfirm;
    if (shouldLock) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isTablet, showSidebar, showHistory, showModal, showConfirm]);

  // Update restoration when a new item is added
  const handleAddToHistory = useCallback(
    (item: { calcId: string; calcTitle: string; inputs: Record<string, string>; result: string; unit: string }) => {
      addToHistory(item);
      setRestoration((prev) => ({ ...prev, [item.calcId]: item.inputs }));
    },
    [addToHistory]
  );

  const restoreItem = useCallback((item: { calcId: string; inputs: Record<string, string> }) => {
    setRestoration(prev => ({ ...prev, [item.calcId]: item.inputs }));
    setLegacyFormulaId(item.calcId === "fi_npv" ? item.calcId : null);
    setSearch("");
    setActiveLevel("all");
    setActiveDepartment("all");
    setShowFormulas(true);
    closeHistory();
  }, [closeHistory]);

  const handleClearAll = useCallback(() => {
    clearAll();
    // Dropped entries must not resurrect as restoration data on remount
    setRestoration({});
    closeConfirm();
  }, [clearAll, closeConfirm]);

  const legacyFormula = legacyFormulaId ? getFormulaById(legacyFormulaId) : undefined;
  const catalog = legacyFormula ? [...formulas.filter((formula) => formula.id !== "biz_npv"), legacyFormula] : formulas;
  const filtered = catalog.filter(c => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      (["th", "en", "jp", "ch", "ko"] as const).some(
        l =>
          c.title[l].toLowerCase().includes(q) ||
          c.cat[l].toLowerCase().includes(q)
      ) ||
      (c.fStr?.toLowerCase().includes(q) ?? false);
    const matchLevel = activeLevel === "all" || c.level === activeLevel;
    const matchDept =
      activeDepartment === "all" ||
      (departments.find(d => d.id === activeDepartment)?.subjects ?? []).includes(c.subject);
    return matchSearch && matchLevel && matchDept;
  });

  const collapsed = isTablet && !isMobile;
  const sidebarOpen = showSidebar;

  const getBreadcrumb = useCallback(() => {
    const isThai = lang === "th";
    if (search.trim()) {
      return isThai ? `หน้าแรก › ค้นหา "${search.trim()}"` : `Home › Search "${search.trim()}"`;
    }
    if (activeLevel !== "all") {
      const levelNames: Record<string, { th: string; en: string }> = {
        elementary: { th: "ประถมศึกษา", en: "Elementary School" },
        middleSchool: { th: "มัธยมศึกษาตอนต้น", en: "Middle School" },
        highSchool: { th: "มัธยมศึกษาตอนปลาย", en: "High School" },
        university: { th: "มหาวิทยาลัย", en: "University" },
      };
      const lvl = levelNames[activeLevel];
      if (lvl) {
        return isThai ? `หน้าแรก › ${lvl.th}` : `Home › ${lvl.en}`;
      }
    }
    return isThai ? "หน้าแรก › สูตรทั้งหมด" : "Home › All Formulas";
  }, [lang, activeLevel, search]);

  return (
    <div className="appShell">
      {/* Sidebar */}
      <Sidebar
        lang={lang}
        activeLevel={activeLevel}
        setActiveLevel={(level) => { setActiveLevel(level); if (window.innerWidth <= 640) setShowSidebar(false); }}
        activeDepartment={activeDepartment}
        setActiveDepartment={(department) => { setActiveDepartment(department); if (window.innerWidth <= 640) setShowSidebar(false); }}
        departments={departments}
        onShowHistory={() => setShowHistory(true)}
        onShowInfo={() => setShowModal(true)}
        onToggleSidebar={toggleSidebar}
        isOpen={sidebarOpen}
        historyCount={history.length}
        onClearHistory={openConfirm}
        collapsed={collapsed}
      />

      {/* Main Content Column */}
      <div className="mainContent">
        {isImpersonating && (
          <div className={styles.impersonationBanner} role="status">
            {impersonationError && <span role="alert">{impersonationError}</span>}
            <span className={styles.impersonationText}>
              {lang === "th"
                ? `กำลังใช้งานในฐานะ ${sessionUser?.email ?? sessionUser?.name ?? sessionUser?.id}`
                : `Impersonating ${sessionUser?.email ?? sessionUser?.name ?? sessionUser?.id}`}
            </span>
            <button
              type="button"
              className={styles.impersonationExitBtn}
              onClick={handleExitImpersonation}
              disabled={exitingImpersonation}
            >
              {exitingImpersonation
                ? (lang === "th" ? "กำลังออก..." : "Exiting...")
                : "Exit Impersonation"}
            </button>
          </div>
        )}
        {/* Top Bar (Isolated Mobile vs Desktop) */}
        <div className="topbar">
          {isMobile ? (
            /* Mobile Topbar: Brand on left, Language selector on right. Zero duplicate buttons! */
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Calculator size={18} color="var(--primary)" />
                <span className="topbar-mobile-title">MathCalc</span>
              </div>
              <div className="topbar-right">
                <LanguageDropdown
                  lang={lang}
                  setLang={setLang}
                  showLangMenu={showLangMenu}
                  setShowLangMenu={setShowLangMenu}
                  isHidden={false}
                />
              </div>
            </>
          ) : (
            /* Desktop Topbar: Sidebar Toggle & Dynamic Breadcrumb on left, Language & History on right */
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  className="tb-btn"
                  onClick={toggleSidebar}
                  aria-label="Toggle sidebar"
                  title={showSidebar ? (lang === "th" ? "ซ่อนเมนู" : "Hide Sidebar") : (lang === "th" ? "เปิดเมนู" : "Show Sidebar")}
                >
                  <Menu size={16} />
                  <span>{showSidebar ? (lang === "th" ? "ซ่อนเมนู" : "Hide Menu") : (lang === "th" ? "เปิดเมนู" : "Open Menu")}</span>
                </button>
                <div className="topbar-breadcrumb">
                  {getBreadcrumb()}
                </div>
              </div>
              <div className="topbar-right">
                <LanguageDropdown
                  lang={lang}
                  setLang={setLang}
                  showLangMenu={showLangMenu}
                  setShowLangMenu={setShowLangMenu}
                  isHidden={false}
                />
                <button
                  className="tb-btn"
                  onClick={() => setShowHistory(true)}
                  aria-label="History"
                >
                  <Clock size={14} />
                  <span>{lang === "th" ? "ประวัติ" : "History"}</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Main scrollable content */}
        <div className="app-wrapper">
          <HomeHero
            formulaCount={filtered.length}
            lang={lang}
            searchQuery={search}
            setSearchQuery={setSearch}
            inputRef={searchInputRef}
          />

          {isMobile && (
            <div style={{ marginBottom: 8 }}>
              <LevelFilter
                lang={lang}
                activeLevel={activeLevel}
                setActiveLevel={setActiveLevel}
              />
            </div>
          )}

          {showFormulas && (
            <FormulaGrid
              formulas={filtered}
              lang={lang}
              onResult={handleAddToHistory}
              restorationData={restoration}
              emptyMessage={lang === "th" ? "ไม่พบสูตรที่ตรงกับการค้นหา" : "No formulas found matching your filter"}
            />
          )}

          {/* Single Clean Premium Footer */}
          <div className="footer-premium">
            <div className="footer-left">
              <button
                className="footer-toggle"
                onClick={() => setShowFormulas(!showFormulas)}
              >
                {showFormulas ? <EyeOff size={14} /> : <Eye size={14} />}
                {showFormulas ? uiTranslations.hideFormula[lang] : uiTranslations.showFormula[lang]}
              </button>
              <button className="tb-btn" onClick={() => setShowModal(true)}>
                <Info size={14} />
                <span>{lang === "th" ? "เกี่ยวกับ" : "About"}</span>
              </button>
              <a href="/status" className="tb-btn" style={{ textDecoration: "none" }}>
                <Activity size={14} />
                <span>{lang === "th" ? "สถานะระบบ" : "Status"}</span>
              </a>
              <div className="footer-credit">
                <span className={styles.footerCreditSpan}>Developed By</span>
                <strong>Heaven Developer Team</strong>
              </div>
            </div>
            <div className="footer-version">Release v{pkg.version}</div>
          </div>
        </div>
      </div>

      {/* History Sidebar (overlay) */}
      <HistorySidebar
        show={showHistory}
        onClose={closeHistory}
        lang={lang}
        history={history}
        onRestore={restoreItem}
        onDelete={(id) => deleteItem(id)}
        onClearAll={openConfirm}
        isMobile={isMobile}
      />
      {showModal && <InfoModal show={showModal} onClose={closeModal} lang={lang} />}
      <ConfirmModal show={showConfirm} onClose={closeConfirm} onConfirm={handleClearAll} lang={lang} />

      {/* Mobile Bottom Nav */}
      {isMobile && (
        <nav className="mobileBottomNav">
          <button
            className={`mb-item ${!showHistory && !showModal && !showSidebar && activeLevel === "all" ? "mb-item-active" : ""}`}
            onClick={() => { setActiveLevel("all"); setActiveDepartment("all"); setSearch(""); setShowHistory(false); setShowModal(false); if(showSidebar) setShowSidebar(false); }}
          >
            <svg width={20} height={20} className="mb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span>{lang === "th" ? "หน้าแรก" : "Home"}</span>
          </button>
          <button
            className={`mb-item ${showSidebar ? "mb-item-active" : ""}`}
            onClick={toggleSidebar}
          >
            <Menu size={20} className="mb-icon" />
            <span>{lang === "th" ? "เมนูระดับชั้น" : "Levels"}</span>
          </button>
          <button
            className={`mb-item ${showHistory ? "mb-item-active" : ""}`}
            onClick={() => setShowHistory(true)}
          >
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Clock size={20} className="mb-icon" />
              {history.length > 0 && (
                <span className="mb-badge">{history.length}</span>
              )}
            </div>
            <span>{lang === "th" ? "ประวัติ" : "History"}</span>
          </button>
          <button
            className={`mb-item ${showModal ? "mb-item-active" : ""}`}
            onClick={() => setShowModal(true)}
          >
            <Info size={20} className="mb-icon" />
            <span>{lang === "th" ? "ข้อมูล" : "Info"}</span>
          </button>
        </nav>
      )}
    </div>
  );
}
