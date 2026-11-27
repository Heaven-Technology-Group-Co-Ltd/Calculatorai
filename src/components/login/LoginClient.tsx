"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, LogIn, Loader2, AlertCircle, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { apiPost } from "@/lib/api-client";
import styles from "./Login.module.css";

/* ─── animation presets ─── */
const fadeSlideUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.1, ease: "easeOut" as const },
  }),
};

export function LoginClient() {
  const router = useRouter();
  const { language: lang, t: tr } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"signin" | "forgot">("signin");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError(tr("loginErrorRequired"));
      return;
    }

    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error === "USER_BANNED") {
          setError(
            lang === "th"
              ? "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ"
              : "This account has been banned. Please contact support."
          );
          setShowResend(false);
        } else if (result.error === "EMAIL_UNVERIFIED") {
          setError(
            lang === "th"
              ? "บัญชีนี้ยังไม่ได้ยืนยันอีเมล กรุณาตรวจสอบกล่องจดหมายของคุณ"
              : "Please verify your email address before signing in."
          );
          setShowResend(true);
        } else {
          setError(tr("loginErrorFailed"));
          setShowResend(false);
        }
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError(tr("loginErrorFailed"));
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) return;
    setResendLoading(true);
    try {
      await apiPost("/api/auth/register", { email: email.trim(), password: crypto.randomUUID(), name: "" });
      setResendSent(true);
    } catch {
      setResendSent(true);
    } finally {
      setResendLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    await signIn("google", { callbackUrl: "/" });
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    setError(null);
    try {
      await apiPost("/api/auth/forgot-password", { email: forgotEmail });
      setForgotSent(true);
    } catch {
      setError(lang === "th" ? "เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย" : "Network error. Unable to reach server.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className={styles.shell}>
      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        {/* ── Calculator Display Strip ── */}
        <div className={styles.display}>
          <motion.div
            className={styles.displayPrompt}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{ delay: 0.15, duration: 0.3 }}
          >
            {tr("loginDisplayPrompt")}
          </motion.div>
          <motion.div
            className={styles.displayStatus}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.4, ease: "easeOut" }}
          >
            {mode === "signin" ? tr("loginTitle") : tr("loginForgotPassword")}
            <span className={styles.displayCursor} />
          </motion.div>
        </div>

        {/* ── Form Body ── */}
        <div className={styles.body}>
          <AnimatePresence mode="wait">
            {mode === "signin" ? (
              <motion.div
                key="signin-view"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.25 }}
              >
                <form onSubmit={handleSubmit}>
                  {/* Error */}
                  {error && (
                    <motion.div
                      role="alert"
                      className={`${styles.messageBox} ${styles.messageError}`}
                      variants={fadeSlideUp}
                      custom={0}
                      initial="hidden"
                      animate="visible"
                    >
                      <AlertCircle size={14} />
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%" }}>
                        <span>{error}</span>
                        {showResend && (
                          <div style={{ marginTop: 4 }}>
                            {resendSent ? (
                              <span style={{ color: "var(--success)", fontWeight: 500 }}>
                                {lang === "th" ? "ส่งอีเมลยืนยันใหม่แล้ว กรุณาตรวจสอบกล่องจดหมาย" : "Verification email resent! Check your inbox."}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={handleResend}
                                disabled={resendLoading}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "var(--primary)",
                                  cursor: "pointer",
                                  textDecoration: "underline",
                                  padding: 0,
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              >
                                {resendLoading
                                  ? (lang === "th" ? "กำลังส่ง..." : "Sending...")
                                  : (lang === "th" ? "ส่งอีเมลยืนยันซ้ำ" : "Resend verification email")}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Email */}
                  <motion.div
                    className={styles.field}
                    variants={fadeSlideUp}
                    custom={1}
                    initial="hidden"
                    animate="visible"
                  >
                    <label className={styles.label} htmlFor="login-email">
                      {tr("loginEmailLabel")}
                    </label>
                    <input
                      id="login-email"
                      className={`${styles.input} ${error ? styles.inputError : ""}`}
                      type="email"
                      placeholder="hello@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      disabled={loading || googleLoading}
                    />
                  </motion.div>

                  {/* Password */}
                  <motion.div
                    className={styles.field}
                    variants={fadeSlideUp}
                    custom={2}
                    initial="hidden"
                    animate="visible"
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <label className={styles.label} htmlFor="login-password">
                        {tr("loginPasswordLabel")}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setMode("forgot");
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--primary, #E8B896)",
                          cursor: "pointer",
                          fontSize: "0.75rem",
                          padding: 0,
                        }}
                      >
                        {tr("loginForgotPassword")}
                      </button>
                    </div>
                    <div style={{ position: "relative" }}>
                      <input
                        id="login-password"
                        className={`${styles.input} ${error ? styles.inputError : ""}`}
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        disabled={loading || googleLoading}
                        style={{ paddingRight: 36 }}
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                        aria-pressed={showPassword}
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: "absolute",
                          right: 8,
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          color: "var(--text-secondary)",
                          cursor: "pointer",
                          padding: 4,
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </motion.div>

                  {/* Submit */}
                  <motion.div
                    variants={fadeSlideUp}
                    custom={3}
                    initial="hidden"
                    animate="visible"
                  >
                    <button
                      type="submit"
                      className={styles.submitBtn}
                      disabled={loading || googleLoading}
                    >
                      {loading ? (
                        <>
                          <Loader2 size={18} className={styles.spinner} />
                          {tr("loginLoading")}
                        </>
                      ) : (
                        <>
                          <LogIn size={18} />
                          {tr("loginSubmit")}
                        </>
                      )}
                    </button>
                  </motion.div>
                </form>

                {/* Divider */}
                <motion.div
                  className={styles.divider}
                  variants={fadeSlideUp}
                  custom={4}
                  initial="hidden"
                  animate="visible"
                >
                  or
                </motion.div>

                {/* Google */}
                <motion.div
                  variants={fadeSlideUp}
                  custom={5}
                  initial="hidden"
                  animate="visible"
                >
                  <button
                    type="button"
                    className={styles.googleBtn}
                    onClick={handleGoogleSignIn}
                    disabled={loading || googleLoading}
                  >
                    {googleLoading ? (
                      <Loader2 size={18} className={styles.spinner} />
                    ) : (
                      <svg className={styles.googleIcon} viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                    )}
                    {tr("loginGoogle")}
                  </button>
                </motion.div>

                {/* Footer */}
                <motion.p
                  className={styles.footer}
                  variants={fadeSlideUp}
                  custom={6}
                  initial="hidden"
                  animate="visible"
                >
                  {tr("loginNoAccount")}{" "}
                  <Link href="/signup" className={styles.footerLink}>
                    {tr("loginSignUp")}
                  </Link>
                </motion.p>
              </motion.div>
            ) : (
              <motion.div
                key="forgot-view"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25 }}
                className={styles.forgotWrap}
              >
                {forgotSent ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <p className={styles.forgotSent}>
                      {tr("forgotPasswordSent")}
                    </p>
                    <button
                      type="button"
                      className={styles.forgotBack}
                      onClick={() => {
                        setMode("signin");
                        setForgotSent(false);
                        setForgotEmail("");
                      }}
                    >
                      <ArrowLeft size={14} />
                      {tr("forgotPasswordBack")}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {error && (
                      <div role="alert" className={`${styles.messageBox} ${styles.messageError}`}>
                        <AlertCircle size={14} />
                        {error}
                      </div>
                    )}
                    <p className={styles.forgotDesc}>
                      {tr("forgotPasswordDesc")}
                    </p>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="forgot-email">
                        {tr("loginEmailLabel")}
                      </label>
                      <input
                        id="forgot-email"
                        className={styles.input}
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder={tr("signUpEmailPlaceholder")}
                        autoComplete="email"
                        disabled={forgotLoading}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className={styles.forgotBtn}
                      disabled={forgotLoading}
                    >
                      {forgotLoading ? (
                        <>
                          <Loader2 size={16} className={styles.spinner} />
                          Sending...
                        </>
                      ) : (
                        tr("forgotPasswordSend")
                      )}
                    </button>

                    <button
                      type="button"
                      className={styles.forgotBack}
                      onClick={() => {
                        setMode("signin");
                        setForgotSent(false);
                        setForgotEmail("");
                      }}
                    >
                      <ArrowLeft size={14} />
                      {tr("forgotPasswordBack")}
                    </button>
                  </form>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
