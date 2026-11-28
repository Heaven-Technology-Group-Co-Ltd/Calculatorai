"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";

import { useState, useCallback, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  DollarSign,
  Users,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { useDashboardContext } from "./DashboardProvider";
import { useDashboardT } from "./i18n/useDashboardT";
import { useSession } from "next-auth/react";
import styles from "./styles/dashboard-shell.module.css";

type TabId = "overview" | "analytics" | "finance" | "users" | "settings";
type DateRange = "7d" | "30d" | "90d" | "custom";

interface DashboardShellProps {
  children: ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const { activeTab, setActiveTab, dateRange, setDateRange } = useDashboardContext();
  const { t } = useDashboardT();
  const router = useRouter();
  const { data: session } = useSession();
  const adminName = session?.user?.name || "Admin";
  const adminInitial = adminName.charAt(0).toUpperCase();

  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 900px)");
    const closeDrawer = () => setDrawerOpen(false);
    mobileQuery.addEventListener("change", closeDrawer);
    return () => mobileQuery.removeEventListener("change", closeDrawer);
  }, []);

  const handleNav = useCallback(
    (tab: TabId) => {
      setActiveTab(tab);
      setDrawerOpen(false);
      router.push(`/dashboard/${tab}`);
    },
    [setActiveTab, router],
  );

  const handleDateRange = useCallback(
    (range: DateRange) => {
      setDateRange(range);
    },
    [setDateRange],
  );

  const NAV_ITEMS: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "overview", label: t("dashboard.nav.overview"), icon: LayoutDashboard },
    { id: "analytics", label: t("dashboard.nav.analytics"), icon: TrendingUp },
    { id: "finance", label: t("dashboard.nav.finance"), icon: DollarSign },
    { id: "users", label: t("dashboard.nav.users"), icon: Users },
    { id: "settings", label: t("dashboard.nav.settings"), icon: Settings },
  ];

  const DATE_OPTIONS: { value: DateRange; label: string }[] = [
    { value: "7d", label: t("dashboard.filter.last7days") },
    { value: "30d", label: t("dashboard.filter.last30days") },
    { value: "90d", label: t("dashboard.filter.last90days") },
  ];

  const activeTitle = NAV_ITEMS.find((n) => n.id === activeTab)?.label ?? t("dashboard.nav.overview");

  // ── Shared nav list (used by sidebar + drawer) ──
  const navList = (
    <>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            className={`${styles.navItem}${isActive ? ` ${styles.navItemActive}` : ""}`}
            onClick={() => handleNav(item.id)}
          >
            <Icon className={styles.navIcon} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </>
  );

  return (
    <div className={styles.layout}>
      {/* ── Desktop sidebar ── */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandIcon}>π</div>
          <div>
            <div className={styles.brandText}>Math Calc</div>
            <div className={styles.brandSub}>Premium Dashboard</div>
          </div>
        </div>

        {navList}

        <div className={styles.sidebarFooter}>
          <div className={styles.userRow}>
            <div className={styles.userAvatar}>{adminInitial}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className={styles.userName}>{adminName}</div>
              <div className={styles.userRole}>Administrator</div>
            </div>
            <Link
              href="/"
              title="Exit to Calculator"
              style={{
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                padding: 4,
                borderRadius: 4,
                textDecoration: "none",
              }}
            >
              <LogOut size={16} />
            </Link>
          </div>
        </div>
      </aside>

      {/* ── Mobile drawer ── */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Close navigation menu"
        className={`${styles.drawerOverlay}${drawerOpen ? ` ${styles.drawerOverlayOpen}` : ""}`}
        onClick={() => setDrawerOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setDrawerOpen(false);
          }
        }}
      />

      <aside
        className={`${styles.drawer}${drawerOpen ? ` ${styles.drawerOpen}` : ""}`}
      >
        <div className={styles.drawerHeader}>
          <div className={styles.brand}>
            <div className={styles.brandIcon}>π</div>
            <div>
              <div className={styles.brandText}>Math Calc</div>
              <div className={styles.brandSub}>Premium Dashboard</div>
            </div>
          </div>
          <button
            className={styles.drawerClose}
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {navList}

        <div className={styles.sidebarFooter}>
          <div className={styles.userRow}>
            <div className={styles.userAvatar}>{adminInitial}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className={styles.userName}>{adminName}</div>
              <div className={styles.userRole}>Administrator</div>
            </div>
            <Link
              href="/"
              title="Exit to Calculator"
              style={{
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                padding: 4,
                borderRadius: 4,
                textDecoration: "none",
              }}
            >
              <LogOut size={16} />
            </Link>
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className={styles.main}>
        {/* Topbar */}
        <header className={styles.topbar}>
          <button
            className={styles.hamburger}
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          <span className={styles.pageTitle}>{activeTitle}</span>

          <div className={styles.topbarActions}>
            {/* Date range pills */}
            <div className={styles.datePills}>
              {DATE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`${styles.datePill}${dateRange === opt.value ? ` ${styles.datePillActive}` : ""}`}
                  onClick={() => handleDateRange(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

          </div>
        </header>

        {/* Content */}
        <main className={styles.content}>{children}</main>
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className={styles.bottomNav}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`${styles.bottomNavItem}${isActive ? ` ${styles.bottomNavItemActive}` : ""}`}
              onClick={() => handleNav(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
