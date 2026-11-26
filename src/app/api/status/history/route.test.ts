import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase-client", () => ({
  getSupabaseAdmin: () => ({ rpc: mocks.rpc }),
}));

import { GET } from "./route";

describe("GET /api/status/history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects service=discord as invalid service", async () => {
    const req = new NextRequest("https://app.example/api/status/history?service=discord");
    const res = await GET(req);
    expect(res.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("ignores legacy discord rows from health_history RPC without degrading active services", async () => {
    const bucketIso = new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000).toISOString();
    mocks.rpc.mockResolvedValue({
      data: [
        { bucket: bucketIso, service: "supabase", checks: 10, ok: 10, avg_latency: 12 },
        { bucket: bucketIso, service: "stripe", checks: 10, ok: 10, avg_latency: 24 },
        { bucket: bucketIso, service: "smtp", checks: 10, ok: 10, avg_latency: 18 },
        { bucket: bucketIso, service: "nextjs", checks: 10, ok: 10, avg_latency: 2 },
        { bucket: bucketIso, service: "discord", checks: 10, ok: 0, avg_latency: 0 },
      ],
      error: null,
    });

    const req = new NextRequest("https://app.example/api/status/history?range=24h");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect("discord" in json.data.summary).toBe(false);
    expect(json.data.summary.supabase.uptimePct).toBe(100);
    expect(json.data.summary.stripe.uptimePct).toBe(100);
  });
});
