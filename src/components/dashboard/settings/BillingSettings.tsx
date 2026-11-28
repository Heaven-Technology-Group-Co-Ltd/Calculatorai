"use client";

import { Panel } from "../ui/Panel";
import styles from "../styles/dashboard-settings.module.css";
import { useDashboardT } from "../i18n/useDashboardT";

export function BillingSettings() {
  const { t } = useDashboardT();
  return (
    <Panel>
      <h3 className={`${styles.sectionTitle} ${styles.sectionTitleCompact}`}>
        {t("dashboard.settings.billing.title")}
      </h3>
      <div className={styles.formGroup}>
        <label className={styles.formLabel} htmlFor="billing-stripe-key">{t("dashboard.settings.billing.stripeKey")}</label>
        <input
          id="billing-stripe-key"
          className={styles.formInput}
          defaultValue="pk_live_••••••••"
          readOnly
        />
        <div className={styles.formHint}>
          {t("dashboard.settings.billing.keyHint")}
        </div>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel} htmlFor="billing-default-tier">{t("dashboard.settings.billing.defaultTier")}</label>
        <select id="billing-default-tier" className={styles.formSelect} disabled>
          <option>{t("dashboard.settings.billing.tierFree")}</option>
          <option>{t("dashboard.settings.billing.tierBasic")}</option>
          <option>{t("dashboard.settings.billing.tierPremium")}</option>
        </select>
      </div>
      <button className={`${styles.saveBtn} ${styles.saveBtnDisabled}`} disabled title="ยังไม่พร้อมใช้งาน">{t("dashboard.common.save")}</button>
    </Panel>
  );
}
