CREATE POLICY "documentos lectura" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'documentos');
CREATE POLICY "documentos subida" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'documentos');
CREATE POLICY "documentos actualizar" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'documentos') WITH CHECK (bucket_id = 'documentos');
CREATE POLICY "documentos borrar" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'documentos');