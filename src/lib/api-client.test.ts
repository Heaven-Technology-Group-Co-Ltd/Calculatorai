import { afterEach, describe, expect, it, vi } from "vitest";
import { apiGet, apiPost, ClientApiError } from "./api-client";

afterEach(() => vi.unstubAllGlobals());

describe("client API envelope", () => {
  it("unwraps a successful envelope with extra metadata", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ success: true, data: { name: "test" }, version: 1 })));
    await expect(apiGet("/test")).resolves.toEqual({ name: "test" });
  });

  it("preserves paginated user metadata", async () => {
    const page = { success: true, data: [], total: 0, page: 1, per_page: 25 };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(page)));
    await expect(apiGet("/test")).resolves.toEqual(page);
  });

  it("preserves error details and retry header", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ success: false, error: "Slow down", code: "RATE_LIMITED", details: { wait: true } }, { status: 429, headers: { "Retry-After": "10" } })));
    const failure = await apiPost("/test").catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(ClientApiError);
    expect(failure).toMatchObject({ message: "Slow down", code: "RATE_LIMITED", status: 429, retryAfter: "10", details: { wait: true } });
  });
});
