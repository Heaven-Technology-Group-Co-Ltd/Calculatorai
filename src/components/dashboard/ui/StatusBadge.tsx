"use client";

import { useDashboardT, type DashboardTKey } from "../i18n/useDashboardT";
import styles from "../styles/dashboard-blocks.module.css";

type Status = "active" | "suspended" | "banned" | "unverified";

const STATUS_CLASS: Record<Status, string> = {
  active: styles.badgeActive,
  suspended: styles.badgeSuspended,
  unverified: styles.badgeSuspended,
  banned: styles.badgeBanned,
};

const STATUS_KEY: Record<Status, DashboardTKey> = {
  active: "dashboard.status.active",
  suspended: "dashboard.status.suspended",
  unverified: "dashboard.status.unverified",
  banned: "dashboard.status.banned",
};

interface StatusBadgeProps {
  status: Status;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useDashboardT();

  return (
    <span className={`${styles.badge} ${STATUS_CLASS[status] || ""}`}>
      <span className={styles.badgeDot} />
      {t(STATUS_KEY[status])}
    </span>
  );
}
