import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AdminGateError } from "@/lib/admin/auth-middleware";
import { ApiError, toErrorResponse } from "./api-response";

describe("API error responses", () => {
  it.each([
    [ApiError.badRequest("bad"), 400], [ApiError.unauthorized("login"), 401],
    [ApiError.forbidden("denied"), 403], [ApiError.notFound("missing"), 404],
    [ApiError.unprocessable("invalid"), 422], [ApiError.tooManyRequests("slow", { "Retry-After": "5" }), 429],
    [ApiError.internal("error"), 500], [ApiError.unavailable("offline"), 503],
  ])("preserves the domain status", async (error, status) => {
    const response = toErrorResponse(error);
    expect(response.status).toBe(status);
    expect((await response.json()).error).toBe(error.message);
    if (status === 429) expect(response.headers.get("Retry-After")).toBe("5");
  });

  it("preserves unavailable administrator gates", () => {
    const error = new AdminGateError({ kind: "unavailable", status: 503, message: "offline" });
    expect(toErrorResponse(error).status).toBe(503);
  });

  it("maps schema failures without exposing the submitted value", async () => {
    const parsed = z.number().safeParse("secret");
    if (parsed.success) throw new Error("Expected validation failure");
    const response = toErrorResponse(parsed.error);
    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain("secret");
  });
});
