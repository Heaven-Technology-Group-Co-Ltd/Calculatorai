"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { apiPost } from "@/lib/api-client";
import { PASSWORD_POLICY, isWithinPasswordByteLimit } from "@/lib/validation/vocabulary";
import styles from "./ResetPassword.module.css";
import { FormField } from "@/components/ui/FormField";

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
    if (password.length < PASSWORD_POLICY.minChars) {
      setError(t("signUpPasswordError"));
      return;
    }
    if (!isWithinPasswordByteLimit(password)) {
      setError(`Password must be at most ${PASSWORD_POLICY.maxBytes} bytes`);
      return;
    }
    if (password !== confirmPassword) {
      setError(t("signUpPasswordMismatch"));
      return;
    }

    setSubmitting(true);
    try {
      await apiPost("/api/auth/reset-password", { token, email, password });
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
          <Link href="/login" className={`${styles.submitBtn} ${styles.backLink}`}>
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
          <div id="reset-form-error" role="alert" className={`${styles.messageBox} ${styles.messageError}`}>{error}</div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <FormField
            id="reset-new-password"
            label={<><Lock size={16} aria-hidden="true" focusable="false" />{t("signUpPasswordLabel")}</>}
            labelClassName={styles.label}
            fieldClassName={styles.inputGroup}
            className={styles.input}
            invalid={Boolean(error)}
            describedById={error ? "reset-form-error" : undefined}
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("signUpPasswordPlaceholder")}
            autoComplete="new-password"
            endAdornment={<button
              type="button"
              className={styles.passwordAdornment}
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff size={16} aria-hidden="true" focusable="false" /> : <Eye size={16} aria-hidden="true" focusable="false" />}
            </button>}
          />

          <FormField
            id="reset-confirm-password"
            label={<><Lock size={16} aria-hidden="true" focusable="false" />{t("signUpConfirmPasswordLabel")}</>}
            labelClassName={styles.label}
            fieldClassName={styles.inputGroup}
            className={styles.input}
            invalid={Boolean(error)}
            describedById={error ? "reset-form-error" : undefined}
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={t("signUpConfirmPasswordPlaceholder")}
            autoComplete="new-password"
          />

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
