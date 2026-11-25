"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import styles from "./ResetPassword.module.css";

const fadeSlideUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.35 } }),
};

export default function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";
  const { t } = useLanguage();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token || !email) {
    return (
      <div className={styles.shell}>
        <motion.div className={styles.card} variants={fadeSlideUp} custom={0} initial="hidden" animate="visible">
          <div className={styles.errorIcon}>!</div>
          <h2 className={styles.errorTitle}>{t("resetPasswordInvalid")}</h2>
          <Link href="/login" className={styles.backLink}>
            <ArrowLeft size={16} /> {t("signUpSignIn")}
          </Link>
        </motion.div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!password || !confirmPassword) {
      setError(t("loginErrorRequired"));
      return;
    }
    if (password.length < 8) {
      setError(t("signUpPasswordError"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("signUpPasswordMismatch"));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className={styles.shell}>
        <motion.div className={styles.card} variants={fadeSlideUp} custom={0} initial="hidden" animate="visible">
          <CheckCircle size={48} className={styles.successIcon} />
          <h2 className={styles.successTitle}>{t("resetPasswordSuccess")}</h2>
          <p className={styles.successDesc}>{t("resetPasswordSuccessDesc")}</p>
          <Link href="/login" className={styles.submitBtn} style={{ textAlign: "center", textDecoration: "none" }}>
            {t("signUpSignIn")}
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <motion.div className={styles.card} variants={fadeSlideUp} custom={0} initial="hidden" animate="visible">
        <div className={styles.header}>
          <h1 className={styles.title}>{t("forgotPasswordTitle")}</h1>
          <p className={styles.subtitle}>{t("resetPasswordSubtitle")}</p>
        </div>

        {error && (
          <div role="alert" className={`${styles.messageBox} ${styles.messageError}`}>{error}</div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="reset-new-password">{t("signUpPasswordLabel")}</label>
            <div className={styles.passwordWrap}>
              <Lock size={16} className={styles.inputIcon} />
              <input
                id="reset-new-password"
                type={showPassword ? "text" : "password"}
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("signUpPasswordPlaceholder")}
                autoComplete="new-password"
              />
              <button
                type="button"
                className={styles.toggleBtn}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="reset-confirm-password">{t("signUpConfirmPasswordLabel")}</label>
            <div className={styles.passwordWrap}>
              <Lock size={16} className={styles.inputIcon} />
              <input
                id="reset-confirm-password"
                type={showPassword ? "text" : "password"}
                className={styles.input}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("signUpConfirmPasswordPlaceholder")}
                autoComplete="new-password"
              />
            </div>
          </div>

          <button type="submit" disabled={submitting} className={styles.submitBtn}>
            {submitting ? <Loader2 size={18} className={styles.spinner} /> : null}
            {submitting ? t("resetPasswordResetting") : t("resetPasswordSubmit")}
          </button>
        </form>

        <Link href="/login" className={styles.backLink}>
          <ArrowLeft size={16} /> {t("signUpSignIn")}
        </Link>
      </motion.div>
    </div>
  );
}
