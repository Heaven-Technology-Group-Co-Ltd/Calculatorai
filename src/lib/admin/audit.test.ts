import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ insert: vi.fn(), remove: vi.fn() }));
vi.mock("../supabase-client", () => ({ getSupabaseAdmin: () => ({ from: () => ({ insert: mocks.insert, delete: () => ({ eq: mocks.remove }) }) }) }));
import { withAuditLog } from "./audit";
const entry = { adminUserId: "a", action: "ban" };
describe("write-ahead audit", () => {
  it("does not mutate when the audit insert fails", async () => {
    mocks.insert.mockReturnValue({ select: () => ({ single: async () => ({ data: null, error: { message: "offline" } }) }) });
    const mutate = vi.fn(); await expect(withAuditLog(entry, mutate)).rejects.toThrow("Audit log write failed"); expect(mutate).not.toHaveBeenCalled();
  });
  it("removes the audit record and rethrows when the mutation fails", async () => {
    mocks.insert.mockReturnValue({ select: () => ({ single: async () => ({ data: { id: "audit-1" }, error: null }) }) });
    mocks.remove.mockResolvedValue({ error: null });
    await expect(withAuditLog(entry, async () => { throw new Error("mutation failed"); })).rejects.toThrow("mutation failed");
    expect(mocks.remove).toHaveBeenCalledWith("id", "audit-1");
  });
});
