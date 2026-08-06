-- Etapa 1: administración de usuarios por parte de admin
DROP POLICY IF EXISTS "usuarios_admin_insert" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_admin_update" ON public.usuarios;

CREATE POLICY "usuarios_admin_insert" ON public.usuarios
  FOR INSERT TO authenticated
  WITH CHECK (public.kalen_rol() = 'admin');

CREATE POLICY "usuarios_admin_update" ON public.usuarios
  FOR UPDATE TO authenticated
  USING (public.kalen_rol() = 'admin')
  WITH CHECK (public.kalen_rol() = 'admin');

GRANT SELECT, INSERT, UPDATE ON public.usuarios TO authenticated;
GRANT ALL ON public.usuarios TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.usuarios_id_seq TO authenticated;