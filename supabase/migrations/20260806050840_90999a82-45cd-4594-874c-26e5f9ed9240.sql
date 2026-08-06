CREATE TABLE public.alertas_revisadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id integer REFERENCES public.usuarios(id) ON DELETE SET NULL,
  auth_user_id text NOT NULL DEFAULT auth.uid()::text,
  tipo_alerta text NOT NULL DEFAULT 'todas',
  fecha_revision timestamptz NOT NULL DEFAULT now(),
  observaciones text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.alertas_revisadas TO authenticated;
GRANT ALL ON public.alertas_revisadas TO service_role;

ALTER TABLE public.alertas_revisadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alertas_revisadas_select" ON public.alertas_revisadas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "alertas_revisadas_insert" ON public.alertas_revisadas
  FOR INSERT TO authenticated
  WITH CHECK (public.kalen_rol() IN ('admin','edicion'));

CREATE INDEX idx_alertas_revisadas_fecha ON public.alertas_revisadas (fecha_revision DESC);
CREATE INDEX idx_alertas_revisadas_tipo ON public.alertas_revisadas (tipo_alerta, fecha_revision DESC);

CREATE TRIGGER update_alertas_revisadas_updated_at BEFORE UPDATE ON public.alertas_revisadas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();