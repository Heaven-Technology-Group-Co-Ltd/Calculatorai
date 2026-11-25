"use client";

import { useState, useEffect, useRef } from "react";
import { fetcher } from "@/lib/fetcher";
import { Skeleton } from "../ui/Skeleton";
import { ErrorState } from "../ui/ErrorState";
import type { DashboardUser } from "../hooks/useUsers";
import styles from "../styles/dashboard-modals.module.css";
import { useDashboardT } from "../i18n/useDashboardT";
import { useBackdropClose } from "@/lib/dialog-backdrop";

interface DetailedUser {
  id: string;
  email: string;
  name: string | null;
  status: "active" | "suspended" | "banned";
  plan: string;
  created_at: string;
  last_seen_at: string | null;
  is_banned?: boolean;
  banned_reason?: string | null;
  banned_at?: string | null;
  subscription?: {
    plan: string;
    status: string;
    amount_monthly: number;
  } | null;
  calculations_count?: number;
}

interface UserDetailModalProps {
  user: DashboardUser;
  onClose: () => void;
}

export function UserDetailModal({ user, onClose }: UserDetailModalProps) {
  const { t } = useDashboardT();
  const [detail, setDetail] = useState<DetailedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (typeof dialog.showModal === "function" && !dialog.open) {
      dialog.showModal();
    }
    return () => {
      if (typeof dialog.close === "function" && dialog.open) {
        dialog.close();
      }
    };
  }, []);

  const backdropClose = useBackdropClose(onClose);

  const load = () => {
    setLoading(true);
    setError(false);
    fetcher(`/api/users/${user.id}`)
      .then((data) => setDetail(data?.data ?? data ?? null))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [user.id]);

  const statusClass =
    user.status === "active"
      ? styles.statusActive
      : user.status === "suspended"
        ? styles.statusSuspended
        : styles.statusBanned;

  return (
    <dialog
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-detail-title"
      className={styles.modal}
      onMouseDown={backdropClose.onMouseDown}
      onClick={backdropClose.onClick}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className={styles.header}>
        <span id="user-detail-title" className={styles.title}>{t("dashboard.modal.userDetails.title")}</span>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
      </div>
      <div className={styles.body}>
        {loading && (
          <div className={styles.spinner}>
            <Skeleton variant="text" />
            <Skeleton variant="text" />
            <Skeleton variant="text" />
          </div>
        )}
        {error && (
          <ErrorState message={t("dashboard.error.loadUserDetailsFailed")} onRetry={load} />
        )}
        {!loading && !error && detail && (
          <>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t("dashboard.modal.userDetails.name")}</span>
              <span className={styles.detailValue}>{detail.name ?? "—"}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t("dashboard.modal.userDetails.email")}</span>
              <span className={styles.detailValue}>{detail.email}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t("dashboard.modal.userDetails.status")}</span>
              <span className={`${styles.statusBadge} ${statusClass}`}>
                <span className={styles.statusDot} />
                {detail.status}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t("dashboard.modal.userDetails.plan")}</span>
              <span className={styles.detailValue}>{detail.plan}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t("dashboard.modal.userDetails.joined")}</span>
              <span className={styles.detailValue}>
                {new Date(detail.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Last Seen</span>
              <span className={styles.detailValue}>
                {detail.last_seen_at
                  ? new Date(detail.last_seen_at).toLocaleDateString()
                  : "—"}
              </span>
            </div>
            {detail.is_banned && detail.banned_reason && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>{t("dashboard.modal.userDetails.banReason")}</span>
                <span className={styles.detailValue}>{detail.banned_reason}</span>
              </div>
            )}
            {detail.subscription && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>{t("dashboard.modal.userDetails.subscription")}</span>
                <span className={styles.detailValue}>
                  {detail.subscription.plan} — ${(detail.subscription.amount_monthly / 100).toFixed(2)}/mo
                </span>
              </div>
            )}
            {detail.calculations_count !== undefined && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>{t("dashboard.modal.userDetails.calculations")}</span>
                <span className={styles.detailValue}>{detail.calculations_count}</span>
              </div>
            )}
          </>
        )}
        {!loading && !error && !detail && (
          <div style={{ color: "var(--text-secondary)", textAlign: "center", padding: 24 }}>
            {t("dashboard.modal.userDetails.empty")}
          </div>
        )}
      </div>
    </dialog>
  );
}
