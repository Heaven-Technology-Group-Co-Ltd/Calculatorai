"use client";

import styles from "./LiveRegion.module.css";

interface LiveRegionProps {
  message: string | null;
}

export function LiveRegion({ message }: LiveRegionProps) {
  return (
    <div className={styles.srOnly} aria-live="polite" aria-atomic="true">
      {message}
    </div>
  );
}
