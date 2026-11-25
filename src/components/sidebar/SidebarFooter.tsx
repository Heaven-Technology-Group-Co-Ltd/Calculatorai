"use client";

import React from "react";
import { motion } from "framer-motion";
import { History, Info, Sparkles } from "lucide-react";
import { AuthButton } from "@/components/AuthButton";
import { uiTranslations } from "@/lib/translations";
import type { Lang } from "@/types/locale";
import { SidebarNavItem, navItemSpring, navItemTap } from "@/components/sidebar/SidebarNavItem";
import styles from "./SidebarFooter.module.css";

export interface SidebarFooterProps {
  lang: Lang;
  historyCount: number;
  onShowHistory: () => void;
  onShowInfo: () => void;
}

const SidebarFooterInner: React.FC<SidebarFooterProps> = ({
  lang,
  historyCount,
  onShowHistory,
  onShowInfo,
}) => {
  return (
    <div className="sidebar-footer">
      {/* Divider */}
      <div className={styles.divider} />

      {/* Section label */}
      <div
        className={`nav-section-label ${styles.sectionLabel}`}
      >
        {uiTranslations.settingsLabel[lang]}
      </div>

      {/* Premium / Upgrade */}
      <SidebarNavItem
        icon={<Sparkles size={16} />}
        label={uiTranslations.premiumLabel?.[lang] ?? "Premium"}
        onClick={() => {
          if (typeof window !== "undefined") window.location.href = "/purchase";
        }}
        activeColor="var(--primary)"
        leftGlow
        showDot
        dotColor="var(--primary)"
      />

      {/* History */}
      <SidebarNavItem
        icon={<History size={16} />}
        label={uiTranslations.history[lang]}
        onClick={onShowHistory}
        badge={
          historyCount > 0 ? (
            <motion.span
              className="history-badge"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 18 }}
            >
              {historyCount}
            </motion.span>
          ) : undefined
        }
      />

      {/* Info */}
      <SidebarNavItem
        icon={<Info size={16} />}
        label={uiTranslations.infoLabel[lang]}
        onClick={onShowInfo}
      />

      {/* Auth */}
      <AuthButton />
    </div>
  );
};

export const SidebarFooter = React.memo(SidebarFooterInner);
