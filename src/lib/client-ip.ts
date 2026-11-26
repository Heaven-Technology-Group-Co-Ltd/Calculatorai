function sanitizeIpCandidate(raw: string | null): string | null {
  if (!raw) return null;
  const tokens = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const candidate = tokens[tokens.length - 1];
  if (!candidate) return null;

  // Strip trailing :port from IPv4 (e.g. 1.2.3.4:5678) without corrupting IPv6.
  const ipv4PortMatch = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(candidate);
  if (ipv4PortMatch) return ipv4PortMatch[1];

  // Strip optional brackets and :port from bracketed IPv6 (e.g. [::1]:5678).
  const bracketedIpv6Match = /^\[([^\]]+)\](?::\d+)?$/.exec(candidate);
  if (bracketedIpv6Match) return bracketedIpv6Match[1];

  return candidate;
}

// Prefer Netlify's authoritative single-IP connection header first; otherwise
// take the rightmost XFF hop (appended by the nearest edge proxy), then x-real-ip.
export function getClientIpFromHeaders(headers: Headers): string {
  const configured = process.env.TRUSTED_IP_HEADER;
  const trusted = configured ?? (process.env.NETLIFY === "true" ? "x-nf-client-connection-ip" : process.env.NODE_ENV === "production" ? "none" : "development");
  if (trusted === "none") return "unknown";
  if (["x-nf-client-connection-ip", "x-forwarded-for", "x-real-ip"].includes(trusted)) {
    return sanitizeIpCandidate(headers.get(trusted)) ?? "unknown";
  }
  if (trusted !== "development") return "unknown";
  return sanitizeIpCandidate(headers.get("x-nf-client-connection-ip"))
    ?? sanitizeIpCandidate(headers.get("x-forwarded-for"))
    ?? sanitizeIpCandidate(headers.get("x-real-ip")) ?? "unknown";
}
