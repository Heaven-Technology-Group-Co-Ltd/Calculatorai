/**
 * Admin Seed Script
 *
 * รัน SQL ด้านล่างใน Supabase SQL Editor:
 *
 * -- Hash ของ password "Admin@123456" ด้วย bcrypt (cost 12)
 * -- ใช้ gen_salt + crypt function ของ PostgreSQL
 *
 * insert into public.users (name, email, password_hash, email_verified)
 * values (
 *   'Admin',
 *   'admin@calculatorai.click',
 *   crypt('Admin@123456', gen_salt('bf', 12)),
 *   now()
 * )
 * on conflict (email) do nothing;
 *
 *
 * หรือจะรันด้วย Node.js (ต้องใส่ env ก่น):
 * SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx src/lib/seed-admin-run.ts
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabase) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
    }
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return supabase;
}

async function seedAdmin() {
  const adminEmail = "admin@calculatorai.click";
  const adminPassword = "Admin@123456";
  const adminName = "Admin";

  const { data: existing } = await getSupabase()
    .from("users")
    .select("id")
    .eq("email", adminEmail)
    .single();

  if (existing) {
    console.log("✅ Admin user already exists!");
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(adminPassword, 14);

  // Use Supabase SDK insert — values are parameterized automatically, no SQL injection risk
  const { error } = await getSupabase().from("users").insert({
    name: adminName,
    email: adminEmail,
    password_hash: passwordHash,
    email_verified: new Date().toISOString(),
  });

  if (error) {
    console.error("❌ Failed to create admin:", error.message);
    process.exit(1);
  }

  console.log("✅ Admin user created!");
  console.log("📧 Email: admin@calculatorai.click");
  console.log("🔑 Password: Admin@123456");
}

seedAdmin().catch((err) => {
  console.error("❌ Failed to seed admin:", err);
  process.exit(1);
});
