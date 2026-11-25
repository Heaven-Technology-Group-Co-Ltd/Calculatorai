"use client";

import { Panel } from "../ui/Panel";
import { Skeleton } from "../ui/Skeleton";
import { useAnalytics } from "../hooks/useAnalytics";
import styles from "../styles/dashboard-blocks.module.css";
import { useDashboardT } from "../i18n/useDashboardT";

export function GeographyList() {
  const { t } = useDashboardT();
  const { data, error, isLoading } = useAnalytics({ type: "geo" });
  const countries = data?.countries ?? [];
  if (error) return null;
  if (isLoading) return <Panel><Skeleton variant="panel" /></Panel>;
  if (!countries.length) return null;

  const maxVal = Math.max(...countries.map((c: { value: number }) => c.value));

  return (
    <Panel>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>{t("dashboard.geography.title")}</span>
      </div>
      {countries.map((c: { name: string; value: number }, i: number) => (
        <div key={c.name || i} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
            <span>{c.name}</span>
            <span style={{ color: "var(--text-secondary)" }}>{c.value.toLocaleString()}</span>
          </div>
          <div style={{ height: 4, background: "rgba(232,184,150,0.1)", borderRadius: 2 }}>
            <div style={{ width: `${(c.value / maxVal) * 100}%`, height: "100%", background: "#E8B896", borderRadius: 2 }} />
          </div>
        </div>
      ))}
    </Panel>
  );
}
