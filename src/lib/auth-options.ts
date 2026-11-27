import { consumePolicy, RATE_LIMIT_POLICIES } from "@/lib/rate-limit-policies";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SupabaseCustomAdapter } from "./supabase-adapter";
import { getSessionCookieName } from "./session-cookie";
import { isSessionValid } from "./admin/session-store";
import { getClientIpFromHeaders } from "./client-ip";

function toHeaders(source?: Record<string, string | string[] | undefined>): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(source ?? {})) {
    if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(", ") : value);
  }
  return headers;
}

let supabase: SupabaseClient | null = null;

// bcrypt compare against a runtime-generated dummy hash runs when the email is
// unknown, so an early return cannot be timed to enumerate which addresses exist
// (a real compare costs ~100ms at cost 12; skipping it is measurable).
let timingEqualizerHashPromise: Promise<string> | null = null;

function getTimingEqualizerHash(): Promise<string> {
  timingEqualizerHashPromise ??= bcrypt.hash(randomUUID(), 12).catch((err) => {
    timingEqualizerHashPromise = null;
    throw err;
  });
  return timingEqualizerHashPromise;
}

function getSupabase(): SupabaseClient {
  if (!supabase) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
    }
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return supabase;
}

export const authOptions: NextAuthOptions = {
  adapter: SupabaseCustomAdapter(),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.trim().toLowerCase();
        const ip = getClientIpFromHeaders(toHeaders(request?.headers));
        const accountGate = await consumePolicy(RATE_LIMIT_POLICIES.LOGIN_IP_ACCOUNT, `${ip}:${email}`);
        const ipGate = ip === "unknown" ? null : await consumePolicy(RATE_LIMIT_POLICIES.LOGIN_IP, ip);
        if (!accountGate.allowed || (ipGate && !ipGate.allowed)) {
          await bcrypt.compare(credentials.password, await getTimingEqualizerHash());
          return null;
        }

        const { data: user, error } = await getSupabase()
          .from("users")
          .select("id, name, email, password_hash, email_verified, is_banned")
          .eq("email", email)
          .single();

        if (error || !user || !user.password_hash) {
          await bcrypt.compare(credentials.password, await getTimingEqualizerHash());
          return null;
        }

        const valid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!valid) return null; // Never disclose email existence when password is wrong

        // Credentials verified! Now distinguish unverified vs banned
        if (user.is_banned) {
          throw new Error("USER_BANNED");
        }

        if (!user.email_verified) {
          throw new Error("EMAIL_UNVERIFIED");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 60, // 30 minutes
  },
  jwt: {
    maxAge: 30 * 60, // 30 minutes
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/verify",
  },
  secret: process.env.NEXTAUTH_SECRET,
  cookies: {
    sessionToken: {
      name: getSessionCookieName(),
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Host-next-auth.csrf-token"
          : "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.id = user.id;
        token.sessionVersion = Date.now();
        return token;
      }

      if (typeof token.sub === "string" && token.sub.length > 0) {
        try {
          const iat = typeof token.iat === "number" && Number.isFinite(token.iat) ? token.iat : 0;
          const [valid, userResult] = await Promise.all([
            isSessionValid(token.sub, iat),
            getSupabase()
              .from("users")
              .select("is_banned")
              .eq("id", token.sub)
              .single(),
          ]);

          if (!valid || userResult.error || !userResult.data || userResult.data.is_banned === true) {
            return { ...token, revoked: true, sub: undefined, id: undefined };
          }
        } catch {
          // Fail closed on revocation/ban check errors only when DB is configured;
          // if DB is unreachable, revoke token to prevent banned access.
          return { ...token, revoked: true, sub: undefined, id: undefined };
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token.revoked || !token.sub) {
        return { ...session, user: undefined, expires: new Date(0).toISOString() };
      }
      if (session.user) {
        (session.user as { id?: string; impersonatedBy?: unknown }).id =
          typeof token.id === "string" ? token.id : token.sub;
        if (typeof token.impersonatedBy === "string") {
          (session.user as { impersonatedBy?: string }).impersonatedBy = token.impersonatedBy;
        }
      }
      return session;
    },
  },
};
