ALTER TABLE public.sedes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sedes_select" ON public.sedes;
CREATE POLICY "sedes_select" ON public.sedes FOR SELECT TO authenticated USING (true);

ALTER TABLE public.tipos_vencimiento ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tipos_vencimiento_select" ON public.tipos_vencimiento;
CREATE POLICY "tipos_vencimiento_select" ON public.tipos_vencimiento FOR SELECT TO authenticated USING (true);

REVOKE ALL ON FUNCTION public.kalen_rol() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kalen_rol() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_concurrente_timeline(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_concurrente_timeline(uuid) TO authenticated, service_role;