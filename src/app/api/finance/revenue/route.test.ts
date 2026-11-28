import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/admin/with-admin", () => ({ withAdmin: (_request: unknown, callback: (context: unknown) => unknown) => callback({ supabase: { from: mocks.from } }) }));
import { GET } from "./route";

function configureTables(payments: unknown[], userCount: number, refundCount: number) {
  mocks.from.mockImplementation((table: string) => {
    const chain = {
      select: () => chain, in: () => chain, eq: () => chain, gte: () => chain,
      order: () => chain, range: async () => ({ data: payments, error: null }),
      then: (resolve: (value: unknown) => void) => resolve({ count: table === "users" ? userCount : refundCount, error: null }),
    };
    return chain;
  });
}

describe("finance reporting", () => {
  it("returns zero and no chart points when there are no paid transactions", async () => {
    configureTables([], 0, 0);
    const response = await GET(new NextRequest("https://example.com/api/finance/revenue?days=7"));
    expect((await response.json()).data).toEqual({ revenue: 0, arpu: null, refunds: 0, monthlyRevenue: [] });
  });
  it("uses the same payment totals for cards and chart", async () => {
    configureTables([{ amount_cents: 1000, currency: "usd", created_at: "2026-01-20" }], 2, 1);
    const response = await GET(new NextRequest("https://example.com/api/finance/revenue?days=30"));
    expect((await response.json()).data).toEqual({ revenue: 10, arpu: 5, refunds: 1, monthlyRevenue: [{ month: "2026-01", revenue: 10 }] });
  });
});
