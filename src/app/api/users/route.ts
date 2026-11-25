import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-client";
import { requireAdmin, adminGateErrorResponse } from "@/lib/admin/auth-middleware";
import { UserListQuerySchema, sanitizeSearchTerm } from "@/lib/admin/schemas";
import { successResponse, badRequestResponse, unauthorizedResponse, forbiddenResponse, serverErrorResponse, notFoundResponse } from "@/lib/api-response";

/**
 * GET /api/users
 * List users with optional search, filter, and pagination.
 * Admin only.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    let admin: { id: string; name: string | null; email: string | null };
    try {
      admin = await requireAdmin(request);
    } catch (__err){
      return adminGateErrorResponse(__err) ?? forbiddenResponse("Admin access required");
    }

    const url = new URL(request.url);
    const query = UserListQuerySchema.parse({
      search: url.searchParams.get("search") ?? "",
      filter: url.searchParams.get("filter") ?? "all",
      page: url.searchParams.get("page") ?? 1,
      per_page: url.searchParams.get("per_page") ?? 20,
    });

    const offset = (query.page - 1) * query.per_page;

    let dbQuery = supabase
      .from("users")
      .select("id, name, email, image, created_at, is_banned, banned_at, banned_reason, last_active_at, is_admin", { count: "exact" });

    if (query.search) {
      const term = sanitizeSearchTerm(query.search);
      dbQuery = dbQuery.or(`name.ilike."%${term}%",email.ilike."%${term}%"`);
    }

    if (query.filter === "banned") dbQuery = dbQuery.eq("is_banned", true);
    else if (query.filter === "active") {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
      dbQuery = dbQuery.gte("last_active_at", sevenDaysAgo);
    } else if (query.filter === "paid") {
      const { data: paidUsers } = await supabase.from("subscriptions").select("user_id").eq("status", "active");
      const paidIds = (paidUsers ?? []).map((s) => s.user_id);
      if (paidIds.length > 0) dbQuery = dbQuery.in("id", paidIds);
      else return NextResponse.json({ success: true, data: [], total: 0, page: query.page, per_page: query.per_page });
    }

    const { data, count, error } = await dbQuery
      .order("created_at", { ascending: false })
      .range(offset, offset + query.per_page - 1);

    if (error) throw new Error(error.message);

    return NextResponse.json({
      success: true,
      data: data ?? [],
      total: count ?? 0,
      page: query.page,
      per_page: query.per_page,
    });
  } catch (err) {
    console.error("[Users List] Error:", err);
    return adminGateErrorResponse(err) ?? serverErrorResponse();
  }
}
