"use client";

import { Panel } from "../ui/Panel";
import { Skeleton } from "../ui/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "../ui/ErrorState";
import { useAnalytics, type FunnelStage } from "../hooks/useAnalytics";
import { useDashboardT } from "../i18n/useDashboardT";
import styles from "../styles/dashboard-blocks.module.css";

export function ConversionFunnel() {
  const { t } = useDashboardT();
  const { data, error, isLoading, mutate } = useAnalytics({ type: "funnel" });

  if (error) return <ErrorState message={t("dashboard.error.loadFailed")} onRetry={mutate} />;
  if (!isLoading && (!data || data.length === 0)) {
    return (
      <Panel padding="md">
        <h3 className={styles.sectionTitle}>{t("dashboard.funnel.conversion")}</h3>
        <EmptyState variant="dashboard" message={t("dashboard.funnel.empty")} />
      </Panel>
    );
  }

  const stages: FunnelStage[] = data ?? [];
  const max = Math.max(0, ...stages.map((stage) => stage.count));

  return (
    <Panel padding="md">
      <h3 className={styles.sectionTitle}>{t("dashboard.funnel.conversion")}</h3>
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="text" width={360} height={32} />
          ))}
        </div>
      ) : (
        <div className={styles.funnelStages}>
          {stages.map((s) => (
            <div key={s.stage} className={styles.funnelStageRow}>
              <span className={styles.funnelStageLabel}>{s.stage}</span>
              <div className={styles.funnelBarTrack}>
                <div
                  className={styles.funnelBarFill}
                  style={{ width: `${max > 0 ? Math.min((s.count / max) * 100, 100) : 0}%` }}
                />
              </div>
              <span className={styles.funnelStageCount}>{s.count.toLocaleString()}</span>
              <span className={styles.funnelStagePct}>{s.percentage}%</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
