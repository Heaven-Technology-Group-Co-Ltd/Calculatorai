import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ maintenance: vi.fn(), quota: vi.fn() }));
vi.mock("@/lib/admin/state", () => ({ readMaintenanceState: mocks.maintenance }));
vi.mock("@/lib/rate-limiter", () => ({ checkRateLimitStrict: mocks.quota }));
import { POST } from "./route";
function request(password: string) { return new NextRequest("https://example.com/api/auth/register", { method: "POST", body: JSON.stringify({ email: "user@example.com", password, name: "User" }) }); }
describe("registration security", () => {
  beforeEach(() => { mocks.maintenance.mockResolvedValue({ maintenanceMode: false }); mocks.quota.mockResolvedValue({ allowed: true }); });
  it("rejects passwords exceeding 72 UTF-8 bytes", async () => {
    expect((await POST(request("ก".repeat(25)))).status).toBe(400);
    expect((await POST(request("x".repeat(73)))).status).toBe(400);
  });
  it("rejects registration during maintenance", async () => {
    mocks.maintenance.mockResolvedValue({ maintenanceMode: true }); expect((await POST(request("longpassword"))).status).toBe(503);
  });
});
