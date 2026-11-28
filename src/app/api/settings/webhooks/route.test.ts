import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ from: vi.fn(), audit: vi.fn() }));
vi.mock("@/lib/admin/with-admin", () => ({ withAdmin: (_request: unknown, callback: (context: unknown) => unknown) => callback({ supabase: { from: mocks.from }, audit: mocks.audit }) }));
import { GET, POST } from "./route";

describe("webhook administration", () => {
  it("masks secrets and deduplicates stored URLs in GET", async () => {
    const url = "https://discord.com/api/webhooks/123/secret-token-1234";
    mocks.from.mockReturnValueOnce({ select: () => ({ order: async () => ({ data: [{ id: 1, url }, { id: 2, url }], error: null }) }) });
    const response = await GET(new NextRequest("https://example.com/api/settings/webhooks"));
    const body = await response.text();
    expect(body).not.toContain("secret-token");
    expect(JSON.parse(body).data).toHaveLength(1);
  });
  it("rejects an existing URL before writing", async () => {
    mocks.audit.mockClear();
    mocks.from.mockReturnValueOnce({ select: () => ({ eq: () => ({ limit: async () => ({ data: [{ id: 1 }], error: null }) }) }) });
    const response = await POST(new NextRequest("https://example.com/api/settings/webhooks", { method: "POST", body: JSON.stringify({ name: "test", url: "https://discord.com/api/webhooks/123/secret-token-1234", event_type: "custom" }) }));
    expect(response.status).toBe(409);
    expect(mocks.audit).not.toHaveBeenCalled();
  });
});
