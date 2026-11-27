import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserActionDialog } from "./UserActionDialog";

const actionState = vi.hoisted(() => ({ submitting: false, error: null as string | null, code: null as string | null }));
vi.mock("@/hooks/useAction", () => ({ useAction: () => ({ ...actionState, run: vi.fn() }) }));
vi.mock("../i18n/useDashboardT", () => ({ useDashboardT: () => ({ t: (key: string) => ({ "dashboard.modal.plan.basic": "Basic plan", "dashboard.modal.plan.pro": "Pro plan", "dashboard.modal.plan.enterprise": "Enterprise plan", "dashboard.modal.plan.changing": "Changing plan", "dashboard.error.rateLimited": "Please try again later" } as Record<string, string>)[key] ?? key }) }));
const user = { id: "1", email: "user@example.com", name: "User", status: "active" as const, plan: "basic", created_at: "2026-01-01", last_seen_at: null };

describe("UserActionDialog", () => {
  beforeEach(() => { actionState.submitting = false; actionState.error = null; actionState.code = null; });
  it.each(["ban", "message", "plan"] as const)("renders %s as a native dialog", (action) => {
    const markup = renderToStaticMarkup(<UserActionDialog action={action} user={user} onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(markup).toContain("<dialog");
    expect(markup).toContain('aria-modal="true"');
  });
  it("uses the shared message length limit", () => {
    const markup = renderToStaticMarkup(<UserActionDialog action="message" user={user} onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(markup).toContain('maxLength="2000"');
  });
  it("localizes plan labels and busy text", () => {
    actionState.submitting = true;
    const markup = renderToStaticMarkup(<UserActionDialog action="plan" user={user} onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(markup).toContain('value="basic" selected="">Basic plan</option>');
    expect(markup).toContain("Changing plan");
  });
  it("localizes rate limit errors rather than exposing technical text", () => {
    actionState.error = "raw server message"; actionState.code = "RATE_LIMITED";
    const markup = renderToStaticMarkup(<UserActionDialog action="ban" user={user} onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(markup).toContain("Please try again later");
    expect(markup).not.toContain("raw server message");
  });
});
