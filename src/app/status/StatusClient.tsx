"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { useCallback, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle, Clock, RefreshCw, Wrench } from "lucide-react";
import useSWR from "swr";
import { LiveRegion } from "@/components/LiveRegion";
import { fetcher } from "@/lib/fetcher";
import { RANGES, SERVICE_META } from "./constants";
import type { HistoryData, Range, StatusData } from "./types";
import { deriveStatusModel } from "@/lib/status/status-model";
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

  const { chartPoints, fullLabels, incidents, failing, healthyCount, banner: bannerState, hasUptime, hasLatency, uptimeDomain } = useMemo(
    () => deriveStatusModel(status, history, range), [status, history, range],
  );

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
          <AlertTriangle size={20} color="var(--error)" aria-hidden="true" focusable="false" />
          <h2 className={styles.stateText}>Unable to fetch status</h2>
          <p className={styles.stateText}>{statusError}</p>
          <button className={styles.retryBtn} onClick={refresh}>
            <RefreshCw size={16} aria-hidden="true" focusable="false" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const banners = {
    maintenance: { color: "var(--warning)", surface: "var(--warning-bg)", border: "var(--warning-border)", title: "Maintenance Mode", icon: Wrench },
    operational: { color: "var(--success)", surface: "var(--success-bg)", border: "var(--success-border)", title: "All Systems Operational", icon: CheckCircle },
    outage: { color: "var(--error)", surface: "var(--error-bg)", border: "var(--error-border)", title: "Partial Outage", icon: AlertTriangle },
    degraded: { color: "var(--warning)", surface: "var(--warning-bg)", border: "var(--warning-border)", title: "Degraded Performance", icon: AlertTriangle },
  };
  const banner = banners[bannerState];
  const BannerIcon = banner.icon;

  return (
    <div className={styles.container}>
      <LiveRegion message={announcement} />
      {/* Header */}
      <div className={styles.backLinkWrap}>
        <Link
          href="/"
          className={styles.backLink}
        >
          <ArrowLeft size={16} aria-hidden="true" focusable="false" />
          Back to App
        </Link>
      </div>
      <div className={`${styles.head} ${styles.fade}`}>
        <div>
          <h1 className={styles.title}>System Status</h1>
          <p className={styles.subtitle}>
            <Clock size={16} aria-hidden="true" focusable="false" />
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
            <RefreshCw size={16} className={refreshing ? styles.spin : ""} aria-hidden="true" focusable="false" />
            Refresh
          </button>
        </div>
      </div>

      {/* Maintenance notice */}
      {status?.maintenanceMode && status.maintenanceMessage && (
        <div className={`${styles.maintenance} ${styles.fade}`}>
          <Wrench size={16} aria-hidden="true" focusable="false" />
          <span>{status.maintenanceMessage}</span>
        </div>
      )}

      {/* Overall banner */}
      <div
        className={`${styles.banner} ${styles.fade}`}
        style={
          {
            "--banner-color": banner.color,
            "--banner-surface": banner.surface,
            "--banner-border": banner.border,
            "--banner-glow": banner.surface,
          } as React.CSSProperties
        }
      >
        <span className={styles.bannerIcon}>
          <BannerIcon size={20} color={banner.color} aria-hidden="true" focusable="false" />
          <span className={`${styles.bannerPulse} ${styles.pulse}`} style={{ background: banner.color }} aria-hidden="true" />
        </span>
        <div className={styles.bannerText}>
          <h2 className={styles.bannerTitle}>
            {banner.title}
          </h2>
          <p className={styles.bannerSubtitle}>
            {failing.length === 0
              ? `${healthyCount} services healthy · checked in ${status?.totalLatencyMs ?? 0}ms`
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
      {overall && <KPIBar stats={overall} incidentCount={incidents.length} />}

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
