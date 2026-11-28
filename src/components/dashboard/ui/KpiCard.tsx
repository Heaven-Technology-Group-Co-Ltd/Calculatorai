"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import styles from "../styles/dashboard-blocks.module.css";
import { Panel } from "./Panel";

type KpiColor = "green" | "blue" | "gold" | "pink";
type KpiFormat = "number" | "currency" | "percent";

interface TrendData {
  direction: "up" | "down";
  value: string;
  label?: string;
}

interface KpiCardProps {
  icon: ReactNode;
  label: string;
  value: number | string;
  format?: KpiFormat;
  trend?: TrendData;
  color?: KpiColor;
  badge?: string;
}

const COLOR_ICON_CLASS: Record<KpiColor, string> = {
  green: styles.kpiIconGreen,
  blue: styles.kpiIconBlue,
  gold: styles.kpiIconGold,
  pink: styles.kpiIconPink,
};

function formatValue(val: number | string, fmt?: KpiFormat): string {
  if (typeof val === "string") return val;
  if (!Number.isFinite(val)) return "—";
  switch (fmt) {
    case "currency": return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case "percent": return `${val}%`;
    default: return val.toLocaleString();
  }
}

export function KpiCard({
  icon, label, value, format, trend, color = "blue", badge,
}: KpiCardProps) {
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevRef = useRef(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (value === prevRef.current) return;
    const dir = value > prevRef.current ? "up" : "down";
    setFlash(dir);
    prevRef.current = value;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setFlash(null), 600);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [value]);

  const displayValue = formatValue(value, format);
  const iconClass = COLOR_ICON_CLASS[color] || COLOR_ICON_CLASS.blue;

  return (
    <Panel padding="sm">
      <div className={styles.kpiHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className={styles.kpiLabel}>{label}</span>
          {badge && (
            <span
              style={{
                fontSize: 10,
                padding: "2px 6px",
                borderRadius: "var(--radius-full)",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
                fontWeight: 600,
              }}
            >
              {badge}
            </span>
          )}
        </div>
        <div className={`${styles.kpiIconWrap} ${iconClass}`}>{icon}</div>
      </div>
      <div
        className={`${styles.kpiValue} ${flash ? styles[`kpiFlash_${flash}`] : ""}`}
      >
        {displayValue}
      </div>
      {trend && (
        <div className={`${styles.kpiTrend} ${styles[`kpiTrend_${trend.direction}`]}`}>
          {trend.direction === "up"
            ? <TrendingUp size={14} />
            : <TrendingDown size={14} />
          }
          {trend.value} {trend.label && <span className={styles.kpiTrendLabel}>{trend.label}</span>}
        </div>
      )}
    </Panel>
  );
}
