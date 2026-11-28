"use client";

import React from "react";
import Link from "next/link";
import { User } from "lucide-react";
import type { Lang } from "@/types/locale";
import styles from "./Sidebar.module.css";
import { useDialog } from "@/hooks/useDialog";

export interface ProfileModalProps {
  show: boolean;
  onClose: () => void;
  onSignOut: () => void;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    plan?: string | null;
    isAdmin?: boolean;
  };
  lang: Lang;
}

export function ProfileModal({ show, onClose, onSignOut, user, lang }: ProfileModalProps) {

  const { dialogRef, dialogProps } = useDialog({ open: show, onClose });
  const planNames: Record<string, string> = { free: lang === "th" ? "ฟรี" : "Free", basic: "Basic", pro: "Pro", enterprise: "Enterprise", monthly: lang === "th" ? "พรีเมียม" : "Premium", yearly: lang === "th" ? "พรีเมียม" : "Premium", lifetime: lang === "th" ? "ตลอดชีพ" : "Lifetime" };
  const planLabel = user.plan ? planNames[user.plan] ?? "—" : "—";

return (
    <dialog
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      className={styles.modalCard}
      {...dialogProps}
    >
      <div className={styles.profileModalHeader}>
        <div className={styles.largeAvatar}>
          {user.image ? (
            <img src={user.image} alt="Avatar" className={styles.avatarImage} />
          ) : (
            <User size={32} />
          )}
        </div>
        <h3 id="profile-modal-title" className={styles.modalTitle}>
          {user.name || (lang === "th" ? "ผู้ใช้งาน" : "User Profile")}
        </h3>
        <p className={`${styles.modalText} ${styles.profileEmail}`}>
          {user.email || ""}
        </p>
      </div>

      <div className={styles.profileDetailList}>
        <div className={styles.profileDetailItem}>
          <span className={styles.detailLabel}>{lang === "th" ? "ชื่อบัญชี:" : "Name:"}</span>
          <span className={styles.detailValue}>{user.name || "-"}</span>
        </div>
        <div className={styles.profileDetailItem}>
          <span className={styles.detailLabel}>{lang === "th" ? "อีเมล:" : "Email:"}</span>
          <span className={styles.detailValue}>{user.email || "-"}</span>
        </div>
        <div className={styles.profileDetailItem}>
          <span className={styles.detailLabel}>{lang === "th" ? "แพ็กเกจ:" : "Plan:"}</span>
          <span className={styles.detailValue}>{planLabel}</span>
        </div>
        <div className={styles.profileDetailItem}>
          <span className={styles.detailLabel}>{lang === "th" ? "สถานะบัญชี:" : "Status:"}</span>
          <span className={`${styles.detailValue} ${styles.profileActive}`}>
            ● {lang === "th" ? "เข้าสู่ระบบอยู่" : "Active"}
          </span>
        </div>
      </div>

      {user.isAdmin === true && <Link className={styles.cancelBtn} href="/dashboard" onClick={onClose}>{lang === "th" ? "แดชบอร์ดผู้ดูแล" : "Admin Dashboard"}</Link>}
      <div className={`${styles.modalBtnRow} ${styles.profileActions}`}>
        <button
          type="button"
          onClick={onClose}
          className={styles.cancelBtn}
        >
          {lang === "th" ? "ปิด" : "Close"}
        </button>
        <button
          type="button"
          onClick={onSignOut}
          className={styles.signOutConfirmBtn}
        >
          {lang === "th" ? "ออกจากระบบ" : "Sign Out"}
        </button>
      </div>
    </dialog>
  );
}
