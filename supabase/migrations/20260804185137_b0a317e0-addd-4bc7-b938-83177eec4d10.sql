-- ============================================================
-- MIGRACIÓN 1/4 — Storage: cerrar acceso anónimo al bucket "documentos"
-- Rollback: recrear las policies con rol anon (ver informe)
-- ============================================================
DROP POLICY IF EXISTS "documentos lectura" ON storage.objects;
DROP POLICY IF EXISTS "documentos subida" ON storage.objects;
DROP POLICY IF EXISTS "documentos actualizar" ON storage.objects;
DROP POLICY IF EXISTS "documentos borrar" ON storage.objects;
DROP POLICY IF EXISTS "documentos auth all" ON storage.objects;

CREATE POLICY "documentos auth all"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'documentos')
WITH CHECK (bucket_id = 'documentos');

-- ============================================================
-- MIGRACIÓN 2/4 — Unicidad de concurrentes (DNI y legacy_id)
-- Rollback: DROP INDEX public.concurrentes_dni_uniq, concurrentes_legacy_id_uniq;
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS concurrentes_dni_uniq
  ON public.concurrentes (dni)
  WHERE dni IS NOT NULL AND btrim(dni) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS concurrentes_legacy_id_uniq
  ON public.concurrentes (legacy_id)
  WHERE legacy_id IS NOT NULL AND btrim(legacy_id) <> '';

-- Índices de apoyo para las consultas más frecuentes
CREATE INDEX IF NOT EXISTS documentos_concurrente_idx ON public.documentos (concurrente_id);
CREATE INDEX IF NOT EXISTS eventos_fecha_idx ON public.eventos (fecha);
CREATE INDEX IF NOT EXISTS turnos_fecha_idx ON public.turnos (fecha);
CREATE INDEX IF NOT EXISTS planilla_estados_mes_idx ON public.planilla_estados (mes);
CREATE INDEX IF NOT EXISTS lote_items_lote_idx ON public.lote_items (lote_id);

-- Unicidad de planilla por (concurrente, mes): requerida por el upsert existente
CREATE UNIQUE INDEX IF NOT EXISTS planilla_estados_conc_mes_uniq
  ON public.planilla_estados (concurrente_id, mes);

-- ============================================================
-- MIGRACIÓN 3/4 — Integridad referencial al eliminar
-- Rollback: recrear las FK sin cláusula ON DELETE (ver informe)
-- ============================================================
ALTER TABLE public.documentos DROP CONSTRAINT IF EXISTS documentos_concurrente_id_fkey;
ALTER TABLE public.documentos ADD CONSTRAINT documentos_concurrente_id_fkey
  FOREIGN KEY (concurrente_id) REFERENCES public.concurrentes(id) ON DELETE CASCADE;

ALTER TABLE public.eventos DROP CONSTRAINT IF EXISTS eventos_concurrente_id_fkey;
ALTER TABLE public.eventos ADD CONSTRAINT eventos_concurrente_id_fkey
  FOREIGN KEY (concurrente_id) REFERENCES public.concurrentes(id) ON DELETE SET NULL;

ALTER TABLE public.facturacion DROP CONSTRAINT IF EXISTS facturacion_concurrente_id_fkey;
ALTER TABLE public.facturacion ADD CONSTRAINT facturacion_concurrente_id_fkey
  FOREIGN KEY (concurrente_id) REFERENCES public.concurrentes(id) ON DELETE SET NULL;

ALTER TABLE public.planilla_estados DROP CONSTRAINT IF EXISTS planilla_estados_concurrente_id_fkey;
ALTER TABLE public.planilla_estados ADD CONSTRAINT planilla_estados_concurrente_id_fkey
  FOREIGN KEY (concurrente_id) REFERENCES public.concurrentes(id) ON DELETE CASCADE;

ALTER TABLE public.lote_items DROP CONSTRAINT IF EXISTS lote_items_concurrente_id_fkey;
ALTER TABLE public.lote_items ADD CONSTRAINT lote_items_concurrente_id_fkey
  FOREIGN KEY (concurrente_id) REFERENCES public.concurrentes(id) ON DELETE SET NULL;

ALTER TABLE public.lote_items DROP CONSTRAINT IF EXISTS lote_items_lote_id_fkey;
ALTER TABLE public.lote_items ADD CONSTRAINT lote_items_lote_id_fkey
  FOREIGN KEY (lote_id) REFERENCES public.lotes(id) ON DELETE CASCADE;

-- El historial conserva la traza aunque se elimine la persona
ALTER TABLE public.historial DROP CONSTRAINT IF EXISTS historial_concurrente_id_fkey;
ALTER TABLE public.historial ADD CONSTRAINT historial_concurrente_id_fkey
  FOREIGN KEY (concurrente_id) REFERENCES public.concurrentes(id) ON DELETE SET NULL;

-- ============================================================
-- MIGRACIÓN 4/4 — Armado de lotes atómico
-- Rollback: DROP FUNCTION public.set_lote_items(uuid, jsonb);
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_lote_items(p_lote_id uuid, p_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.lote_items WHERE lote_id = p_lote_id;
  INSERT INTO public.lote_items (lote_id, concurrente_id, nombre)
  SELECT p_lote_id,
         NULLIF(item->>'concurrente_id','')::uuid,
         COALESCE(item->>'nombre','')
  FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) AS item;
END;
$$;

REVOKE ALL ON FUNCTION public.set_lote_items(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_lote_items(uuid, jsonb) TO authenticated;