"use client";

import { Server } from "lucide-react";
import type { StatusData } from "../types";
import { formatTime } from "../utils";
import styles from "../StatusClient.module.css";

interface SystemInfoProps {
  status: StatusData;
}

export function SystemInfo({ status }: SystemInfoProps) {
  const rows = [
    { label: "Checked at", value: formatTime(status.timestamp) },
  ];

  return (
    <div className={styles.panel}>
      <div className={styles.chartTitle}>
        <Server size={16} color="var(--primary)" />
        System info
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((row) => (
          <div key={row.label} className={styles.infoRow}>
            <span className={styles.infoLabel}>{row.label}</span>
            <span className={styles.infoValue} title={row.value}>
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
