/**
 * Shared Supabase Admin Client Factory
 *
 * Creates a SINGLE Supabase admin client using the service role key.
 * All API routes MUST import from this module instead of creating
 * inline `createClient()` calls.
 *
 * SECURITY: This client has admin privileges (row-level security bypass).
 * Only use in server-side API routes — NEVER import in client components.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function getSupabaseUrl(): string {
  const url = process.env.SUPABASE_URL;
  if (!url) throw new Error("SUPABASE_URL is not set");
  return url;
}

function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return key;
}

let cachedClient: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase admin client.
 * Uses the service_role key to bypass RLS.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cachedClient) return cachedClient;
  cachedClient = createClient(getSupabaseUrl(), getServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return cachedClient;
}
