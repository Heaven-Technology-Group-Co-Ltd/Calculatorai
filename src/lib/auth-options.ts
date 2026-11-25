import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SupabaseCustomAdapter } from "./supabase-adapter";
import { getSessionCookieName } from "./session-cookie";

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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const { data: user, error } = await getSupabase()
          .from("users")
          .select("id, name, email, password_hash, email_verified, is_banned")
          .eq("email", credentials.email)
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
        // On login, store a session version that can be invalidated
        token.sessionVersion = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
};
