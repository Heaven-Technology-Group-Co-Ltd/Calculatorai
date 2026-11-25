"use client";

import styles from "../styles/dashboard-blocks.module.css";

interface SkeletonProps {
  variant?: "text" | "kpi" | "chart" | "panel";
  width?: number;
  height?: number;
}

export function Skeleton({ variant = "text", width, height }: SkeletonProps) {
  if (variant === "kpi") {
    return (
      <div className={styles.skeletonKpi}>
        <div className={`${styles.skeletonBlock} ${styles.skeletonShimmer}`} style={{ width: "60%", height: 14 }} />
        <div className={`${styles.skeletonBlock} ${styles.skeletonShimmer}`} style={{ width: "80%", height: 28, marginTop: 8 }} />
        <div className={`${styles.skeletonBlock} ${styles.skeletonShimmer}`} style={{ width: "40%", height: 12, marginTop: 8 }} />
      </div>
    );
  }

  if (variant === "chart") {
    return (
      <div
        className={`${styles.skeletonBlock} ${styles.skeletonShimmer}`}
        style={{ width: width ?? "100%", height: height ?? 200, borderRadius: 10 }}
      />
    );
  }

  if (variant === "panel") {
    return (
      <div className={styles.skeletonPanel}>
        <div className={`${styles.skeletonBlock} ${styles.skeletonShimmer}`} style={{ width: "40%", height: 16 }} />
        <div className={`${styles.skeletonBlock} ${styles.skeletonShimmer}`} style={{ width: "100%", height: 120, marginTop: 12 }} />
      </div>
    );
  }

  // text variant (default)
  return (
    <div
      className={`${styles.skeletonBlock} ${styles.skeletonShimmer}`}
      style={{ width: width ?? "100%", height: height ?? 14, borderRadius: 4 }}
    />
  );
}
