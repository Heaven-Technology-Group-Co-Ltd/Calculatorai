"use client";

import React, { useRef, useEffect } from "react";
import { uiTranslations } from "@/lib/translations";
import type { Lang } from "@/types/locale";
import { AlertTriangle, X } from "lucide-react";
import styles from "./ConfirmModal.module.css";
import { useBackdropClose } from "@/lib/dialog-backdrop";

interface ConfirmModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  lang: Lang;
  title?: string;
  message?: string;
}

export function ConfirmModal({ show, onClose, onConfirm, lang, title, message }: ConfirmModalProps) {
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
      aria-labelledby="confirm-modal-title"
      className={`modal-container ${styles.container}`}
      onMouseDown={backdropClose.onMouseDown}
      onClick={backdropClose.onClick}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className={`modal-header ${styles.headerNoBorder}`}>
        <div className="confirm-icon">
          <AlertTriangle size={24} />
        </div>
        <button className="modal-close" onClick={onClose} aria-label={lang === "th" ? "ปิด" : "Close"}>
          <X size={16} />
        </button>
      </div>
      <div className={`modal-body ${styles.bodyCentered}`}>
        <div className="confirm-title" id="confirm-modal-title">
          {title || (lang === "th" ? "ล้างประวัติ?" : "Clear History?")}
        </div>
        <div className="confirm-message">
          {message || (lang === "th" ? "การกระทำนี้ไม่สามารถย้อนกลับได้" : "This action cannot be undone.")}
        </div>
        <div className="confirm-btn-row">
          <button type="button" className="cancel-btn-p" onClick={onClose}>
            {lang === "th" ? "ยกเลิก" : "Cancel"}
          </button>
          <button type="button" className="confirm-btn-p" onClick={onConfirm}>
            {uiTranslations.clearAll[lang]}
          </button>
        </div>
      </div>
    </dialog>
  );
}
