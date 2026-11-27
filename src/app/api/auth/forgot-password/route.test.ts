import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ quota: vi.fn(), from: vi.fn(), send: vi.fn(), filters: [] as string[] }));
vi.mock("@/lib/rate-limiter", () => ({ checkRateLimitStrict: mocks.quota }));
vi.mock("nodemailer", () => ({ default: { createTransport: () => ({ sendMail: mocks.send }) } }));
vi.mock("@/lib/supabase-client", () => ({ getSupabaseAdmin: () => ({ from: mocks.from }) }));
import { POST } from "./route";
function request() { return new NextRequest("https://example.com/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email: "user@example.com" }) }); }
describe("password recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.filters.length = 0; mocks.quota.mockResolvedValue({ allowed: true }); mocks.send.mockResolvedValue({});
    mocks.from.mockImplementation((table: string) => {
      if (table === "users") return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "u" } }) }) }) };
      return { delete: () => { const chain = { eq: (key: string, value: string) => { mocks.filters.push(`${key}:${value}`); return chain; } }; return chain; }, insert: async () => ({ error: null }) };
    });
  });
  it("deletes password reset tokens without deleting verification tokens", async () => {
    expect((await POST(request())).status).toBe(200);
    expect(mocks.filters).toContain("type:password_reset"); expect(mocks.filters).not.toContain("type:email_verify");
  });
  it("returns the generic success when the recipient cap is reached", async () => {
    mocks.quota.mockResolvedValueOnce({ allowed: true }).mockResolvedValueOnce({ allowed: false });
    const response = await POST(request()); expect(response.status).toBe(200); expect(mocks.send).not.toHaveBeenCalled(); expect(mocks.from).not.toHaveBeenCalled();
  });
  it("returns 503 when the rate limiter fails", async () => {
    mocks.quota.mockRejectedValueOnce(new Error("offline")); expect((await POST(request())).status).toBe(503);
  });
  it("returns 503 when the recipient limiter fails", async () => {
    mocks.quota.mockResolvedValueOnce({ allowed: true }).mockRejectedValueOnce(new Error("offline"));
    expect((await POST(request())).status).toBe(503);
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
