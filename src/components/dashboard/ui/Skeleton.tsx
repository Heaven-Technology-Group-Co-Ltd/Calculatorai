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
        <div className={`${styles.skeletonBlock} ${styles.skeletonShimmer} ${styles.skeletonKpiLine}`} />
        <div className={`${styles.skeletonBlock} ${styles.skeletonShimmer} ${styles.skeletonKpiValue}`} />
        <div className={`${styles.skeletonBlock} ${styles.skeletonShimmer} ${styles.skeletonKpiFoot}`} />
      </div>
    );
  }

  if (variant === "chart") {
    return (
      <div
        className={`${styles.skeletonBlock} ${styles.skeletonShimmer} ${styles.skeletonDynamic}`}
        style={{ width: width ?? "100%", height: height ?? 200 }}
      />
    );
  }

  if (variant === "panel") {
    return (
      <div className={styles.skeletonPanel}>
        <div className={`${styles.skeletonBlock} ${styles.skeletonShimmer} ${styles.skeletonPanelTitle}`} />
        <div className={`${styles.skeletonBlock} ${styles.skeletonShimmer} ${styles.skeletonPanelBody}`} />
      </div>
    );
  }

  // text variant (default)
  return (
    <div
      className={`${styles.skeletonBlock} ${styles.skeletonShimmer} ${styles.skeletonDynamic}`}
      style={{ width: width ?? "100%", height: height ?? 14 }}
    />
  );
}
