"use client";

import { Activity, DollarSign, Clock } from "lucide-react";
import { Panel } from "../ui/Panel";
import { Skeleton } from "../ui/Skeleton";
import { ErrorState } from "../ui/ErrorState";
import { useDashboardStats } from "../hooks/useDashboardStats";
import { useDashboardT } from "../i18n/useDashboardT";
import styles from "../styles/dashboard-blocks.module.css";

export function SystemHealth() {
  const { t } = useDashboardT();
  const { data, error, isLoading, mutate } = useDashboardStats();

  if (error) return <ErrorState message={t("dashboard.error.loadFailed")} onRetry={mutate} />;

  return (
    <Panel padding="md">
      <h3 className={styles.sectionTitle}>{t("dashboard.health.system")}</h3>
      {isLoading ? (
        <div className={styles.healthGrid}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="kpi" />
          ))}
        </div>
      ) : (
        <div className={styles.healthGrid}>
          <div className={styles.healthItem}>
            <Activity size={20} className={styles.healthIcon} />
            <div className={styles.healthItemValue}>{data?.activeSessions ?? 0}</div>
            <div className={styles.healthItemLabel}>{t("dashboard.health.sessions")}</div>
          </div>
          <div className={styles.healthItem}>
            <DollarSign size={20} className={styles.healthIcon} />
            <div className={styles.healthItemValue}>
              ${((data?.monthlyRevenue ?? 0) / 1000).toFixed(1)}k
            </div>
            <div className={styles.healthItemLabel}>{t("dashboard.health.revenue")}</div>
          </div>
          <div className={styles.healthItem}>
            <Clock size={20} className={styles.healthIcon} />
            <div className={styles.healthItemValue}>
              {data?.serverTime ? new Date(data.serverTime).toLocaleTimeString() : "--"}
            </div>
            <div className={styles.healthItemLabel}>{t("dashboard.health.serverTime")}</div>
          </div>
        </div>
      )}
    </Panel>
  );
}
