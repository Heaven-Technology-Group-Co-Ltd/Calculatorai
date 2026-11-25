"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { useCallback, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle, Clock, RefreshCw, Wrench } from "lucide-react";
import useSWR from "swr";
import { LiveRegion } from "@/components/LiveRegion";
import { fetcher } from "@/lib/fetcher";
import { RANGES, SERVICES, SERVICE_META } from "./constants";
import type { BucketStats, HistoryData, Incident, Range, StatusData } from "./types";
import { formatBucketLabel } from "./utils";
import { Charts } from "./components/Charts";
import { IncidentTimeline } from "./components/IncidentTimeline";
import { KPIBar } from "./components/KPIBar";
import { ServiceCard } from "./components/ServiceCard";
import { SystemInfo } from "./components/SystemInfo";
import styles from "./StatusClient.module.css";

const REFRESH_INTERVAL_MS = 3_600_000;

export function StatusClient() {
  const [range, setRange] = useState<Range>("24h");
  // SWR owns the fetch lifecycle (mount, range change, hourly refresh, focus
  // revalidation), so the page keeps no effect-driven state machine.
  const {
    data: status,
    error: statusFetchError,
    isLoading,
    isValidating,
    mutate: refreshStatus,
  } = useSWR<StatusData>("/api/status", fetcher, {
    refreshInterval: REFRESH_INTERVAL_MS,
    keepPreviousData: true,
  });
  const {
    data: history,
    error: historyFetchError,
    mutate: refreshHistory,
  } = useSWR<HistoryData>(`/api/status/history?range=${range}`, fetcher, {
    refreshInterval: REFRESH_INTERVAL_MS,
    keepPreviousData: true,
  });

  const loading = isLoading && !status;
  const refreshing = isValidating && !isLoading;
  const statusError = statusFetchError?.message ?? null;
  const historyError = historyFetchError?.message ?? null;
  const lastUpdated = status ? new Date(status.timestamp) : null;
  const announcement = statusError
    ? "Status refresh failed"
    : lastUpdated
      ? `Status refreshed at ${lastUpdated.toLocaleTimeString()}`
      : null;

  const refresh = useCallback(() => {
    void refreshStatus();
    void refreshHistory();
  }, [refreshStatus, refreshHistory]);

  const overall = status?.stats[range];

  const chartPoints = useMemo(() => {
    return (history?.series ?? []).map((pt) => {
      const vals = SERVICES.map((s) => pt.services[s]).filter(
        (v): v is BucketStats & { uptimePct: number } =>
          v !== null && v !== undefined && v.uptimePct !== null,
      );
      const uptime = vals.length
        ? Math.round((vals.reduce((a, v) => a + v.uptimePct, 0) / vals.length) * 10) / 10
        : null;
      const label = formatBucketLabel(pt.start, range);
      const row: Record<string, string | number | null> = { key: pt.start, label, uptime };
      for (const s of SERVICES) row[s] = pt.services[s]?.avgLatencyMs ?? null;
      return row;
    });
  }, [history, range]);

  const fullLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const pt of history?.series ?? []) {
      const d = new Date(pt.start);
      map.set(
        formatBucketLabel(pt.start, range),
        range === "24h"
          ? d.toLocaleString()
          : d.toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" }),
      );
    }
    return map;
  }, [history, range]);

  const hasUptime = chartPoints.some((p) => p.uptime !== null);
  const hasLatency = chartPoints.some((p) => SERVICES.some((s) => p[s] !== null));

  const uptimeDomain: [number, number] = useMemo(() => {
    const vals = chartPoints
      .map((p) => p.uptime)
      .filter((v): v is number => typeof v === "number");
    if (!vals.length) return [90, 100];
    return [Math.max(0, Math.floor(Math.min(...vals) - 5)), 100];
  }, [chartPoints]);

  const incidents: Incident[] = useMemo(() => {
    const list: Incident[] = [];
    if (status) {
      for (const s of SERVICES) {
        const c = status.checks[s];
        if (c && c.status !== "ok") {
          list.push({
            id: `live-${s}`,
            time: status.timestamp,
            service: s,
            message: c.message ?? (c.status === "error" ? "Check failing" : "Running degraded"),
            kind: c.status === "error" ? "error" : "degraded",
          });
        }
      }
    }
    (history?.series ?? []).forEach((pt) => {
      for (const s of SERVICES) {
        const st = pt.services[s];
        // incidents > 0 implies checks > 0, so uptimePct is never null here; guard is for the type
        if (st && st.incidents > 0 && st.uptimePct !== null) {
          list.push({
            id: `${pt.start}-${s}`,
            time: pt.start,
            service: s,
            message: `${st.incidents} failed check${st.incidents > 1 ? "s" : ""} · ${st.uptimePct}% uptime · avg ${st.avgLatencyMs}ms`,
            kind: st.uptimePct < 50 ? "error" : "degraded",
          });
        }
      }
    });
    return list
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 20);
  }, [status, history]);

  // ── Loading state ──
  if (loading && !status) {
    return (
      <div className={styles.container}>
        <LiveRegion message={announcement} />
        <div className={`${styles.panel} ${styles.centerState}`}>
          <div className={styles.spinner} />
          <p className={styles.stateText}>Loading status…</p>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (statusError && !status) {
    return (
      <div className={styles.container}>
        <LiveRegion message={announcement} />
        <div className={`${styles.panel} ${styles.centerState}`}>
          <AlertTriangle size={48} color="#ef4444" />
          <h2 className={styles.stateText}>Unable to fetch status</h2>
          <p className={styles.stateText}>{statusError}</p>
          <button className={styles.retryBtn} onClick={refresh}>
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Derived banner state ──
  const failing = SERVICES.filter((s) => status?.checks[s] && status.checks[s].status !== "ok");
  const hasError = failing.some((s) => status?.checks[s]?.status === "error");
  const banner = status?.maintenanceMode
    ? { color: "#eab308", title: "Maintenance Mode", icon: Wrench }
    : failing.length === 0
      ? { color: "#22c55e", title: "All Systems Operational", icon: CheckCircle }
      : hasError
        ? { color: "#ef4444", title: "Partial Outage", icon: AlertTriangle }
        : { color: "#eab308", title: "Degraded Performance", icon: AlertTriangle };
  const BannerIcon = banner.icon;

  return (
    <div className={styles.container}>
      <LiveRegion message={announcement} />
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--text-secondary)",
            textDecoration: "none",
            padding: "6px 12px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            transition: "all var(--transition-fast)"
          }}
        >
          <ArrowLeft size={14} />
          Back to App
        </Link>
      </div>
      <div className={`${styles.head} ${styles.fade}`}>
        <div>
          <h1 className={styles.title}>System Status</h1>
          <p className={styles.subtitle}>
            <Clock size={13} />
            Updated {lastUpdated?.toLocaleTimeString() ?? "—"}
            {refreshing ? " · refreshing…" : " · auto-refresh 1h"}
          </p>
        </div>
        <div className={styles.headerActions}>
          <div
            className={styles.tabs}
            role="tablist"
            tabIndex={0}
            aria-label="Time range"
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              e.preventDefault();
              const idx = RANGES.findIndex((r) => r.id === range);
              const next = e.key === "ArrowRight"
                ? (idx + 1) % RANGES.length
                : (idx - 1 + RANGES.length) % RANGES.length;
              setRange(RANGES[next].id);
              document.getElementById(`status-range-tab-${RANGES[next].id}`)?.focus();
            }}
          >
            {RANGES.map((r) => (
              <button
                key={r.id}
                id={`status-range-tab-${r.id}`}
                role="tab"
                aria-selected={range === r.id}
                aria-controls="status-range-panel"
                tabIndex={range === r.id ? 0 : -1}
                className={`${styles.tab} ${range === r.id ? styles.tabActive : ""}`}
                onClick={() => setRange(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            className={styles.refreshBtn}
            onClick={refresh}
            disabled={refreshing}
            aria-label="Refresh status"
          >
            <RefreshCw size={15} className={refreshing ? styles.spin : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Maintenance notice */}
      {status?.maintenanceMode && status.maintenanceMessage && (
        <div className={`${styles.maintenance} ${styles.fade}`}>
          <Wrench size={18} style={{ flexShrink: 0 }} />
          <span>{status.maintenanceMessage}</span>
        </div>
      )}

      {/* Overall banner */}
      <div
        className={`${styles.banner} ${styles.fade}`}
        style={
          {
            "--banner-color": `${banner.color}14`,
            "--banner-border": `${banner.color}55`,
            "--banner-glow": `${banner.color}18`,
          } as React.CSSProperties
        }
      >
        <span className={styles.bannerIcon}>
          <BannerIcon size={40} color={banner.color} />
          <span className={`${styles.bannerPulse} ${styles.pulse}`} style={{ background: banner.color }} />
        </span>
        <div style={{ minWidth: 0 }}>
          <h2 className={styles.bannerTitle} style={{ color: banner.color }}>
            {banner.title}
          </h2>
          <p className={styles.bannerSubtitle}>
            {failing.length === 0
              ? `5 services healthy · checked in ${status?.totalLatencyMs ?? 0}ms`
              : `${failing.length} service${failing.length > 1 ? "s" : ""} affected: ${failing.join(", ")}`}
          </p>
        </div>
        {overall && (
          <div className={styles.bannerUptime}>
            <div className={styles.bannerUptimeValue}>
              {overall.uptimePct !== null ? `${overall.uptimePct.toFixed(1)}%` : "No data"}
            </div>
            <div className={styles.bannerUptimeLabel}>Uptime · {range}</div>
          </div>
        )}
      </div>

      {/* KPI row */}
      {overall && <KPIBar stats={overall} />}

      {/* Service cards */}
      <section className={styles.fade}>
        <h3 className={styles.sectionTitle}>Services</h3>
        <div className={styles.services}>
          {SERVICE_META.map((m) => (
            <ServiceCard
              key={m.id}
              id={m.id}
              check={status?.checks[m.id]}
              uptimePct={history?.summary[m.id]?.uptimePct ?? overall?.services[m.id]?.uptimePct ?? null}
            />
          ))}
        </div>
      </section>

      {/* Charts */}
      <div
        className={styles.fade}
        role="tabpanel"
        id="status-range-panel"
        aria-labelledby={`status-range-tab-${range}`}
        tabIndex={0}
      >
        <Charts
          chartPoints={chartPoints}
          fullLabels={fullLabels}
          uptimeDomain={uptimeDomain}
          hasUptime={hasUptime}
          hasLatency={hasLatency}
          range={range}
          historyError={historyError}
        />
      </div>

      {/* Incidents + system info */}
      <div className={`${styles.bottom} ${styles.fade}`}>
        <IncidentTimeline incidents={incidents} range={range} />
        {status && <SystemInfo status={status} />}
      </div>
    </div>
  );
}
