import { getSupabaseAdmin } from "@/lib/supabase-client";
import { ApiError } from "@/lib/api-response";

export async function assertAdminMutationAllowed(adminId: string, targetId: string, change: { is_admin?: boolean; is_banned?: boolean }): Promise<void> {
  if (change.is_banned !== true && change.is_admin !== false) return;
  if (targetId === adminId) throw ApiError.forbidden("Cannot ban or demote your own administrator account");
  const client = getSupabaseAdmin();
  const { data: target, error } = await client.from("users").select("is_admin, is_banned").eq("id", targetId).single();
  if (error) throw new Error(`Unable to inspect target: ${error.message}`);
  if (!target.is_admin || target.is_banned) return;
  const { count, error: countError } = await client.from("users").select("id", { count: "exact", head: true })
    .eq("is_admin", true).eq("is_banned", false);
  if (countError || count === null) throw new Error("Unable to count active administrators");
  if (count <= 1) throw ApiError.forbidden("Refusing to ban or demote the last active administrator");
}
