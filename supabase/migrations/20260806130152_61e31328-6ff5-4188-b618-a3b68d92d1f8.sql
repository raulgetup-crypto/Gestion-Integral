-- =====================================================
-- CORREGIR POLÍTICAS DE USUARIOS (solo admin)
-- =====================================================

DROP POLICY IF EXISTS usuarios_select ON public.usuarios;
DROP POLICY IF EXISTS usuarios_insert ON public.usuarios;
DROP POLICY IF EXISTS usuarios_update ON public.usuarios;
DROP POLICY IF EXISTS usuarios_delete ON public.usuarios;

CREATE POLICY usuarios_select ON public.usuarios
    FOR SELECT TO authenticated USING (true);

CREATE POLICY usuarios_insert ON public.usuarios
    FOR INSERT TO authenticated
    WITH CHECK (public.kalen_rol() = 'admin');

CREATE POLICY usuarios_update ON public.usuarios
    FOR UPDATE TO authenticated
    USING (public.kalen_rol() = 'admin')
    WITH CHECK (public.kalen_rol() = 'admin');

CREATE POLICY usuarios_delete ON public.usuarios
    FOR DELETE TO authenticated
    USING (public.kalen_rol() = 'admin');

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;