import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ insert: vi.fn() }));
vi.mock("@/lib/supabase-client", () => ({ getSupabaseAdmin: () => ({ from: () => ({ insert: mocks.insert }) }) }));
vi.mock("@/lib/rate-limiter", () => ({ checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }) }));
import { POST } from "./route";

async function record(headers: Record<string, string>, referrer?: string) {
  return POST(new NextRequest("https://calculatorai.click/api/page-views", {
    method: "POST", headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ path: "/", sessionId: null, referrer }),
  }));
}

describe("POST /api/page-views", () => {
  beforeEach(() => { mocks.insert.mockReset().mockResolvedValue({ error: null }); });
  it("prioritizes Netlify country and strips referral secrets", async () => {
    expect((await record({ "x-nf-country": "th", "cf-ipcountry": "US" }, "https://example.com/a?token=secret#fragment")).status).toBe(200);
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ country: "TH", referrer: "https://example.com/a" }));
  });
  it("reads encoded geo before Cloudflare and rejects self referrals", async () => {
    const geo = Buffer.from(JSON.stringify({ country: { code: "jp" } })).toString("base64");
    await record({ "x-nf-geo": geo, "cf-ipcountry": "US" }, "https://calculatorai.click/internal?token=secret");
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ country: "JP", referrer: null }));
  });
  it("ignores invalid country codes", async () => {
    await record({ "x-nf-country": "bad", "cf-ipcountry": "XX" });
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ country: null }));
  });
});
