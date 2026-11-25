/**
 * The one place that answers "which cookie name holds the session?".
 * NODE_ENV is the same fact NextAuth uses to name the cookie it sets
 * (authOptions.cookies), so a gate reading it cannot disagree with it.
 */
export function getSessionCookieName(): string {
  return process.env.NODE_ENV === "production"
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";
}
