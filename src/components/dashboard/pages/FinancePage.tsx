"use client";

import { DollarSign, TrendingUp, ArrowDownLeft, RotateCcw } from "lucide-react";
import { useDashboardContext } from "../DashboardProvider";
import { useDashboardT } from "../i18n/useDashboardT";
import { KpiCard } from "../ui/KpiCard";
import { RevenueChart } from "../blocks/RevenueChart";
import { PlanBreakdown } from "../blocks/PlanBreakdown";
import { ConversionFunnel } from "../blocks/ConversionFunnel";
import styles from "../styles/dashboard-blocks.module.css";

export function FinancePage() {
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

      <div className={styles.kpiRow}>
        <KpiCard icon={<DollarSign size={16} />} label={t("dashboard.finance.mrr")} value={12450} format="currency" color="blue" badge="ตัวอย่าง" />
        <KpiCard icon={<TrendingUp size={16} />} label={t("dashboard.finance.arpu")} value={8.42} format="currency" color="gold" badge="ตัวอย่าง" />
        <KpiCard icon={<ArrowDownLeft size={16} />} label={t("dashboard.finance.churn")} value={2.1} format="percent" trend={{ direction: "down", value: "0.3%" }} color="pink" badge="ตัวอย่าง" />
        <KpiCard icon={<RotateCcw size={16} />} label={t("dashboard.finance.refunds")} value={342} color="green" badge="ตัวอย่าง" />
      </div>

      <div className={styles.grid2col}>
        <RevenueChart />
        <PlanBreakdown />
      </div>

      <ConversionFunnel />
    </div>
  );
}
