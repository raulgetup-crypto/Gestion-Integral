ALTER TABLE public.planilla_estados
  ADD COLUMN IF NOT EXISTS ciclo text NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS lote_id uuid REFERENCES public.lotes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fecha_impresion timestamptz,
  ADD COLUMN IF NOT EXISTS impresa_por text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fecha_entrega date,
  ADD COLUMN IF NOT EXISTS fecha_recepcion date,
  ADD COLUMN IF NOT EXISTS fecha_archivado date;

CREATE INDEX IF NOT EXISTS idx_planilla_estados_lote ON public.planilla_estados(lote_id);
CREATE INDEX IF NOT EXISTS idx_planilla_estados_mes_ciclo ON public.planilla_estados(mes, ciclo);

ALTER TABLE public.lotes ADD COLUMN IF NOT EXISTS lugar_entrega text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.set_ciclo_planillas(
  p_ids uuid[], p_mes text, p_ciclo text, p_lote_id uuid DEFAULT NULL, p_usuario text DEFAULT ''
) RETURNS integer
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE n int := 0;
BEGIN
  IF p_ciclo NOT IN ('pendiente','impresa','en_lote','entregada','recibida','archivada') THEN
    RAISE EXCEPTION 'Estado de ciclo inválido: %', p_ciclo;
  END IF;

  INSERT INTO public.planilla_estados (concurrente_id, mes, estados, ciclo, lote_id,
    fecha_impresion, impresa_por, fecha_entrega, fecha_recepcion, fecha_archivado, updated_at)
  SELECT id, p_mes, '{}'::jsonb, p_ciclo,
    CASE WHEN p_ciclo IN ('impresa','pendiente') THEN NULL ELSE p_lote_id END,
    CASE WHEN p_ciclo = 'impresa' THEN now() ELSE NULL END,
    CASE WHEN p_ciclo = 'impresa' THEN COALESCE(p_usuario,'') ELSE '' END,
    CASE WHEN p_ciclo IN ('entregada','recibida','archivada') THEN CURRENT_DATE ELSE NULL END,
    CASE WHEN p_ciclo IN ('recibida','archivada') THEN CURRENT_DATE ELSE NULL END,
    CASE WHEN p_ciclo = 'archivada' THEN CURRENT_DATE ELSE NULL END,
    now()
  FROM unnest(p_ids) AS id
  ON CONFLICT (concurrente_id, mes) DO UPDATE SET
    ciclo = EXCLUDED.ciclo,
    lote_id = CASE WHEN EXCLUDED.ciclo IN ('impresa','pendiente') THEN NULL ELSE COALESCE(EXCLUDED.lote_id, public.planilla_estados.lote_id) END,
    fecha_impresion = COALESCE(EXCLUDED.fecha_impresion, public.planilla_estados.fecha_impresion),
    impresa_por = CASE WHEN EXCLUDED.ciclo = 'impresa' THEN EXCLUDED.impresa_por ELSE public.planilla_estados.impresa_por END,
    fecha_entrega = COALESCE(EXCLUDED.fecha_entrega, public.planilla_estados.fecha_entrega),
    fecha_recepcion = COALESCE(EXCLUDED.fecha_recepcion, public.planilla_estados.fecha_recepcion),
    fecha_archivado = COALESCE(EXCLUDED.fecha_archivado, public.planilla_estados.fecha_archivado),
    updated_at = now();

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_ciclo_lote(p_lote_id uuid, p_ciclo text)
RETURNS integer
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE n int := 0; v_mes text;
BEGIN
  SELECT mes INTO v_mes FROM public.lotes WHERE id = p_lote_id;
  IF v_mes IS NULL THEN RAISE EXCEPTION 'Lote inexistente'; END IF;

  n := public.set_ciclo_planillas(
    ARRAY(SELECT concurrente_id FROM public.lote_items WHERE lote_id = p_lote_id AND concurrente_id IS NOT NULL),
    v_mes, p_ciclo, p_lote_id, ''
  );
  RETURN n;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_ciclo_planillas(uuid[], text, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_ciclo_lote(uuid, text) TO authenticated;