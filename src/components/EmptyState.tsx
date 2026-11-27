"use client";

import type { ReactNode } from "react";
import { SearchX } from "lucide-react";
import { Panel } from "@/components/dashboard/ui/Panel";
import styles from "@/components/dashboard/styles/dashboard-blocks.module.css";

interface EmptyStateProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  message?: string;
  action?: ReactNode;
  variant?: "default" | "dashboard" | "inline";
}

export function EmptyState({ icon, title, description, message, action, variant = "default" }: EmptyStateProps) {
  if (variant === "default") return <div className="empty-state-premium">{icon ?? <SearchX size={32} />}{title && <strong>{title}</strong>}<p>{description ?? message}</p>{action}</div>;
  const content = <div className={styles.emptyWrap}>{icon && <div className={styles.emptyIcon}>{icon}</div>}{title && <strong>{title}</strong>}<p className={styles.emptyText}>{description ?? message}</p>{action && <div className={styles.emptyAction}>{action}</div>}</div>;
  return variant === "dashboard" ? <Panel padding="lg">{content}</Panel> : content;
}
