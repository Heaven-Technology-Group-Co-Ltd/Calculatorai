import { describe, expect, it } from "vitest";
import { ClientApiError } from "@/lib/api-client";
import { forgotPasswordError } from "./LoginClient";

describe("forgot password errors", () => {
  it("shows the server error for a rejected request", () => {
    expect(forgotPasswordError(new ClientApiError("Please retry in a minute", 429, "RATE_LIMITED"), "en")).toBe("Please retry in a minute");
  });
  it("distinguishes an offline transport failure", () => {
    expect(forgotPasswordError(new TypeError("Failed to fetch"), "en")).toBe("Network error. Unable to reach server.");
  });
});
