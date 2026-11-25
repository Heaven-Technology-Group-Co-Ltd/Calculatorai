/**
 * Session Revocation Store
 *
 * Provides the ability to invalidate JWT sessions before they expire.
 * Since JWTs can't be "deleted", we store a revocation timestamp per user.
 * On each admin API call, we check if the JWT was issued before the
 * revocation time — if so, the session is considered invalid.
 *
 * This enables:
 *  - Immediate logout of specific admin users
 *  - Force re-login after password change
 *  - Emergency session kill switch
 */

import { getSupabaseAdmin } from "../supabase-client";

function getSupabase() {
  return getSupabaseAdmin();
}

const supabase = {
  from: (table: string) => getSupabase().from(table),
};

/**
 * Invalidate all sessions for a user.
 * Any JWT issued before this timestamp will be rejected.
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  const { error } = await supabase
    .from("user_session_revocations")
    .upsert({
      user_id: userId,
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error("[SessionRevocation] Failed to revoke sessions:", error);
    throw new Error("Failed to revoke sessions");
  }
}

/**
 * Check if a user's JWT session has been revoked.
 * Returns true if the session is still valid, false if revoked.
 */
export async function isSessionValid(
  userId: string,
  tokenIat: number // JWT iat (issued-at) claim in seconds
): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_session_revocations")
    .select("revoked_at")
    .eq("user_id", userId)
    .single();

  // PostgREST PGRST116: .single() with zero rows is the expected "no
  // revocation record" case, not a database failure.
  if (error && error.code !== "PGRST116") {
    throw error;
  }

  if (!data) return true; // No revocation record = valid

  const revokedAtMs = new Date(data.revoked_at).getTime();
  const issuedAtMs = tokenIat * 1000; // Convert seconds to ms

  return issuedAtMs >= revokedAtMs; // Token issued after revocation = valid
}

/**
 * Clear the revocation record (restore access without requiring re-login).
 */
export async function restoreUserSessions(userId: string): Promise<void> {
  await supabase
    .from("user_session_revocations")
    .delete()
    .eq("user_id", userId);
}
