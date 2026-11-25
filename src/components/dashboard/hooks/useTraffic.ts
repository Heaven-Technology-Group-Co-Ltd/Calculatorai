"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useDashboardContext } from "../DashboardProvider";
import { useDateRangeParams } from "./useDateRangeParams";

/* ── Response types ── */

interface TopPage {
  path: string;
  views: number;
}

interface GeographyEntry {
  country: string;
  views: number;
  percentage: number;
}

interface ReferralEntry {
  source: string;
  views: number;
}

export interface TrafficResponse {
  topPages: TopPage[];
  geography: GeographyEntry[];
  referrals: ReferralEntry[];
  totalViews: number;
}

/**
 * Fetch traffic analytics from GET /api/analytics/traffic.
 *
 * The API uses `successResponse()` (2-key wrapper) → fetcher auto-unwraps to `TrafficResponse`.
 */
export function useTraffic(options?: { days?: number }) {
  const { refreshKey } = useDashboardContext();
  const dateParams = useDateRangeParams();

  const query = options?.days ? `days=${options.days}` : dateParams.query;

  return useSWR<TrafficResponse>(
    `/api/analytics/traffic?${query}&k=${refreshKey}`,
    fetcher,
    { refreshInterval: 1_800_000, revalidateOnFocus: true }, // 30 minutes
  );
}
