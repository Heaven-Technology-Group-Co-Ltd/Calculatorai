"use client";

import { useState, useEffect } from "react";
import { EmptyState } from "@/components/EmptyState";
import { Panel } from "../ui/Panel";
import { Skeleton } from "../ui/Skeleton";
import { fetcher } from "@/lib/fetcher";
import { useDashboardT } from "../i18n/useDashboardT";
import styles from "../styles/dashboard-settings.module.css";
import tableStyles from "../styles/dashboard-tables.module.css";

interface Webhook {
  id: string;
  name?: string;
  url: string;
  events?: string[];
  event_type?: string;
  status?: string;
}

export function WebhookManager() {
  const { t } = useDashboardT();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetcher("/api/settings/webhooks")
      .then((d) => {
        if (Array.isArray(d)) {
          setWebhooks(d as Webhook[]);
        } else {
          setWebhooks([]);
        }
      })
      .catch(() => setWebhooks([]))
      .finally(() => setLoading(false));
  }, []);

  const safeWebhooks = Array.isArray(webhooks) ? webhooks : [];

  return (
    <Panel>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: "var(--text)" }}>
        {t("dashboard.settings.webhooks.title")}
      </h3>
      {loading ? (
        <div className={styles.skeletonRow}>
          <Skeleton variant="text" height={48} />
          <Skeleton variant="text" height={48} />
          <Skeleton variant="text" height={48} />
        </div>
      ) : safeWebhooks.length === 0 ? (
        <EmptyState variant="inline" message={t("dashboard.settings.webhooks.empty")} />
      ) : (
        <div className={tableStyles.wrapper}>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>{t("dashboard.settings.webhooks.url")}</th>
                <th>{t("dashboard.settings.webhooks.events")}</th>
                <th>{t("dashboard.table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {safeWebhooks.map((wh) => {
                const eventsList = Array.isArray(wh.events)
                  ? wh.events
                  : wh.event_type
                  ? [wh.event_type]
                  : [];
                return (
                  <tr key={wh.id}>
                    <td className={tableStyles.cellUrl}>{wh.url}</td>
                    <td>
                      <div className={styles.eventList}>
                        {eventsList.map((ev) => (
                          <span key={ev} className={styles.eventBadge}>
                            {ev}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className={tableStyles.actionCell}>
                        <button
                          className={tableStyles.actionBtn}
                          title={t("dashboard.settings.webhooks.test")}
                        >
                          ▶
                        </button>
                        <button
                          className={tableStyles.actionBtn}
                          title={t("dashboard.settings.webhooks.delete")}
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
