import { getSupabaseAdmin } from "@/lib/supabase-client";

export async function guardAdminChange(adminId: string, targetId: string, change: { is_admin?: boolean; is_banned?: boolean }): Promise<string | null> {
  if (change.is_banned !== true && change.is_admin !== false) return null;
  if (targetId === adminId) return "Cannot ban or demote your own administrator account";
  const client = getSupabaseAdmin();
  const { data: target, error } = await client.from("users").select("is_admin, is_banned").eq("id", targetId).single();
  if (error) throw new Error(`Unable to inspect target: ${error.message}`);
  if (!target.is_admin || target.is_banned) return null;
  const { count, error: countError } = await client.from("users").select("id", { count: "exact", head: true })
    .eq("is_admin", true).eq("is_banned", false);
  if (countError || count === null) throw new Error("Unable to count active administrators");
  return count <= 1 ? "Refusing to ban or demote the last active administrator" : null;
}
