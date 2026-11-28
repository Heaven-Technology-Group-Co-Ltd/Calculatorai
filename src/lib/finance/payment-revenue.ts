import type { SupabaseClient } from "@supabase/supabase-js";

export interface RevenuePayment { amount_cents: number; currency: string; created_at: string }
export function selectedRevenueDays(search: URLSearchParams): number {
  const days = Number(search.get("days"));
  return [7, 30, 90].includes(days) ? days : 30;
}

export function summarizePayments(payments: RevenuePayment[]) {
  const months = new Map<string, number>();
  let totalCents = 0;
  for (const payment of payments) {
    if (payment.currency.toLowerCase() !== "usd") throw new Error("Mixed currencies require separate reporting");
    totalCents += payment.amount_cents;
    const month = payment.created_at.slice(0, 7);
    months.set(month, (months.get(month) ?? 0) + payment.amount_cents);
  }
  return { total: totalCents / 100, months: [...months].sort(([left], [right]) => left.localeCompare(right)).map(([month, cents]) => ({ month, revenue: cents / 100 })) };
}

export async function loadPaymentRevenue(client: SupabaseClient, days: number) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const payments: RevenuePayment[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data: page, error } = await client.from("payments").select("amount_cents,currency,created_at").in("status", ["succeeded", "partially_refunded", "refunded"]).gte("created_at", since).order("id", { ascending: true }).range(offset, offset + 999);
    if (error) throw new Error("Failed to load payment revenue");
    payments.push(...(page ?? []));
    if (!page || page.length < 1000) return summarizePayments(payments);
  }
}
