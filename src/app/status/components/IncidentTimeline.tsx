"use client";

import { AlertTriangle, CheckCircle } from "lucide-react";
import { SERVICE_META } from "../constants";
import type { Incident } from "../types";
import styles from "../StatusClient.module.css";

interface IncidentTimelineProps {
  incidents: Incident[];
  range: string;
}

export function IncidentTimeline({ incidents, range }: IncidentTimelineProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.chartTitle}>
        <AlertTriangle size={16} color="var(--primary)" />
        Incident timeline
        <span className={styles.incidentCount}>{incidents.length}</span>
      </div>
      {incidents.length === 0 ? (
        <div className={styles.incidentNone}>
          <CheckCircle size={18} />
          No incidents in the last {range} — smooth sailing.
        </div>
      ) : (
        <div className={styles.incidentList}>
          {incidents.map((inc, i) => (
            <div
              key={inc.id}
              className={`${styles.incidentItem} ${i < incidents.length - 1 ? styles.incidentItemBorder : ""}`}
              style={{ "--incident-color": inc.kind === "error" ? "var(--error)" : "var(--warning)" } as React.CSSProperties}
            >
              <div className={styles.incidentBody}>
                <div className={styles.incidentHeader}>
                  <strong className={styles.incidentService}>
                    {SERVICE_META.find((m) => m.id === inc.service)?.label ?? inc.service}
                  </strong>
                  <span className={styles.incidentBadge}>
                    {inc.kind === "error" ? "Outage" : "Degraded"}
                  </span>
                  {inc.id.startsWith("live-") && (
                    <span className={`${styles.incidentOngoing} ${styles.pulse}`}>ONGOING</span>
                  )}
                </div>
                <div className={styles.incidentMessage}>{inc.message}</div>
              </div>
              <div className={styles.incidentTime}>
                {new Date(inc.time).toLocaleString(undefined, {
                  month: "numeric",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
