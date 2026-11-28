import { describe, expect, it } from "vitest";
import { signupFieldForServerCode, signupFieldInvalid } from "./SignUpClient";

describe("signup field errors", () => {
  it("attributes client validation from the selected field state", () => {
    expect(signupFieldInvalid("email", "email")).toBe(true);
    expect(signupFieldInvalid("password", "email")).toBe(false);
  });

  it("maps server error codes before showing a form-level message", () => {
    expect(signupFieldForServerCode("EMAIL_ALREADY_EXISTS")).toBe("email");
    expect(signupFieldForServerCode("INVALID_PASSWORD")).toBe("password");
    expect(signupFieldForServerCode("RATE_LIMITED")).toBeNull();
  });
});
