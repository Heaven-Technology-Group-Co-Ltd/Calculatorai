"use client";

import { useState } from "react";
import { useDashboardT, type DashboardTKey } from "../i18n/useDashboardT";
import { GeneralSettings } from "../settings/GeneralSettings";
import { SecuritySettings } from "../settings/SecuritySettings";
import { BillingSettings } from "../settings/BillingSettings";
import { WebhookManager } from "../settings/WebhookManager";
import styles from "../styles/dashboard-settings.module.css";

const TABS: { key: string; labelKey: DashboardTKey }[] = [
  { key: "General", labelKey: "dashboard.settings.general" },
  { key: "Security", labelKey: "dashboard.settings.security" },
  { key: "Billing", labelKey: "dashboard.settings.billing" },
  { key: "Webhooks", labelKey: "dashboard.settings.webhooks" },
];

export function SettingsPage() {
  const { t } = useDashboardT();
  const [active, setActive] = useState<string>("General");

  return (
    <div className={styles.settingsLayout}>
      <div className={styles.settingsTabs}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`${styles.settingsTab} ${active === tab.key ? styles.settingsTabActive : ""}`}
            onClick={() => setActive(tab.key)}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>
      <div className={styles.settingsContent}>
        {active === "General" && <GeneralSettings />}
        {active === "Security" && <SecuritySettings />}
        {active === "Billing" && <BillingSettings />}
        {active === "Webhooks" && <WebhookManager />}
      </div>
    </div>
  );
}
