"use client";

import { useState, useEffect, useRef } from "react";
import type { DashboardUser } from "../hooks/useUsers";
import { useDashboardT } from "../i18n/useDashboardT";
import styles from "../styles/dashboard-modals.module.css";
import { useBackdropClose } from "@/lib/dialog-backdrop";

interface MessageModalProps {
  user: DashboardUser;
  onClose: () => void;
  onSuccess: () => void;
}

export function MessageModal({ user, onClose, onSuccess }: MessageModalProps) {
  const { t } = useDashboardT();
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  const maxLength = 2000;

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

  const remaining = maxLength - content.length;

  const handleSend = async () => {
    if (!content.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/users/${user.id}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (!res.ok) throw new Error("Request failed");
      onSuccess();
      onClose();
    } catch {
      setError(t("dashboard.error.sendMessageFailed"));
    } finally {
      setSending(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="message-modal-title"
      className={styles.modal}
      onMouseDown={backdropClose.onMouseDown}
      onClick={backdropClose.onClick}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className={styles.header}>
        <span id="message-modal-title" className={styles.title}>
          {t("dashboard.modal.message.to", { name: user.name || user.email })}
        </span>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
      </div>
      <div className={styles.body}>
        <textarea
          className={styles.modalTextarea}
          placeholder={t("dashboard.modal.message.placeholder")}
          aria-label={t("dashboard.modal.message.placeholder")}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={maxLength}
        />
        <div className={styles.charCount}>
          {remaining.toLocaleString()} characters remaining
        </div>
        {error && (
          <div role="alert" style={{ color: "var(--error)", fontSize: 13, marginTop: 8 }}>
            {error}
          </div>
        )}
        <div className={styles.actions}>
          <button type="button" className={styles.btnCancel} onClick={onClose}>
            {t("dashboard.modal.cancel")}
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleSend}
            disabled={!content.trim() || sending}
          >
            {sending ? t("dashboard.modal.message.sending") : t("dashboard.modal.message.send")}
          </button>
        </div>
      </div>
    </dialog>
  );
}
