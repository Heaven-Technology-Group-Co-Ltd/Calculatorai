import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ADMIN_CONTROL_ACTIONS, buildAdminCanonicalPayload } from "./admin-control";

describe("admin control contract", () => {
  it("keeps the standalone bot contract identical", () => {
    const webSource = readFileSync(fileURLToPath(new URL("./admin-control.ts", import.meta.url)), "utf8").replace(/\r\n/g, "\n");
    const botSource = readFileSync(fileURLToPath(new URL("../../discord-bot/src/contracts/admin-control.ts", import.meta.url)), "utf8").replace(/\r\n/g, "\n");
    expect(botSource).toBe(webSource);
  });
  it("pins the canonical bytes and HMAC digest", () => {
    const canonical = '["1700000000000","123","a#1","{\\"action\\":\\"ping\\"}"]';
    expect(buildAdminCanonicalPayload("1700000000000", "123", '{"action":"ping"}', "a#1")).toBe(canonical);
    expect(createHmac("sha256", "test-secret-batch2").update(canonical).digest("hex")).toBe("2da04f732f2dc07731af7add2860aa2569cf742e8bb1bad80040765cfbeff1fe");
    expect(ADMIN_CONTROL_ACTIONS).toEqual(["get_stats", "toggle_maintenance", "broadcast"]);
  });
});
