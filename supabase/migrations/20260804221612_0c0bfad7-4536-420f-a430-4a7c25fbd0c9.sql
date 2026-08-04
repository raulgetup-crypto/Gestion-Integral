DROP POLICY IF EXISTS "documentos lectura" ON storage.objects;
DROP POLICY IF EXISTS "documentos subida" ON storage.objects;
DROP POLICY IF EXISTS "documentos actualizar" ON storage.objects;
DROP POLICY IF EXISTS "documentos borrar" ON storage.objects;
DROP POLICY IF EXISTS "documentos select" ON storage.objects;
DROP POLICY IF EXISTS "documentos insert" ON storage.objects;
DROP POLICY IF EXISTS "documentos update" ON storage.objects;
DROP POLICY IF EXISTS "documentos delete" ON storage.objects;
DROP POLICY IF EXISTS "documentos auth all" ON storage.objects;

CREATE POLICY "documentos solo autenticados"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'documentos' AND auth.uid() IS NOT NULL)
WITH CHECK (bucket_id = 'documentos' AND auth.uid() IS NOT NULL);