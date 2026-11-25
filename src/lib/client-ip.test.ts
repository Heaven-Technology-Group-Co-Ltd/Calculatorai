import { describe, expect, it } from "vitest";
import { getClientIpFromHeaders } from "./client-ip";

function h(headers: Record<string, string>): Headers {
  return new Headers(headers);
}

describe("getClientIpFromHeaders", () => {
  // The rightmost XFF hop was appended by the proxy nearest to the app;
  // the first hop is attacker-supplied and must never be the key.
  it("takes the rightmost XFF hop, not the client-supplied first", () => {
    expect(getClientIpFromHeaders(h({ "x-forwarded-for": "13.37.13.37, 10.0.0.2" }))).toBe("10.0.0.2");
  });

  it("single-hop XFF works", () => {
    expect(getClientIpFromHeaders(h({ "x-forwarded-for": "10.0.0.2" }))).toBe("10.0.0.2");
  });

  it("falls back to x-real-ip", () => {
    expect(getClientIpFromHeaders(h({ "x-real-ip": "10.0.0.9" }))).toBe("10.0.0.9");
  });

  it("no headers → unknown", () => {
    expect(getClientIpFromHeaders(h({}))).toBe("unknown");
  });
});
