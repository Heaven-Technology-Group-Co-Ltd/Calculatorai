"use client";

import { useCallback, useState } from "react";
import { useDialog } from "@/hooks/useDialog";
import { useAction } from "@/hooks/useAction";
import { apiPost } from "@/lib/api-client";
import { FIELD_LIMITS } from "@/lib/validation/vocabulary";
import { ADMIN_ASSIGNABLE_PLANS } from "@/lib/plans";
import { useDashboardT } from "../i18n/useDashboardT";
import type { DashboardUser } from "../hooks/useUsers";
import styles from "../styles/dashboard-modals.module.css";

type UserAction = "ban" | "message" | "plan";
interface UserActionDialogProps { user: DashboardUser; action: UserAction; onClose: () => void; onSuccess: () => void }

export function UserActionDialog({ user, action, onClose, onSuccess }: UserActionDialogProps) {
  const { t } = useDashboardT();
  const [content, setContent] = useState("");
  const [plan, setPlan] = useState(user.plan);
  const isBanned = user.status === "banned";
  const { dialogRef, dialogProps } = useDialog({ open: true, onClose });
  const execute = useCallback(() => {
    if (action === "message") return apiPost(`/api/users/${user.id}/message`, { content: content.trim() });
    if (action === "plan") return apiPost(`/api/users/${user.id}/plan`, { plan });
    return apiPost(`/api/users/${user.id}/${isBanned ? "unban" : "ban"}`, isBanned ? undefined : { reason: content.trim() || undefined });
  }, [action, content, isBanned, plan, user.id]);
  const { submitting, error, run } = useAction(execute);
  const invalid = (action === "message" && !content.trim()) || (action === "plan" && plan === user.plan);
  const confirm = async () => {
    if (invalid || submitting) return;
    try { await run(); onSuccess(); onClose(); } catch { return; }
  };
  const title = action === "message" ? t("dashboard.modal.message.to", { name: user.name || user.email }) : action === "plan" ? t("dashboard.modal.plan.forUser", { name: user.name ?? user.email }) : isBanned ? t("dashboard.modal.ban.titleUnban") : t("dashboard.modal.ban.title");
  const submitLabel = action === "message" ? t("dashboard.modal.message.send") : action === "plan" ? t("dashboard.modal.plan.change") : isBanned ? t("dashboard.modal.ban.unban") : t("dashboard.modal.ban.ban");
  const maxLength = action === "ban" ? FIELD_LIMITS.banReason : FIELD_LIMITS.adminMessage;
  return (
    <dialog ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="user-action-title" className={styles.modal} {...dialogProps}>
      <div className={styles.header}>
        <span id="user-action-title" className={styles.title}>{title}</span>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
      </div>
      <div className={styles.body}>
        {action === "ban" && <p>{isBanned ? t("dashboard.modal.ban.descriptionUnban", { name: user.name ?? user.email }) : t("dashboard.modal.ban.description", { name: user.name ?? user.email })}</p>}
        {action === "plan" && <select className={styles.modalSelect} aria-label={t("dashboard.modal.plan.title")} value={plan} onChange={(event) => setPlan(event.target.value)}>{ADMIN_ASSIGNABLE_PLANS.map((option) => <option key={option} value={option}>{option}</option>)}</select>}
        {(action === "message" || (action === "ban" && !isBanned)) && <textarea className={styles.modalTextarea} aria-label={action === "ban" ? t("dashboard.modal.ban.reasonPlaceholder") : t("dashboard.modal.message.placeholder")} placeholder={action === "ban" ? t("dashboard.modal.ban.reasonPlaceholder") : t("dashboard.modal.message.placeholder")} value={content} onChange={(event) => setContent(event.target.value)} maxLength={maxLength} />}
        {action === "message" && <div className={styles.charCount}>{(maxLength - content.length).toLocaleString()} characters remaining</div>}
        {error && <div role="alert" style={{ color: "var(--error)" }}>{error}</div>}
        <div className={styles.actions}>
          <button type="button" className={styles.btnCancel} onClick={onClose}>{t("dashboard.modal.cancel")}</button>
          <button type="button" className={action === "ban" && !isBanned ? styles.btnDanger : styles.btnPrimary} onClick={confirm} disabled={invalid || submitting}>{submitting ? "…" : submitLabel}</button>
        </div>
      </div>
    </dialog>
  );
}
