import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FormField } from "./FormField";

describe("FormField", () => {
  it("connects invalid inputs to their hint and error text", () => {
    const markup = renderToStaticMarkup(createElement(FormField, {
      id: "email",
      label: "Email",
      hint: "Use your account email",
      error: "Email is invalid",
      type: "email",
    }));
    const describedBy = markup.match(/aria-describedby="([^"]+)"/)?.[1] ?? "";
    const errorId = markup.match(/id="([^"]+-error)"/)?.[1];

    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain("inputError");
    expect(errorId).toBeTruthy();
    expect(describedBy).toContain(errorId);
    expect(markup).toContain('role="alert"');
  });

  it("does not mark valid inputs as invalid", () => {
    const markup = renderToStaticMarkup(createElement(FormField, {
      id: "name",
      label: "Name",
      type: "text",
    }));

    expect(markup).not.toContain('aria-invalid="true"');
  });

  it("renders an optional label action and end adornment", () => {
    const markup = renderToStaticMarkup(createElement(FormField, {
      id: "password",
      label: "Password",
      labelAction: createElement("a", { href: "/forgot-password" }, "Forgot password?"),
      endAdornment: createElement("button", { type: "button", "aria-label": "Show password" }, "Show"),
      type: "password",
    }));

    expect(markup).toContain("Forgot password?");
    expect(markup).toContain('aria-label="Show password"');
  });
});
