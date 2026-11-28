import { describe, expect, it } from "vitest";
import { signupFieldInvalid } from "./SignUpClient";

describe("signup field errors", () => {
  it("marks only the email field for an email format error", () => {
    expect(signupFieldInvalid("email", "broken", "Enter a valid email address")).toBe(true);
    expect(signupFieldInvalid("password", "long-enough", "Enter a valid email address")).toBe(false);
  });

  it("marks both password fields when confirmation does not match", () => {
    expect(signupFieldInvalid("password", "password1", "Passwords do not match")).toBe(true);
    expect(signupFieldInvalid("confirm", "password2", "Passwords do not match")).toBe(true);
    expect(signupFieldInvalid("email", "person@example.com", "Passwords do not match")).toBe(false);
  });
});
