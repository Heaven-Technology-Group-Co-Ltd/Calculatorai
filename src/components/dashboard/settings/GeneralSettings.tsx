"use client";

import { useEffect, useState } from "react";
import { Panel } from "../ui/Panel";
import styles from "../styles/dashboard-settings.module.css";
import { useDashboardT } from "../i18n/useDashboardT";

type SaveState = "idle" | "saving" | "saved" | "error";
type LoadState = "loading" | "loaded" | "error";

export function GeneralSettings() {
  const { t } = useDashboardT();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [state, setState] = useState<SaveState>("idle");
  const [loadState, setLoadState] = useState<LoadState>("loading");

  // Values live in site_settings; starting from empty state and saving would
  // overwrite the stored site name with a hardcoded default.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load settings: ${res.status}`);
        return res.json();
      })
      .then((body) => {
        if (cancelled) return;
        if (body?.data) {
          if (typeof body.data.site_name === "string") setName(body.data.site_name);
          if (typeof body.data.description === "string") setDesc(body.data.description);
        }
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

  const put = (key: string, value: string) =>
    fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    }).then((res) => {
      if (!res.ok) throw new Error(String(res.status));
    });

  const handleSave = async () => {
    setState("saving");
    try {
      await Promise.all([put("site_name", name), put("description", desc)]);
      setState("saved");
    } catch {
      setState("error");
    }
  };

  return (
    <Panel>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: "var(--text)" }}>
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
          className={styles.formTextarea}
          rows={3}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </div>
      {loadState === "error" && (
        <div role="alert" style={{ marginBottom: 16, color: "var(--error)", fontSize: 13 }}>
          Failed to load current settings. Saving is disabled to prevent data loss.
        </div>
      )}
      <button className={styles.saveBtn} onClick={handleSave} disabled={loadState !== "loaded" || state === "saving"}>
        {t("dashboard.common.save")}
      </button>
      {state === "saved" && <span role="status" style={{ marginLeft: 12, color: "var(--primary)" }}>Saved</span>}
      {state === "error" && <span role="alert" style={{ marginLeft: 12, color: "var(--error)" }}>Save failed</span>}
    </Panel>
  );
}
