"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Monitor } from "lucide-react";
import { Panel } from "../ui/Panel";
import { Skeleton } from "../ui/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "../ui/ErrorState";
import { useDashboardStats } from "../hooks/useDashboardStats";
import { useDashboardT } from "../i18n/useDashboardT";
import styles from "../styles/dashboard-blocks.module.css";

const COLORS = ["#E8B896", "#D4A045", "#8B7D6B", "#5C5A55", "#3A3A3A"];

export function DevicePieChart() {
  const { t } = useDashboardT();
  const { data, error, isLoading, mutate } = useDashboardStats();

  if (error) return <ErrorState message={t("dashboard.error.loadFailed")} onRetry={mutate} />;
  if (!isLoading && (!data?.deviceData || data.deviceData.length === 0)) {
    return <EmptyState variant="dashboard" icon={<Monitor size={28} />} message={t("dashboard.chart.devices.empty")} />;
  }

  const chartData = (data?.deviceData ?? []).map((d) => ({
    device: d.device ?? d.name ?? "Unknown",
    count: d.count ?? d.value ?? 0,
  }));

  return (
    <Panel padding="md" className={styles.chartPanel}>
      <h3 className={styles.sectionTitle}>{t("dashboard.chart.devices")}</h3>
      {isLoading ? (
        <Skeleton variant="chart" height={220} />
      ) : (
        <div className={styles.chartWrap}>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="count"
                nameKey="device"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={2}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#242F35",
                  border: "1px solid rgba(232,184,150,0.12)",
                  borderRadius: 8,
                  color: "var(--text)",
                  fontSize: 13,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className={styles.legendList}>
            {chartData.map((d, i) => (
              <div key={d.device} className={styles.legendItem}>
                <span
                  className={styles.legendDot}
                  style={{ background: COLORS[i % COLORS.length] }}
                />
                <span className={styles.legendLabel}>{d.device}</span>
                <span className={styles.legendValue}>{(d.count ?? 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}
