import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PurchaseClient } from "./PurchaseClient";

vi.mock("next/navigation", () => ({ useRouter: () => ({ back: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
vi.mock("@/lib/LanguageContext", () => ({ useLanguage: () => ({ language: "en" }) }));

describe("checkout", () => {
  it("does not show a spinner while idle", () => {
    const markup = renderToStaticMarkup(<PurchaseClient />);
    expect(markup).toContain("Proceed to Checkout");
    expect(markup).not.toContain("spin-animation");
  });
});
