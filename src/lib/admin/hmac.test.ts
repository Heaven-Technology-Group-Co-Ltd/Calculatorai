process.env.ADMIN_API_SHARED_SECRET = "test-secret-batch2";

import { beforeAll, describe, expect, it } from "vitest";
import { createHmac } from "crypto";

let mod: typeof import("./hmac");

beforeAll(async () => {
  mod = await import("./hmac");
});

function sign(signedData: string): string {
  return createHmac("sha256", "test-secret-batch2").update(signedData).digest("hex");
}

describe("verifyHmacSignature", () => {
  it("accepts a freshly signed request", () => {
    const timestamp = String(Date.now());
    const signedData = JSON.stringify({
      action: "ping",
      callerId: "123",
      callerTag: "a#1",
      timestamp,
    });
    expect(mod.verifyHmacSignature('{"action":"ping"}', sign(signedData), timestamp, "123", "a#1")).toBe(true);
  });

  it("rejects replay after the freshness window", () => {
    const timestamp = String(Date.now() - 6 * 60 * 1000);
    const signedData = JSON.stringify({
      action: "ping",
      callerId: "123",
      callerTag: "a#1",
      timestamp,
    });
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
    const signedData = JSON.stringify({
      action: "ping",
      callerId: "123",
      callerTag: "a#1",
      timestamp,
    });
    expect(mod.verifyHmacSignature('{"action":"ping"}', "00", timestamp, "123", "a#1")).toBe(false);
  });
});
