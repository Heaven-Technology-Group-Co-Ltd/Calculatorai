CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  stripe_session_id TEXT NOT NULL,
  stripe_payment_intent_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL,
  customer_email TEXT,
  product_name TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.payments GROUP BY stripe_session_id HAVING COUNT(*) > 1) THEN
    RAISE NOTICE 'Payment session duplicates exist; unique index skipped';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_stripe_session_id_key ON public.payments (stripe_session_id);
  END IF;
END $$;
ALTER TABLE public.rate_limits ADD COLUMN IF NOT EXISTS reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
DELETE FROM public.rate_limits a USING public.rate_limits b
WHERE a.identifier = b.identifier AND (a.reset_at < b.reset_at OR (a.reset_at = b.reset_at AND a.ctid < b.ctid));
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_identifier_unique ON public.rate_limits (identifier);
CREATE OR REPLACE FUNCTION public.consume_rate_limit(p_identifier TEXT, p_limit INTEGER, p_window_ms BIGINT)
RETURNS TABLE(allowed BOOLEAN, current_count INTEGER, reset_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.rate_limits AS limits (identifier, count, reset_at)
  VALUES (p_identifier, 1, NOW() + p_window_ms * INTERVAL '1 millisecond')
  ON CONFLICT (identifier) DO UPDATE SET
    count = CASE WHEN limits.reset_at <= NOW() THEN 1 ELSE limits.count + 1 END,
    reset_at = CASE WHEN limits.reset_at <= NOW() THEN EXCLUDED.reset_at ELSE limits.reset_at END
  RETURNING limits.count <= p_limit, limits.count, limits.reset_at;
END $$;
REVOKE ALL ON FUNCTION public.consume_rate_limit(TEXT, INTEGER, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(TEXT, INTEGER, BIGINT) TO service_role;
DO $$
DECLARE function_signature regprocedure;
BEGIN
  FOR function_signature IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'health_report'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', function_signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', function_signature);
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.users WHERE lower(email) = 'admin@calculatorai.click' AND is_admin = TRUE AND is_banned = FALSE)
     AND NOT EXISTS (SELECT 1 FROM public.users WHERE is_admin = TRUE AND is_banned = FALSE AND lower(email) <> 'admin@calculatorai.click') THEN
    RAISE WARNING 'Bootstrap account is the sole active administrator: rotate its password and provision a dedicated administrator immediately';
  END IF;
  UPDATE public.users SET password_hash = NULL, email_verified = NULL, is_admin = FALSE
  WHERE lower(email) = 'admin@calculatorai.click'
    AND (is_admin = FALSE OR EXISTS (SELECT 1 FROM public.users other WHERE other.is_admin = TRUE AND other.is_banned = FALSE AND lower(other.email) <> 'admin@calculatorai.click'));
END $$;

CREATE OR REPLACE FUNCTION public.prune_old_health_checks() RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.health_checks WHERE created_at < NOW() - INTERVAL '35 days';
$$;
REVOKE ALL ON FUNCTION public.prune_old_health_checks() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prune_old_health_checks() TO service_role;
