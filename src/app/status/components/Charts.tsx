"use client";

import { Activity, Zap } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SERVICE_META } from "../constants";
import type { BucketStats, Range } from "../types";
import { formatBucketLabel } from "../utils";
import styles from "../StatusClient.module.css";

const tooltipStyle = {
  background: "#242F35",
  border: "1px solid rgba(232,184,150,0.12)",
  borderRadius: 8,
  color: "var(--text)",
  fontSize: 13,
};

interface ChartsProps {
  chartPoints: Record<string, string | number | null>[];
  fullLabels: Map<string, string>;
  uptimeDomain: [number, number];
  hasUptime: boolean;
  hasLatency: boolean;
  range: Range;
  historyError: string | null;
}

export function Charts({
  chartPoints,
  fullLabels,
  uptimeDomain,
  hasUptime,
  hasLatency,
  range,
  historyError,
}: ChartsProps) {
  return (
    <div className={styles.charts}>
      {/* Uptime chart */}
      <div className={styles.panel}>
        <div className={styles.chartTitle}>
          <Activity size={16} color="var(--primary)" />
          Uptime %
        </div>
        <p className={styles.chartSubtitle}>
          {range === "24h" ? "One bucket per hour, local time" : "Daily buckets"} · {range} window
        </p>
        {historyError || !hasUptime ? (
          <div className={styles.chartEmpty}>
            <Activity size={24} style={{ opacity: 0.4 }} />
            {historyError ?? "No uptime data yet — check back after a few checks run."}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartPoints}>
              <defs>
                <linearGradient id="uptimeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E8B896" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#E8B896" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(232,184,150,0.06)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                axisLine={{ stroke: "rgba(232,184,150,0.08)" }}
                tickLine={{ stroke: "rgba(232,184,150,0.25)" }}
                interval="preserveStartEnd"
                minTickGap={6}
              />
              <YAxis
                domain={uptimeDomain}
                tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(label) => fullLabels.get(label) ?? String(label)}
                formatter={(value) => [`${value}%`, "Uptime"]}
              />
              <Area
                type="monotone"
                dataKey="uptime"
                name="Uptime"
                stroke="#E8B896"
                strokeWidth={2}
                fill="url(#uptimeGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Latency chart */}
      <div className={styles.panel}>
        <div className={styles.chartTitle}>
          <Zap size={16} color="var(--primary)" />
          Response time
        </div>
        <p className={styles.chartSubtitle}>Avg latency per service · ms</p>
        {historyError || !hasLatency ? (
          <div className={styles.chartEmpty}>
            <Zap size={24} style={{ opacity: 0.4 }} />
            {historyError ?? "No latency data yet — check back after a few checks run."}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartPoints}>
              <CartesianGrid stroke="rgba(232,184,150,0.06)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                axisLine={{ stroke: "rgba(232,184,150,0.08)" }}
                tickLine={{ stroke: "rgba(232,184,150,0.25)" }}
                interval="preserveStartEnd"
                minTickGap={6}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={(v) => `${v}`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(label) => fullLabels.get(label) ?? String(label)}
                formatter={(value, name) => [
                  `${value} ms`,
                  SERVICE_META.find((m) => m.id === name)?.label ?? String(name),
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-secondary)" }} iconType="line" />
              {SERVICE_META.map((m) => (
                <Line
                  key={m.id}
                  type="monotone"
                  dataKey={m.id}
                  name={m.id}
                  stroke={m.color}
                  strokeWidth={2}
                  dot={chartPoints.length <= 8}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
