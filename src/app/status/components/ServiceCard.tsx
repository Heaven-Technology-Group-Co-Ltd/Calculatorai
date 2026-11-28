"use client";

import { SERVICE_META, STATUS_COLOR, STATUS_LABEL } from "../constants";
import type { ServiceCheck } from "../types";
import styles from "../StatusClient.module.css";

interface ServiceCardProps {
  id: string;
  check: ServiceCheck | undefined;
  uptimePct: number | null;
}

export function ServiceCard({ id, check, uptimePct }: ServiceCardProps) {
  const meta = SERVICE_META.find((m) => m.id === id);
  if (!meta) return null;

  const st = check?.status ?? "unknown";
  const color = STATUS_COLOR[st];
  const Icon = meta.icon;

  return (
    <div
      className={styles.serviceCard}
      style={{ "--service-color": meta.color } as React.CSSProperties}
    >
      <div className={styles.serviceHeader}>
        <span className={styles.serviceIcon}>
          <Icon size={20} aria-hidden="true" focusable="false" />
        </span>
        <div className={styles.serviceText}>
          <div className={styles.serviceName}>{meta.label}</div>
          <div className={styles.serviceHint}>{meta.hint}</div>
        </div>
        <span
          className={styles.serviceDot}
          title={STATUS_LABEL[st]}
          style={{ "--status-color": color } as React.CSSProperties}
        />
      </div>
      <div className={styles.serviceStatus} style={{ "--status-color": color } as React.CSSProperties}>
        {STATUS_LABEL[st]}
        {st === "ok" && uptimePct !== null && uptimePct < 99 && <span className={styles.serviceMessage}> Rolling uptime below 99%</span>}
        {check?.message ? (
          <span className={styles.serviceMessage} title={check.message}>
            {check.message}
          </span>
        ) : null}
      </div>
      <div className={styles.serviceFooter}>
        <span className={styles.serviceLatency}>{check && st !== "unknown" ? `${check.latencyMs}ms` : "—"}</span>
        <span className={styles.serviceUptime}>
          {uptimePct !== null ? `${uptimePct.toFixed(1)}%` : "—"}
        </span>
      </div>
    </div>
  );
}
