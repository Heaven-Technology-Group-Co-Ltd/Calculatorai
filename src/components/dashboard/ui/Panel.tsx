"use client";

import { type ReactNode } from "react";
import styles from "../styles/dashboard-blocks.module.css";

interface PanelProps {
  children: ReactNode;
  variant?: "glass" | "solid" | "outlined";
  padding?: "sm" | "md" | "lg";
  hover?: boolean;
  className?: string;
}

export function Panel({
  children,
  variant = "glass",
  padding = "md",
  hover = false,
  className = "",
}: PanelProps) {
  const cls = [
    styles.panel,
    styles[`panel_${variant}`],
    styles[`panel_pad_${padding}`],
    hover ? styles.panel_hover : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={cls}>{children}</div>;
}
