"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import styles from "./NotFound.module.css";

/* ─── animation presets ─── */
const fadeUp = (delay: number) => ({
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, delay, ease: "easeOut" as const } },
});

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.45, ease: "easeOut" as const } },
};

const resultReveal = {
  hidden: { opacity: 0, scale: 0.7, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 120, damping: 12, delay: 0.3 } },
};

export function NotFoundClient() {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <div className={styles.shell}>
      <motion.div
        className={styles.card}
        variants={scaleIn}
        initial="hidden"
        animate="visible"
      >
        {/* ── Calculator Display ── */}
        <div className={styles.display}>
          <motion.div
            className={styles.displayCalcLine}
            variants={fadeUp(0.05)}
            initial="hidden"
            animate="visible"
          >
            {t("notFoundCalc")}
          </motion.div>

          <motion.div
            className={styles.displayResult}
            variants={resultReveal}
            initial="hidden"
            animate="visible"
          >
            404
          </motion.div>

          <motion.div
            className={styles.displayErrTag}
            variants={fadeUp(0.5)}
            initial="hidden"
            animate="visible"
          >
            404
          </motion.div>
        </div>

        {/* ── Body ── */}
        <div className={styles.body}>
          <motion.div
            className={styles.domainTag}
            variants={fadeUp(0.6)}
            initial="hidden"
            animate="visible"
          >
            <span aria-hidden="true" className={styles.domainMark}>!</span>
            {" "}
            {t("notFoundDomain")}
          </motion.div>

          <motion.p
            className={styles.description}
            variants={fadeUp(0.72)}
            initial="hidden"
            animate="visible"
          >
            {t("notFoundDesc")}
          </motion.p>

          <motion.button
            className={styles.ctaBtn}
            onClick={() => router.push("/")}
            variants={fadeUp(0.84)}
            initial="hidden"
            animate="visible"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <ArrowLeft size={16} />
            {t("notFoundCTA")}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
