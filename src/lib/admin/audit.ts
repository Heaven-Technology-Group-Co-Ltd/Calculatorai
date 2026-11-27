import { getSupabaseAdmin } from "../supabase-client";

export interface AuditEntry {
  adminUserId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

export async function withAuditLog<T>(entry: AuditEntry, mutate: () => Promise<T>): Promise<T> {
  const client = getSupabaseAdmin();
  const { data: auditRow, error } = await client.from("admin_audit_log").insert({
    admin_user_id: entry.adminUserId, action: entry.action, target_type: entry.targetType ?? null,
    target_id: entry.targetId ?? null, metadata: entry.metadata ?? null,
  }).select("id").single();
  if (error || !auditRow) throw new Error(`Audit log write failed: ${error?.message ?? "missing id"}`);
  try {
    return await mutate();
  } catch (mutationError) {
    try {
      const { error: deleteError } = await client.from("admin_audit_log").delete().eq("id", auditRow.id);
      if (deleteError) console.error("[AuditLog] Compensation failed:", deleteError);
    } catch (deleteError) {
      console.error("[AuditLog] Compensation failed:", deleteError);
    }
    throw mutationError;
  }
}
