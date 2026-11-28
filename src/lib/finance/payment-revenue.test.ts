import { describe, expect, it } from "vitest";
import { selectedRevenueDays, summarizePayments } from "./payment-revenue";

describe("payment revenue", () => {
  it("returns zero for no paid transactions", () => {
    expect(summarizePayments([])).toEqual({ total: 0, months: [] });
  });
  it("keeps range totals consistent with monthly chart points", () => {
    const summary = summarizePayments([{ amount_cents: 1250, currency: "usd", created_at: "2026-01-01" }, { amount_cents: 750, currency: "usd", created_at: "2026-02-01" }]);
    expect(summary.total).toBe(20);
    expect(summary.months.reduce((sum, point) => sum + point.revenue, 0)).toBe(summary.total);
  });
  it("rejects currencies that cannot be added to USD", () => {
    expect(() => summarizePayments([{ amount_cents: 100, currency: "eur", created_at: "2026-01-01" }])).toThrow();
  });
  it("limits reporting periods to supported presets", () => {
    expect(selectedRevenueDays(new URLSearchParams("days=7"))).toBe(7);
    expect(selectedRevenueDays(new URLSearchParams("days=100000"))).toBe(30);
  });
});
