"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Panel } from "../ui/Panel";
import { Skeleton } from "../ui/Skeleton";
import { useAnalytics } from "../hooks/useAnalytics";
import { useDashboardT } from "../i18n/useDashboardT";
import styles from "../styles/dashboard-blocks.module.css";

const PLAN_COLORS = ["#E8B896", "#D4A045", "#F0CCAE", "#60A5FA"];

export function PlanBreakdown() {
  const { t } = useDashboardT();
  const { data, error, isLoading } = useAnalytics({ type: "sessions" });
  const plans = data?.plans ?? [];
  if (error) return null;
  if (isLoading) return <Panel><Skeleton variant="panel" /></Panel>;
  if (!plans.length) return null;

  return (
    <Panel>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>{t("dashboard.plan.breakdown")}</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={plans} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
            {plans.map((_: unknown, i: number) => (
              <Cell key={i} fill={PLAN_COLORS[i % PLAN_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </Panel>
  );
}
