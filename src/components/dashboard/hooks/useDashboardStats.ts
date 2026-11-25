"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useDashboardContext } from "../DashboardProvider";
import { useDateRangeParams } from "./useDateRangeParams";

/* ── Response types ── */

interface VisitorChartPoint {
  date?: string;
  day?: string;
  views?: number;
  pageViews?: number;
  visitors?: number;
}

interface DeviceDatum {
  device?: string;
  name?: string;
  count?: number;
  value?: number;
}

interface UserGrowthPoint {
  label: string;
  value: number;
}

interface RecentActivityItem {
  action: string;
  user: string;
  time: string;
}

export interface StatsResponse {
  activeUsers: number;
  totalUsers: number;
  conversionRate: number;
  bounceRate: number;
  totalPageViews7d: number;
  activeSessions: number;
  userGrowth: UserGrowthPoint[];
  recentActivity: RecentActivityItem[];
  visitorChart: VisitorChartPoint[];
  deviceData: DeviceDatum[];
  monthlyRevenue: number;
  serverTime: string;
}

/**
 * Fetch aggregated dashboard stats from GET /api/stats.
 *
 * `/api/stats` returns raw (unwrapped) JSON, so the fetcher passes it through as-is.
 */
export function useDashboardStats() {
  const { refreshKey } = useDashboardContext();
  const { query } = useDateRangeParams();
  return useSWR<StatsResponse>(`/api/stats?${query}&k=${refreshKey}`, fetcher, {
    refreshInterval: 1_800_000, // 30 minutes
    revalidateOnFocus: true,
  });
}
