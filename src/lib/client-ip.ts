// ponytail: rightmost hop assumes the adjacent edge proxy sanitizes/strips
// client-supplied XFF; with N trusted proxy layers the anchor should be
// hops[hops.length - N].
export function getClientIpFromHeaders(h: Headers): string {
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const hops = xff
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const last = hops[hops.length - 1];
    if (last) return last;
  }
  const realIp = h.get("x-real-ip");
  if (realIp) return realIp.trim() || "unknown";
  return "unknown";
}
