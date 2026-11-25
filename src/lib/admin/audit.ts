import { getSupabaseAdmin } from "../supabase-client";

export interface AuditEntry {
  adminUserId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    // Resolved per call: a module-scope init reads SUPABASE_URL while Next
    // collects page data at build time and fails the build without live env.
    const { error } = await getSupabaseAdmin().from("admin_audit_log").insert({
      admin_user_id: entry.adminUserId,
      action: entry.action,
      target_type: entry.targetType ?? null,
      target_id: entry.targetId ?? null,
      metadata: entry.metadata ?? null,
    });

    if (error) {
      console.error("[AuditLog] Failed to write:", error.message);
    }
  } catch (err) {
    console.error("[AuditLog] Unexpected error:", err);
  }
}
