import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ target: vi.fn(), count: vi.fn() }));
vi.mock("@/lib/supabase-client", () => ({ getSupabaseAdmin: () => ({ from: () => ({ select: (_columns: string, options?: unknown) => options ? { eq: () => ({ eq: mocks.count }) } : { eq: () => ({ single: mocks.target }) } }) }) }));
import { guardAdminChange } from "./user-guard";
describe("administrator protection", () => {
  beforeEach(() => { mocks.target.mockResolvedValue({ data: { is_admin: true, is_banned: false }, error: null }); mocks.count.mockResolvedValue({ count: 1, error: null }); });
  it("refuses self ban or demotion", async () => { expect(await guardAdminChange("a", "a", { is_banned: true })).toContain("own administrator"); });
  it("refuses removal of the last active administrator", async () => { expect(await guardAdminChange("a", "b", { is_admin: false })).toContain("last active administrator"); });
  it("allows removal when another active administrator exists", async () => { mocks.count.mockResolvedValue({ count: 2, error: null }); expect(await guardAdminChange("a", "b", { is_banned: true })).toBeNull(); });
});
