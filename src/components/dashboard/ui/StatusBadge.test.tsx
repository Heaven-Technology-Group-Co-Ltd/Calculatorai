import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { StatusBadge } from "./StatusBadge";

vi.mock("../i18n/useDashboardT", () => ({ useDashboardT: () => ({ t: (key: string) => ({ "dashboard.status.active": "Active", "dashboard.status.banned": "Banned", "dashboard.status.unverified": "Unverified" } as Record<string, string>)[key] }) }));

describe("user status text", () => {
  it.each([["active", "Active"], ["banned", "Banned"], ["unverified", "Unverified"]] as const)("renders %s visibly", (status, label) => {
    expect(renderToStaticMarkup(<StatusBadge status={status} />)).toContain(label);
  });
});
