"use client";

import React, { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Mail, Lock, User, CheckCircle, Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { uiTranslations } from "@/lib/translations";
import { useLanguage } from "@/lib/LanguageContext";
import { apiPost } from "@/lib/api-client";
import { PASSWORD_POLICY, isWithinPasswordByteLimit } from "@/lib/validation/vocabulary";
import styles from "./SignUp.module.css";
import fieldStyles from "@/components/ui/FormField.module.css";

/* ─── animation presets ─── */
const fadeSlideUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" as const },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: "easeOut" as const } },
};

type SignUpField = "name" | "email" | "password" | "confirm";

export function signupFieldInvalid(field: SignUpField, value: string, message: string | null): boolean {
  if (!message) return false;
  const normalizedMessage = message.toLowerCase();
  if (normalizedMessage.includes("fill in all fields") || normalizedMessage.includes("กรุณากรอกข้อมูล")) return !value.trim();
  if (normalizedMessage.includes("password") || normalizedMessage.includes("รหัสผ่าน")) {
    return field === "password" || (field === "confirm" && (normalizedMessage.includes("match") || normalizedMessage.includes("ตรงกัน")));
  }
  if (normalizedMessage.includes("email") || normalizedMessage.includes("อีเมล")) return field === "email";
  return field === "email";
}

