CREATE POLICY "respaldos_bucket_select_admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'respaldos' AND public.kalen_rol() = 'admin');

CREATE POLICY "respaldos_bucket_insert_admin" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'respaldos' AND public.kalen_rol() = 'admin');

CREATE POLICY "respaldos_bucket_delete_admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'respaldos' AND public.kalen_rol() = 'admin');