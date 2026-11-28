"use client";

import { Panel } from "../ui/Panel";
import styles from "../styles/dashboard-settings.module.css";
import { FormField } from "@/components/ui/FormField";
import { useDashboardT } from "../i18n/useDashboardT";

export function SecuritySettings() {
  const { t } = useDashboardT();
  return (
    <Panel>
      <h3 className={`${styles.sectionTitle} ${styles.sectionTitleCompact}`}>
        {t("dashboard.settings.security.title")}
      </h3>
      <div className={styles.securityNotice}>
        <span aria-hidden="true">⚠️</span> ส่วนการตั้งค่านี้ยังไม่ได้เชื่อมต่อกับระบบหลังบ้าน (ตัวอย่างแสดงผล)
      </div>
      <div className={styles.formGroup}>
        <FormField id="security-current-password" className={styles.formInput} label={t("dashboard.settings.security.currentPassword")} type="password" placeholder={t("dashboard.settings.security.placeholderCurrent")} disabled />
      </div>
      <div className={styles.formGroup}>
        <FormField id="security-new-password" className={styles.formInput} label={t("dashboard.settings.security.newPassword")} type="password" placeholder={t("dashboard.settings.security.placeholderNew")} disabled />
      </div>
      <button className={`${styles.saveBtn} ${styles.saveBtnDisabled}`} disabled title="ยังไม่พร้อมใช้งาน">{t("dashboard.settings.security.update")}</button>
    </Panel>
  );
}
