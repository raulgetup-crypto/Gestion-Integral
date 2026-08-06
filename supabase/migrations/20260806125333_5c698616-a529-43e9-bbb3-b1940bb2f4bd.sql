CREATE OR REPLACE FUNCTION public.kalen_rol()
RETURNS TEXT
LANGUAGE sql
SECURITY INVOKER
AS $$
    SELECT COALESCE(
        (SELECT rol FROM public.usuarios WHERE auth_user_id = auth.uid()::text),
        'solo_lectura'
    );
$$;

ALTER TABLE public.concurrentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admisiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sedes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_vencimiento ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE
    tablas text[] := ARRAY['concurrentes', 'documentos', 'planillas', 'comunicaciones', 'admisiones', 'usuarios', 'sedes', 'tipos_vencimiento'];
    t text;
BEGIN
    FOREACH t IN ARRAY tablas
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS all_%I ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all authenticated on %I" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I_select ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I_insert ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I_update ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I_delete ON public.%I', t, t);
    END LOOP;
END $$;

CREATE POLICY concurrentes_select ON public.concurrentes FOR SELECT TO authenticated USING (true);
CREATE POLICY concurrentes_insert ON public.concurrentes FOR INSERT TO authenticated WITH CHECK (public.kalen_rol() IN ('admin', 'edicion'));
CREATE POLICY concurrentes_update ON public.concurrentes FOR UPDATE TO authenticated USING (public.kalen_rol() IN ('admin', 'edicion')) WITH CHECK (public.kalen_rol() IN ('admin', 'edicion'));
CREATE POLICY concurrentes_delete ON public.concurrentes FOR DELETE TO authenticated USING (public.kalen_rol() = 'admin');

CREATE POLICY documentos_select ON public.documentos FOR SELECT TO authenticated USING (true);
CREATE POLICY documentos_insert ON public.documentos FOR INSERT TO authenticated WITH CHECK (public.kalen_rol() IN ('admin', 'edicion'));
CREATE POLICY documentos_update ON public.documentos FOR UPDATE TO authenticated USING (public.kalen_rol() IN ('admin', 'edicion')) WITH CHECK (public.kalen_rol() IN ('admin', 'edicion'));
CREATE POLICY documentos_delete ON public.documentos FOR DELETE TO authenticated USING (public.kalen_rol() = 'admin');

CREATE POLICY planillas_select ON public.planillas FOR SELECT TO authenticated USING (true);
CREATE POLICY planillas_insert ON public.planillas FOR INSERT TO authenticated WITH CHECK (public.kalen_rol() IN ('admin', 'edicion'));
CREATE POLICY planillas_update ON public.planillas FOR UPDATE TO authenticated USING (public.kalen_rol() IN ('admin', 'edicion')) WITH CHECK (public.kalen_rol() IN ('admin', 'edicion'));
CREATE POLICY planillas_delete ON public.planillas FOR DELETE TO authenticated USING (public.kalen_rol() = 'admin');

CREATE POLICY comunicaciones_select ON public.comunicaciones FOR SELECT TO authenticated USING (true);
CREATE POLICY comunicaciones_insert ON public.comunicaciones FOR INSERT TO authenticated WITH CHECK (public.kalen_rol() IN ('admin', 'edicion'));
CREATE POLICY comunicaciones_update ON public.comunicaciones FOR UPDATE TO authenticated USING (public.kalen_rol() IN ('admin', 'edicion')) WITH CHECK (public.kalen_rol() IN ('admin', 'edicion'));
CREATE POLICY comunicaciones_delete ON public.comunicaciones FOR DELETE TO authenticated USING (public.kalen_rol() = 'admin');

CREATE POLICY admisiones_select ON public.admisiones FOR SELECT TO authenticated USING (true);
CREATE POLICY admisiones_insert ON public.admisiones FOR INSERT TO authenticated WITH CHECK (public.kalen_rol() IN ('admin', 'edicion'));
CREATE POLICY admisiones_update ON public.admisiones FOR UPDATE TO authenticated USING (public.kalen_rol() IN ('admin', 'edicion')) WITH CHECK (public.kalen_rol() IN ('admin', 'edicion'));
CREATE POLICY admisiones_delete ON public.admisiones FOR DELETE TO authenticated USING (public.kalen_rol() = 'admin');

CREATE POLICY usuarios_select ON public.usuarios FOR SELECT TO authenticated USING (true);
CREATE POLICY usuarios_insert ON public.usuarios FOR INSERT TO authenticated WITH CHECK (public.kalen_rol() IN ('admin', 'edicion'));
CREATE POLICY usuarios_update ON public.usuarios FOR UPDATE TO authenticated USING (public.kalen_rol() IN ('admin', 'edicion')) WITH CHECK (public.kalen_rol() IN ('admin', 'edicion'));
CREATE POLICY usuarios_delete ON public.usuarios FOR DELETE TO authenticated USING (public.kalen_rol() = 'admin');

CREATE POLICY sedes_select ON public.sedes FOR SELECT TO authenticated USING (true);
CREATE POLICY sedes_insert ON public.sedes FOR INSERT TO authenticated WITH CHECK (public.kalen_rol() IN ('admin', 'edicion'));
CREATE POLICY sedes_update ON public.sedes FOR UPDATE TO authenticated USING (public.kalen_rol() IN ('admin', 'edicion')) WITH CHECK (public.kalen_rol() IN ('admin', 'edicion'));
CREATE POLICY sedes_delete ON public.sedes FOR DELETE TO authenticated USING (public.kalen_rol() = 'admin');

CREATE POLICY tipos_vencimiento_select ON public.tipos_vencimiento FOR SELECT TO authenticated USING (true);
CREATE POLICY tipos_vencimiento_insert ON public.tipos_vencimiento FOR INSERT TO authenticated WITH CHECK (public.kalen_rol() IN ('admin', 'edicion'));
CREATE POLICY tipos_vencimiento_update ON public.tipos_vencimiento FOR UPDATE TO authenticated USING (public.kalen_rol() IN ('admin', 'edicion')) WITH CHECK (public.kalen_rol() IN ('admin', 'edicion'));
CREATE POLICY tipos_vencimiento_delete ON public.tipos_vencimiento FOR DELETE TO authenticated USING (public.kalen_rol() = 'admin');