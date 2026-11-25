"use client";

import { useDashboardContext } from "../DashboardProvider";
import { useDashboardT } from "../i18n/useDashboardT";
import { KpiRow } from "../blocks/KpiRow";
import { TrafficAreaChart } from "../blocks/TrafficAreaChart";
import { DevicePieChart } from "../blocks/DevicePieChart";
import { TopPagesTable } from "../blocks/TopPagesTable";
import { ConversionFunnel } from "../blocks/ConversionFunnel";
import { RevenueChart } from "../blocks/RevenueChart";
import { RecentActivityFeed } from "../blocks/RecentActivityFeed";
import { SystemHealth } from "../blocks/SystemHealth";
import styles from "../styles/dashboard-blocks.module.css";

export function OverviewPage() {
  const { dateRange, setDateRange, triggerRefresh } = useDashboardContext();
  const { t } = useDashboardT();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Filter bar */}
      <div className={styles.chipRow}>
        {(["7d", "30d", "90d", "custom"] as const).map((d) => (
          <button
            key={d}
            className={`${styles.chip} ${dateRange === d ? styles.chipActive : ""}`}
            onClick={() => setDateRange(d)}
          >
            {d === "7d"
              ? t("dashboard.filter.last7days")
              : d === "30d"
                ? t("dashboard.filter.last30days")
                : d === "90d"
                  ? t("dashboard.filter.last90days")
                  : t("dashboard.filter.custom")}
          </button>
        ))}
        <button
          className={styles.chip}
          onClick={triggerRefresh}
          style={{ marginLeft: "auto" }}
        >
          ⟳ Refresh
        </button>
      </div>

      {/* KPI */}
      <KpiRow />

      {/* Charts */}
      <div className={styles.grid2col}>
        <TrafficAreaChart />
        <DevicePieChart />
      </div>

      {/* 3-col */}
      <div className={styles.grid3col}>
        <TopPagesTable />
        <ConversionFunnel />
        <RevenueChart />
      </div>

      {/* Activity + Health */}
      <div className={styles.grid2col}>
        <RecentActivityFeed />
        <SystemHealth />
      </div>
    </div>
  );
}
