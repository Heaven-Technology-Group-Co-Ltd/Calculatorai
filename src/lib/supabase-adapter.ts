import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase-client";
import type { Adapter, AdapterUser, AdapterAccount, AdapterSession, VerificationToken } from "next-auth/adapters";

function getSupabase(): SupabaseClient {
  return getSupabaseAdmin();
}

/** Row shape returned from the users table */
interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  email_verified: string | null;
}

/** Row shape returned from the accounts table (with joined users) */
interface AccountRow {
  id: string;
  type: string;
  provider: string;
  provider_account_id: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
  token_type: string | null;
  scope: string | null;
  id_token: string | null;
  session_state: string | null;
  user_id: string;
  users: UserRow | UserRow[] | null;
}

/** Row shape returned from the sessions table (with joined users) */
interface SessionRow {
  session_token: string;
  user_id: string;
  expires: string;
  users: UserRow | UserRow[] | null;
}

/** Row shape returned from verification_tokens table */
interface VerificationTokenRow {
  identifier: string;
  token: string;
  expires: string;
}

/** Convert a UserRow to AdapterUser */
function toAdapterUser(row: UserRow): AdapterUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? "",
    image: row.image,
    emailVerified: row.email_verified ? new Date(row.email_verified) : null,
  };
}

/** Extract a single UserRow from possibly-joined data (users(*) can be array or object) */
function extractUserRow(users: UserRow | UserRow[] | null): UserRow | null {
  if (!users) return null;
  if (Array.isArray(users)) return users[0] ?? null;
  return users;
}

export function SupabaseCustomAdapter(): Adapter {
  return {
    async createUser(user: Omit<AdapterUser, "id">): Promise<AdapterUser> {
      const { data, error } = await getSupabase()
        .from("users")
        .insert({
          name: user.name,
          email: user.email,
          image: user.image,
          email_verified: user.emailVerified?.toISOString() ?? null,
        })
        .select()
        .single<UserRow>();
      if (error) throw error;
      return toAdapterUser(data);
    },

    async getUser(id: string): Promise<AdapterUser | null> {
      const { data, error } = await getSupabase()
        .from("users")
        .select()
        .eq("id", id)
        .single<UserRow>();
      if (error || !data) return null;
      return toAdapterUser(data);
    },

    async getUserByEmail(email: string): Promise<AdapterUser | null> {
      const { data, error } = await getSupabase()
        .from("users")
        .select()
        .eq("email", email)
        .single<UserRow>();
      if (error || !data) return null;
      return toAdapterUser(data);
    },

    async getUserByAccount({
      providerAccountId,
      provider,
    }: Pick<AdapterAccount, "provider" | "providerAccountId">): Promise<AdapterUser | null> {
      const { data, error } = await getSupabase()
        .from("accounts")
        .select("id, type, provider, provider_account_id, access_token, refresh_token, expires_at, token_type, scope, id_token, session_state, user_id, users(*)")
        .eq("provider", provider)
        .eq("provider_account_id", providerAccountId)
        .single<AccountRow>();
      if (error || !data) return null;
      const userRow = extractUserRow(data.users);
      if (!userRow) return null;
      return toAdapterUser(userRow);
    },

    async updateUser(user: Partial<AdapterUser> & Pick<AdapterUser, "id">): Promise<AdapterUser> {
      const { data, error } = await getSupabase()
        .from("users")
        .update({
          name: user.name,
          email: user.email,
          image: user.image,
          email_verified: user.emailVerified?.toISOString() ?? null,
        })
        .eq("id", user.id)
        .select()
        .single<UserRow>();
      if (error) throw error;
      return toAdapterUser(data);
    },

    async deleteUser(userId: string): Promise<AdapterUser | null> {
      await getSupabase().from("users").delete().eq("id", userId);
      return null;
    },

    async linkAccount(account: AdapterAccount): Promise<AdapterAccount | null> {
      await getSupabase().from("accounts").insert({
        user_id: account.userId,
        type: account.type,
        provider: account.provider,
        provider_account_id: account.providerAccountId,
        access_token: account.access_token,
        refresh_token: account.refresh_token,
        expires_at: account.expires_at,
        token_type: account.token_type,
        scope: account.scope,
        id_token: account.id_token,
        session_state: account.session_state,
      });
      return null;
    },

    async unlinkAccount({
      providerAccountId,
      provider,
    }: Pick<AdapterAccount, "provider" | "providerAccountId">): Promise<AdapterAccount | undefined> {
      await getSupabase()
        .from("accounts")
        .delete()
        .eq("provider", provider)
        .eq("provider_account_id", providerAccountId);
      return undefined;
    },

    async createSession({ sessionToken, userId, expires }: {
      sessionToken: string;
      userId: string;
      expires: Date;
    }): Promise<AdapterSession> {
      await getSupabase().from("sessions").insert({
        session_token: sessionToken,
        user_id: userId,
        expires: expires.toISOString(),
      });
      return { sessionToken, userId, expires };
    },

    async getSessionAndUser(sessionToken: string): Promise<{ session: AdapterSession; user: AdapterUser } | null> {
      const { data, error } = await getSupabase()
        .from("sessions")
        .select("session_token, user_id, expires, users(*)")
        .eq("session_token", sessionToken)
        .single<SessionRow>();
      if (error || !data) return null;

      const userRow = extractUserRow(data.users);
      if (!userRow) return null;

      return {
        session: {
          sessionToken: data.session_token,
          userId: data.user_id,
          expires: new Date(data.expires),
        },
        user: toAdapterUser(userRow),
      };
    },

    async updateSession(session: Partial<AdapterSession> & Pick<AdapterSession, "sessionToken">): Promise<AdapterSession | null> {
      const update: Record<string, string> = {};
      if (session.expires !== undefined) update.expires = session.expires.toISOString();
      if (session.userId !== undefined) update.user_id = session.userId;
      const { data, error } = await getSupabase()
        .from("sessions")
        .update(update)
        .eq("session_token", session.sessionToken)
        .select()
        .single<{ session_token: string; user_id: string; expires: string }>();
      if (error || !data) return null;
      return {
        sessionToken: data.session_token,
        userId: data.user_id,
        expires: new Date(data.expires),
      };
    },

    async deleteSession(sessionToken: string): Promise<AdapterSession | null> {
      await getSupabase().from("sessions").delete().eq("session_token", sessionToken);
      return null;
    },

    async createVerificationToken(verificationToken: VerificationToken): Promise<VerificationToken | null> {
      await getSupabase().from("verification_tokens").insert({
        identifier: verificationToken.identifier,
        token: verificationToken.token,
        expires: verificationToken.expires.toISOString(),
      });
      return verificationToken;
    },

    async useVerificationToken({ identifier, token }: {
      identifier: string;
      token: string;
    }): Promise<VerificationToken | null> {
      const { data, error } = await getSupabase()
        .from("verification_tokens")
        .delete()
        .eq("identifier", identifier)
        .eq("token", token)
        .select()
        .single<VerificationTokenRow>();
      if (error || !data) return null;
      return {
        identifier: data.identifier,
        token: data.token,
        expires: new Date(data.expires),
      };
    },
  };
}
