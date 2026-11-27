import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const from = vi.fn();
  const retrieve = vi.fn();
  const getState = vi.fn();
  const connect = vi.fn();
  return { from, retrieve, getState, connect };
});

vi.mock("@/lib/supabase-client", () => ({ getSupabaseAdmin: () => ({ from: mocks.from, rpc: vi.fn().mockResolvedValue({ error: null }) }) }));
vi.mock("@/lib/stripe", () => ({ getStripe: () => ({ balance: { retrieve: mocks.retrieve } }) }));
vi.mock("@/lib/admin/state", () => ({ getState: mocks.getState, readMaintenanceState: mocks.getState }));
vi.mock("node:net", () => ({ default: { connect: mocks.connect } }));

let historyRows: { service: string; status: string; latency_ms: number; created_at: string }[] = [];

function chain() {
  const node: Record<string, unknown> = {};
  node.select = () => node;
  node.eq = () => node;
  node.gte = () => node;
  node.order = () => node;
  node.limit = () => Promise.resolve({ data: historyRows, error: null });
  node.insert = () => Promise.resolve({ error: null });
  return node;
}

function request(ip = "10.0.0.1"): Request {
  return new Request("https://app.example/api/status", {
    headers: { "x-forwarded-for": ip },
  });
}

async function loadRoute() {
  vi.resetModules();
  return await import("./route");
}

beforeEach(() => {
  vi.clearAllMocks();
  historyRows = [];
  process.env.SMTP_HOST = "smtp.example";
  process.env.SMTP_PORT = "587";
  delete process.env.DISCORD_BOT_TOKEN;
  delete process.env.NEXT_PUBLIC_URL;
  mocks.from.mockImplementation(() => chain());
  mocks.retrieve.mockResolvedValue({ available: [] });
  mocks.getState.mockReturnValue({
    maintenanceMode: false,
    maintenanceMessage: null,
    uptimeStart: new Date().toISOString(),
    lastCommand: null,
    lastCommandBy: null,
    lastCommandAt: null,
  });
  const socket = {
    once(event: string, cb: () => void) {
      if (event === "connect") queueMicrotask(cb);
      return socket;
    },
    end() {},
    setTimeout() {},
    destroy() {},
  };
  mocks.connect.mockReturnValue(socket);
});

afterEach(() => {
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
});

describe("GET /api/status", () => {
  it("reports nextjs ok from in-process runtime health without any nested fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { GET } = await loadRoute();

    const res = await GET(request());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.checks.nextjs.status).toBe("ok");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("checks only the 4 active services (no discord), never queries bot_heartbeats, and returns operational", async () => {
    const { GET } = await loadRoute();

    const res = await GET(request());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.status).toBe("operational");
    expect("discord" in body.data.checks).toBe(false);
    expect(Object.keys(body.data.checks).sort()).toEqual(["nextjs", "smtp", "stripe", "supabase"]);
    expect(mocks.from).not.toHaveBeenCalledWith("bot_heartbeats");
  });

  it("ignores historical discord error rows in health_checks when computing uptime stats", async () => {
    const nowIso = new Date().toISOString();
    historyRows = [
      { service: "supabase", status: "ok", latency_ms: 10, created_at: nowIso },
      { service: "stripe", status: "ok", latency_ms: 20, created_at: nowIso },
      { service: "smtp", status: "ok", latency_ms: 15, created_at: nowIso },
      { service: "nextjs", status: "ok", latency_ms: 5, created_at: nowIso },
      { service: "discord", status: "error", latency_ms: 0, created_at: nowIso },
    ];
    const { GET } = await loadRoute();

    const res = await GET(request());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.stats["24h"].uptimePct).toBe(100);
    expect(body.data.stats["24h"].incidents).toBe(0);
    expect(body.data.stats["24h"].checks).toBe(4);
    expect("discord" in body.data.stats["24h"].services).toBe(false);
  });

  it("serves a second request inside the TTL from cache without touching any upstream", async () => {
    const { GET } = await loadRoute();

    const first = await GET(request("10.0.0.2"));
    const callsAfterFirst = mocks.from.mock.calls.length;

    const second = await GET(request("10.0.0.3"));
    const secondBody = await second.json();

    expect(first.status).toBe(200);
    expect(callsAfterFirst).toBeGreaterThan(0);
    expect(mocks.from.mock.calls.length).toBe(callsAfterFirst);
    expect(secondBody.data.checks.nextjs.status).toBe("ok");
  });

  it("returns 429 with Retry-After once the per-IP burst limit is exceeded, before any probe runs", async () => {
    const { GET } = await loadRoute();

    for (let i = 0; i < 30; i += 1) {
      expect((await GET(request("10.0.0.9"))).status).toBe(200);
    }
    const callsBeforeLimit = mocks.from.mock.calls.length;

    const limited = await GET(request("10.0.0.9"));
    const body = await limited.json();

    expect(limited.status).toBe(429);
    expect(body.error).toBe("Too many requests");
    expect(Number(limited.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(mocks.from.mock.calls.length).toBe(callsBeforeLimit);
  });
});
