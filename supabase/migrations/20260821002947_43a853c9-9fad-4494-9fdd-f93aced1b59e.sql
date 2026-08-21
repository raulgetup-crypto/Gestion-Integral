CREATE TABLE IF NOT EXISTS public.envio_mensual (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concurrente_id uuid REFERENCES public.concurrentes(id) ON DELETE SET NULL,
  mes text NOT NULL,
  tipo text NOT NULL DEFAULT 'apross_ie',
  mutual_detalle text NOT NULL DEFAULT '',
  dai_nombre text NOT NULL DEFAULT '',
  dai_mail text NOT NULL DEFAULT '',
  dai_whatsapp text NOT NULL DEFAULT '',
  horario_detalle text NOT NULL DEFAULT '',
  enviado boolean NOT NULL DEFAULT false,
  fecha_envio date,
  entregado boolean NOT NULL DEFAULT false,
  fecha_entrega date,
  observaciones text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.envio_mensual ADD COLUMN IF NOT EXISTS mutual_detalle text NOT NULL DEFAULT '';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.envio_mensual TO authenticated;
GRANT ALL ON public.envio_mensual TO service_role;

ALTER TABLE public.envio_mensual ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='envio_mensual' AND policyname='envio_mensual_select') THEN
    CREATE POLICY envio_mensual_select ON public.envio_mensual FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='envio_mensual' AND policyname='envio_mensual_insert') THEN
    CREATE POLICY envio_mensual_insert ON public.envio_mensual FOR INSERT TO authenticated WITH CHECK (kalen_rol() = ANY (ARRAY['admin','edicion']));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='envio_mensual' AND policyname='envio_mensual_update') THEN
    CREATE POLICY envio_mensual_update ON public.envio_mensual FOR UPDATE TO authenticated USING (kalen_rol() = ANY (ARRAY['admin','edicion'])) WITH CHECK (kalen_rol() = ANY (ARRAY['admin','edicion']));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='envio_mensual' AND policyname='envio_mensual_delete') THEN
    CREATE POLICY envio_mensual_delete ON public.envio_mensual FOR DELETE TO authenticated USING (kalen_rol() = 'admin');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_envio_mensual_mes ON public.envio_mensual (mes);
CREATE INDEX IF NOT EXISTS idx_envio_mensual_concurrente ON public.envio_mensual (concurrente_id);

DROP TRIGGER IF EXISTS trg_envio_mensual_updated_at ON public.envio_mensual;
CREATE TRIGGER trg_envio_mensual_updated_at
BEFORE UPDATE ON public.envio_mensual
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();