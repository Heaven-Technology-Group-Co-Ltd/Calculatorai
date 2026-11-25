"use client";

import { useDashboardContext } from "../DashboardProvider";
import { useDashboardT } from "../i18n/useDashboardT";
import { TrafficAreaChart } from "../blocks/TrafficAreaChart";
import { DevicePieChart } from "../blocks/DevicePieChart";
import { ConversionFunnel } from "../blocks/ConversionFunnel";
import { FormulaHeatmap } from "../blocks/FormulaHeatmap";
import { GeographyList } from "../blocks/GeographyList";
import { TopPagesTable } from "../blocks/TopPagesTable";
import styles from "../styles/dashboard-blocks.module.css";

export function AnalyticsPage() {
  const { t } = useDashboardT();
  const { dateRange, setDateRange } = useDashboardContext();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className={styles.chipRow}>
        {(["7d", "30d", "90d"] as const).map((d) => (
          <button
            key={d}
            className={`${styles.chip} ${dateRange === d ? styles.chipActive : ""}`}
            onClick={() => setDateRange(d)}
          >
            {t(d === "7d" ? "dashboard.filter.last7days" : d === "30d" ? "dashboard.filter.last30days" : "dashboard.filter.last90days")}
          </button>
        ))}
      </div>

      <div className={styles.grid2col}>
        <TrafficAreaChart />
        <DevicePieChart />
      </div>

      <FormulaHeatmap />

      <div className={styles.grid2col}>
        <GeographyList />
        <ConversionFunnel />
      </div>

      <TopPagesTable />
    </div>
  );
}
