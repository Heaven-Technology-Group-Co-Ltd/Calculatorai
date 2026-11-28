"use client";

import { TrafficAreaChart } from "../blocks/TrafficAreaChart";
import { DevicePieChart } from "../blocks/DevicePieChart";
import { ConversionFunnel } from "../blocks/ConversionFunnel";
import { FormulaHeatmap } from "../blocks/FormulaHeatmap";
import { GeographyList } from "../blocks/GeographyList";
import { TopPagesTable } from "../blocks/TopPagesTable";
import styles from "../styles/dashboard-blocks.module.css";

export function AnalyticsPage() {

  return (
    <div className={styles.dashboardColumn}>
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
