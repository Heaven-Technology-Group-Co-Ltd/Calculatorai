"use client";

import Link from "next/link";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProfileModal } from "@/components/ProfileModal";
import { LogoutModal } from "@/components/LogoutModal";
import { motion, AnimatePresence } from "framer-motion";
import { useSession, signIn, signOut } from "next-auth/react";
import type { Lang } from "@/types/locale";
import { uiTranslations } from "@/lib/translations";
import {
  levels as levelData,
  departments,
} from "@/lib/math-data";
import styles from "./Sidebar.module.css";
import { SidebarSection } from "./sidebar/SidebarSection";
import { formulas, getFormulaCountByDepartment } from "@/lib/formulas/registry";
import {
  X,
  Layers,
  Building2,
  GraduationCap,
  Atom,
  BookOpen,
  Clock,
  Info,
  ShoppingCart,
  Calculator,
  LayoutDashboard,
  User,
  LogOut,
} from "lucide-react";

interface SidebarInnerProps {
  lang: Lang;
  activeLevel: "all" | string;
  setActiveLevel: (level: "all" | string) => void;
  activeDepartment: "all" | string;
  setActiveDepartment: (dept: "all" | string) => void;
  departments: typeof departments;
  onShowHistory: () => void;
  onShowInfo: () => void;
  onToggleSidebar: () => void;
  isOpen: boolean;
  historyCount: number;
  onClearHistory: () => void;
  collapsed?: boolean;
}

