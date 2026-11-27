"use client";

import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { DollarSign } from "lucide-react";
import { Panel } from "../ui/Panel";
import { Skeleton } from "../ui/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "../ui/ErrorState";
import { useRevenue } from "../hooks/useRevenue";
import { useDashboardT } from "../i18n/useDashboardT";
import styles from "../styles/dashboard-blocks.module.css";

export function RevenueChart() {
  const { t } = useDashboardT();
  const { data, error, isLoading, mutate } = useRevenue();

  if (error) return <ErrorState message={t("dashboard.error.loadFailed")} onRetry={mutate} />;
  if (!isLoading && (!data?.monthlyRevenue || data.monthlyRevenue.length === 0)) {
    return (
      <Panel padding="md">
        <h3 className={styles.sectionTitle}>{t("dashboard.chart.monthlyRevenue")}</h3>
        <EmptyState variant="dashboard" icon={<DollarSign size={24} />} message={t("dashboard.chart.monthlyRevenue.empty")} />
      </Panel>
    );
  }

  const chartData = (data?.monthlyRevenue ?? []).map((pt) => ({
    month: pt.month?.slice(0, 7) ?? pt.month ?? "", // "YYYY-MM"
    revenue: pt.revenue ?? 0,
  }));

  return (
    <Panel padding="md" className={styles.chartPanel}>
      <h3 className={styles.sectionTitle}>{t("dashboard.chart.monthlyRevenue")}</h3>
      {isLoading ? (
        <Skeleton variant="chart" height={220} />
      ) : (
        <div className={styles.chartWrap}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: "var(--text-secondary)" }}
                axisLine={{ stroke: "rgba(232,184,150,0.08)" }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <Tooltip
                contentStyle={{
                  background: "#242F35",
                  border: "1px solid rgba(232,184,150,0.12)",
                  borderRadius: 8,
                  color: "var(--text)",
                  fontSize: 13,
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, t("dashboard.chart.monthlyRevenue.tooltip")]}
              />
              <Bar dataKey="revenue" fill="#D4A045" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}
