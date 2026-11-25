import { describe, expect, it } from "vitest";
import { getClientIpFromHeaders } from "./client-ip";

function h(headers: Record<string, string>): Headers {
  return new Headers(headers);
}

describe("getClientIpFromHeaders", () => {
  it("prefers x-nf-client-connection-ip over spoofed x-forwarded-for", () => {
    expect(
      getClientIpFromHeaders(
        h({
          "x-nf-client-connection-ip": "203.0.113.42",
          "x-forwarded-for": "13.37.13.37, 10.0.0.2",
        })
      )
    ).toBe("203.0.113.42");
  });

  // The rightmost XFF hop was appended by the proxy nearest to the app;
  // the first hop is attacker-supplied and must never be the key.
  it("takes the rightmost XFF hop when x-nf-client-connection-ip is absent", () => {
    expect(getClientIpFromHeaders(h({ "x-forwarded-for": "13.37.13.37, 10.0.0.2" }))).toBe("10.0.0.2");
  });

  it("single-hop XFF works", () => {
    expect(getClientIpFromHeaders(h({ "x-forwarded-for": "10.0.0.2" }))).toBe("10.0.0.2");
  });

  it("normalizes IPv4 with port and preserves IPv6 addresses", () => {
    expect(getClientIpFromHeaders(h({ "x-forwarded-for": "1.2.3.4:5678" }))).toBe("1.2.3.4");
    expect(getClientIpFromHeaders(h({ "x-nf-client-connection-ip": "2001:db8::1" }))).toBe("2001:db8::1");
  });

  it("strips port from bracketed IPv6 and preserves IPv4-mapped IPv6 addresses", () => {
    expect(getClientIpFromHeaders(h({ "x-forwarded-for": "[2001:db8::1]:443" }))).toBe("2001:db8::1");
    expect(getClientIpFromHeaders(h({ "x-nf-client-connection-ip": "::ffff:1.2.3.4" }))).toBe("::ffff:1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    expect(getClientIpFromHeaders(h({ "x-real-ip": "10.0.0.9" }))).toBe("10.0.0.9");
  });

  it("returns unknown when all IP headers are absent or empty", () => {
    expect(getClientIpFromHeaders(h({}))).toBe("unknown");
    expect(getClientIpFromHeaders(h({ "x-nf-client-connection-ip": "   ", "x-forwarded-for": " , " }))).toBe("unknown");
  });
});