function SidebarInner({
  lang,
  activeLevel,
  setActiveLevel,
  activeDepartment,
  setActiveDepartment,
  departments: depts,
  onShowHistory,
  onShowInfo,
  onToggleSidebar,
  isOpen,
  historyCount,
  onClearHistory,
  collapsed = false,

}: SidebarInnerProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [levelsOpen, setLevelsOpen] = useState(true);
  const [deptsOpen, setDeptsOpen] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Mobile overlay only renders when sidebar is open (backdrop covers full viewport)
  const showOverlay = isOpen;

  // Badge must match the visible list: zero-result departments are hidden (F-12).
  const visibleDeptCount = depts.filter(
    (dept) => getFormulaCountByDepartment(dept.subjects) > 0,
  ).length;

  return (
    <>
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            className="sidebar-mobile-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={onToggleSidebar}
          />
        )}
      </AnimatePresence>

      <motion.aside
        className={`sidebar-premium ${collapsed ? styles.collapsed : ""} ${!isOpen ? "closed" : ""}`}
        animate={{
          opacity: isOpen ? 1 : 0,
          x: isOpen ? 0 : -240,
          width: isOpen ? (collapsed ? 56 : 240) : 0,
        }}
        initial={false}
        transition={{
          width: { type: "spring", stiffness: 300, damping: 30 },
          opacity: { duration: 0.2, ease: "easeOut" },
          x: { type: "spring", stiffness: 300, damping: 30 },
        }}
      >
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Calculator size={18} />
            <span className="sidebar-logo-text">Math</span>
            <span className="sidebar-logo-text">Calc</span>
          </div>
          <button
            onClick={onToggleSidebar}
            className={`modal-close ${styles.closeBtn}`}
            aria-label="Close sidebar"
          >
            <X size={14} />
          </button>
        </div>

        <nav className={styles.scrollNav}>
          {/* Levels Section */}
          <SidebarSection
            label={uiTranslations.eduLevel?.[lang] || "EDUCATION LEVEL"}
          isOpen={levelsOpen}
          onToggle={() => setLevelsOpen((prev) => !prev)}
          itemCount={levelData.length}
        >
          <button
            className={`sidebar-nav-item ${activeLevel === "all" ? "active" : ""}`}
            onClick={() => setActiveLevel("all")}
            title={
              collapsed
                ? lang === "th"
                  ? "ทุกระดับ"
                  : "All Levels"
                : undefined
            }
          >
            <Layers size={16} />
            <span className="navLabel"> {uiTranslations.allLevels?.[lang] || "All Levels"}</span>
          </button>
          {levelData.map((lv) => (
            <button
              key={lv.id}
              className={`sidebar-nav-item ${activeLevel === lv.id ? "active" : ""}`}
              style={
                {
                  "--level-color": lv.color,
                  "--level-bg": `${lv.color}12`,
                  "--level-border": `${lv.color}20`,
                } as React.CSSProperties
              }
              onClick={() => setActiveLevel(lv.id)}
              aria-pressed={activeLevel === lv.id}
              title={collapsed ? lv.title[lang] : undefined}
            >
              {(() => { const Icon = lv.icon; return <span style={{ color: lv.color }}><Icon size={16} /></span>; })()}
              <span className="navLabel"> {lv.title[lang]}</span>
            </button>
          ))}
        </SidebarSection>

        {/* Departments Section */}
        <SidebarSection
          label={uiTranslations.departmentsLabel?.[lang] || "DEPARTMENTS"}
          isOpen={deptsOpen}
          onToggle={() => setDeptsOpen((prev) => !prev)}
          itemCount={visibleDeptCount + 1}
        >
          <button
            className={`dept-nav-item ${activeDepartment === "all" ? "active" : ""}`}
            onClick={() => setActiveDepartment("all")}
            aria-pressed={activeDepartment === "all"}
            style={
              {
                "--level-color": "var(--primary)",
              } as React.CSSProperties
            }
          >
            <span style={{ color: "var(--primary)" }}>
              <Layers size={14} />
            </span>
            <span className="navLabel">
              {" "}
              {lang === "th"
                ? "ทั้งหมด"
                : "All Departments"}
            </span>
            <span className={styles.subjectCount}>{formulas.length}</span>
          </button>
          {depts.map((dept) => {
            const deptFormulaCount = getFormulaCountByDepartment(dept.subjects);
            if (deptFormulaCount === 0) return null;
            return (
              <button
                key={dept.id}
                className={`dept-nav-item ${activeDepartment === dept.id ? "active" : ""}`}
                onClick={() => setActiveDepartment(dept.id)}
                aria-pressed={activeDepartment === dept.id}
                title={dept.label[lang]}
                style={
                  {
                    "--level-color": dept.color || "var(--primary)",
                  } as React.CSSProperties
                }
              >
                {(() => { const DeptIcon = dept.icon; return <span style={{ color: dept.color || "var(--primary)" }}><DeptIcon size={14} /></span>; })()}
                <span className="navLabel"> {dept.label[lang]}</span>
                <span className={styles.subjectCount}>{deptFormulaCount}</span>
              </button>
            );
          })}
        </SidebarSection>
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <button
            className="sidebar-footer-item"
            onClick={onShowHistory}
            title={
              collapsed
                ? lang === "th"
                  ? "ประวัติ"
                  : "History"
                : undefined
            }
          >
            <Clock size={14} />
            <span className="navLabel"> {uiTranslations.history?.[lang] || "History"}</span>
            {historyCount > 0 && (
              <span className={`footer-version ${styles.historyBadge}`}>
                {historyCount}
              </span>
            )}
          </button>
          <button
            className="sidebar-footer-item"
            onClick={onShowInfo}
            title={
              collapsed
                ? lang === "th"
                  ? "วิธีใช้งาน"
                  : "How to Use"
                : undefined
            }
          >
            <Info size={14} />
            <span className="navLabel"> {lang === "th" ? "วิธีใช้งาน" : "How to Use"}</span>
          </button>

          {/* Purchase */}
          <button
            className="sidebar-footer-item"
            onClick={() => router.push("/purchase")}
            title={
              collapsed
                ? uiTranslations.purchase?.[lang] || "Purchase"
                : undefined
            }
          >
            <ShoppingCart size={14} />
            <span className="navLabel"> {uiTranslations.purchase?.[lang] || "Purchase"}</span>
          </button>

                    {/* Admin Dashboard (F-14) */}
          {(session?.user as { isAdmin?: boolean } | undefined)?.isAdmin === true && (
            <Link
              href="/dashboard"
              className="sidebar-footer-item"
              title={
                collapsed
                  ? lang === "th"
                    ? "แดชบอร์ดแอดมิน"
                    : "Admin Dashboard"
                  : undefined
              }
            >
              <LayoutDashboard size={14} color="var(--primary)" />
              <span className="navLabel"> {lang === "th" ? "แดชบอร์ดแอดมิน" : "Admin Dashboard"}</span>
            </Link>
          )}

          {/* Profile Section */}
          {status === "loading" ? (
            <div className="sidebar-bottom-profile" style={{ opacity: 0.5 }}>
              <div className="profile-avatar"><User size={16} /></div>
              <div className="profile-info">
                <div className="profile-name">
                  {lang === "th" ? "กำลังโหลด..." : "Loading..."}
                </div>
              </div>
            </div>
          ) : session?.user ? (
            <div className="sidebar-bottom-profile">
              <button
                type="button"
                className="sidebar-profile-trigger"
                onClick={() => setShowProfileModal(true)}
                title={lang === "th" ? "ดูข้อมูลส่วนตัว" : "View Profile"}
              >
                <span className="profile-avatar">
                  {session.user.image ? (
                    <img src={session.user.image} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%" }} />
                  ) : (
                    <User size={16} />
                  )}
                </span>
                <span className="profile-info">
                  <span className="profile-name">
                    {session.user.name || session.user.email || "User"}
                  </span>
                  <span className="profile-email">
                    {session.user.email || (lang === "th" ? "ออนไลน์" : "Online")}
                  </span>
                </span>
              </button>
              <button
                type="button"
                className={styles.logoutBtn}
                aria-label={lang === "th" ? "ออกจากระบบ" : "Sign out"}
                title={lang === "th" ? "ออกจากระบบ" : "Sign out"}
                onClick={() => setShowLogoutConfirm(true)}
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="sidebar-bottom-profile"
              onClick={() => signIn()}
            >
              <span className="profile-avatar"><User size={16} /></span>
              <span className="profile-info">
                <span className="profile-name">
                  {lang === "th" ? "ผู้ใช้ทั่วไป" : "Guest"}
                </span>
                <span className="profile-email">
                  {lang === "th" ? "เข้าสู่ระบบ" : "Sign in"}
                </span>
              </span>
            </button>
          )}
        </div>
      </motion.aside>

      {/* User Profile Modal */}
      {session?.user && (
        <ProfileModal
          show={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          onSignOut={() => {
            setShowProfileModal(false);
            setShowLogoutConfirm(true);
          }}
          user={session.user}
          lang={lang}
        />
      )}

      {/* Logout Confirm Modal */}
      <LogoutModal
        show={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          signOut();
        }}
        lang={lang}
      />
    </>
  );
};

export const Sidebar = React.memo(SidebarInner);
