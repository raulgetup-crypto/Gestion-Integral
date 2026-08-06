CREATE TABLE IF NOT EXISTS public.respaldo_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.respaldo_config TO service_role;

ALTER TABLE public.respaldo_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "solo service role gestiona el token"
  ON public.respaldo_config FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO public.respaldo_config (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.respaldo_cron_token()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT token FROM public.respaldo_config WHERE id LIMIT 1 $$;

REVOKE ALL ON FUNCTION public.respaldo_cron_token() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.respaldo_cron_token() TO service_role, postgres;

SELECT cron.unschedule(jobid) FROM cron.job WHERE command LIKE '%hooks/respaldo%';

SELECT cron.schedule(
  'respaldo-diario',
  '0 6 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://project--8fbd4edb-5b2a-4b56-a711-72a0798b1a89.lovable.app/api/public/hooks/respaldo',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', public.respaldo_cron_token()
    ),
    body := '{"tipo":"automatico"}'::jsonb
  ) as request_id;
  $cron$
);