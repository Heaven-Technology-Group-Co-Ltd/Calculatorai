"use client";

import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Activity } from "lucide-react";
import { Panel } from "../ui/Panel";
import { Skeleton } from "../ui/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "../ui/ErrorState";
import { useDashboardStats } from "../hooks/useDashboardStats";
import { useDashboardT } from "../i18n/useDashboardT";
import styles from "../styles/dashboard-blocks.module.css";

export function TrafficAreaChart() {
  const { t } = useDashboardT();
  const { data, error, isLoading, mutate } = useDashboardStats();

  if (error) return <ErrorState message={t("dashboard.error.loadFailed")} onRetry={mutate} />;
  if (!isLoading && (!data?.visitorChart || data.visitorChart.length === 0)) {
    return <EmptyState variant="dashboard" icon={<Activity size={28} />} message={t("dashboard.chart.traffic.empty")} />;
  }

  const chartData = (data?.visitorChart ?? []).map((pt) => {
    const rawDate = pt.date ?? pt.day ?? "";
    const dateLabel = typeof rawDate === "string" && rawDate.length >= 10 ? rawDate.slice(5) : rawDate;
    const viewsCount = pt.views ?? pt.pageViews ?? pt.visitors ?? 0;
    return {
      date: dateLabel,
      views: viewsCount,
    };
  });

  return (
    <Panel padding="md" className={styles.chartPanel}>
      <h3 className={styles.sectionTitle}>{t("dashboard.chart.traffic")}</h3>
      {isLoading ? (
        <Skeleton variant="chart" height={200} />
      ) : (
        <div className={styles.chartWrap}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E8B896" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#E8B896" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                axisLine={{ stroke: "rgba(232,184,150,0.08)" }}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#242F35",
                  border: "1px solid rgba(232,184,150,0.12)",
                  borderRadius: 8,
                  color: "var(--text)",
                  fontSize: 13,
                }}
              />
              <Area
                type="monotone"
                dataKey="views"
                stroke="#E8B896"
                strokeWidth={2}
                fill="url(#trafficGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}
