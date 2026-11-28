"use client";

import React, { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  BookOpen,
  GraduationCap,
  Building2,
  Check,
  Sparkles,
  Loader2,
  Shield,
  Zap,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { formulas } from "@/lib/formulas/registry";
import { apiPost } from "@/lib/api-client";
import styles from "./Purchase.module.css";

const plans = [
  {
    id: "monthly",
    name: { en: "Monthly Pro", th: "รายเดือนโปร" },
    price: { en: "$9.99", th: "$9.99" },
    period: { en: "/month", th: "/เดือน" },
    description: { en: "Full access to all calculators and formulas", th: "เข้าถึงเครื่องคิดเลขและสูตรทั้งหมด" },
    features: [
      { en: `${formulas.length}+ formulas & calculators`, th: `${formulas.length}+ สูตรและเครื่องคิดเลข` },
      { en: "Step-by-step solutions", th: "แสดงวิธีทำทีละขั้นตอน" },
      { en: "Multi-language support", th: "รองรับหลายภาษา" },
      { en: "Calculation history", th: "ประวัติการคำนวณ" },
    ],
    priceId: "price_monthly",
    highlighted: false,
    icon: BookOpen,
  },
  {
    id: "yearly",
    name: { en: "Yearly Premium", th: "รายปีพรีเมียม" },
    price: { en: "$79.99", th: "$79.99" },
    period: { en: "/year", th: "/ปี" },
    description: { en: "Everything in Pro + priority features", th: "ทุกอย่างในโปร + ฟีเจอร์เพิ่มเติม" },
    features: [
      { en: "Everything in Monthly Pro", th: "ทุกอย่างในรายเดือนโปร" },
      { en: "Advanced engineering tools", th: "เครื่องมือวิศวกรรมขั้นสูง" },
      { en: "Priority support", th: "การสนับสนุนระดับพรีiority" },
      { en: "Save 33% vs monthly", th: "ประหยัด 33% เทียบรายเดือน" },
    ],
    priceId: "price_yearly",
    highlighted: true,
    icon: Zap,
  },
  {
    id: "lifetime",
    name: { en: "Lifetime Access", th: "ตลอดชีพ" },
    price: { en: "$199", th: "$199" },
    period: { en: " once", th: "ครั้งเดียว" },
    description: { en: "One-time payment, lifetime access", th: "จ่ายครั้งเดียวใช้ได้ตลอดชีพ" },
    features: [
      { en: "Everything in Yearly Premium", th: "ทุกอย่างในรายปีพรีเมียม" },
      { en: "All future updates", th: "อัปเดตทั้งหมดในอนาคต" },
      { en: "Export & sharing", th: "ส่งออกและแชร์" },
      { en: "Commercial license", th: "ใบอนุญาตเชิงพาณิชย์" },
    ],
    priceId: "price_lifetime",
    highlighted: false,
    icon: Shield,
  },
];

export function PurchaseClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCanceled = searchParams.get("canceled") === "true";
  const { language: lang } = useLanguage();
  const [selectedPlan, setSelectedPlan] = useState<string>("yearly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePurchase = useCallback(async (planId: string) => {
    setSelectedPlan(planId);
    setLoading(true);
    setError(null);

    try {
      const plan = plans.find(p => p.id === planId);
      if (!plan) throw new Error("Invalid plan");

      const origin = window.location.origin;

      const checkout = await apiPost<{ url?: string }>("/api/payments/create-checkout-session", {
        planId, successUrl: `${origin}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}/purchase?canceled=true`,
      });
      if (!checkout.url) throw new Error("No checkout URL returned");
      window.location.href = checkout.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      
      setLoading(false);
    }
  }, []);

  return (
    <div className={styles.container}>
      {/* ── Back Button ── */}
      <button
        onClick={() => router.back()}
        className={styles.backBtn}
      >
        <ArrowLeft size={14} />
        {lang === "th" ? "ย้อนกลับ" : "Back"}
      </button>

      {/* ── Canceled Banner ── */}
      {isCanceled && (
        <div className={styles.canceledBanner} role="status">
          <AlertCircle size={18} className={styles.canceledIcon} />
          <span>
            {lang === "th"
              ? "การชำระเงินถูกยกเลิก คุณสามารถเลือกแพ็กเกจและลองใหม่อีกครั้งได้ตลอดเวลา"
              : "Payment was canceled. You can select a plan and try again anytime."}
          </span>
        </div>
      )}

      <div className={styles.header}>
        <h1>{lang === "th" ? "อัปเกรดเป็นพรีเมียม" : "Upgrade to Premium"}</h1>
        <p>{lang === "th" ? "ปลดล็อกขีดจำกัดเครื่องคิดเลขคณิตศาสตร์พรีเมียม" : "Unlock the full power of Premium Math Calculator"}</p>
      </div>

      {/* ── Plans Grid ── */}
      <div className={styles.planGrid}>
        {plans.map(pkg => {
          const Icon = pkg.icon;
          const isActive = selectedPlan === pkg.id;
          const planName = pkg.name[lang as "en" | "th"] || pkg.name.en;
          const planDesc = pkg.description[lang as "en" | "th"] || pkg.description.en;
          const planPeriod = pkg.period[lang as "en" | "th"] || pkg.period.en;

          return (
            <div
              key={pkg.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedPlan(pkg.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedPlan(pkg.id);
                }
              }}
              className={`${styles.planCard} ${pkg.highlighted ? styles.active : ""} ${loading ? styles.planCardDisabled : ""} ${isActive ? styles.planCardActive : ""}`}
              style={{
                transform: isActive ? "scale(0.97)" : "scale(1)",
              }}
            >
              {/* ── Highlight Background ── */}
              {pkg.highlighted && (
                <div
                  className={styles.highlightBg}
                  style={{
                    background: `radial-gradient(ellipse at top, var(--primary-subtle), transparent 70%)`,
                  }}
                />
              )}

              {/* ── Best Value Badge ── */}
              {pkg.highlighted && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={styles.bestValueBadge}
                >
                  <Sparkles size={10} style={{ marginRight: 4, display: "inline" }} />
                  {lang === "th" ? "คุ้มค่าที่สุด" : "Best Value"}
                </motion.div>
              )}

              {/* ── Loading Indicator ── */}
              {isActive && loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={styles.planLoadingIndicator}
                >
                  <Loader2 size={14} className="spin-animation" style={{ color: "var(--text)" }} />
                </motion.div>
              )}

              {/* ── Plan Header ── */}
              <div className={styles.planHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className={styles.planIconBox}>
                    <Icon size={20} color="var(--primary)" />
                  </div>
                  <span className={styles.planNameText}>
                    {planName}
                  </span>
                </div>
              </div>

              {/* ── Price ── */}
              <div className={styles.planPrice}>
                {pkg.price.en}
                <small>{planPeriod}</small>
              </div>

              {/* ── Description ── */}
              <div className={styles.planDesc}>
                {planDesc}
              </div>

              {/* ── Features ── */}
              <ul className={styles.planFeatures}>
                {pkg.features.map((f, i) => {
                  const featureText = f[lang as "en" | "th"] || f.en;
                  return (
                    <li key={i}><Check size={16} />{featureText}</li>
                  );
                })}
              </ul>

              {/* ── Select Card CTA (F-21) ── */}
              <span
                aria-hidden="true"
                className={`${styles.selectCardBtn} ${isActive ? styles.selectedCardBtn : ""}`}
              >
                {isActive ? (
                  <>
                    <Check size={16} />
                    {lang === "th" ? "เลือกแพ็กเกจนี้แล้ว" : "Selected"}
                  </>
                ) : (
                  lang === "th" ? `เลือก ${planName}` : `Select ${planName}`
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Single Checkout CTA (F-21) ── */}
      {(() => {
        const activePlan = plans.find((p) => p.id === selectedPlan) || plans[1];
        const aName = activePlan.name[lang as "en" | "th"] || activePlan.name.en;
        const aPrice = activePlan.price[lang as "en" | "th"] || activePlan.price.en;
        return (
          <div className={styles.checkoutActionWrap}>
            <button
              type="button"
              className={styles.checkoutSubmitBtn}
              disabled={loading}
              onClick={() => handlePurchase(activePlan.id)}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Loader2 size={18} className="spin-animation" />
                  {lang === "th" ? "กำลังนำทางไปหน้าชำระเงิน..." : "Redirecting to checkout..."}
                </span>
              ) : (
                <>
                  <Sparkles size={18} />
                  {lang === "th"
                    ? `ดำเนินการชำระเงิน (${aName} • ${aPrice})`
                    : `Proceed to Checkout (${aName} • ${aPrice})`}
                </>
              )}
            </button>
            <p className={styles.checkoutNote}>
              <Shield size={14} />
              {lang === "th"
                ? "ชำระเงินอย่างปลอดภัยด้วย Stripe • เข้ารหัส 256-bit"
                : "Secure checkout powered by Stripe • 256-bit encryption"}
            </p>
          </div>
        );
      })()}

      {/* ── Error ── */}
      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      {/* ── Loading Overlay ── */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={styles.loadingOverlay}
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className={styles.loadingIconBox}
          >
            <Loader2 size={32} color="var(--primary)" className="spin-animation" />
          </motion.div>
          <span className={styles.loadingTitle}>
            {lang === "th" ? "กำลังนำทางไปยังหน้าชำระเงินที่ปลอดภัย..." : "Redirecting to secure checkout..."}
          </span>
          <span className={styles.loadingSub}>
            {lang === "th" ? "ดำเนินการโดย Stripe" : "Powered by Stripe"}
          </span>
        </motion.div>
      )}
    </div>
  );
}
