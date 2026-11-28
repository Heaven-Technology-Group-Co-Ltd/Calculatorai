"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, ClientApiError } from "@/lib/api-client";
import { Panel } from "../ui/Panel";
import styles from "../styles/dashboard-settings.module.css";
import { useDashboardT } from "../i18n/useDashboardT";
import { useToast } from "@/components/ui/Toast";

type SaveState = "idle" | "saving" | "saved" | "error";
type LoadState = "loading" | "loaded" | "error";

export function GeneralSettings() {
  const { t } = useDashboardT();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [state, setState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  // Values live in site_settings; starting from empty state and saving would
  // overwrite the stored site name with a hardcoded default.
  useEffect(() => {
    let cancelled = false;
    apiGet<{ site_name?: string; description?: string }>("/api/settings")
      .then((settings) => {
        if (cancelled) return;
        if (typeof settings?.site_name === "string") setName(settings.site_name);
        if (typeof settings?.description === "string") setDesc(settings.description);
        setLoadState("loaded");
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("[GeneralSettings] Load failed:", err);
          setLoadState("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const put = (key: string, value: string) => apiPost("/api/settings", { key, value });

  const handleSave = async () => {
    setState("saving");
    setSaveError(null);
    try {
      await Promise.all([put("site_name", name), put("description", desc)]);
      setState("saved");
      showToast(t("dashboard.toast.settingsSaved"));
    } catch (failure) {
      setSaveError(failure instanceof ClientApiError ? failure.message : null);
      setState("error");
    }
  };

  return (
    <Panel>
      <h3 className={`${styles.sectionTitle} ${styles.sectionTitleSpaced}`}>
        {t("dashboard.settings.general.title")}
      </h3>
      <div className={styles.formGroup}>
        <label className={styles.formLabel} htmlFor="general-site-name">{t("dashboard.settings.general.siteName")}</label>
        <input
          id="general-site-name"
          className={styles.formInput}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel} htmlFor="general-description">{t("dashboard.settings.general.description")}</label>
        <textarea
          id="general-description"
          placeholder={t("dashboard.settings.general.descriptionPlaceholder")}
          className={styles.formTextarea}
          rows={3}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </div>
      {loadState === "error" && (
        <div role="alert" className={styles.loadError}>
          Failed to load current settings. Saving is disabled to prevent data loss.
        </div>
      )}
      <button className={styles.saveBtn} onClick={handleSave} disabled={loadState !== "loaded" || state === "saving"}>
        {t("dashboard.common.save")}
      </button>
      {state === "saved" && <span role="status" className={`${styles.inlineState} ${styles.inlineSuccess}`}>Saved</span>}
      {state === "error" && <span role="alert" className={`${styles.inlineState} ${styles.inlineError}`}>{saveError ?? "Save failed"}</span>}
    </Panel>
  );
}
