"use client";

import { AlertTriangle, CheckCircle, Zap, type LucideIcon } from "lucide-react";
import type { RangeStats } from "../types";
import styles from "../StatusClient.module.css";

interface KPIBarProps {
  stats: RangeStats;
  incidentCount: number;
}

export function KPIBar({ stats, incidentCount }: KPIBarProps) {
  const items: { icon: LucideIcon; label: string; value: string; color: string }[] = [
    {
      icon: CheckCircle,
      label: "Uptime",
      value: stats.uptimePct !== null ? `${stats.uptimePct.toFixed(1)}%` : "No data",
      color: stats.uptimePct === null ? "var(--text-secondary)" : "var(--success)",
    },
    { icon: Zap, label: "Avg latency", value: `${stats.avgLatencyMs}ms`, color: "var(--primary)" },
    {
      icon: AlertTriangle,
      label: "Incidents",
      value: String(incidentCount),
      color: incidentCount > 0 ? "var(--error)" : "var(--text-secondary)",
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
