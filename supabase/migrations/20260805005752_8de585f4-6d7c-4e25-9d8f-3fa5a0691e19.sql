-- 1. planilla_estados: tipo + nuevos estados
ALTER TABLE public.planilla_estados ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'general';
ALTER TABLE public.planilla_estados ADD COLUMN IF NOT EXISTS fecha_firma date;
ALTER TABLE public.planilla_estados ADD COLUMN IF NOT EXISTS fecha_escaneo date;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.planilla_estados'::regclass AND contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE public.planilla_estados DROP CONSTRAINT %I', r.conname);
  END LOOP;
  FOR r IN
    SELECT i.indexname FROM pg_indexes i
    WHERE i.schemaname='public' AND i.tablename='planilla_estados'
      AND i.indexdef ILIKE '%UNIQUE%'
      AND i.indexname <> 'planilla_estados_pkey'
      AND NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        WHERE c.conrelid = 'public.planilla_estados'::regclass
          AND c.conname = i.indexname
      )
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS public.%I', r.indexname);
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS planilla_estados_conc_mes_tipo_key
  ON public.planilla_estados (concurrente_id, mes, tipo);

-- 2. reglas de generación automática de planillas
CREATE TABLE IF NOT EXISTS public.reglas_planilla (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL DEFAULT '',
  prestacion text NOT NULL DEFAULT '',
  mutual text NOT NULL DEFAULT '',
  modo_facturacion text NOT NULL DEFAULT '',
  tipo_planilla text NOT NULL,
  prioridad int NOT NULL DEFAULT 100,
  activa boolean NOT NULL DEFAULT true,
  observaciones text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reglas_planilla TO authenticated;
GRANT ALL ON public.reglas_planilla TO service_role;
ALTER TABLE public.reglas_planilla ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reglas_planilla_auth" ON public.reglas_planilla FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_reglas_planilla_updated_at BEFORE UPDATE ON public.reglas_planilla
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. historial inmutable de planillas
CREATE TABLE IF NOT EXISTS public.planilla_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concurrente_id uuid REFERENCES public.concurrentes(id) ON DELETE SET NULL,
  mes text NOT NULL,
  tipo text NOT NULL DEFAULT 'general',
  estado_anterior text NOT NULL DEFAULT '',
  estado_nuevo text NOT NULL,
  lote_id uuid REFERENCES public.lotes(id) ON DELETE SET NULL,
  usuario text NOT NULL DEFAULT '',
  observaciones text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.planilla_eventos TO authenticated;
GRANT ALL ON public.planilla_eventos TO service_role;
ALTER TABLE public.planilla_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "planilla_eventos_read" ON public.planilla_eventos FOR SELECT TO authenticated USING (true);
CREATE POLICY "planilla_eventos_insert" ON public.planilla_eventos FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_planilla_eventos_conc_mes ON public.planilla_eventos (concurrente_id, mes);

-- 4. cronograma administrativo mensual
CREATE TABLE IF NOT EXISTS public.cronograma_administrativo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes text NOT NULL,
  titulo text NOT NULL,
  tipo text NOT NULL DEFAULT 'entrega',
  fecha date NOT NULL,
  responsable text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT 'pendiente',
  observaciones text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cronograma_administrativo TO authenticated;
GRANT ALL ON public.cronograma_administrativo TO service_role;
ALTER TABLE public.cronograma_administrativo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cronograma_admin_auth" ON public.cronograma_administrativo FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_cronograma_admin_updated_at BEFORE UPDATE ON public.cronograma_administrativo
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_cronograma_admin_mes ON public.cronograma_administrativo (mes);

-- 5. transporte
CREATE TABLE IF NOT EXISTS public.transporte_servicios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concurrente_id uuid REFERENCES public.concurrentes(id) ON DELETE SET NULL,
  mes text NOT NULL,
  empresa text NOT NULL DEFAULT '',
  recorrido text NOT NULL DEFAULT '',
  hora_ida text NOT NULL DEFAULT '',
  hora_vuelta text NOT NULL DEFAULT '',
  dias text NOT NULL DEFAULT '',
  monto numeric NOT NULL DEFAULT 0,
  comprobante_anses boolean NOT NULL DEFAULT false,
  fecha_comprobante date,
  estado text NOT NULL DEFAULT 'pendiente',
  observaciones text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transporte_servicios TO authenticated;
GRANT ALL ON public.transporte_servicios TO service_role;
ALTER TABLE public.transporte_servicios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transporte_servicios_auth" ON public.transporte_servicios FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_transporte_servicios_updated_at BEFORE UPDATE ON public.transporte_servicios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_transporte_servicios_mes ON public.transporte_servicios (mes);

-- 6. RPC set_ciclo_planillas: soporta tipo + nuevos estados + evento
CREATE OR REPLACE FUNCTION public.set_ciclo_planillas(
  p_ids uuid[], p_mes text, p_ciclo text,
  p_lote_id uuid DEFAULT NULL::uuid, p_usuario text DEFAULT ''::text,
  p_tipo text DEFAULT 'general'::text, p_observaciones text DEFAULT ''::text)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE n int := 0; v_tipo text := COALESCE(NULLIF(p_tipo,''),'general');
BEGIN
  IF p_ciclo NOT IN ('pendiente','impresa','en_lote','entregada','recibida','firmada','escaneada','archivada') THEN
    RAISE EXCEPTION 'Estado de ciclo inválido: %', p_ciclo;
  END IF;

  INSERT INTO public.planilla_eventos (concurrente_id, mes, tipo, estado_anterior, estado_nuevo, lote_id, usuario, observaciones)
  SELECT u.id, p_mes, v_tipo, COALESCE(pe.ciclo,''), p_ciclo, p_lote_id, COALESCE(p_usuario,''), COALESCE(p_observaciones,'')
  FROM unnest(p_ids) AS u(id)
  LEFT JOIN public.planilla_estados pe
    ON pe.concurrente_id = u.id AND pe.mes = p_mes AND pe.tipo = v_tipo;

  INSERT INTO public.planilla_estados (concurrente_id, mes, tipo, estados, ciclo, lote_id,
    fecha_impresion, impresa_por, fecha_entrega, fecha_recepcion, fecha_firma, fecha_escaneo, fecha_archivado, updated_at)
  SELECT id, p_mes, v_tipo, '{}'::jsonb, p_ciclo,
    CASE WHEN p_ciclo IN ('impresa','pendiente') THEN NULL ELSE p_lote_id END,
    CASE WHEN p_ciclo = 'impresa' THEN now() ELSE NULL END,
    CASE WHEN p_ciclo = 'impresa' THEN COALESCE(p_usuario,'') ELSE '' END,
    CASE WHEN p_ciclo IN ('entregada','recibida','firmada','escaneada','archivada') THEN CURRENT_DATE ELSE NULL END,
    CASE WHEN p_ciclo IN ('recibida','firmada','escaneada','archivada') THEN CURRENT_DATE ELSE NULL END,
    CASE WHEN p_ciclo IN ('firmada','escaneada','archivada') THEN CURRENT_DATE ELSE NULL END,
    CASE WHEN p_ciclo IN ('escaneada','archivada') THEN CURRENT_DATE ELSE NULL END,
    CASE WHEN p_ciclo = 'archivada' THEN CURRENT_DATE ELSE NULL END,
    now()
  FROM unnest(p_ids) AS id
  ON CONFLICT (concurrente_id, mes, tipo) DO UPDATE SET
    ciclo = EXCLUDED.ciclo,
    lote_id = CASE WHEN EXCLUDED.ciclo IN ('impresa','pendiente') THEN NULL ELSE COALESCE(EXCLUDED.lote_id, public.planilla_estados.lote_id) END,
    fecha_impresion = COALESCE(EXCLUDED.fecha_impresion, public.planilla_estados.fecha_impresion),
    impresa_por = CASE WHEN EXCLUDED.ciclo = 'impresa' THEN EXCLUDED.impresa_por ELSE public.planilla_estados.impresa_por END,
    fecha_entrega = COALESCE(EXCLUDED.fecha_entrega, public.planilla_estados.fecha_entrega),
    fecha_recepcion = COALESCE(EXCLUDED.fecha_recepcion, public.planilla_estados.fecha_recepcion),
    fecha_firma = COALESCE(EXCLUDED.fecha_firma, public.planilla_estados.fecha_firma),
    fecha_escaneo = COALESCE(EXCLUDED.fecha_escaneo, public.planilla_estados.fecha_escaneo),
    fecha_archivado = COALESCE(EXCLUDED.fecha_archivado, public.planilla_estados.fecha_archivado),
    updated_at = now();

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$function$;

-- 7. set_ciclo_lote respeta la nueva firma
CREATE OR REPLACE FUNCTION public.set_ciclo_lote(p_lote_id uuid, p_ciclo text)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE n int := 0; v_mes text;
BEGIN
  SELECT mes INTO v_mes FROM public.lotes WHERE id = p_lote_id;
  IF v_mes IS NULL THEN RAISE EXCEPTION 'Lote inexistente'; END IF;

  n := public.set_ciclo_planillas(
    ARRAY(SELECT concurrente_id FROM public.lote_items WHERE lote_id = p_lote_id AND concurrente_id IS NOT NULL),
    v_mes, p_ciclo, p_lote_id, '', 'general', ''
  );
  RETURN n;
END;
$function$;

-- 8. reglas base (compatibles con Sprint 2A)
INSERT INTO public.reglas_planilla (nombre, prestacion, mutual, modo_facturacion, tipo_planilla, prioridad)
VALUES
  ('DAI - control horario', 'DAI', '', 'horas', 'DAI', 10),
  ('MIE - control horario', 'MIE', '', 'horas', 'MIE', 10),
  ('IE - control horario', 'IE', '', 'horas', 'IE', 10),
  ('Centro de Día - módulo', 'Centro de Día', '', 'modulo', 'CD', 20),
  ('CET - módulo', 'CET', '', 'modulo', 'CET', 20),
  ('Transporte - módulo', 'Transporte', '', 'modulo', 'TRANSPORTE', 30)
ON CONFLICT DO NOTHING;