import { describe, it, expect } from "vitest";
import { encodeHistoryPayload, decodeHistoryExpression } from "./history-payload";

const sample = { calcId: "geo_sq", calcTitle: "Square Area", inputs: { s: "5" }, result: "25 sq. units", unit: "sq. units" };

describe("history-payload", () => {
  it("roundtrips a payload through encode/decode", () => {
    expect(decodeHistoryExpression(encodeHistoryPayload(sample))).toEqual(sample);
  });
  it("rejects plain-string legacy rows", () => {
    expect(decodeHistoryExpression("2 + 2 = 4")).toBeNull();
    expect(decodeHistoryExpression(null)).toBeNull();
    expect(decodeHistoryExpression(undefined)).toBeNull();
    expect(decodeHistoryExpression(42)).toBeNull();
  });
  it("rejects JSON with wrong shape", () => {
    expect(decodeHistoryExpression(JSON.stringify({ foo: 1 }))).toBeNull();
  });
});
