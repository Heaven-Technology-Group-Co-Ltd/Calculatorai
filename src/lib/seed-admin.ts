import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { basename } from "node:path";

export async function seedAdmin(): Promise<void> {
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!adminEmail || !adminEmail.includes("@") || !adminPassword || adminPassword.length < 12) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (at least 12 characters) are required");
  }
  if (!supabaseUrl || !serviceKey) throw new Error("Supabase service credentials are required");
  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: existing, error: lookupError } = await supabase.from("users")
    .select("id").eq("email", adminEmail).maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) return;
  const passwordHash = await bcrypt.hash(adminPassword, 14);
  const { error } = await supabase.from("users").insert({
    name: "Admin", email: adminEmail, password_hash: passwordHash,
    email_verified: new Date().toISOString(),
  });
  if (error) throw error;
}

if (/^seed-admin\.(?:ts|js|mjs|cjs)$/.test(basename(process.argv[1] ?? ""))) {
  seedAdmin().catch((error: unknown) => {
    console.error("Failed to seed admin:", error);
    process.exitCode = 1;
  });
}
