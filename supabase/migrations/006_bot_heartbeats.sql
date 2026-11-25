-- =============================================================================
-- Premium Math Calculator — Bot Heartbeats (006)
-- =============================================================================
-- Tracks bot liveness via periodic upserts from the discord-bot process.
-- Status page reads this instead of in-memory state.lastCommandAt.
-- Re-runnable (IF NOT EXISTS). Run AFTER 005 in the Supabase SQL Editor.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.bot_heartbeats (
  service   TEXT PRIMARY KEY,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.bot_heartbeats IS 'Bot process liveness signals for the status page';

-- ── RLS (service_role client bypasses; mirrors 001 conventions) ──
ALTER TABLE public.bot_heartbeats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_all" ON public.bot_heartbeats;
CREATE POLICY "admins_all" ON public.bot_heartbeats
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = TRUE));
