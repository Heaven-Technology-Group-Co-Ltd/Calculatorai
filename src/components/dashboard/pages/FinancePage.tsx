"use client";

import { DollarSign, TrendingUp, ArrowDownLeft, RotateCcw } from "lucide-react";
import { useRevenue } from "../hooks/useRevenue";
import { useDashboardT } from "../i18n/useDashboardT";
import { KpiCard } from "../ui/KpiCard";
import { RevenueChart } from "../blocks/RevenueChart";
import { PlanBreakdown } from "../blocks/PlanBreakdown";
import styles from "../styles/dashboard-blocks.module.css";

export function FinancePage() {
  const { t } = useDashboardT();
  const { data: revenue } = useRevenue();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className={styles.kpiRow}>
        <KpiCard icon={<DollarSign size={16} />} label={t("dashboard.finance.mrr")} value={revenue?.revenue ?? "—"} format="currency" color="blue" />
        <KpiCard icon={<TrendingUp size={16} />} label={t("dashboard.finance.arpu")} value={revenue?.arpu ?? "—"} format="currency" color="gold" />
        <KpiCard icon={<ArrowDownLeft size={16} />} label={t("dashboard.finance.churn")} value="—" format="percent" color="pink" />
        <KpiCard icon={<RotateCcw size={16} />} label={t("dashboard.finance.refunds")} value={revenue?.refunds ?? "—"} color="green" />
      </div>

      <div className={styles.grid2col}>
        <RevenueChart />
        <PlanBreakdown />
      </div>

    </div>
  );
}
