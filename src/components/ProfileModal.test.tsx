import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ProfileModal } from "./ProfileModal";

vi.mock("@/hooks/useDialog", () => ({ useDialog: () => ({ dialogRef: { current: null }, dialogProps: {} }) }));
const baseProps = { show: true, onClose: vi.fn(), onSignOut: vi.fn(), lang: "en" as const };
describe("account profile", () => {
  it("shows the account plan and admin link for an administrator", () => {
    const markup = renderToStaticMarkup(<ProfileModal {...baseProps} user={{ name: "Name", plan: "yearly", isAdmin: true }} />);
    expect(markup).toContain("Premium");
    expect(markup).toContain('href="/dashboard"');
  });
  it("does not show an admin link to other users", () => {
    const markup = renderToStaticMarkup(<ProfileModal {...baseProps} user={{ name: "Name", plan: "free", isAdmin: false }} />);
    expect(markup).toContain("Free");
    expect(markup).not.toContain('href="/dashboard"');
  });
});
