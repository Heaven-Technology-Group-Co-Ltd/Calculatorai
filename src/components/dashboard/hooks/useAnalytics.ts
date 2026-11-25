"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useDashboardContext } from "../DashboardProvider";
import { useDateRangeParams } from "./useDateRangeParams";

/* ── Response types ── */

export interface FormulaUsageItem {
  name: string;
  count: number;
}

export interface PlanItem {
  name: string;
  value: number;
}

export interface CountryItem {
  name: string;
  value: number;
}

export interface SessionsResponse {
  totalCalculations: number;
  activeSessions: number;
  bounceRate: number;
  conversionRate: number;
  avgSessionDuration: number;
  formulas?: FormulaUsageItem[];
  plans?: PlanItem[];
}

export interface FunnelStage {
  stage: string;
  count: number;
  percentage: number;
}

export interface GeoResponse {
  countries: CountryItem[];
}

type AnalyticsType = "sessions" | "funnel" | "geo";

type AnalyticsResponse<T extends AnalyticsType> = T extends "sessions"
  ? SessionsResponse
  : T extends "funnel"
    ? FunnelStage[]
    : GeoResponse;

const ENDPOINT: Record<AnalyticsType, string> = {
  sessions: "/api/analytics/sessions",
  funnel: "/api/analytics/funnel",
  geo: "/api/analytics/geo",
};

/**
 * Fetch analytics data from either:
 * - GET /api/analytics/sessions  → sessions metrics
 * - GET /api/analytics/funnel    → conversion funnel stages
 *
 * Both APIs use `successResponse()` (2-key wrapper) → fetcher auto-unwraps.
 */
export function useAnalytics<T extends AnalyticsType>({ type }: { type: T }) {
  const { refreshKey } = useDashboardContext();
  const { query } = useDateRangeParams();

  return useSWR<AnalyticsResponse<T>>(
    `${ENDPOINT[type]}?${query}&k=${refreshKey}`,
    fetcher,
    { refreshInterval: 1_800_000, revalidateOnFocus: true }, // 30 minutes
  );
}
