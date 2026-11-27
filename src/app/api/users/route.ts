import { withAdmin } from "@/lib/admin/with-admin";
import { USER_LIST_SELECT_COLUMNS } from "@/lib/admin/user-columns";
import { NextRequest, NextResponse } from "next/server";
import { UserListQuerySchema, sanitizeSearchTerm } from "@/lib/admin/schemas";
import { serverErrorResponse } from "@/lib/api-response";

/**
 * GET /api/users
 * List users with optional search, filter, and pagination.
 * Admin only.
 */
export async function GET(request: NextRequest) {
  return withAdmin(request, async ({ supabase }) => {

    const url = new URL(request.url);
    const parsed = UserListQuerySchema.safeParse({
      search: url.searchParams.get("search") ?? "",
      filter: url.searchParams.get("filter") ?? "all",
      page: url.searchParams.get("page") ?? 1,
      per_page: url.searchParams.get("per_page") ?? 20,
    });
    if (!parsed.success) return serverErrorResponse();
    const query = parsed.data;

    const offset = (query.page - 1) * query.per_page;

    let dbQuery = supabase
      .from("users")
      .select(USER_LIST_SELECT_COLUMNS, { count: "exact" });

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
  });
}
