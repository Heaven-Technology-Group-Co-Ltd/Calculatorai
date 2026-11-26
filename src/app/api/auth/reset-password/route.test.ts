import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("@/lib/rate-limiter", () => ({ checkRateLimitStrict: vi.fn(async () => ({ allowed: true })) }));
import { POST } from "./route";
function request(password: string) { return new NextRequest("https://example.com/api/auth/reset-password", { method: "POST", body: JSON.stringify({ email: "user@example.com", token: "token", password }) }); }
describe("reset password validation", () => {
  it("rejects passwords exceeding 72 UTF-8 bytes", async () => {
    expect((await POST(request("ก".repeat(25)))).status).toBe(400);
    expect((await POST(request("x".repeat(73)))).status).toBe(400);
  });
});
