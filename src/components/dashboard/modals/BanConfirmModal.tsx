"use client";

import { useState, useEffect, useRef } from "react";
import { useDashboardT } from "../i18n/useDashboardT";
import type { DashboardUser } from "../hooks/useUsers";
import styles from "../styles/dashboard-modals.module.css";
import { useBackdropClose } from "@/lib/dialog-backdrop";

interface BanConfirmModalProps {
  user: DashboardUser;
  onClose: () => void;
  onSuccess: () => void;
}

export function BanConfirmModal({ user, onClose, onSuccess }: BanConfirmModalProps) {
  const { t } = useDashboardT();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  const isBanned = user.status === "banned";

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

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      if (isBanned) {
        const res = await fetch(`/api/users/${user.id}/unban`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error("Request failed");
      } else {
        const res = await fetch(`/api/users/${user.id}/ban`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reason.trim() || undefined }),
        });
        if (!res.ok) throw new Error("Request failed");
      }
      onSuccess();
      onClose();
    } catch {
      setError(isBanned ? t("dashboard.error.unbanFailed") : t("dashboard.error.banFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ban-modal-title"
      className={styles.modal}
      onMouseDown={backdropClose.onMouseDown}
      onClick={backdropClose.onClick}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className={styles.header}>
        <span id="ban-modal-title" className={styles.title}>
          {isBanned ? t("dashboard.modal.ban.titleUnban") : t("dashboard.modal.ban.title")}
        </span>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
      </div>
      <div className={styles.body}>
        <p style={{ color: "var(--text)", fontSize: 14, margin: "0 0 8px" }}>
          {isBanned
            ? t("dashboard.modal.ban.descriptionUnban", { name: user.name ?? user.email })
            : t("dashboard.modal.ban.description", { name: user.name ?? user.email })}
        </p>

        {!isBanned && (
          <textarea
            className={styles.modalTextarea}
            style={{ marginTop: 14, minHeight: 80 }}
            placeholder={t("dashboard.modal.ban.reasonPlaceholder")}
            aria-label={t("dashboard.modal.ban.reasonPlaceholder")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
          />
        )}

        {error && (
          <div role="alert" style={{ color: "var(--error)", fontSize: 13, marginTop: 10 }}>
            {error}
          </div>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.btnCancel} onClick={onClose}>
            {t("dashboard.modal.cancel")}
          </button>
          <button
            type="button"
            className={isBanned ? styles.btnPrimary : styles.btnDanger}
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting
              ? isBanned ? t("dashboard.modal.ban.unbanning") : t("dashboard.modal.ban.banning")
              : isBanned ? t("dashboard.modal.ban.unban") : t("dashboard.modal.ban.ban")}
          </button>
        </div>
      </div>
    </dialog>
  );
}
