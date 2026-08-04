ALTER TABLE public.concurrentes
  ADD COLUMN IF NOT EXISTS apellido text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS dni text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fecha_nacimiento date,
  ADD COLUMN IF NOT EXISTS direccion text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS telefono text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS transporte boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lugar_firma text NOT NULL DEFAULT 'Kalen';

ALTER TABLE public.historial
  ADD COLUMN IF NOT EXISTS usuario text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS observaciones text NOT NULL DEFAULT '';

ALTER TABLE public.documentos
  ADD COLUMN IF NOT EXISTS requisito text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.requisitos_documentales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prestacion text NOT NULL,
  documento text NOT NULL,
  obligatorio boolean NOT NULL DEFAULT true,
  vence boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prestacion, documento)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.requisitos_documentales TO authenticated;
GRANT ALL ON public.requisitos_documentales TO service_role;
ALTER TABLE public.requisitos_documentales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "solo autenticados requisitos" ON public.requisitos_documentales
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.lotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL,
  prestacion text NOT NULL DEFAULT '',
  mutual text NOT NULL DEFAULT '',
  mes text NOT NULL DEFAULT '',
  fecha_armado date NOT NULL DEFAULT CURRENT_DATE,
  fecha_entrega date,
  fecha_recepcion date,
  entregado_por text NOT NULL DEFAULT '',
  recibido_por text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT 'armado',
  notas text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lotes TO authenticated;
GRANT ALL ON public.lotes TO service_role;
ALTER TABLE public.lotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "solo autenticados lotes" ON public.lotes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.lote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id uuid NOT NULL REFERENCES public.lotes(id) ON DELETE CASCADE,
  concurrente_id uuid REFERENCES public.concurrentes(id) ON DELETE SET NULL,
  nombre text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lote_items TO authenticated;
GRANT ALL ON public.lote_items TO service_role;
ALTER TABLE public.lote_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "solo autenticados lote_items" ON public.lote_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_lotes_updated_at BEFORE UPDATE ON public.lotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.requisitos_documentales (prestacion, documento, obligatorio, vence) VALUES
  ('Transporte', 'CUD', true, true),
  ('Transporte', 'Autorización', true, true),
  ('Transporte', 'DNI', true, false),
  ('Transporte', 'Último comprobante de ANSES', true, true),
  ('Centro de Día', 'CUD', true, true),
  ('Centro de Día', 'Autorización', true, true),
  ('Centro de Día', 'DNI', true, false),
  ('Apoyo a la Integración', 'CUD', true, true),
  ('Apoyo a la Integración', 'Autorización', true, true),
  ('Apoyo a la Integración', 'Plan pedagógico', true, true)
ON CONFLICT (prestacion, documento) DO NOTHING;