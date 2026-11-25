"use client";

import { useDashboardContext } from "../DashboardProvider";

/**
 * Convert dateRange & customDateRange from DashboardContext to URL query string.
 * - '7d' => 'days=7'
 * - '30d' => 'days=30'
 * - '90d' => 'days=90'
 * - 'custom' => 'from=YYYY-MM-DD&to=YYYY-MM-DD' (or fallback days=30 if unset)
 */
export function useDateRangeParams(): { query: string; days: number } {
  const { dateRange, customDateRange } = useDashboardContext();

  if (dateRange === "7d") {
    return { query: "days=7", days: 7 };
  }

  if (dateRange === "30d") {
    return { query: "days=30", days: 30 };
  }

  if (dateRange === "90d") {
    return { query: "days=90", days: 90 };
  }

  if (dateRange === "custom" && customDateRange?.from && customDateRange?.to) {
    const fromStr = customDateRange.from.toISOString().slice(0, 10);
    const toStr = customDateRange.to.toISOString().slice(0, 10);
    const diffTime = Math.abs(customDateRange.to.getTime() - customDateRange.from.getTime());
    const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    return { query: `from=${fromStr}&to=${toStr}`, days: diffDays };
  }

  // Default fallback
  return { query: "days=30", days: 30 };
}
