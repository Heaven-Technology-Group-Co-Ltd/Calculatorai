import { beforeAll, describe, expect, it, vi } from "vitest";
import { ADMIN_CONTROL_ACTIONS, type AdminControlRequest } from "./admin-control";

let signRequest: typeof import("../../discord-bot/src/lib/hmac").signRequest;
let verifyHmacSignature: typeof import("@/lib/admin/hmac").verifyHmacSignature;

beforeAll(async () => {
  vi.resetModules();
  process.env.ADMIN_API_SHARED_SECRET = "contract-test-secret";
  ({ signRequest } = await import("../../discord-bot/src/lib/hmac"));
  ({ verifyHmacSignature } = await import("@/lib/admin/hmac"));
});

const commands: AdminControlRequest[] = [
  { action: "get_stats", scope: "all" },
  { action: "toggle_maintenance", enabled: true },
  { action: "broadcast", content: "hello", target: "all" },
];

describe("shared admin control signing", () => {
  it.each(commands)("signs and verifies $action", (command) => {
    expect(ADMIN_CONTROL_ACTIONS).toContain(command.action);
    const rawBody = JSON.stringify(command);
    const signed = signRequest(command, "123", "admin#1");
    expect(verifyHmacSignature(rawBody, signed.signature, signed.timestamp, "123", "admin#1")).toBe(true);
    expect(verifyHmacSignature(rawBody + " ", signed.signature, signed.timestamp, "123", "admin#1")).toBe(false);
    expect(verifyHmacSignature(rawBody, signed.signature, String(Number(signed.timestamp) + 1), "123", "admin#1")).toBe(false);
    expect(verifyHmacSignature(rawBody, signed.signature, signed.timestamp, "124", "admin#1")).toBe(false);
    expect(verifyHmacSignature(rawBody, signed.signature, signed.timestamp, "123", "other")).toBe(false);
  });
});
