"use client";

import { Users, Percent, TrendingDown } from "lucide-react";
import { KpiCard } from "../ui/KpiCard";
import { Skeleton } from "../ui/Skeleton";
import { ErrorState } from "../ui/ErrorState";
import { useDashboardStats } from "../hooks/useDashboardStats";
import { useDashboardT } from "../i18n/useDashboardT";
import styles from "../styles/dashboard-blocks.module.css";

export function KpiRow() {
  const { t } = useDashboardT();
  const { data, error, isLoading, mutate } = useDashboardStats();

  if (error) return <ErrorState message={t("dashboard.error.loadFailed")} onRetry={mutate} />;

  if (isLoading) {
    return (
      <div className={styles.kpiRow}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="kpi" />
        ))}
      </div>
    );
  }

  return (
    <div className={styles.kpiRow}>
      <KpiCard
        icon={<Users size={16} />}
        label={t("dashboard.kpi.activeUsers")}
        value={data?.activeUsers ?? "—"}
        format="number"
        color="green"
      />
      <KpiCard
        icon={<Users size={16} />}
        label={t("dashboard.kpi.totalUsers")}
        value={data?.totalUsers ?? 0}
        format="number"
        color="blue"
      />
      <KpiCard
        icon={<Percent size={16} />}
        label={t("dashboard.kpi.conversionRate")}
        value={data?.conversionRate ?? "—"}
        format="percent"
        color="gold"
      />
      <KpiCard
        icon={<TrendingDown size={16} />}
        label={t("dashboard.kpi.bounceRate")}
        value={data?.bounceRate ?? "—"}
        format="percent"
        color="pink"
      />
    </div>
  );
}
