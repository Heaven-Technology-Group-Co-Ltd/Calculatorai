process.env.ADMIN_API_SHARED_SECRET = "test-secret-batch2";

import { beforeAll, describe, expect, it } from "vitest";
import { createHmac } from "crypto";
import { buildAdminCanonicalPayload } from "@/contracts/admin-control";

let mod: typeof import("./hmac");

beforeAll(async () => {
  mod = await import("./hmac");
});

function sign(signedData: string): string {
  return createHmac("sha256", "test-secret-batch2").update(signedData).digest("hex");
}

describe("verifyHmacSignature", () => {
  it("pins the wire format and golden signature", () => {
    const canonical = '["1700000000000","123","a#1","{\\"action\\":\\"ping\\"}"]';
    expect(buildAdminCanonicalPayload("1700000000000", "123", '{"action":"ping"}', "a#1")).toBe(canonical);
    expect(sign(canonical)).toBe("2da04f732f2dc07731af7add2860aa2569cf742e8bb1bad80040765cfbeff1fe");
  });
  it("accepts a freshly signed request", () => {
    const timestamp = String(Date.now());
    const signedData = `["${timestamp}","123","a#1","{\\"action\\":\\"ping\\"}"]`;
    expect(mod.verifyHmacSignature('{"action":"ping"}', sign(signedData), timestamp, "123", "a#1")).toBe(true);
  });

  it.each([
    '{"action":"get_stats","scope":"all"}',
    '{"action":"toggle_maintenance","enabled":true}',
    '{"action":"broadcast","content":"hello","target":"all"}',
  ])("rejects tampering for %s", (rawBody) => {
    const timestamp = String(Date.now());
    const signedData = `["${timestamp}","123","a#1",${JSON.stringify(rawBody)}]`;
    const signature = sign(signedData);
    expect(mod.verifyHmacSignature(rawBody, signature, timestamp, "123", "a#1")).toBe(true);
    expect(mod.verifyHmacSignature(rawBody + " ", signature, timestamp, "123", "a#1")).toBe(false);
    expect(mod.verifyHmacSignature(rawBody, signature, String(Number(timestamp) + 1), "123", "a#1")).toBe(false);
    expect(mod.verifyHmacSignature(rawBody, signature, timestamp, "124", "a#1")).toBe(false);
    expect(mod.verifyHmacSignature(rawBody, signature, timestamp, "123", "a#2")).toBe(false);
  });

  it("rejects replay after the freshness window", () => {
    const timestamp = String(Date.now() - 6 * 60 * 1000);
    const signedData = `["${timestamp}","123","a#1","{\\"action\\":\\"ping\\"}"]`;
    expect(mod.verifyHmacSignature('{"action":"ping"}', sign(signedData), timestamp, "123", "a#1")).toBe(false);
  });

  it("rejects a captured request replayed with a forged fresh timestamp header", () => {
    // Old-format signature: computed over signed data WITHOUT the timestamp.
    const oldSignedData = JSON.stringify({ action: "ping", callerId: "123", callerTag: "a#1" });
    const freshTimestamp = String(Date.now());
    expect(
      mod.verifyHmacSignature('{"action":"ping"}', sign(oldSignedData), freshTimestamp, "123", "a#1")
    ).toBe(false);
  });

  it("rejects garbage signature", () => {
    const timestamp = String(Date.now());
    const signedData = `["${timestamp}","123","a#1","{\\"action\\":\\"ping\\"}"]`;
    expect(mod.verifyHmacSignature('{"action":"ping"}', "00", timestamp, "123", "a#1")).toBe(false);
  });
});
