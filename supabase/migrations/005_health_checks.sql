-- =============================================================================
-- Premium Math Calculator — Health Checks (005)
-- =============================================================================
-- Stores periodic service health-check results backing /api/status (current +
-- 24h/7d/30d stats) and /api/status/history (chart buckets).
-- Re-runnable (IF NOT EXISTS). Run AFTER 001–004 in the Supabase SQL Editor.
--
-- Growth note: /api/status inserts 5 rows per hit. Add a retention delete
-- (e.g. pg_cron dropping rows older than 90d) once volume grows.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.health_checks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service     TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('ok', 'error', 'degraded')),
  latency_ms  INTEGER NOT NULL DEFAULT 0,
  details     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.health_checks IS 'Service health-check results for the public status page and uptime charts';

CREATE INDEX IF NOT EXISTS idx_health_checks_service_created
  ON public.health_checks(service, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_checks_created_at
  ON public.health_checks(created_at DESC);

-- ── RLS (service_role client bypasses; mirrors 001 conventions) ──
ALTER TABLE public.health_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_all" ON public.health_checks;
CREATE POLICY "admins_all" ON public.health_checks
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = TRUE));
