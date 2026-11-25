/**
 * Supabase Database Type Definitions
 *
 * Auto-generated from migrations 001-004.
 * Run `npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts`
 * to regenerate when schema changes.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string | null;
          email: string | null;
          password_hash: string | null;
          image: string | null;
          email_verified: string | null;
          is_admin: boolean;
          is_banned: boolean;
          banned_at: string | null;
          banned_reason: string | null;
          last_active_at: string | null;
          session_version: number;
          plan: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name?: string | null;
          email?: string | null;
          password_hash?: string | null;
          image?: string | null;
          email_verified?: string | null;
          is_admin?: boolean;
          is_banned?: boolean;
          banned_at?: string | null;
          banned_reason?: string | null;
          last_active_at?: string | null;
          session_version?: number;
          plan?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          email?: string | null;
          password_hash?: string | null;
          image?: string | null;
          email_verified?: string | null;
          is_admin?: boolean;
          is_banned?: boolean;
          banned_at?: string | null;
          banned_reason?: string | null;
          last_active_at?: string | null;
          session_version?: number;
          plan?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      accounts: {
        Row: {
          id: string;
          type: string;
          provider: string;
          provider_account_id: string;
          refresh_token: string | null;
          access_token: string | null;
          expires_at: number | null;
          token_type: string | null;
          scope: string | null;
          id_token: string | null;
          session_state: string | null;
          user_id: string;
        };
        Insert: {
          id?: string;
          type: string;
          provider: string;
          provider_account_id: string;
          refresh_token?: string | null;
          access_token?: string | null;
          expires_at?: number | null;
          token_type?: string | null;
          scope?: string | null;
          id_token?: string | null;
          session_state?: string | null;
          user_id: string;
        };
        Update: {
          id?: string;
          type?: string;
          provider?: string;
          provider_account_id?: string;
          refresh_token?: string | null;
          access_token?: string | null;
          expires_at?: number | null;
          token_type?: string | null;
          scope?: string | null;
          id_token?: string | null;
          session_state?: string | null;
          user_id?: string;
        };
      };
      sessions: {
        Row: {
          id: string;
          session_token: string;
          user_id: string;
          expires: string;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_token: string;
          user_id: string;
          expires: string;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_token?: string;
          user_id?: string;
          expires?: string;
          user_agent?: string | null;
          created_at?: string;
        };
      };
      verification_tokens: {
        Row: {
          identifier: string;
          token: string;
          expires: string;
        };
        Insert: {
          identifier: string;
          token: string;
          expires: string;
        };
        Update: {
          identifier?: string;
          token?: string;
          expires?: string;
        };
      };
      calculation_history: {
        Row: {
          id: string;
          user_id: string;
          expression: string;
          result: string;
          timestamp: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          expression: string;
          result?: string;
          timestamp?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          expression?: string;
          result?: string;
          timestamp?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          user_id: string | null;
          stripe_session_id: string;
          stripe_payment_intent_id: string | null;
          amount_cents: number;
          currency: string;
          status: string;
          customer_email: string | null;
          product_name: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          stripe_session_id: string;
          stripe_payment_intent_id?: string | null;
          amount_cents: number;
          currency?: string;
          status: string;
          customer_email?: string | null;
          product_name: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          stripe_session_id?: string;
          stripe_payment_intent_id?: string | null;
          amount_cents?: number;
          currency?: string;
          status?: string;
          customer_email?: string | null;
          product_name?: string;
          metadata?: Json;
          created_at?: string;
        };
      };
      stripe_events: {
        Row: {
          id: string;
          event_id: string;
          event_type: string;
          processed_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          event_type: string;
          processed_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          event_type?: string;
          processed_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan: string;
          status: string;
          amount_monthly: number;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan: string;
          status: string;
          amount_monthly: number;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan?: string;
          status?: string;
          amount_monthly?: number;
          updated_at?: string;
          created_at?: string;
        };
      };
      invoices: {
        Row: {
          id: string;
          user_id: string | null;
          amount_cents: number;
          status: string;
          stripe_invoice_id: string | null;
          created_at: string;
          paid_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          amount_cents: number;
          status?: string;
          stripe_invoice_id?: string | null;
          created_at?: string;
          paid_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          amount_cents?: number;
          status?: string;
          stripe_invoice_id?: string | null;
          created_at?: string;
          paid_at?: string | null;
        };
      };
      refunds: {
        Row: {
          id: string;
          payment_id: string;
          amount_cents: number;
          reason: string | null;
          status: string;
          stripe_refund_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          payment_id: string;
          amount_cents: number;
          reason?: string | null;
          status: string;
          stripe_refund_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          payment_id?: string;
          amount_cents?: number;
          reason?: string | null;
          status?: string;
          stripe_refund_id?: string | null;
          created_at?: string;
        };
      };
      page_views: {
        Row: {
          id: string;
          path: string;
          user_id: string | null;
          session_id: string | null;
          ip_address: string | null;
          user_agent: string | null;
          referrer: string | null;
          country: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          path: string;
          user_id?: string | null;
          session_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          referrer?: string | null;
          country?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          path?: string;
          user_id?: string | null;
          session_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          referrer?: string | null;
          country?: string | null;
          created_at?: string;
        };
      };
      formula_usage: {
        Row: {
          id: string;
          user_id: string | null;
          session_id: string | null;
          formula_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          session_id?: string | null;
          formula_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          session_id?: string | null;
          formula_id?: string;
          created_at?: string;
        };
      };
      site_settings: {
        Row: {
          key: string;
          value: string;
          updated_at: string;
          updated_by: string;
        };
        Insert: {
          key: string;
          value: string;
          updated_at?: string;
          updated_by?: string;
        };
        Update: {
          key?: string;
          value?: string;
          updated_at?: string;
          updated_by?: string;
        };
      };
      admin_audit_log: {
        Row: {
          id: string;
          admin_user_id: string | null;
          action: string;
          target_type: string | null;
          target_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_user_id?: string | null;
          action: string;
          target_type?: string | null;
          target_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_user_id?: string | null;
          action?: string;
          target_type?: string | null;
          target_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
      };
      discord_webhooks: {
        Row: {
          id: string;
          name: string;
          url: string;
          event_type: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          url: string;
          event_type?: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          url?: string;
          event_type?: string;
          status?: string;
          created_at?: string;
        };
      };
      admin_messages: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          sent_by: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content: string;
          sent_by?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          content?: string;
          sent_by?: string;
          read_at?: string | null;
          created_at?: string;
        };
      };
      user_session_revocations: {
        Row: {
          user_id: string;
          revoked_at: string;
        };
        Insert: {
          user_id: string;
          revoked_at?: string;
        };
        Update: {
          user_id?: string;
          revoked_at?: string;
        };
      };
      rate_limits: {
        Row: {
          id: string;
          identifier: string;
          count: number;
          reset_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          identifier: string;
          count?: number;
          reset_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          identifier?: string;
          count?: number;
          reset_at?: string;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: { uid: string };
        Returns: boolean;
      };
      update_updated_at_column: {
        Args: Record<string, never>;
        Returns: unknown;
      };
      cleanup_expired_rate_limits: {
        Args: Record<string, never>;
        Returns: unknown;
      };
    };
    Enums: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
