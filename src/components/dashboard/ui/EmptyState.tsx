"use client";

import { type ReactNode } from "react";
import { Panel } from "./Panel";
import { Inbox } from "lucide-react";
import styles from "../styles/dashboard-blocks.module.css";

interface EmptyStateProps {
  icon?: ReactNode;
  message: string;
  action?: ReactNode;
}

export function EmptyState({ icon, message, action }: EmptyStateProps) {
  return (
    <Panel padding="lg">
      <div className={styles.emptyWrap}>
        <div className={styles.emptyIcon}>{icon ?? <Inbox size={32} />}</div>
        <p className={styles.emptyText}>{message}</p>
        {action && <div className={styles.emptyAction}>{action}</div>}
      </div>
    </Panel>
  );
}
