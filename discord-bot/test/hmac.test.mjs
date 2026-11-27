import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

process.env.ADMIN_API_SHARED_SECRET = "test-secret-batch2";
const { signRequest } = await import("../dist/lib/hmac.js");
const canonical = '["1700000000000","123","a#1","{\\"action\\":\\"ping\\"}"]';
const golden = "2da04f732f2dc07731af7add2860aa2569cf742e8bb1bad80040765cfbeff1fe";

test("compiled bot signer matches the independent golden vector", (context) => {
  context.mock.method(Date, "now", () => 1700000000000);
  const signed = signRequest({ action: "ping" }, "123", "a#1");
  const independent = createHmac("sha256", "test-secret-batch2").update(canonical).digest("hex");
  assert.equal(signed.signature, golden);
  assert.equal(signed.signature, independent);
  assert.deepEqual({ timestamp: signed.timestamp, callerId: signed.callerId, callerTag: signed.callerTag }, { timestamp: "1700000000000", callerId: "123", callerTag: "a#1" });
});

test("compiled bot signature binds body, timestamp, caller id and caller tag", (context) => {
  const clock = context.mock.method(Date, "now", () => 1700000000000);
  const original = signRequest({ action: "ping" }, "123", "a#1").signature;
  assert.notEqual(signRequest({ action: "ping " }, "123", "a#1").signature, original);
  assert.notEqual(signRequest({ action: "ping" }, "124", "a#1").signature, original);
  assert.notEqual(signRequest({ action: "ping" }, "123", "a#2").signature, original);
  clock.mock.mockImplementation(() => 1700000000001);
  assert.notEqual(signRequest({ action: "ping" }, "123", "a#1").signature, original);
});
