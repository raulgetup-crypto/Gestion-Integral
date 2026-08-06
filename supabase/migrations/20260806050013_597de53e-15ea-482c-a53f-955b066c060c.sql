CREATE TABLE public.respaldos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL DEFAULT 'automatico',
  origen text NOT NULL DEFAULT 'cron',
  storage_path text NOT NULL DEFAULT '',
  tablas text NOT NULL DEFAULT '',
  total_registros integer NOT NULL DEFAULT 0,
  tamano bigint NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'ok',
  detalle text NOT NULL DEFAULT '',
  usuario text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.respaldos TO authenticated;
GRANT ALL ON public.respaldos TO service_role;

ALTER TABLE public.respaldos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "respaldos_select" ON public.respaldos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "respaldos_insert_admin" ON public.respaldos
  FOR INSERT TO authenticated WITH CHECK (public.kalen_rol() = 'admin');
CREATE POLICY "respaldos_update_admin" ON public.respaldos
  FOR UPDATE TO authenticated USING (public.kalen_rol() = 'admin') WITH CHECK (public.kalen_rol() = 'admin');
CREATE POLICY "respaldos_delete_admin" ON public.respaldos
  FOR DELETE TO authenticated USING (public.kalen_rol() = 'admin');

CREATE TRIGGER update_respaldos_updated_at BEFORE UPDATE ON public.respaldos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_respaldos_created_at ON public.respaldos (created_at DESC);