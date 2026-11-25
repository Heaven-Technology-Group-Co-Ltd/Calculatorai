"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle, Loader2, XCircle, ArrowRight, Sparkles } from "lucide-react";
import styles from "./PurchaseSuccess.module.css";

type StatusState = "loading" | "succeeded" | "unpaid" | "error";

interface PaymentStatus {
  status: string;
  paymentStatus: string;
  amountTotal: number;
  currency?: string;
}

export function PurchaseSuccessClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [state, setState] = useState<StatusState>("loading");
  const [payment, setPayment] = useState<PaymentStatus | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const verifyPayment = useCallback(async function runVerify(attempt = 0) {
    if (!sessionId) {
      setState("error");
      setErrorMsg("No session ID provided");
      return;
    }
    try {
      const res = await fetch(`/api/payments/status?session_id=${encodeURIComponent(sessionId)}`);
      const data = await res.json();
      if (!res.ok) {
        setState("error");
        setErrorMsg(data.error || "Failed to verify payment");
        return;
      }
      const paymentData = data.data as PaymentStatus;
      setPayment(paymentData);
      const pStatus = paymentData.paymentStatus;
      if (pStatus === "paid") {
        setState("succeeded");
      } else if (pStatus === "unpaid") {
        if (attempt < 3) {
          setTimeout(() => void runVerify(attempt + 1), 1500);
        } else {
          setState("unpaid");
          setErrorMsg(`Payment status: ${pStatus}`);
        }
      } else {
        setState("error");
        setErrorMsg("Error verifying payment");
      }
    } catch (err) {
      if (attempt < 3) {
        setTimeout(() => void runVerify(attempt + 1), 1500);
      } else {
        setState("error");
        setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      }
    }
  }, [sessionId]);

  useEffect(() => {
    const timer = setTimeout(() => void verifyPayment(0), 300);
    return () => clearTimeout(timer);
  }, [verifyPayment]);

  const paidAmount = ((payment?.amountTotal ?? 0) / 100).toFixed(2);
  const currencyCode = (payment?.currency ?? "usd").toUpperCase();

  return (
    <div className={styles.container}>
      {/* ── Loading State ── */}
      {state === "loading" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={styles.stateWrap}
        >
          <div className={styles.iconBox}>
            <Loader2 size={40} color="var(--primary)" className="spin-animation" />
          </div>
          <h1 className={styles.titleSmall}>Verifying Payment</h1>
          <p className={styles.desc}>Please wait while we confirm your purchase...</p>
        </motion.div>
      )}

      {/* ── Success State ── */}
      {state === "succeeded" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={styles.stateWrap}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className={`${styles.iconBoxCircle} ${styles.iconBoxSuccess}`}
          >
            <CheckCircle size={48} color="var(--success)" />
          </motion.div>
          <h1 className={styles.title}>Payment Successful!</h1>
          <p className={styles.desc}>
            Welcome to Premium Math Calculator. Your premium features are now active.
          </p>

          {payment && (
            <div className={styles.paymentCard}>
              <div className={styles.paymentLabel}>Amount paid</div>
              <div className={styles.paymentAmount}>
                $${paidAmount} USD
              </div>
            </div>
          )}

          <div className={styles.btnRow}>
            <button onClick={() => router.push("/")} className={styles.btnPrimary}>
              <Sparkles size={16} />
              Start Calculating
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Error / Unpaid State ── */}
      {(state === "unpaid" || state === "error") && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={styles.stateWrap}
        >
          <div className={`${styles.iconBoxCircle} ${styles.iconBoxError}`}>
            <XCircle size={48} color="var(--error)" />
          </div>
          <h1 className={styles.title}>
            {state === "unpaid" ? "Payment Pending" : "Verification Failed"}
          </h1>
          <p className={styles.desc}>
            {errorMsg || "We encountered an issue verifying your payment."}
          </p>
          <div className={styles.btnRow}>
            <button onClick={() => router.push("/purchase")} className={styles.btnSecondary}>
              <ArrowRight size={16} />
              Try Again
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
