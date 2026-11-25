"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Panel } from "./Panel";
import { useDashboardT } from "../i18n/useDashboardT";
import styles from "../styles/dashboard-blocks.module.css";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { t } = useDashboardT();

  return (
    <Panel padding="lg">
      <div className={styles.errorWrap}>
        <AlertTriangle size={28} className={styles.errorIcon} />
        <p className={styles.errorText}>{message}</p>
        {onRetry && (
          <button onClick={onRetry} className={styles.retryBtn}>
            <RefreshCw size={14} /> {t("dashboard.error.retry")}
          </button>
        )}
      </div>
    </Panel>
  );
}
