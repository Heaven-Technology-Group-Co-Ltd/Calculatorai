"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle, Loader2, XCircle, ArrowRight, Sparkles } from "lucide-react";
import styles from "./PurchaseSuccess.module.css";
import { apiGet, ClientApiError } from "@/lib/api-client";

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

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const verify = async (attempt: number) => {
      if (!sessionId) {
        setState("error");
        setErrorMsg("No session ID provided");
        return;
      }
      try {
        const paymentStatus = await apiGet<PaymentStatus>(`/api/payments/status?session_id=${encodeURIComponent(sessionId)}`);
        if (cancelled) return;
        setPayment(paymentStatus);
        if (paymentStatus.paymentStatus === "paid") { setState("succeeded"); return; }
        if (paymentStatus.paymentStatus !== "unpaid") { setState("error"); setErrorMsg("Error verifying payment"); return; }
        if (attempt < 3) { timer = setTimeout(() => void verify(attempt + 1), 1500); return; }
        setState("unpaid");
        setErrorMsg(`Payment status: ${paymentStatus.paymentStatus}`);
      } catch (failure) {
        if (cancelled) return;
        if (!(failure instanceof ClientApiError) && attempt < 3) { timer = setTimeout(() => void verify(attempt + 1), 1500); return; }
        setState("error");
        setErrorMsg(failure instanceof Error ? failure.message : "Something went wrong");
      }
    };
    timer = setTimeout(() => void verify(0), 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [sessionId]);

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
