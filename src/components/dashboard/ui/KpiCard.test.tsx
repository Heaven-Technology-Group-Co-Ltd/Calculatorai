import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { KpiCard } from "./KpiCard";

describe("KPI values", () => {
  it.each([NaN, Infinity, -Infinity])("uses a neutral value for %s", (value) => {
    const markup = renderToStaticMarkup(<KpiCard icon={null} label="Rate" value={value} format="percent" />);
    expect(markup).toContain("—");
    expect(markup).not.toContain("NaN");
    expect(markup).not.toContain("Infinity");
  });
});
