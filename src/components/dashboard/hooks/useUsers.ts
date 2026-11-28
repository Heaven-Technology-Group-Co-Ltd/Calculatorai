"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useDashboardContext } from "../DashboardProvider";

/* ── Response types ── */

export interface DashboardUser {
  id: string;
  email: string;
  name: string | null;
  status: "active" | "suspended" | "banned" | "unverified";
  plan: string;
  created_at: string;
  last_seen_at: string | null;
  is_banned?: boolean;
  email_verified?: string | null;
  last_active_at?: string | null;
}

export interface UsersResponse {
  success: true;
  data: DashboardUser[];
  total: number;
  page: number;
  per_page: number;
}

interface UseUsersOptions {
  search?: string;
  status?: string;
  page?: number;
  perPage?: number;
}

/**
 * Fetch paginated user list from GET /api/users.
 *
 * `/api/users` returns `{ success, data, total, page, per_page }` (3+ keys),
 * so the fetcher passes it through as-is — we get the full `UsersResponse`.
 */
export function useUsers(opts: UseUsersOptions = {}) {
  const { refreshKey } = useDashboardContext();
  const { search = "", status = "", page = 1, perPage = 20 } = opts;

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (status) params.set("filter", status);
  params.set("page", String(page));
  params.set("per_page", String(perPage));
  params.set("k", String(refreshKey));

  return useSWR<UsersResponse>(
    `/api/users?${params.toString()}`,
    fetcher,
    { refreshInterval: 1_800_000, revalidateOnFocus: true }, // 30 minutes
  );
}
