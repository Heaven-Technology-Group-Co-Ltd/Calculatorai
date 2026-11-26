import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  sendAdminLog: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/admin/log-dispatcher", () => ({
  sendAdminLog: mocks.sendAdminLog,
}));

vi.mock("@/lib/supabase-client", () => ({
  getSupabaseAdmin: () => ({ from: mocks.from }),
}));

const SHARED_SECRET = "control-route-test-secret";

async function loadModule() {
  vi.resetModules();
  process.env.ADMIN_API_SHARED_SECRET = SHARED_SECRET;
  const route = await import("./route");
  const hmac = await import("@/lib/admin/hmac");
  return { POST: route.POST, createHmacSignature: hmac.createHmacSignature };
}

describe("POST /api/admin/control", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.DISCORD_ADMIN_IDS;
    delete process.env.ADMIN_DISCORD_IDS;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("succeeds (200) for valid Bot HMAC request without any browser cookie", async () => {
    const { POST, createHmacSignature } = await loadModule();
    process.env.DISCORD_ADMIN_IDS = "discord-admin-1";

    const payload = { action: "get_stats", scope: "system" };
    const rawBody = JSON.stringify(payload);
    const timestamp = String(Date.now());
    const callerId = "discord-admin-1";
    const callerTag = "admin#0001";
    const signature = createHmacSignature(
      JSON.stringify({ ...payload, callerId, callerTag, timestamp }),
      SHARED_SECRET
    );

    const req = new NextRequest("https://app.example/api/admin/control", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-signature": signature,
        "x-timestamp": timestamp,
        "x-caller-id": callerId,
        "x-caller-tag": callerTag,
      },
      body: rawBody,
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.system).toBeDefined();
  });

  it("returns 403 for invalid HMAC signature or unauthorized x-caller-id", async () => {
    const { POST, createHmacSignature } = await loadModule();
    process.env.DISCORD_ADMIN_IDS = "discord-admin-1";

    const payload = { action: "get_stats", scope: "system" };
    const rawBody = JSON.stringify(payload);
    const timestamp = String(Date.now());

    // Invalid signature
    const badSigReq = new NextRequest("https://app.example/api/admin/control", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-signature": "00".repeat(32),
        "x-timestamp": timestamp,
        "x-caller-id": "discord-admin-1",
        "x-caller-tag": "admin#0001",
      },
      body: rawBody,
    });
    const badSigRes = await POST(badSigReq);
    expect(badSigRes.status).toBe(403);

    // Valid signature but caller not in allowlist
    const callerId = "discord-intruder-99";
    const callerTag = "intruder#9999";
    const signature = createHmacSignature(
      JSON.stringify({ ...payload, callerId, callerTag, timestamp }),
      SHARED_SECRET
    );
    const unauthCallerReq = new NextRequest("https://app.example/api/admin/control", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-signature": signature,
        "x-timestamp": timestamp,
        "x-caller-id": callerId,
        "x-caller-tag": callerTag,
      },
      body: rawBody,
    });
    const unauthCallerRes = await POST(unauthCallerReq);
    expect(unauthCallerRes.status).toBe(403);
  });

  it("returns 401 for unauthenticated request with neither HMAC nor admin cookie", async () => {
    const { POST } = await loadModule();

    const req = new NextRequest("https://app.example/api/admin/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_stats", scope: "system" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
