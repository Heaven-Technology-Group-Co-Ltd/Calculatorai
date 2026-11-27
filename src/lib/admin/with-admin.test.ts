import { describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api-response";
import { AdminGateError } from "@/lib/admin/auth-middleware";

const mocks = vi.hoisted(() => ({ gate: vi.fn(), audit: vi.fn(), client: {} }));
vi.mock("./admin-gate", () => ({ checkAdminGate: mocks.gate }));
vi.mock("./audit", () => ({ withAuditLog: mocks.audit }));
vi.mock("@/lib/supabase-client", () => ({ getSupabaseAdmin: () => mocks.client }));
import { withAdmin } from "./with-admin";

const request = new NextRequest("https://example.com/api/users");
const admin = { id: "admin-1", name: null, email: null, is_admin: true };

describe("withAdmin", () => {
  it.each([[401, "UNAUTHORIZED"], [403, "FORBIDDEN"], [429, "RATE_LIMITED"], [503, "SERVICE_UNAVAILABLE"]])("preserves gate failure %s", async (status, code) => {
    mocks.gate.mockResolvedValueOnce({ ok: false, failure: { status, message: "denied" } });
    const handler = vi.fn();
    const response = await withAdmin(request, handler);
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ success: false, error: "denied", code });
    expect(handler).not.toHaveBeenCalled();
  });

  it("logs the route and error without exposing internal details to clients", async () => {
    const error = new Error("db boom");
    const logger = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      mocks.gate.mockResolvedValueOnce({ ok: true, user: admin });
      const response = await withAdmin(request, async () => { throw error; });
      expect(logger).toHaveBeenCalledWith("[GET /api/users] Unhandled route error:", error);
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ success: false, error: "Internal server error", code: "INTERNAL_ERROR" });
    } finally {
      logger.mockRestore();
    }
  });

  it("forwards retry headers from gate failures", async () => {
    mocks.gate.mockResolvedValueOnce({ ok: false, failure: { status: 429, message: "denied", headers: { "Retry-After": "12" } } });
    const response = await withAdmin(request, async () => NextResponse.json({ success: true }));
    expect(response.headers.get("Retry-After")).toBe("12");
  });

  it("attributes write-ahead audit entries to the authenticated administrator", async () => {
    mocks.gate.mockResolvedValueOnce({ ok: true, user: admin });
    mocks.audit.mockImplementationOnce(async (_entry, effect) => effect());
    const response = await withAdmin(request, async ({ audit }) => {
      await audit({ action: "update_user" }, async () => undefined);
      return NextResponse.json({ success: true });
    });
    expect(response.status).toBe(200);
    expect(mocks.audit).toHaveBeenCalledWith({ action: "update_user", adminUserId: admin.id }, expect.any(Function));
  });

  it("maps domain errors without changing their status", async () => {
    mocks.gate.mockResolvedValueOnce({ ok: true, user: admin });
    const response = await withAdmin(request, async () => { throw ApiError.forbidden("blocked"); });
    expect(response.status).toBe(403);
  });

  it("preserves a thrown gate unavailability error", async () => {
    mocks.gate.mockRejectedValueOnce(new AdminGateError({ kind: "unavailable", status: 503, message: "offline" }));
    const response = await withAdmin(request, async () => NextResponse.json({ success: true }));
    expect(response.status).toBe(503);
  });
});
