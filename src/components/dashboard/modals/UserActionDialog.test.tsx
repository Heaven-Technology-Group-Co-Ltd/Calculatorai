import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { UserActionDialog } from "./UserActionDialog";

vi.mock("../i18n/useDashboardT", () => ({ useDashboardT: () => ({ t: (key: string) => key }) }));
const user = { id: "1", email: "user@example.com", name: "User", status: "active" as const, plan: "basic", created_at: "2026-01-01", last_seen_at: null };

describe("UserActionDialog", () => {
  it.each(["ban", "message", "plan"] as const)("renders the %s action as a native dialog", (action) => {
    const markup = renderToStaticMarkup(<UserActionDialog action={action} user={user} onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(markup).toContain("<dialog");
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain('id="user-action-title"');
  });
  it("uses the shared message length limit", () => {
    const markup = renderToStaticMarkup(<UserActionDialog action="message" user={user} onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(markup).toContain('maxLength="2000"');
  });
});
