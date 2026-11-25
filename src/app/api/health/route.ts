import { NextResponse } from "next/server";
import { getRuntimeHealth } from "@/lib/runtime-health";

export const dynamic = "force-dynamic";

export async function GET() {
  const { ok, uptimeSeconds } = getRuntimeHealth();
  return NextResponse.json({ ok, uptime: uptimeSeconds });
}
