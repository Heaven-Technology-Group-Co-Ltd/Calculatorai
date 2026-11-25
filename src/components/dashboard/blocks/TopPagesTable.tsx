"use client";

import { ExternalLink } from "lucide-react";
import { Panel } from "../ui/Panel";
import { Skeleton } from "../ui/Skeleton";
import { EmptyState } from "../ui/EmptyState";
import { ErrorState } from "../ui/ErrorState";
import { useTraffic } from "../hooks/useTraffic";
import { useDashboardT } from "../i18n/useDashboardT";
import styles from "../styles/dashboard-blocks.module.css";

export function TopPagesTable() {
  const { t } = useDashboardT();
  const { data, error, isLoading, mutate } = useTraffic({ days: 30 });

  if (error) return <ErrorState message={t("dashboard.error.loadFailed")} onRetry={mutate} />;
  if (!isLoading && (!data?.topPages || data.topPages.length === 0)) {
    return (
      <Panel padding="md">
        <h3 className={styles.sectionTitle}>{t("dashboard.table.topPages")}</h3>
        <EmptyState icon={<ExternalLink size={24} />} message={t("dashboard.table.topPages.empty")} />
      </Panel>
    );
  }

  return (
    <Panel padding="md">
      <h3 className={styles.sectionTitle}>{t("dashboard.table.topPages")}</h3>
      {isLoading ? (
        <Skeleton variant="chart" height={200} />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("dashboard.table.topPages.headerPage")}</th>
                <th style={{ textAlign: "right" }}>{t("dashboard.table.topPages.headerViews")}</th>
              </tr>
            </thead>
            <tbody>
              {(data?.topPages ?? []).slice(0, 8).map((p) => (
                <tr key={p.path} className={styles.tableRow}>
                  <td>
                    <span className={styles.pageLink}>{p.path}</span>
                  </td>
                  <td style={{ textAlign: "right" }}>{p.views.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
