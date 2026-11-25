import { describe, expect, it } from "vitest";
import { mapDashboardGateResult } from "./dashboard-gate-mapping";
import type { AdminGateFailure } from "./admin-gate";

function failure(kind: AdminGateFailure["kind"], status: AdminGateFailure["status"], message: string): AdminGateFailure {
  return { kind, status, message } as AdminGateFailure;
}

describe("mapDashboardGateResult", () => {
  it("maps unauthenticated gate result to login redirect", () => {
    expect(
      mapDashboardGateResult({
        ok: false,
        failure: failure("unauthenticated", 401, "Authentication required"),
      })
    ).toEqual({ kind: "redirect", destination: "/login" });
  });

  it("maps forbidden gate result to home redirect", () => {
    expect(
      mapDashboardGateResult({
        ok: false,
        failure: failure("forbidden", 403, "Admin privileges required"),
      })
    ).toEqual({ kind: "redirect", destination: "/" });
  });

  it("maps unavailable gate result to service unavailable", () => {
    expect(
      mapDashboardGateResult({
        ok: false,
        failure: failure("unavailable", 503, "Service temporarily unavailable. Please try again shortly."),
      })
    ).toEqual({ kind: "unavailable" });
  });

  it("maps success to allow rendering dashboard", () => {
    expect(
      mapDashboardGateResult({
        ok: true,
        user: { id: "u1", name: "Admin", email: "admin@example.com", is_admin: true },
      })
    ).toEqual({ kind: "allow" });
  });
});
