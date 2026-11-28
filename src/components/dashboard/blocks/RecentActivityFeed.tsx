"use client";

import { Activity, UserPlus, Calculator, CreditCard, Settings } from "lucide-react";
import { Panel } from "../ui/Panel";
import { Skeleton } from "../ui/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { useDashboardStats } from "../hooks/useDashboardStats";
import { useDashboardT } from "../i18n/useDashboardT";
import styles from "../styles/dashboard-blocks.module.css";

const ACTION_ICON: Record<string, React.ReactNode> = {
  login: <Activity size={14} />,
  register: <UserPlus size={14} />,
  calculation: <Calculator size={14} />,
  payment: <CreditCard size={14} />,
  settings: <Settings size={14} />,
  default: <Activity size={14} />,
};

function iconForAction(action: string): React.ReactNode {
  const key = Object.keys(ACTION_ICON).find((k) => action.toLowerCase().includes(k));
  return key ? ACTION_ICON[key] : ACTION_ICON["default"];
}

export function formatActivityTime(timestamp: string, locale: string, now = Date.now()): string {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return "—";
  const minutes = Math.max(0, Math.floor((now - date.getTime()) / 60_000));
  if (minutes >= 43200) return date.toLocaleDateString(locale);
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });
  if (minutes >= 1440) return relative.format(-Math.floor(minutes / 1440), "day");
  if (minutes >= 60) return relative.format(-Math.floor(minutes / 60), "hour");
  return relative.format(-minutes, "minute");
}

export function RecentActivityFeed() {
  const { t, locale } = useDashboardT();
  const { data, error, isLoading } = useDashboardStats();

  if (error) return null; // non-critical, hide on error
  if (!isLoading && (!data?.recentActivity || data.recentActivity.length === 0)) {
    return (
      <Panel padding="md">
        <h3 className={styles.sectionTitle}>{t("dashboard.activity.recent")}</h3>
        <EmptyState variant="dashboard" icon={<Activity size={24} />} message={t("dashboard.activity.empty")} />
      </Panel>
    );
  }

  return (
    <Panel padding="md">
      <h3 className={styles.sectionTitle}>{t("dashboard.activity.recent")}</h3>
      {isLoading ? (
        <div className={styles.activityList}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="text" width={360} height={36} />
          ))}
        </div>
      ) : (
        <div className={styles.activityList}>
          {(data?.recentActivity ?? []).slice(0, 6).map((item, i) => (
            <div key={i} className={styles.activityItem}>
              <span className={styles.activityItemIcon}>{iconForAction(item.action)}</span>
              <div className={styles.activityItemContent}>
                <span className={styles.activityItemUser}>{item.user}</span>
                <span className={styles.activityItemAction}>{item.action}</span>
              </div>
              <span className={styles.activityItemTime}>{formatActivityTime(item.time, locale)}</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
