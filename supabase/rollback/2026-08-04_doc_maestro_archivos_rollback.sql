-- Rollback: versionado de archivos del documento maestro
DROP TRIGGER IF EXISTS update_documento_maestro_archivos_updated_at ON public.documento_maestro_archivos;
DROP INDEX IF EXISTS public.idx_doc_maestro_archivos_concurrente;
DROP POLICY IF EXISTS "solo autenticados doc maestro archivos" ON public.documento_maestro_archivos;
DROP TABLE IF EXISTS public.documento_maestro_archivos;
