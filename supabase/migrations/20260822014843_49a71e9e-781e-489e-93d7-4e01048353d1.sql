
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer procedimientos" ON public.procedimientos;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar procedimientos" ON public.procedimientos;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar procedimientos" ON public.procedimientos;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar procedimientos" ON public.procedimientos;

CREATE POLICY "procedimientos_select_auth" ON public.procedimientos FOR SELECT TO authenticated USING (true);
CREATE POLICY "procedimientos_insert_edicion" ON public.procedimientos FOR INSERT TO authenticated WITH CHECK (public.kalen_rol() IN ('admin','edicion'));
CREATE POLICY "procedimientos_update_edicion" ON public.procedimientos FOR UPDATE TO authenticated USING (public.kalen_rol() IN ('admin','edicion')) WITH CHECK (public.kalen_rol() IN ('admin','edicion'));
CREATE POLICY "procedimientos_delete_admin" ON public.procedimientos FOR DELETE TO authenticated USING (public.kalen_rol() = 'admin');

DROP POLICY IF EXISTS "Usuarios autenticados pueden leer glosario" ON public.glosario;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar glosario" ON public.glosario;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar glosario" ON public.glosario;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar glosario" ON public.glosario;

CREATE POLICY "glosario_select_auth" ON public.glosario FOR SELECT TO authenticated USING (true);
CREATE POLICY "glosario_insert_edicion" ON public.glosario FOR INSERT TO authenticated WITH CHECK (public.kalen_rol() IN ('admin','edicion'));
CREATE POLICY "glosario_update_edicion" ON public.glosario FOR UPDATE TO authenticated USING (public.kalen_rol() IN ('admin','edicion')) WITH CHECK (public.kalen_rol() IN ('admin','edicion'));
CREATE POLICY "glosario_delete_admin" ON public.glosario FOR DELETE TO authenticated USING (public.kalen_rol() = 'admin');

DROP POLICY IF EXISTS "documentos solo autenticados" ON storage.objects;

CREATE POLICY "documentos_bucket_select_auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documentos');
CREATE POLICY "documentos_bucket_insert_edicion" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documentos' AND public.kalen_rol() IN ('admin','edicion'));
CREATE POLICY "documentos_bucket_update_edicion" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documentos' AND public.kalen_rol() IN ('admin','edicion'))
  WITH CHECK (bucket_id = 'documentos' AND public.kalen_rol() IN ('admin','edicion'));
CREATE POLICY "documentos_bucket_delete_admin" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documentos' AND public.kalen_rol() = 'admin');
