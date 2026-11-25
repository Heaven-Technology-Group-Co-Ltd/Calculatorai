"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Check, X, Loader2, ArrowLeft, ArrowRight, ShieldAlert } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import styles from "./Verify.module.css";

/* ─── animation presets ─── */
const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const iconPop = {
  hidden: { scale: 0, rotate: -20 },
  visible: (delay: number) => ({
    scale: 1,
    rotate: 0,
    transition: { type: "spring" as const, stiffness: 180, damping: 14, delay },
  }),
};

const fadeUp = (delay: number) => ({
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, delay, ease: "easeOut" as const } },
});

const COUNTDOWN_SECONDS = 5;

export function VerifyClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const called = useRef(false);
  const { t, language: lang } = useLanguage();

  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const isValid = !!(token && email);

  const [status, setStatus] = useState<"loading" | "success" | "error">(isValid ? "loading" : "error");
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

  /* ─── call verify API ─── */
  useEffect(() => {
    if (!isValid || called.current) return;
    called.current = true;

    void (async () => {
      try {
        const res = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, email }),
        });
        const data = await res.json();

        if (res.ok && data.success) {
          setStatus("success");
          setMessage("");
        } else {
          setStatus("error");
          setMessage(data.error || t("verifyFailedDesc"));
        }
      } catch {
        setStatus("error");
        setMessage(t("verifyFailedDesc"));
      }
    })();
  }, [isValid, token, email]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── countdown redirect on success ─── */
  useEffect(() => {
    if (status !== "success") return;
    if (countdown <= 0) {
      router.replace("/");
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [status, countdown, router]);

  const goHome = useCallback(() => router.push("/"), [router]);
  const goSignUp = useCallback(() => router.push("/signup"), [router]);

  /* ─── State: Loading ─── */
  const renderLoading = () => (
    <motion.div
      className={styles.card}
      variants={scaleIn}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        className={`${styles.iconBox} ${styles.iconLoading}`}
        variants={iconPop}
        custom={0}
        initial="hidden"
        animate="visible"
      >
        <Loader2 size={28} color="var(--primary)" className="spin-animation" />
      </motion.div>

      <motion.h1
        className={`${styles.title} ${styles.titleLoading}`}
        variants={fadeUp(0.15)}
        initial="hidden"
        animate="visible"
      >
        {t("verifyTitle")}
      </motion.h1>

      <motion.p
        className={styles.desc}
        variants={fadeUp(0.25)}
        initial="hidden"
        animate="visible"
      >
        {t("verifyLoading")}
      </motion.p>

      {email && (
        <motion.div
          className={styles.emailChip}
          variants={fadeUp(0.35)}
          initial="hidden"
          animate="visible"
        >
          <Mail size={14} />
          {email}
        </motion.div>
      )}
    </motion.div>
  );

  /* ─── State: Success ─── */
  const renderSuccess = () => (
    <motion.div
      className={styles.card}
      variants={scaleIn}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        className={`${styles.iconBox} ${styles.iconSuccess}`}
        variants={iconPop}
        custom={0.1}
        initial="hidden"
        animate="visible"
      >
        <Check size={32} color="var(--success)" />
      </motion.div>

      <motion.h1
        role="status"
        className={`${styles.title} ${styles.titleSuccess}`}
        variants={fadeUp(0.2)}
        initial="hidden"
        animate="visible"
      >
        {t("verifySuccessTitle")}
      </motion.h1>

      <motion.p
        className={styles.desc}
        variants={fadeUp(0.3)}
        initial="hidden"
        animate="visible"
      >
        {t("verifySuccessDesc")}
      </motion.p>

      <motion.button
        className={styles.btnPrimary}
        onClick={goHome}
        aria-label={t("verifyGoHome")}
        variants={fadeUp(0.4)}
        initial="hidden"
        animate="visible"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        {t("verifyGoHome")}
        <ArrowRight size={16} />
      </motion.button>

      <motion.div
        className={styles.countdownRing}
        variants={fadeUp(0.5)}
        initial="hidden"
        animate="visible"
      >
        <Loader2 size={14} className="spin-animation" color="var(--text-secondary)" />
        {lang === "th"
          ? `นำทางอัตโนมัติใน ${countdown} วินาที...`
          : lang === "jp"
          ? `${countdown}秒後に自動的に移動します...`
          : lang === "ch"
          ? `${countdown}秒后自动跳转...`
          : lang === "ko"
          ? `${countdown}초 후 자동 이동...`
          : `Auto-redirect in ${countdown}s...`}
      </motion.div>
    </motion.div>
  );

  /* ─── State: Error ─── */
  const renderError = () => (
    <motion.div
      className={styles.card}
      variants={scaleIn}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        className={`${styles.iconBox} ${styles.iconError}`}
        variants={iconPop}
        custom={0.1}
        initial="hidden"
        animate="visible"
      >
        {isValid ? <X size={30} color="var(--error)" /> : <ShieldAlert size={30} color="var(--error)" />}
      </motion.div>

      <motion.h1
        role="alert"
        className={`${styles.title} ${styles.titleError}`}
        variants={fadeUp(0.2)}
        initial="hidden"
        animate="visible"
      >
        {t("verifyFailedTitle")}
      </motion.h1>

      <motion.p
        className={styles.desc}
        variants={fadeUp(0.3)}
        initial="hidden"
        animate="visible"
      >
        {message || (isValid ? t("verifyFailedDesc") : t("verifyNoToken"))}
      </motion.p>

      <motion.div
        className={styles.errorActions}
        variants={fadeUp(0.4)}
        initial="hidden"
        animate="visible"
      >
        <motion.button
          className={styles.btnPrimary}
          onClick={goHome}
          aria-label={t("verifyGoHome")}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <ArrowLeft size={16} />
          {t("verifyGoHome")}
        </motion.button>
        <motion.button
          className={styles.btnSecondary}
          onClick={goSignUp}
          aria-label={t("verifyGoSignUp")}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          {t("verifyGoSignUp")}
        </motion.button>
      </motion.div>
    </motion.div>
  );

  return (
    <div className={styles.shell}>
      <AnimatePresence mode="wait">
        {status === "loading" && <React.Fragment key="loading">{renderLoading()}</React.Fragment>}
        {status === "success" && <React.Fragment key="success">{renderSuccess()}</React.Fragment>}
        {status === "error" && <React.Fragment key="error">{renderError()}</React.Fragment>}
      </AnimatePresence>
    </div>
  );
}
