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

  const trendDirection =
    data?.userGrowth && data.userGrowth.length >= 2
      ? data.userGrowth.at(-1)!.value > data.userGrowth.at(-2)!.value
        ? "up"
        : "down"
      : undefined;

  return (
    <div className={styles.kpiRow}>
      <KpiCard
        icon={<Users size={16} />}
        label={t("dashboard.kpi.activeUsers")}
        value={data?.activeUsers ?? 0}
        format="number"
        color="green"
        trend={
          trendDirection && data?.userGrowth && data.userGrowth.length >= 2
            ? { direction: trendDirection, value: `${Math.abs(data.userGrowth.at(-1)!.value - data.userGrowth.at(-2)!.value)}` }
            : undefined
        }
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
        value={data?.conversionRate ?? 0}
        format="percent"
        color="gold"
        trend={
          data
            ? { direction: data.conversionRate >= 3 ? "up" : "down", value: `${data.conversionRate}%` }
            : undefined
        }
      />
      <KpiCard
        icon={<TrendingDown size={16} />}
        label={t("dashboard.kpi.bounceRate")}
        value={data?.bounceRate ?? 0}
        format="percent"
        color="pink"
      />
    </div>
  );
}
