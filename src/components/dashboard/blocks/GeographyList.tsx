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
        <div key={c.name || i} className={styles.countryRow}>
          <div className={styles.countryHeading}>
            <span>{c.name}</span>
            <span className={styles.countryValue}>{c.value.toLocaleString()}</span>
          </div>
          <div className={styles.countryTrack}>
            <div className={styles.countryFill} style={{ width: `${(c.value / maxVal) * 100}%` }} />
          </div>
        </div>
      ))}
    </Panel>
  );
}
