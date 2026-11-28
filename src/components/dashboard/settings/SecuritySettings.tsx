"use client";

import { Panel } from "../ui/Panel";
import styles from "../styles/dashboard-settings.module.css";
import { FormField } from "@/components/ui/FormField";
import { useDashboardT } from "../i18n/useDashboardT";

export function SecuritySettings() {
  const { t } = useDashboardT();
  return (
    <Panel>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: "var(--text)" }}>
        {t("dashboard.settings.security.title")}
      </h3>
      <div style={{ marginBottom: 16, padding: "8px 12px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: 13, color: "var(--text-secondary)" }}>
        <span aria-hidden="true">⚠️</span> ส่วนการตั้งค่านี้ยังไม่ได้เชื่อมต่อกับระบบหลังบ้าน (ตัวอย่างแสดงผล)
      </div>
      <div className={styles.formGroup}>
        <FormField id="security-current-password" className={styles.formInput} label={t("dashboard.settings.security.currentPassword")} type="password" placeholder={t("dashboard.settings.security.placeholderCurrent")} disabled />
      </div>
      <div className={styles.formGroup}>
        <FormField id="security-new-password" className={styles.formInput} label={t("dashboard.settings.security.newPassword")} type="password" placeholder={t("dashboard.settings.security.placeholderNew")} disabled />
      </div>
      <button className={styles.saveBtn} disabled title="ยังไม่พร้อมใช้งาน" style={{ opacity: 0.5, cursor: "not-allowed" }}>{t("dashboard.settings.security.update")}</button>
    </Panel>
  );
}
