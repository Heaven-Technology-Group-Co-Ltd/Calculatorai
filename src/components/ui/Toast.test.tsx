import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ToastNotice, ToastProvider, TOAST_DURATION_MS } from "./Toast";

describe("ToastProvider", () => {
  it("renders its content without an empty status notice", () => {
    const markup = renderToStaticMarkup(createElement(ToastProvider, null, createElement("p", null, "Dashboard")));
    expect(markup).toContain("Dashboard");
    expect(markup).not.toContain('role="status"');
  });

  it("renders a polite status notice with a dismiss control and four-second lifetime", () => {
    const markup = renderToStaticMarkup(createElement(ToastNotice, {
      notice: { id: 1, message: "Saved", tone: "success" },
      onDismiss: () => undefined,
    }));
    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('aria-label="Dismiss notification"');
    expect(TOAST_DURATION_MS).toBe(4000);
  });

  it("assigns deterministic sequential notice identifiers", () => {
    const source = readFileSync("src/components/ui/Toast.tsx", "utf8");
    expect(source).toContain("let nextToastId = 0;");
    expect(source).toContain("const id = ++nextToastId;");
    expect(source).not.toContain("Math.random()");
  });
});
