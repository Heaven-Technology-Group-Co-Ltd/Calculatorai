import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { KPIBar } from "./KPIBar";

it("shows derived timeline incident count rather than aggregated checks", () => {
  const markup = renderToStaticMarkup(<KPIBar incidentCount={1} stats={{ uptimePct: 99, avgLatencyMs: 25, checks: 1000, incidents: 0, services: {} }} />);
  expect(markup).toContain("Incidents");
  expect(markup).toContain(">1</div>");
  expect(markup).not.toContain("1000");
});
