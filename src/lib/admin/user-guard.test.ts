import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ target: vi.fn(), count: vi.fn() }));
vi.mock("@/lib/supabase-client", () => ({ getSupabaseAdmin: () => ({ from: () => ({ select: (_columns: string, options?: unknown) => options ? { eq: () => ({ eq: mocks.count }) } : { eq: () => ({ single: mocks.target }) } }) }) }));
import { assertAdminMutationAllowed } from "./user-guard";
describe("administrator protection", () => {
  beforeEach(() => { mocks.target.mockResolvedValue({ data: { is_admin: true, is_banned: false }, error: null }); mocks.count.mockResolvedValue({ count: 1, error: null }); });
  it("refuses self ban or demotion", async () => { await expect(assertAdminMutationAllowed("a", "a", { is_banned: true })).rejects.toThrow("own administrator"); });
  it("refuses removal of the last active administrator", async () => { await expect(assertAdminMutationAllowed("a", "b", { is_admin: false })).rejects.toThrow("last active administrator"); });
  it("allows removal when another active administrator exists", async () => { mocks.count.mockResolvedValue({ count: 2, error: null }); await expect(assertAdminMutationAllowed("a", "b", { is_banned: true })).resolves.toBeUndefined(); });
  it("allows profile changes without inspecting administrator counts", async () => {
    const profileChange = { name: "Updated", plan: "pro", is_admin: undefined };
    await expect(assertAdminMutationAllowed("a", "b", profileChange)).resolves.toBeUndefined();
    expect(mocks.target).not.toHaveBeenCalled();
    expect(mocks.count).not.toHaveBeenCalled();
  });
});
