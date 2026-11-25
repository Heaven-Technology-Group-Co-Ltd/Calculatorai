"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useDashboardContext } from "../DashboardProvider";
import { useDateRangeParams } from "./useDateRangeParams";

/* ── Response types ── */

interface MonthlyRevenuePoint {
  month: string;
  revenue: number;
}

export interface RevenueResponse {
  mrr: number;
  arr: number;
  churnRate: number;
  activeSubscriptions: number;
  monthlyRevenue: MonthlyRevenuePoint[];
}

/**
 * Fetch revenue metrics from GET /api/finance/revenue.
 *
 * The API uses `successResponse()` (2-key wrapper) → fetcher auto-unwraps to `RevenueResponse`.
 */
export function useRevenue(options?: { days?: number }) {
  const { refreshKey } = useDashboardContext();
  const dateParams = useDateRangeParams();

  const query = options?.days ? `days=${options.days}` : dateParams.query;

  return useSWR<RevenueResponse>(
    `/api/finance/revenue?${query}&k=${refreshKey}`,
    fetcher,
    { refreshInterval: 1_800_000, revalidateOnFocus: true }, // 30 minutes
  );
}
