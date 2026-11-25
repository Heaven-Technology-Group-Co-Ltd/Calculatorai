-- =============================================================================
-- Premium Math Calculator — Health History Aggregation (007)
-- =============================================================================
-- Replaces client-side aggregation in /api/status/history with a SQL function.
-- Run AFTER 006 in the Supabase SQL Editor.
-- =============================================================================

CREATE OR REPLACE FUNCTION health_history(
  p_since timestamptz,
  p_bucket text,
  p_service text DEFAULT NULL
)
RETURNS TABLE (
  bucket timestamptz,
  service text,
  checks int,
  ok int,
  avg_latency int
)
LANGUAGE sql STABLE
AS $$
  SELECT
    date_trunc(p_bucket, created_at),
    service,
    count(*)::int,
    (count(*) FILTER (WHERE status = 'ok'))::int,
    COALESCE(round(avg(latency_ms)), 0)::int
  FROM public.health_checks
  WHERE created_at >= p_since
    AND (p_service IS NULL OR service = p_service)
  GROUP BY 1, 2
  ORDER BY 1;
$$;

COMMENT ON FUNCTION health_history IS 'Aggregated health check buckets for status charts';

-- Retention: drop rows older than 35 days (run daily via pg_cron)
-- Uncomment when pg_cron is available:
-- SELECT cron.schedule('health_retention', '0 3 * * *',
--   $$DELETE FROM public.health_checks WHERE created_at < now() - interval '35 days'$$);
