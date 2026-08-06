ALTER TABLE public.documentos
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS archivo_nombre text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS archivo_tamano bigint NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.documento_versiones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id uuid NOT NULL REFERENCES public.documentos(id) ON DELETE CASCADE,
  concurrente_id uuid REFERENCES public.concurrentes(id) ON DELETE SET NULL,
  version integer NOT NULL DEFAULT 1,
  storage_path text NOT NULL DEFAULT '',
  nombre text NOT NULL DEFAULT '',
  mime text NOT NULL DEFAULT '',
  tamano bigint NOT NULL DEFAULT 0,
  usuario text NOT NULL DEFAULT '',
  created_by integer REFERENCES public.usuarios(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.documento_versiones TO authenticated;
GRANT ALL ON public.documento_versiones TO service_role;

ALTER TABLE public.documento_versiones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "docver_select" ON public.documento_versiones
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "docver_insert" ON public.documento_versiones
  FOR INSERT TO authenticated WITH CHECK (public.kalen_rol() IN ('admin','edicion'));

CREATE INDEX IF NOT EXISTS idx_documento_versiones_doc ON public.documento_versiones(documento_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_documento_versiones_conc ON public.documento_versiones(concurrente_id);