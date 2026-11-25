"use client";

import React, { useCallback } from "react";
import { motion } from "framer-motion";
import styles from "./SidebarNavItem.module.css";

// ─── Smooth Spring Config (shared across all SidebarNavItems) ───────────────
export const navItemSpring = { type: "spring" as const, stiffness: 350, damping: 28, mass: 0.5 };
export const navItemTap = { type: "spring" as const, stiffness: 500, damping: 30, mass: 0.4 };
export const dotSpring = { type: "spring" as const, stiffness: 400, damping: 22, mass: 0.6 };

export interface SidebarNavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  activeColor?: string;
  showDot?: boolean;
  dotColor?: string;
  dotInactiveColor?: string;
  dotShadow?: string;
  badge?: React.ReactNode;
  leftGlow?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}

const SidebarNavItemInner: React.FC<SidebarNavItemProps> = ({
  icon,
  label,
  isActive = false,
  activeColor,
  showDot = false,
  dotColor,
  dotInactiveColor = "var(--text-secondary)",
  dotShadow,
  badge,
  leftGlow = false,
  onClick,
  className = "",
  style,
  id,
}) => {
  const resolvedDotColor = dotColor || activeColor;
  const resolvedBg = activeColor || "var(--level-color)";

  // ── CSS custom properties for dynamic theming (single style source) ──
  const cssVars = {
    "--nav-color": resolvedBg,
    "--nav-glow-shadow": isActive ? `0 0 8px ${resolvedBg}, 0 0 16px ${resolvedBg}50` : "none",
    "--nav-dot-shadow": isActive
      ? (dotShadow || `0 0 8px ${resolvedDotColor}, 0 0 16px ${resolvedDotColor}40`)
      : "none",
    "--nav-dot-bg": isActive ? (resolvedDotColor ?? "var(--primary)") : dotInactiveColor,
    ...style,
  } as React.CSSProperties;

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
    },
    [onClick],
  );

  return (
    <motion.button
      id={id}
      className={`sidebar-nav-item ${isActive ? "active" : ""} ${styles.navItemBtn} ${className}`}
      onClick={handleClick}
      whileHover={navItemSpring}
      whileTap={navItemTap}
      style={cssVars}
    >
      {/* ── Left border glow indicator ── */}
      {leftGlow && (
        <motion.span
          className={`nav-item-glow-bar ${styles.glowBar}`}
          animate={{
            opacity: isActive ? 1 : 0,
            boxShadow: isActive
              ? `0 0 8px ${resolvedBg}, 0 0 16px ${resolvedBg}50`
              : "none",
          }}
          transition={dotSpring}
        />
      )}

      {/* ── Hover background glow overlay ── */}
      {leftGlow && (
        <motion.span
          className={styles.hoverBg}
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 0.05 }}
          transition={{ duration: 0.2 }}
        />
      )}

      {/* ── Icon ── */}
      <span className={styles.navIcon} style={{ color: (isActive && resolvedBg) ? resolvedBg : undefined }}>
        {icon}
      </span>

      {/* ── Label ── */}
      <span className="navLabel">{label}</span>

      {/* ── Badge ── */}
      {badge}

      {/* ── Active Dot Indicator ── */}
      {showDot && (
        <motion.span
          className={`nav-item-dot ${styles.navDot}`}
          animate={{
            boxShadow: isActive
              ? (dotShadow || `0 0 8px ${resolvedDotColor}, 0 0 16px ${resolvedDotColor}40`)
              : "none",
            scale: isActive ? 1.2 : 0.9,
          }}
          transition={dotSpring}
        />
      )}
    </motion.button>
  );
};

export const SidebarNavItem = React.memo(SidebarNavItemInner);
