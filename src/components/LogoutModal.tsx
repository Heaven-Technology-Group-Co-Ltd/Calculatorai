"use client";

import React, { useRef, useEffect } from "react";
import { LogOut } from "lucide-react";
import type { Lang } from "@/types/locale";
import styles from "./Sidebar.module.css";
import { useBackdropClose } from "@/lib/dialog-backdrop";

export interface LogoutModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  lang: Lang;
}

export function LogoutModal({ show, onClose, onConfirm, lang }: LogoutModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (show) {
      if (typeof dialog.showModal === "function" && !dialog.open) {
        dialog.showModal();
      }
    } else {
      if (typeof dialog.close === "function" && dialog.open) {
        dialog.close();
      }
    }
    return () => {
      if (typeof dialog?.close === "function" && dialog.open) {
        dialog.close();
      }
    };
  }, [show]);

  const backdropClose = useBackdropClose(onClose);

return (
    <dialog
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
      className={styles.modalCard}
      onMouseDown={backdropClose.onMouseDown}
      onClick={backdropClose.onClick}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className={styles.modalIconWrap}>
        <LogOut size={24} color="var(--error)" />
      </div>
      <h3 id="logout-modal-title" className={styles.modalTitle}>
        {lang === "th" ? "ยืนยันการออกจากระบบ" : "Confirm Sign Out"}
      </h3>
      <p className={styles.modalText}>
        {lang === "th"
          ? "คุณแน่ใจหรือว่าต้องการออกจากระบบบัญชีนี้?"
          : "Are you sure you want to sign out of your account?"}
      </p>
      <div className={styles.modalBtnRow}>
        <button
          type="button"
          onClick={onClose}
          className={styles.cancelBtn}
        >
          {lang === "th" ? "ยกเลิก" : "Cancel"}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={styles.signOutConfirmBtn}
        >
          {lang === "th" ? "ออกจากระบบ" : "Sign Out"}
        </button>
      </div>
    </dialog>
  );
}
