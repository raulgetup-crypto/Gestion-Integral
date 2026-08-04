CREATE TABLE public.documento_maestro_archivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concurrente_id uuid NOT NULL REFERENCES public.concurrentes(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  nombre text NOT NULL DEFAULT ''::text,
  storage_path text NOT NULL DEFAULT ''::text,
  mime text NOT NULL DEFAULT ''::text,
  tamano bigint NOT NULL DEFAULT 0,
  descripcion text NOT NULL DEFAULT ''::text,
  usuario text NOT NULL DEFAULT ''::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documento_maestro_archivos TO authenticated;
GRANT ALL ON public.documento_maestro_archivos TO service_role;

ALTER TABLE public.documento_maestro_archivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "solo autenticados doc maestro archivos"
ON public.documento_maestro_archivos
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_doc_maestro_archivos_concurrente ON public.documento_maestro_archivos (concurrente_id, version DESC);

CREATE TRIGGER update_documento_maestro_archivos_updated_at
BEFORE UPDATE ON public.documento_maestro_archivos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();