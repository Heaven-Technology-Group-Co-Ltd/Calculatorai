import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const from = vi.fn();
  const retrieve = vi.fn();
  const getState = vi.fn();
  const connect = vi.fn();
  return { from, retrieve, getState, connect };
});

vi.mock("@/lib/supabase-client", () => ({ getSupabaseAdmin: () => ({ from: mocks.from }) }));
vi.mock("@/lib/stripe", () => ({ getStripe: () => ({ balance: { retrieve: mocks.retrieve } }) }));
vi.mock("@/lib/admin/state", () => ({ getState: mocks.getState }));
vi.mock("node:net", () => ({ default: { connect: mocks.connect } }));

let heartbeat: { last_seen: string } | null = null;

function chain() {
  const node: Record<string, unknown> = {};
  node.select = () => node;
  node.eq = () => node;
  node.gte = () => node;
  node.order = () => node;
  node.limit = () => Promise.resolve({ data: [], error: null });
  node.insert = () => Promise.resolve({ error: null });
  node.maybeSingle = () => Promise.resolve({ data: heartbeat, error: null });
  node.single = () => Promise.resolve({ data: heartbeat, error: null });
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
  heartbeat = { last_seen: new Date().toISOString() };
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

  it("marks discord ok when the bot heartbeat is fresh and no bot token exists in the web env", async () => {
    const { GET } = await loadRoute();

    const body = await (await GET(request())).json();

    expect(process.env.DISCORD_BOT_TOKEN).toBeUndefined();
    expect(body.data.checks.discord.status).toBe("ok");
    expect(body.data.status).toBe("operational");
  });

  it("marks discord error when the bot heartbeat is older than the 2h threshold", async () => {
    heartbeat = { last_seen: new Date(Date.now() - 3 * 3_600_000).toISOString() };
    const { GET } = await loadRoute();

    const body = await (await GET(request())).json();

    expect(body.data.checks.discord.status).toBe("error");
    expect(body.data.checks.discord.message).toBe("Bot last seen 3h ago");
    expect(body.data.status).toBe("degraded");
  });

  it("marks discord error when no heartbeat row exists", async () => {
    heartbeat = null;
    const { GET } = await loadRoute();

    const body = await (await GET(request())).json();

    expect(body.data.checks.discord.status).toBe("error");
    expect(body.data.checks.discord.message).toBe("No bot heartbeat recorded");
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
