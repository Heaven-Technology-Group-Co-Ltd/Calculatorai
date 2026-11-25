import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import proxy from "./proxy";
import { checkAdminGate } from "@/lib/admin/admin-gate";

vi.mock("@/lib/admin/admin-gate", () => ({
  checkAdminGate: vi.fn(),
}));

describe("dashboard proxy gate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows authenticated admin and skips rate limiting", async () => {
    vi.mocked(checkAdminGate).mockResolvedValue({
      ok: true,
      user: { id: "u1", name: "Admin", email: "admin@example.com", is_admin: true },
    });

    const request = new NextRequest("https://example.com/dashboard");
    const response = await proxy(request);

    expect(checkAdminGate).toHaveBeenCalledWith(request);
    expect(response.status).toBe(200);
  });

  it("redirects unauthenticated dashboard requests to login", async () => {
    vi.mocked(checkAdminGate).mockResolvedValue({
      ok: false,
      failure: { kind: "unauthenticated", status: 401, message: "Authentication required" },
    });

    const response = await proxy(new NextRequest("https://example.com/dashboard"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.com/login");
  });

  it("redirects non-admin dashboard requests home", async () => {
    vi.mocked(checkAdminGate).mockResolvedValue({
      ok: false,
      failure: { kind: "forbidden", status: 403, message: "Admin privileges required" },
    });

    const response = await proxy(new NextRequest("https://example.com/dashboard"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.com/");
  });

  it("passes /formulas-demo through outside production so the page can serve it", async () => {
    // Proxy gates the demo in production (first layer, Node runtime); outside
    // production it must pass through (second layer: formulas-demo-gate.ts).
    const response = await proxy(new NextRequest("https://example.com/formulas-demo"));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("leaves Content-Security-Policy to next.config, not the proxy", async () => {
    vi.mocked(checkAdminGate).mockResolvedValue({
      ok: true,
      user: { id: "u1", name: "Admin", email: "admin@example.com", is_admin: true },
    });

    const response = await proxy(new NextRequest("https://example.com/dashboard"));

    expect(response.headers.get("Content-Security-Policy")).toBeNull();
  });

  it("returns 503 when admin gate dependencies are unavailable", async () => {
    vi.mocked(checkAdminGate).mockResolvedValue({
      ok: false,
      failure: {
        kind: "unavailable",
        status: 503,
        message: "Service temporarily unavailable. Please try again shortly.",
      },
    });

    const response = await proxy(new NextRequest("https://example.com/dashboard"));
    expect(response.status).toBe(503);
  });
});