export function SignUpClient() {
  const { data: session } = useSession();
  const router = useRouter();
  const { language: lang } = useLanguage();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  /* ─── redirect if already logged in ─── */
  useEffect(() => {
    if (session) router.replace("/");
  }, [session, router]);

  /* ─── t helper ─── */
  const t = (key: keyof typeof uiTranslations) => uiTranslations[key][lang];
  const formError = message?.type === "error" ? message.text : null;
  const nameInvalid = signupFieldInvalid("name", name, formError);
  const emailInvalid = signupFieldInvalid("email", email, formError);
  const passwordInvalid = signupFieldInvalid("password", password, formError);
  const confirmationInvalid = signupFieldInvalid("confirm", confirmPassword, formError);

  /* ─── submit handler ─── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!name.trim() || !email.trim() || !password.trim()) {
      setMessage({ type: "error", text: lang === "th" ? "กรุณากรอกข้อมูลให้ครบทุกช่อง" : "Please fill in all fields" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setMessage({ type: "error", text: lang === "th" ? "กรุณากรอกอีเมลให้ถูกต้อง" : "Enter a valid email address" });
      return;
    }
    if (password.length < PASSWORD_POLICY.minChars) {
      setMessage({ type: "error", text: lang === "th" ? "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" : "Password must be at least 8 characters" });
      return;
    }
    if (!isWithinPasswordByteLimit(password)) {
      setMessage({ type: "error", text: lang === "th" ? `รหัสผ่านต้องมีขนาดไม่เกิน ${PASSWORD_POLICY.maxBytes} ไบต์` : `Password must be at most ${PASSWORD_POLICY.maxBytes} bytes` });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ type: "error", text: uiTranslations.signUpPasswordMismatch?.[lang] ?? "Passwords do not match" });
      return;
    }

    setLoading(true);
    try {
      await apiPost("/api/auth/register", { name, email, password });

      setMessage({ type: "success", text: "" });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  /* ─── Loading spinner ─── */
  if (session === undefined) {
    return (
      <div className={styles.shell}>
        <div className={styles.loadingWrap}>
          <Loader2 size={28} className="spin-animation" color="var(--primary)" />
          <span>{t("loading")}</span>
        </div>
      </div>
    );
  }

  /* ─── Success state ─── */
  if (message?.type === "success") {
    return (
      <div className={styles.shell}>
        <motion.div
          className={styles.card}
          variants={scaleIn}
          initial="hidden"
          animate="visible"
        >
          <div className={styles.successOverlay}>
            <motion.div
              className={styles.successIcon}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
            >
              <CheckCircle size={36} color="var(--success)" />
            </motion.div>
            <motion.h1
              role="status"
              className={styles.successTitle}
              variants={fadeSlideUp}
              custom={0}
              initial="hidden"
              animate="visible"
            >
              {t("signUpSuccessTitle")}
            </motion.h1>
            <motion.p
              className={styles.successDesc}
              variants={fadeSlideUp}
              custom={1}
              initial="hidden"
              animate="visible"
            >
              {t("signUpSuccessDesc")}
            </motion.p>
            <motion.button
              className={styles.submitBtn}
              style={{ marginTop: 20, maxWidth: 260 }}
              onClick={() => router.push("/")}
              variants={fadeSlideUp}
              custom={2}
              initial="hidden"
              animate="visible"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <ArrowLeft size={16} />
              {t("verifyGoHome")}
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ─── Main form ─── */
  return (
    <div className={styles.shell}>
      <motion.div
        className={styles.card}
        variants={scaleIn}
        initial="hidden"
        animate="visible"
      >
        {/* ── Header ── */}
        <motion.div className={styles.header} variants={fadeSlideUp} custom={0} initial="hidden" animate="visible">
          <div className={styles.iconCircle}>
            <UserPlus size={24} color="var(--primary)" />
          </div>
          <h1 className={styles.title}>{t("signUpTitle")}</h1>
          <p className={styles.subtitle}>{t("signUpSubtitle")}</p>
        </motion.div>

        {/* ── Form ── */}
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {/* Name field */}
          <motion.div className={styles.inputGroup} variants={fadeSlideUp} custom={1} initial="hidden" animate="visible">
            <label className={styles.inputLabel} htmlFor="signup-name">
              <User size={12} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
              {t("signUpNameLabel")}
            </label>
            <input
              id="signup-name"
              className={`${styles.inputField} ${nameInvalid ? fieldStyles.inputError : ""}`}
              aria-invalid={nameInvalid}
              aria-describedby={nameInvalid ? "signup-form-error" : undefined}
              type="text"
              placeholder={t("signUpNamePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              disabled={loading}
            />
          </motion.div>

          {/* Email field */}
          <motion.div className={styles.inputGroup} variants={fadeSlideUp} custom={2} initial="hidden" animate="visible">
            <label className={styles.inputLabel} htmlFor="signup-email">
              <Mail size={12} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
              {t("signUpEmailLabel")}
            </label>
            <input
              id="signup-email"
              className={`${styles.inputField} ${emailInvalid ? fieldStyles.inputError : ""}`}
              aria-invalid={emailInvalid}
              aria-describedby={emailInvalid ? "signup-form-error" : undefined}
              type="email"
              placeholder={t("signUpEmailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={loading}
            />
          </motion.div>

          {/* Password field */}
          <motion.div className={styles.inputGroup} variants={fadeSlideUp} custom={3} initial="hidden" animate="visible">
            <label className={styles.inputLabel} htmlFor="signup-password">
              <Lock size={12} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
              {t("signUpPasswordLabel")}
            </label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                id="signup-password"
                className={`${styles.inputField} ${passwordInvalid ? fieldStyles.inputError : ""}`}
                aria-invalid={passwordInvalid}
                aria-describedby={passwordInvalid ? "signup-form-error" : undefined}
                type={showPassword ? "text" : "password"}
                placeholder={t("signUpPasswordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={PASSWORD_POLICY.minChars}
                disabled={loading}
                style={{ paddingRight: 36 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                aria-pressed={showPassword}
                style={{
                  position: "absolute", right: 8, background: "none", border: "none",
                  color: "var(--text-secondary)", cursor: "pointer", padding: 4, display: "flex"
                }}
              >
                {showPassword ? <EyeOff size={16} aria-hidden="true" focusable="false" /> : <Eye size={16} aria-hidden="true" focusable="false" />}
              </button>
            </div>
          </motion.div>

          {/* Confirm Password field */}
          <motion.div className={styles.inputGroup} variants={fadeSlideUp} custom={4} initial="hidden" animate="visible">
            <label className={styles.inputLabel} htmlFor="signup-confirm">
              <Lock size={12} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
              {t("signUpConfirmPasswordLabel")}
            </label>
            <input
              id="signup-confirm"
              className={`${styles.inputField} ${confirmationInvalid ? fieldStyles.inputError : ""}`}
              aria-invalid={confirmationInvalid}
              aria-describedby={confirmationInvalid ? "signup-form-error" : undefined}
              type={showPassword ? "text" : "password"}
              placeholder={t("signUpConfirmPasswordPlaceholder")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              minLength={PASSWORD_POLICY.minChars}
              disabled={loading}
            />
          </motion.div>

          {/* Error message */}
          <AnimatePresence>
            {message?.type === "error" && (
              <motion.div
                id="signup-form-error"
                role="alert"
                className={`${styles.messageBox} ${styles.messageError}`}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit button */}
          <motion.button
            className={styles.submitBtn}
            type="submit"
            disabled={loading}
            variants={fadeSlideUp}
            custom={5}
            initial="hidden"
            animate="visible"
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="spin-animation" />
                {t("signUpBtnLoading")}
              </>
            ) : (
              t("signUpBtn")
            )}
          </motion.button>
        </form>

        {/* Divider */}
        <motion.div className={styles.divider} variants={fadeSlideUp} custom={6} initial="hidden" animate="visible">
          <span className={styles.dividerText}>
            {lang === "th" ? "หรือ" : lang === "jp" ? "または" : lang === "ch" ? "或" : lang === "ko" ? "또는" : "OR"}
          </span>
        </motion.div>

        {/* Google sign-in */}
        <motion.button
          className={styles.googleBtn}
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/" })}
          variants={fadeSlideUp}
          custom={7}
          initial="hidden"
          animate="visible"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
        >
          <svg className={styles.googleIcon} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09a6.6 6.6 0 0 1-.35-2.09c0-.73.12-1.44.35-2.09V7.12H2.18a11 11 0 0 0 0 9.76l3.66-2.79z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.9 10.9 0 0 0 12 1a10.98 10.98 0 0 0-9.82 6.12l3.66 2.79A6.6 6.6 0 0 1 12 5.38z"/>
          </svg>
          {t("signUpGoogle")}
        </motion.button>

        {/* Footer */}
        <motion.p className={styles.footer} variants={fadeSlideUp} custom={8} initial="hidden" animate="visible">
          {t("signUpHasAccount")}{" "}
          <Link href="/login" className={styles.footerLink}>
            {t("signUpSignIn")}
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
