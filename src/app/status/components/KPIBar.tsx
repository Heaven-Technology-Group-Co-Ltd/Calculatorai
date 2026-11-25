"use client";

import { Activity, AlertTriangle, CheckCircle, Zap, type LucideIcon } from "lucide-react";
import type { RangeStats } from "../types";
import styles from "../StatusClient.module.css";

interface KPIBarProps {
  stats: RangeStats;
}

export function KPIBar({ stats }: KPIBarProps) {
  const items: { icon: LucideIcon; label: string; value: string; color: string }[] = [
    {
      icon: CheckCircle,
      label: "Uptime",
      value: stats.uptimePct !== null ? `${stats.uptimePct.toFixed(1)}%` : "No data",
      color: stats.uptimePct === null ? "var(--text-secondary)" : "var(--success)",
    },
    { icon: Zap, label: "Avg latency", value: `${stats.avgLatencyMs}ms`, color: "var(--primary)" },
    { icon: Activity, label: "Checks", value: String(stats.checks), color: "#7DD3FC" },
    {
      icon: AlertTriangle,
      label: "Incidents",
      value: String(stats.incidents),
      color: stats.incidents > 0 ? "var(--error)" : "var(--text-secondary)",
    },
  ];

  return (
    <div className={styles.kpis}>
      {items.map((k) => (
        <div key={k.label} className={`${styles.panel} ${styles.kpiCard}`}>
          <div className={styles.kpiLabel}>
            <k.icon size={14} color={k.color} />
            {k.label}
          </div>
          <div className={styles.kpiValue}>{k.value}</div>
        </div>
      ))}
    </div>
  );
}
