"use client";

import { useState, useEffect, type FormEvent } from "react";
import { EmptyState } from "@/components/EmptyState";
import { Panel } from "../ui/Panel";
import { Skeleton } from "../ui/Skeleton";
import { apiDelete, apiPost } from "@/lib/api-client";
import { fetcher } from "@/lib/fetcher";
import { useDashboardT } from "../i18n/useDashboardT";
import styles from "../styles/dashboard-settings.module.css";
import tableStyles from "../styles/dashboard-tables.module.css";
import { useToast } from "@/components/ui/Toast";
import { Play, Trash2 } from "lucide-react";

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
  const { showToast } = useToast();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeWebhook, setActiveWebhook] = useState<string | null>(null);
  const [webhookName, setWebhookName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvent, setWebhookEvent] = useState("custom");
  const [creating, setCreating] = useState(false);

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

  const runAction = async (id: string, action: "test" | "delete") => {
    setActiveWebhook(id);
    setActionError(null);
    try {
      if (action === "test") await apiPost(`/api/settings/webhooks/${id}/test`);
      else {
        await apiDelete(`/api/settings/webhooks/${id}`);
        setWebhooks((previous) => previous.filter((webhook) => webhook.id !== id));
      }
      showToast(t(action === "test" ? "dashboard.toast.webhookTested" : "dashboard.toast.webhookDeleted"));
    } catch (failure) {
      setActionError(failure instanceof Error ? failure.message : t("dashboard.error.loadFailed"));
    } finally {
      setActiveWebhook(null);
    }
  };

  const createWebhook = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!webhookName.trim() || !webhookUrl.trim() || creating) return;
    setCreating(true);
    setActionError(null);
    try {
      const createdWebhook = await apiPost<Webhook>("/api/settings/webhooks", {
        name: webhookName.trim(), url: webhookUrl.trim(), event_type: webhookEvent,
      });
      setWebhooks((previous) => [createdWebhook, ...previous]);
      setWebhookName("");
      setWebhookUrl("");
      showToast(t("dashboard.toast.webhookAdded"));
    } catch (failure) {
      setActionError(failure instanceof Error ? failure.message : t("dashboard.error.loadFailed"));
    } finally {
      setCreating(false);
    }
  };

  const safeWebhooks = Array.isArray(webhooks) ? webhooks : [];

  return (
    <Panel>
      <h3 className={`${styles.sectionTitle} ${styles.sectionTitleSpaced}`}>
        {t("dashboard.settings.webhooks.title")}
      </h3>
      {actionError && <p role="alert">{actionError}</p>}
      <form className={styles.webhookForm} onSubmit={createWebhook}>
        <label className={styles.formGroup}>
          <span className={styles.formLabel}>{t("dashboard.settings.webhooks.name")}</span>
          <input className={styles.formInput} value={webhookName} onChange={(event) => setWebhookName(event.target.value)} required maxLength={255} />
        </label>
        <label className={styles.formGroup}>
          <span className={styles.formLabel}>{t("dashboard.settings.webhooks.url")}</span>
          <input className={styles.formInput} type="url" value={webhookUrl} onChange={(event) => setWebhookUrl(event.target.value)} required maxLength={2048} />
        </label>
        <label className={styles.formGroup}>
          <span className={styles.formLabel}>{t("dashboard.settings.webhooks.events")}</span>
          <select className={styles.formSelect} value={webhookEvent} onChange={(event) => setWebhookEvent(event.target.value)}>
            <option value="backup">{t("dashboard.settings.webhooks.backup")}</option>
            <option value="analytics">{t("dashboard.settings.webhooks.analytics")}</option>
            <option value="error_alert">{t("dashboard.settings.webhooks.errorAlert")}</option>
            <option value="custom">{t("dashboard.settings.webhooks.custom")}</option>
          </select>
        </label>
        <button className={styles.saveBtn} type="submit" disabled={creating}>{creating ? t("dashboard.settings.webhooks.adding") : t("dashboard.settings.webhooks.add")}</button>
      </form>
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
                          aria-label={t("dashboard.settings.webhooks.test")}
                          disabled={activeWebhook !== null}
                          onClick={() => void runAction(wh.id, "test")}
                        >
                          <Play size={16} aria-hidden="true" focusable="false" />
                        </button>
                        <button
                          className={tableStyles.actionBtn}
                          title={t("dashboard.settings.webhooks.delete")}
                          aria-label={t("dashboard.settings.webhooks.delete")}
                          disabled={activeWebhook !== null}
                          onClick={() => void runAction(wh.id, "delete")}
                        >
                          <Trash2 size={16} aria-hidden="true" focusable="false" />
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
