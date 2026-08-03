-- 1. Quitar políticas abiertas
DROP POLICY IF EXISTS "acceso total catalogos" ON public.catalogos;
DROP POLICY IF EXISTS "acceso total concurrentes" ON public.concurrentes;
DROP POLICY IF EXISTS "acceso total documentos" ON public.documentos;
DROP POLICY IF EXISTS "acceso total eventos" ON public.eventos;
DROP POLICY IF EXISTS "acceso total facturacion" ON public.facturacion;
DROP POLICY IF EXISTS "acceso total historial" ON public.historial;
DROP POLICY IF EXISTS "acceso total mensajes" ON public.mensajes;
DROP POLICY IF EXISTS "acceso total planilla" ON public.planilla_estados;
DROP POLICY IF EXISTS "acceso total tareas" ON public.tareas;
DROP POLICY IF EXISTS "acceso total turnos" ON public.turnos;

-- 2. Politicas solo para usuarios autenticados
CREATE POLICY "solo autenticados catalogos" ON public.catalogos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "solo autenticados concurrentes" ON public.concurrentes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "solo autenticados documentos" ON public.documentos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "solo autenticados eventos" ON public.eventos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "solo autenticados facturacion" ON public.facturacion FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "solo autenticados historial" ON public.historial FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "solo autenticados mensajes" ON public.mensajes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "solo autenticados planilla" ON public.planilla_estados FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "solo autenticados tareas" ON public.tareas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "solo autenticados turnos" ON public.turnos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Revocar acceso del rol anonimo y asegurar el autenticado
REVOKE ALL ON public.catalogos, public.concurrentes, public.documentos, public.eventos,
  public.facturacion, public.historial, public.mensajes, public.planilla_estados,
  public.tareas, public.turnos FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalogos, public.concurrentes, public.documentos,
  public.eventos, public.facturacion, public.historial, public.mensajes, public.planilla_estados,
  public.tareas, public.turnos TO authenticated;

GRANT ALL ON public.catalogos, public.concurrentes, public.documentos, public.eventos,
  public.facturacion, public.historial, public.mensajes, public.planilla_estados,
  public.tareas, public.turnos TO service_role;

-- 4. Storage: bucket documentos solo autenticados
DROP POLICY IF EXISTS "acceso total documentos storage" ON storage.objects;
DROP POLICY IF EXISTS "documentos select" ON storage.objects;
DROP POLICY IF EXISTS "documentos insert" ON storage.objects;
DROP POLICY IF EXISTS "documentos update" ON storage.objects;
DROP POLICY IF EXISTS "documentos delete" ON storage.objects;

CREATE POLICY "documentos select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documentos');
CREATE POLICY "documentos insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documentos');
CREATE POLICY "documentos update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'documentos') WITH CHECK (bucket_id = 'documentos');
CREATE POLICY "documentos delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documentos');