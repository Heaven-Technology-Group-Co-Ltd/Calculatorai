-- =============================================================================
-- Premium Math Calculator — Calculation History + Rate Limits (002)
-- =============================================================================
-- Run this in the Supabase SQL Editor or via `supabase migration up`.
-- Uses CREATE TABLE IF NOT EXISTS so it's safe to re-run.
-- =============================================================================

-- ── Extensions (idempotent) ──
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. calculation_history
-- =============================================================================
-- Persists calculation history for authenticated users.
-- Anonymous users continue using sessionStorage (client-side).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.calculation_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES public.users(id) ON DELETE CASCADE,
  calc_id     TEXT NOT NULL,
  calc_title  TEXT NOT NULL,
  inputs      JSONB NOT NULL DEFAULT '{}'::jsonb,
  result      TEXT NOT NULL DEFAULT '',
  unit        TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.calculation_history IS 'Calculation history entries per user (authenticated only)';
COMMENT ON COLUMN public.calculation_history.user_id IS 'NULL for anonymous users (they use sessionStorage)';

CREATE INDEX IF NOT EXISTS idx_calc_history_user_id
  ON public.calculation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_calc_history_created_at
  ON public.calculation_history(created_at DESC);

-- =============================================================================
-- 2. rate_limits
-- =============================================================================
-- Backs src/lib/rate-limiter.ts for shared rate-limit state across instances.
-- Columns match the exact field names used in rate-limiter.ts queries.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         TEXT NOT NULL UNIQUE,
  count       INTEGER NOT NULL DEFAULT 1,
  reset_at    TIMESTAMPTZ NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.rate_limits IS 'Rate limit state shared across server instances';

CREATE INDEX IF NOT EXISTS idx_rate_limits_key
  ON public.rate_limits(key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at
  ON public.rate_limits(reset_at);

-- =============================================================================
-- RLS Policies
-- =============================================================================

ALTER TABLE public.calculation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Admin users can do everything (via service_role / anon with admin session)
CREATE POLICY "admins_all" ON public.calculation_history
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = TRUE));

CREATE POLICY "admins_all" ON public.rate_limits
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = TRUE));
