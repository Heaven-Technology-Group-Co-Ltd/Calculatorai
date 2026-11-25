import type { AdminGateResult } from "./admin-gate";

export type DashboardGateAction =
  | { kind: "allow" }
  | { kind: "redirect"; destination: "/login" | "/" }
  | { kind: "unavailable" };

export function mapDashboardGateResult(result: AdminGateResult): DashboardGateAction {
  if (result.ok) return { kind: "allow" };
  if (result.failure.kind === "unavailable") return { kind: "unavailable" };
  return {
    kind: "redirect",
    destination: result.failure.kind === "unauthenticated" ? "/login" : "/",
  };
}
