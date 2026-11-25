-- =============================================================================
-- Premium Math Calculator — Health Report (008)
-- =============================================================================
-- SQL function + state table for Discord log scheduler (12h health report).
-- Run AFTER 007 in the Supabase SQL Editor.
-- =============================================================================

-- ── Indexes (idempotent) ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_health_checks_created_at
  ON public.health_checks (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_health_checks_service_created
  ON public.health_checks (service, created_at DESC);

-- ── State table: track last report sent ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bot_report_state (
  key         TEXT PRIMARY KEY,
  last_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.bot_report_state IS 'Tracks last Discord health report sent (prevents duplicates on restart)';

-- ── RLS (service_role bypasses; mirrors 005/006 conventions) ─────────────────
ALTER TABLE public.bot_report_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_all" ON public.bot_report_state;
CREATE POLICY "admins_all" ON public.bot_report_state
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE is_admin = TRUE));

-- ── Aggregate function: health summary for Discord report ───────────────────
CREATE OR REPLACE FUNCTION public.health_report(p_hours INT)
RETURNS TABLE (
  service     TEXT,
  checks      BIGINT,
  ok          BIGINT,
  degraded    BIGINT,
  error       BIGINT,
  avg_latency INT,
  p95_latency INT
)
LANGUAGE sql
STABLE
PARALLEL SAFE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    service,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE status = 'ok')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'degraded')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'error')::BIGINT,
    COALESCE(ROUND(AVG(latency_ms)), 0)::INT,
    COALESCE(ROUND((PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms))::NUMERIC), 0)::INT
  FROM public.health_checks
  WHERE created_at >= NOW() - MAKE_INTERVAL(hours => p_hours)
  GROUP BY service
  ORDER BY service;
$$;

COMMENT ON FUNCTION public.health_report(INT) IS 'Aggregated health stats for Discord log scheduler (12h report)';

-- Revoke from anon/authenticated — only service_role (bot) can call
REVOKE EXECUTE ON FUNCTION public.health_report(INT) FROM anon, authenticated;

-- ── Retention: drop rows older than 60 days (requires pg_cron) ─────────────
-- Uncomment when pg_cron extension is available:
-- SELECT cron.schedule(
--   'health-checks-retention',
--   '0 3 * * *',
--   $$DELETE FROM public.health_checks WHERE created_at < NOW() - INTERVAL '60 days'$$
-- );
