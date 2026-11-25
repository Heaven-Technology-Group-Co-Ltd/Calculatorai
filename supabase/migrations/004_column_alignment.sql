-- =============================================================================
-- Premium Math Calculator — Column Alignment Fix (004)
-- =============================================================================
-- Fixes column mismatches between actual Supabase DB and code expectations.
-- Run this AFTER 001, 002, 003 in the Supabase SQL Editor.
-- =============================================================================

-- ── 1. Add created_at to users (missing from original migration) ──
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Add plan column (exists in 001 but missing from actual DB)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at DESC);

-- ── 2. Add created_at to sessions (needed for analytics/stats queries) ──
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ── 3. Fix rate_limits: add created_at + id if missing ──
DO $$
BEGIN
  -- Add id column if missing (some versions use key as PK)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'rate_limits' AND column_name = 'id') THEN
    ALTER TABLE public.rate_limits ADD COLUMN id UUID DEFAULT uuid_generate_v4();
    -- Try to set as PK (might fail if another PK exists)
    BEGIN
      ALTER TABLE public.rate_limits ADD PRIMARY KEY (id);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  -- Ensure created_at exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'rate_limits' AND column_name = 'created_at') THEN
    ALTER TABLE public.rate_limits ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- ── 4. Ensure site_settings has seed data ──
INSERT INTO public.site_settings (key, value) VALUES
  ('maintenance_mode', 'false'),
  ('site_name', 'Premium Math Calculator'),
  ('site_description', 'Advanced scientific calculator with formula library'),
  ('max_formula_per_day', '100'),
  ('registration_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- ── 5. Ensure update_updated_at trigger on users ──
DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- Verification queries (run these to confirm fixes)
-- =============================================================================
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position;
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'sessions' ORDER BY ordinal_position;
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'rate_limits' ORDER BY ordinal_position;
