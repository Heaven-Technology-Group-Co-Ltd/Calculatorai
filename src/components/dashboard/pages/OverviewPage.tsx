"use client";

import { useDashboardContext } from "../DashboardProvider";
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
  const { triggerRefresh } = useDashboardContext();

  return (
    <div className={styles.dashboardColumn}>
      {/* Filter bar */}
      <div className={styles.chipRow}>
        <button
          className={`${styles.chip} ${styles.dashboardHeaderAction}`}
          onClick={triggerRefresh}
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
