import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ session: vi.fn(), quota: vi.fn(), maintenance: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: mocks.session }));
vi.mock("@/lib/auth-options", () => ({ authOptions: {} }));
vi.mock("@/lib/rate-limiter", () => ({ checkRateLimitStrict: mocks.quota }));
vi.mock("@/lib/admin/state", () => ({ readMaintenanceState: mocks.maintenance }));
import { POST } from "./route";
function request(body: unknown) { return new NextRequest("https://example.com/api/history", { method: "POST", body: JSON.stringify(body) }); }
const valid = { calcId: "1", calcTitle: "test", inputs: {}, result: "1", unit: "" };
describe("history security", () => {
  beforeEach(() => { mocks.session.mockResolvedValue({ user: { id: "u" } }); mocks.quota.mockResolvedValue({ allowed: true }); mocks.maintenance.mockResolvedValue({ maintenanceMode: false }); });
  it("returns 429 and Retry-After when the quota is exhausted", async () => {
    mocks.quota.mockResolvedValue({ allowed: false, retryAfter: 42 });
    const response = await POST(request(valid));
    expect(response.status).toBe(429); expect(response.headers.get("Retry-After")).toBe("42");
  });
  it("rejects oversized result and inputs", async () => {
    expect((await POST(request({ ...valid, result: "a".repeat(4097) }))).status).toBe(400);
    expect((await POST(request({ ...valid, inputs: Object.fromEntries(Array.from({ length: 33 }, (_, index) => [String(index), "a"])) }))).status).toBe(400);
  });
  it("returns 503 during maintenance", async () => {
    mocks.maintenance.mockResolvedValue({ maintenanceMode: true });
    expect((await POST(request(valid))).status).toBe(503);
  });
  it("returns 503 when the strict limiter is unavailable", async () => {
    mocks.quota.mockRejectedValueOnce(new Error("offline"));
    const response = await POST(request(valid));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "SERVICE_UNAVAILABLE" });
  });
});
