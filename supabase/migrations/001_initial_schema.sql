-- =============================================================================
-- Premium Math Calculator — Initial Schema (001)
-- =============================================================================
-- Run this in the Supabase SQL Editor or via `supabase migration up`.
-- Uses CREATE TABLE IF NOT EXISTS so it's safe to re-run.
-- =============================================================================

-- ── Extensions ──
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Helper: auto-updated_at trigger ──
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 1. users
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT,
  email           TEXT UNIQUE,
  email_verified  TIMESTAMPTZ,
  image           TEXT,
  password_hash   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_banned       BOOLEAN NOT NULL DEFAULT FALSE,
  banned_at       TIMESTAMPTZ,
  banned_reason   TEXT,
  last_active_at  TIMESTAMPTZ,
  is_admin        BOOLEAN NOT NULL DEFAULT FALSE,
  plan            TEXT DEFAULT 'free'
);

COMMENT ON TABLE  public.users IS 'Users and admins (also serves as NextAuth user store)';
COMMENT ON COLUMN public.users.password_hash IS 'bcrypt hash — only used for credentials provider';

CREATE INDEX IF NOT EXISTS idx_users_email           ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_admin        ON public.users(is_admin) WHERE is_admin = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_created_at      ON public.users(created_at DESC);

-- =============================================================================
-- 2. accounts (NextAuth)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.accounts (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type                TEXT NOT NULL,
  provider            TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token       TEXT,
  access_token        TEXT,
  expires_at          BIGINT,
  token_type          TEXT,
  scope               TEXT,
  id_token            TEXT,
  session_state       TEXT,
  user_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  UNIQUE(provider, provider_account_id)
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);

-- =============================================================================
-- 3. sessions (NextAuth + custom user_agent)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_token   TEXT NOT NULL UNIQUE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expires         TIMESTAMPTZ NOT NULL,
  user_agent      TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id     ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_session_token ON public.sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires      ON public.sessions(expires);

-- =============================================================================
-- 4. verification_tokens (NextAuth)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.verification_tokens (
  identifier  TEXT NOT NULL,
  token       TEXT NOT NULL UNIQUE,
  expires     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- =============================================================================
-- 5. subscriptions
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan            TEXT NOT NULL DEFAULT 'free',
  amount_monthly  INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'active',
  started_at      TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

COMMENT ON COLUMN public.subscriptions.amount_monthly IS 'In cents (USD)';

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id  ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status   ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan     ON public.subscriptions(plan);

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 6. invoices
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID REFERENCES public.users(id) ON DELETE SET NULL,
  amount_cents      INTEGER NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending',
  stripe_invoice_id TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at           TIMESTAMPTZ
);

COMMENT ON COLUMN public.invoices.status IS 'paid | pending | failed';

CREATE INDEX IF NOT EXISTS idx_invoices_user_id    ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status     ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);

-- =============================================================================
-- 7. refunds
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.refunds (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id      UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  amount_cents    INTEGER NOT NULL,
  reason          TEXT,
  status          TEXT NOT NULL DEFAULT 'requested',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at    TIMESTAMPTZ
);

COMMENT ON COLUMN public.refunds.status IS 'requested | processed | failed | rejected';

CREATE INDEX IF NOT EXISTS idx_refunds_invoice_id ON public.refunds(invoice_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status    ON public.refunds(status);

-- =============================================================================
-- 8. stripe_events (webhook dedup)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id      TEXT NOT NULL UNIQUE,
  event_type    TEXT NOT NULL,
  processed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_event_id ON public.stripe_events(event_id);

-- =============================================================================
-- 9. page_views (analytics)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.page_views (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  TEXT,
  path        TEXT NOT NULL,
  referrer    TEXT,
  user_agent  TEXT,
  country     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON public.page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_path       ON public.page_views(path);
CREATE INDEX IF NOT EXISTS idx_page_views_country     ON public.page_views(country);

-- =============================================================================
-- 10. formula_usage (analytics)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.formula_usage (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  session_id  TEXT,
  formula_id  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_formula_usage_user_id    ON public.formula_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_formula_usage_formula_id ON public.formula_usage(formula_id);
CREATE INDEX IF NOT EXISTS idx_formula_usage_created_at ON public.formula_usage(created_at DESC);

-- =============================================================================
-- 11. admin_messages
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.admin_messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  sent_by     TEXT NOT NULL DEFAULT 'system',
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_messages_user_id ON public.admin_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_messages_created_at ON public.admin_messages(created_at DESC);

-- =============================================================================
-- 12. admin_audit_log
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id TEXT NOT NULL,
  action        TEXT NOT NULL,
  target_type   TEXT,
  target_id     TEXT,
  metadata      JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.admin_audit_log IS 'Immutable audit trail for admin actions (ban, message, plan change, impersonate, etc.)';

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action     ON public.admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target     ON public.admin_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_user ON public.admin_audit_log(admin_user_id);

-- =============================================================================
-- 13. settings (key/value)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 14. webhooks
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.webhooks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url           TEXT NOT NULL,
  event_type    TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.webhooks.event_type IS 'backup | analytics | error_alert | custom';

CREATE INDEX IF NOT EXISTS idx_webhooks_event_type ON public.webhooks(event_type);
CREATE INDEX IF NOT EXISTS idx_webhooks_status     ON public.webhooks(status);

-- =============================================================================
-- RLS Policies (basic — service_role client bypasses these)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_views          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formula_usage       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks            ENABLE ROW LEVEL SECURITY;

-- Admin users can do everything (via service_role / anon with admin session)
CREATE POLICY "admins_all" ON public.users
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = TRUE));

CREATE POLICY "admins_all" ON public.accounts
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = TRUE));

CREATE POLICY "admins_all" ON public.sessions
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = TRUE));

CREATE POLICY "admins_all" ON public.verification_tokens
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = TRUE));

CREATE POLICY "admins_all" ON public.subscriptions
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = TRUE));

CREATE POLICY "admins_all" ON public.invoices
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = TRUE));

CREATE POLICY "admins_all" ON public.refunds
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = TRUE));

CREATE POLICY "admins_all" ON public.stripe_events
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = TRUE));

CREATE POLICY "admins_all" ON public.page_views
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = TRUE));

CREATE POLICY "admins_all" ON public.formula_usage
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = TRUE));

CREATE POLICY "admins_all" ON public.admin_messages
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = TRUE));

CREATE POLICY "admins_all" ON public.admin_audit_log
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = TRUE));

CREATE POLICY "admins_all" ON public.settings
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = TRUE));

CREATE POLICY "admins_all" ON public.webhooks
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = TRUE));

-- Users can read and update their own row
CREATE POLICY "users_self" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_self_update" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- =============================================================================
-- Seed: default settings
-- =============================================================================
INSERT INTO public.settings (key, value)
VALUES
  ('maintenance_mode', 'false'),
  ('site_name', 'Premium Math Calculator'),
  ('site_description', 'Advanced scientific calculator with formula library'),
  ('max_formula_per_day', '100'),
  ('registration_enabled', 'true')
ON CONFLICT (key) DO NOTHING;
