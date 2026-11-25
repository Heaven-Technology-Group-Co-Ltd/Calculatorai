"use client";

import { useState, useEffect, useRef } from "react";
import type { DashboardUser } from "../hooks/useUsers";
import { useDashboardT } from "../i18n/useDashboardT";
import styles from "../styles/dashboard-modals.module.css";
import { useBackdropClose } from "@/lib/dialog-backdrop";

interface PlanChangeModalProps {
  user: DashboardUser;
  onClose: () => void;
  onSuccess: () => void;
}

const PLANS = [
  { value: "basic", label: "Basic" },
  { value: "pro", label: "Pro" },
  { value: "enterprise", label: "Enterprise" },
];

export function PlanChangeModal({ user, onClose, onSuccess }: PlanChangeModalProps) {
  const { t } = useDashboardT();
  const [selectedPlan, setSelectedPlan] = useState(user.plan);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
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

  const handleChange = async () => {
    if (submitting || selectedPlan === user.plan) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/users/${user.id}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan }),
      });
      if (!res.ok) throw new Error("Request failed");
      onSuccess();
      onClose();
    } catch {
      setError(t("dashboard.error.changePlanFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const isUnchanged = selectedPlan === user.plan;

  const planLabel = (value: string) => {
    switch (value) {
      case "basic": return t("dashboard.modal.plan.basic");
      case "pro": return t("dashboard.modal.plan.pro");
      case "enterprise": return t("dashboard.modal.plan.enterprise");
      default: return value;
    }
  };

  return (
    <dialog
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-modal-title"
      className={styles.modal}
      onMouseDown={backdropClose.onMouseDown}
      onClick={backdropClose.onClick}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className={styles.header}>
        <span id="plan-modal-title" className={styles.title}>
          {t("dashboard.modal.plan.forUser", { name: user.name ?? user.email })}
        </span>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
      </div>
      <div className={styles.body}>
        <div style={{ marginBottom: 6 }}>
          <span style={{ display: "block", fontSize: 13, color: "var(--text-secondary)", marginBottom: 6 }}>
            Current plan: <strong style={{ color: "var(--text)" }}>{planLabel(user.plan)}</strong>
          </span>
        </div>
        <select
          className={styles.modalSelect}
          aria-label={t("dashboard.modal.plan.title")}
          value={selectedPlan}
          onChange={(e) => setSelectedPlan(e.target.value)}
        >
          {PLANS.map((p) => (
            <option key={p.value} value={p.value}>
              {planLabel(p.value)}
            </option>
          ))}
        </select>

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
            className={styles.btnPrimary}
            onClick={handleChange}
            disabled={isUnchanged || submitting}
          >
            {submitting ? t("dashboard.modal.plan.changing") : t("dashboard.modal.plan.change")}
          </button>
        </div>
      </div>
    </dialog>
  );
}
