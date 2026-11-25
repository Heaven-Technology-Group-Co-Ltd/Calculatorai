import { NextResponse } from "next/server";

/**
 * Catch-all for unmatched `/api/*` paths.
 *
 * Without this, App Router answers unknown API paths with the HTML 404 page,
 * so any client calling `res.json()` throws a parse error instead of handling
 * a 404. Concrete and deeper dynamic routes stay more specific than this one.
 */
const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });
const notFoundHead = () => new NextResponse(null, { status: 404 });

export const GET = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
export const OPTIONS = notFound;
export const HEAD = notFoundHead;
