import { describe, expect, it } from "vitest";
import { deriveStatusModel, SERVICES, type StatusData, type HistoryData } from "./status-model";

const status: StatusData = {
  status: "operational", maintenanceMode: false, maintenanceMessage: null,
  checks: Object.fromEntries(SERVICES.map((service) => [service, { status: "ok", latencyMs: 5 }])),
  stats: {} as StatusData["stats"], totalLatencyMs: 5, timestamp: "2026-11-27T00:00:00Z",
};

describe("status model", () => {
  it("counts the four actual services", () => {
    expect(deriveStatusModel(status, undefined, "24h")).toMatchObject({ healthyCount: 4, banner: "operational", incidents: [] });
  });
  it.each([["degraded", "degraded"], ["error", "outage"], ["unknown", "degraded"]] as const)("derives %s as %s", (checkStatus, banner) => {
    const snapshot: StatusData = { ...status, checks: { ...status.checks, smtp: { status: checkStatus, latencyMs: 1 } } };
    expect(deriveStatusModel(snapshot, undefined, "24h")).toMatchObject({ healthyCount: 3, banner, incidents: [{ service: "smtp" }] });
  });
  it("extracts history incidents and tolerates empty history", () => {
    const history: HistoryData = { service: "all", range: "24h", bucket: "hour", summary: {}, series: [{ start: "2026-11-27T00:00:00Z", services: { stripe: { checks: 2, uptimePct: 50, avgLatencyMs: 30, incidents: 1 } } }] };
    const model = deriveStatusModel(status, history, "24h");
    expect(model.incidents).toHaveLength(1);
    expect(model.chartPoints[0].uptime).toBe(50);
    expect(deriveStatusModel(status, { ...history, series: [] }, "24h").chartPoints).toEqual([]);
  });
});
