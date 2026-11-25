-- =============================================================================
-- Premium Math Calculator — Schema Fix & Completion (003)
-- =============================================================================
-- Fixes table naming mismatches between original migrations and API codebase.
-- Adds missing columns, indexes, RLS policies.
-- Run AFTER 001_initial_schema.sql and 002_calculation_history.sql.
-- Safe to re-run (uses IF NOT EXISTS / IF EXISTS patterns).
-- =============================================================================

-- ── Extensions (idempotent) ──
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. Fix table naming: settings → site_settings
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings' AND table_schema = 'public') THEN
    ALTER TABLE public.settings RENAME TO site_settings;
  ELSE
    CREATE TABLE IF NOT EXISTS public.site_settings (
      key         TEXT PRIMARY KEY,
      value       TEXT NOT NULL,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by  TEXT NOT NULL DEFAULT 'system'
    );
  END IF;
END $$;

-- =============================================================================
-- 2. Fix table naming: webhooks → discord_webhooks
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webhooks' AND table_schema = 'public') THEN
    ALTER TABLE public.webhooks RENAME TO discord_webhooks;
  ELSE
    CREATE TABLE IF NOT EXISTS public.discord_webhooks (
      id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name        TEXT NOT NULL,
      url         TEXT NOT NULL,
      event_type  TEXT NOT NULL DEFAULT 'analytics',
      status      TEXT NOT NULL DEFAULT 'active',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- =============================================================================
-- 3. Add missing columns to users
-- =============================================================================
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_active_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS session_version   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- =============================================================================
-- 4. Add missing columns to sessions (user_agent for analytics)
-- =============================================================================
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- =============================================================================
-- 5. Add missing columns to page_views (country, session_id)
-- =============================================================================
ALTER TABLE public.page_views
  ADD COLUMN IF NOT EXISTS country     TEXT,
  ADD COLUMN IF NOT EXISTS session_id  TEXT;

-- =============================================================================
-- 6. Fix calculation_history: add expression & timestamp columns
--    (original 002 had calc_id/calc_title/inputs/unit instead)
-- =============================================================================
DO $$
BEGIN
  -- Add new columns that API code expects
  ALTER TABLE public.calculation_history
    ADD COLUMN IF NOT EXISTS expression TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW();

  -- Drop unused columns from original 002 schema (no production data)
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'calculation_history' AND column_name = 'calc_id') THEN
    ALTER TABLE public.calculation_history DROP COLUMN calc_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'calculation_history' AND column_name = 'calc_title') THEN
    ALTER TABLE public.calculation_history DROP COLUMN calc_title;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'calculation_history' AND column_name = 'inputs') THEN
    ALTER TABLE public.calculation_history DROP COLUMN inputs;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'calculation_history' AND column_name = 'unit') THEN
    ALTER TABLE public.calculation_history DROP COLUMN unit;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'calculation_history' AND column_name = 'created_at') THEN
    ALTER TABLE public.calculation_history RENAME COLUMN created_at TO created_at_old;
    ALTER TABLE public.calculation_history DROP COLUMN created_at_old;
  END IF;
END $$;

-- =============================================================================
-- 7. Fix rate_limits: add identifier column if missing
--    (original 002 used 'key' column instead of 'identifier')
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'rate_limits' AND column_name = 'key') THEN
    ALTER TABLE public.rate_limits RENAME COLUMN key TO identifier;
  END IF;
  ALTER TABLE public.rate_limits
    ADD COLUMN IF NOT EXISTS identifier TEXT NOT NULL DEFAULT '';
END $$;

-- Recreate rate_limits with correct schema if it doesn't have the right columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'rate_limits' AND column_name = 'identifier') THEN
    -- Table was created wrong, drop and recreate
    DROP TABLE IF EXISTS public.rate_limits;
    CREATE TABLE public.rate_limits (
      id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      identifier  TEXT NOT NULL,
      count       INTEGER NOT NULL DEFAULT 1,
      reset_at    TIMESTAMPTZ NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- =============================================================================
-- 8. Create user_session_revocations (session invalidation store)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_session_revocations (
  user_id     UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  revoked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 9. Add helper: is_admin check function
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_admin(uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.users WHERE id = uid AND is_admin = TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 10. Add helper: auto-updated_at trigger (keep existing if already defined)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to users
DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Apply trigger to site_settings
DROP TRIGGER IF EXISTS trg_site_settings_updated_at ON public.site_settings;
CREATE TRIGGER trg_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- 11. Add missing indexes
-- =============================================================================

-- Accounts
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);

-- Sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);

-- Calculation history
CREATE INDEX IF NOT EXISTS idx_calc_history_user_id ON public.calculation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_calc_history_timestamp ON public.calculation_history(timestamp DESC);

-- Payments
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- Subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- Page views (analytics queries)
CREATE INDEX IF NOT EXISTS idx_page_views_created ON public.page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON public.page_views(path);

-- Formula usage (analytics)
CREATE INDEX IF NOT EXISTS idx_formula_usage_created ON public.formula_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_formula_usage_formula_id ON public.formula_usage(formula_id);

-- Admin audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_admin_user ON public.admin_audit_log(admin_user_id);

-- Stripe events
CREATE INDEX IF NOT EXISTS idx_stripe_events_event_id ON public.stripe_events(event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_type ON public.stripe_events(event_type);

-- Rate limits cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON public.rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON public.rate_limits(reset_at);

-- Discord webhooks
CREATE INDEX IF NOT EXISTS idx_discord_webhooks_status ON public.discord_webhooks(status);

-- =============================================================================
-- 12. Comprehensive RLS Policies
-- =============================================================================

-- Helper: prevent recursive admin check by using ENCRYPTED is_admin column
-- (is_admin() function already defined above)

-- ── Enable RLS on all tables ──
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formula_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_session_revocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- ── Users: own profile read/update; admins read all ──
DROP POLICY IF EXISTS "users_self_read" ON public.users;
CREATE POLICY "users_self_read" ON public.users
  FOR SELECT USING (auth.uid() = id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "users_self_update" ON public.users;
CREATE POLICY "users_self_update" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- ── Accounts: own only ──
DROP POLICY IF EXISTS "accounts_self" ON public.accounts;
CREATE POLICY "accounts_self" ON public.accounts
  FOR ALL USING (auth.uid() = user_id);

-- ── Sessions: own only ──
DROP POLICY IF EXISTS "sessions_self" ON public.sessions;
CREATE POLICY "sessions_self" ON public.sessions
  FOR ALL USING (auth.uid() = user_id);

-- ── Calculation History: own CRUD; admins read all ──
DROP POLICY IF EXISTS "calc_history_self" ON public.calculation_history;
CREATE POLICY "calc_history_self" ON public.calculation_history
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "calc_history_admin" ON public.calculation_history;
CREATE POLICY "calc_history_admin" ON public.calculation_history
  FOR SELECT USING (public.is_admin(auth.uid()));

-- ── Payments: own read; admins read all ──
DROP POLICY IF EXISTS "payments_self" ON public.payments;
CREATE POLICY "payments_self" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "payments_admin" ON public.payments;
CREATE POLICY "payments_admin" ON public.payments
  FOR ALL USING (public.is_admin(auth.uid()));

-- ── Subscriptions: own read; admins read/update all ──
DROP POLICY IF EXISTS "subscriptions_self" ON public.subscriptions;
CREATE POLICY "subscriptions_self" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "subscriptions_admin" ON public.subscriptions;
CREATE POLICY "subscriptions_admin" ON public.subscriptions
  FOR ALL USING (public.is_admin(auth.uid()));

-- ── Invoices: own read ──
DROP POLICY IF EXISTS "invoices_self" ON public.invoices;
CREATE POLICY "invoices_self" ON public.invoices
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "invoices_admin" ON public.invoices;
CREATE POLICY "invoices_admin" ON public.invoices
  FOR ALL USING (public.is_admin(auth.uid()));

-- ── Refunds: admins only ──
DROP POLICY IF EXISTS "refunds_admin" ON public.refunds;
CREATE POLICY "refunds_admin" ON public.refunds
  FOR ALL USING (public.is_admin(auth.uid()));

-- ── Stripe Events: service_role only (inserted by webhook) ──
-- No anon/authenticated access — webhook uses service_role key

-- ── Page Views: insert for all, read for admins ──
DROP POLICY IF EXISTS "page_views_insert" ON public.page_views;
CREATE POLICY "page_views_insert" ON public.page_views
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "page_views_admin" ON public.page_views;
CREATE POLICY "page_views_admin" ON public.page_views
  FOR SELECT USING (public.is_admin(auth.uid()));

-- ── Formula Usage: insert for all, read for admins & self ──
DROP POLICY IF EXISTS "formula_usage_insert" ON public.formula_usage;
CREATE POLICY "formula_usage_insert" ON public.formula_usage
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "formula_usage_self" ON public.formula_usage;
CREATE POLICY "formula_usage_self" ON public.formula_usage
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "formula_usage_admin" ON public.formula_usage;
CREATE POLICY "formula_usage_admin" ON public.formula_usage
  FOR SELECT USING (public.is_admin(auth.uid()));

-- ── Site Settings: read all, write admins ──
DROP POLICY IF EXISTS "site_settings_read" ON public.site_settings;
CREATE POLICY "site_settings_read" ON public.site_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "site_settings_write" ON public.site_settings;
CREATE POLICY "site_settings_write" ON public.site_settings
  FOR ALL USING (public.is_admin(auth.uid()));

-- ── Admin Audit Log: admins only ──
DROP POLICY IF EXISTS "audit_log_admin" ON public.admin_audit_log;
CREATE POLICY "audit_log_admin" ON public.admin_audit_log
  FOR ALL USING (public.is_admin(auth.uid()));

-- ── Admin Messages: own read ──
DROP POLICY IF EXISTS "admin_messages_self" ON public.admin_messages;
CREATE POLICY "admin_messages_self" ON public.admin_messages
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_messages_admin" ON public.admin_messages;
CREATE POLICY "admin_messages_admin" ON public.admin_messages
  FOR ALL USING (public.is_admin(auth.uid()));

-- ── Discord Webhooks: admins only ──
DROP POLICY IF EXISTS "discord_webhooks_admin" ON public.discord_webhooks;
CREATE POLICY "discord_webhooks_admin" ON public.discord_webhooks
  FOR ALL USING (public.is_admin(auth.uid()));

-- ── User Session Revocations: admins only ──
DROP POLICY IF EXISTS "session_revocations_admin" ON public.user_session_revocations;
CREATE POLICY "session_revocations_admin" ON public.user_session_revocations
  FOR ALL USING (public.is_admin(auth.uid()));

-- ── Rate Limits: service_role only (set by middleware) ──
-- No anon/authenticated access

-- =============================================================================
-- 13. Seed: default site_settings (complement existing seeds)
-- =============================================================================
INSERT INTO public.site_settings (key, value)
VALUES
  ('maintenance_mode', 'false'),
  ('site_name', 'Premium Math Calculator'),
  ('site_description', 'Advanced scientific calculator with formula library'),
  ('max_formula_per_day', '100'),
  ('registration_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- 14. Admin seed (idempotent)
-- =============================================================================
-- Admin user: admin@calculatorai.click / Admin@123456
-- Password hash generated with bcrypt cost 12
-- Run this AFTER registration is active, or use the seed-admin.ts script
-- =============================================================================
