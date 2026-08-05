-- =========================================================
-- SPRINT 2A · Núcleo administrativo del concurrente (aditivo)
-- =========================================================

-- 1) Campos administrativos en concurrentes (aditivos)
ALTER TABLE public.concurrentes
  ADD COLUMN IF NOT EXISTS mutual text NOT NULL DEFAULT ''::text,
  ADD COLUMN IF NOT EXISTS observaciones_administrativas text NOT NULL DEFAULT ''::text;

-- 2) Prestaciones múltiples por concurrente
CREATE TABLE IF NOT EXISTS public.concurrente_prestaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concurrente_id uuid NOT NULL REFERENCES public.concurrentes(id) ON DELETE CASCADE,
  prestacion text NOT NULL,
  fecha_inicio date,
  fecha_fin date,
  activa boolean NOT NULL DEFAULT true,
  principal boolean NOT NULL DEFAULT false,
  observaciones text NOT NULL DEFAULT ''::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.concurrente_prestaciones TO authenticated;
GRANT ALL ON public.concurrente_prestaciones TO service_role;
ALTER TABLE public.concurrente_prestaciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "solo autenticados concurrente_prestaciones" ON public.concurrente_prestaciones;
CREATE POLICY "solo autenticados concurrente_prestaciones"
  ON public.concurrente_prestaciones FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_cp_concurrente ON public.concurrente_prestaciones(concurrente_id);
CREATE INDEX IF NOT EXISTS idx_cp_activa ON public.concurrente_prestaciones(concurrente_id, activa);

DROP TRIGGER IF EXISTS update_concurrente_prestaciones_updated_at ON public.concurrente_prestaciones;
CREATE TRIGGER update_concurrente_prestaciones_updated_at
  BEFORE UPDATE ON public.concurrente_prestaciones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Cronograma semanal por prestación
CREATE TABLE IF NOT EXISTS public.prestacion_horarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prestacion_id uuid NOT NULL REFERENCES public.concurrente_prestaciones(id) ON DELETE CASCADE,
  dia_semana smallint NOT NULL,
  hora_inicio text NOT NULL DEFAULT '09:00'::text,
  hora_fin text NOT NULL DEFAULT '12:00'::text,
  horas numeric NOT NULL DEFAULT 0,
  observaciones text NOT NULL DEFAULT ''::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prestacion_horarios TO authenticated;
GRANT ALL ON public.prestacion_horarios TO service_role;
ALTER TABLE public.prestacion_horarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "solo autenticados prestacion_horarios" ON public.prestacion_horarios;
CREATE POLICY "solo autenticados prestacion_horarios"
  ON public.prestacion_horarios FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_ph_prestacion ON public.prestacion_horarios(prestacion_id);

DROP TRIGGER IF EXISTS update_prestacion_horarios_updated_at ON public.prestacion_horarios;
CREATE TRIGGER update_prestacion_horarios_updated_at
  BEFORE UPDATE ON public.prestacion_horarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validación de día y horas (trigger, no CHECK dependiente de datos externos)
CREATE OR REPLACE FUNCTION public.validar_prestacion_horario()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  h_ini numeric;
  h_fin numeric;
BEGIN
  IF NEW.dia_semana < 0 OR NEW.dia_semana > 6 THEN
    RAISE EXCEPTION 'dia_semana debe estar entre 0 (domingo) y 6 (sábado)';
  END IF;

  BEGIN
    h_ini := EXTRACT(EPOCH FROM NEW.hora_inicio::time) / 3600.0;
    h_fin := EXTRACT(EPOCH FROM NEW.hora_fin::time) / 3600.0;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'Horario inválido: % - %', NEW.hora_inicio, NEW.hora_fin;
  END;

  IF h_fin <= h_ini THEN
    RAISE EXCEPTION 'La hora de fin debe ser posterior a la de inicio';
  END IF;

  NEW.horas := ROUND((h_fin - h_ini)::numeric, 2);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_prestacion_horario ON public.prestacion_horarios;
CREATE TRIGGER trg_validar_prestacion_horario
  BEFORE INSERT OR UPDATE ON public.prestacion_horarios
  FOR EACH ROW EXECUTE FUNCTION public.validar_prestacion_horario();

-- 4) Registro de horas (control APROSS)
CREATE TABLE IF NOT EXISTS public.registro_horas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concurrente_id uuid NOT NULL REFERENCES public.concurrentes(id) ON DELETE CASCADE,
  prestacion_id uuid REFERENCES public.concurrente_prestaciones(id) ON DELETE SET NULL,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  horas numeric NOT NULL DEFAULT 0,
  tipo text NOT NULL DEFAULT 'programada'::text,
  mes text NOT NULL DEFAULT to_char(CURRENT_DATE, 'YYYY-MM'),
  observaciones text NOT NULL DEFAULT ''::text,
  usuario text NOT NULL DEFAULT ''::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.registro_horas TO authenticated;
GRANT ALL ON public.registro_horas TO service_role;
ALTER TABLE public.registro_horas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "solo autenticados registro_horas" ON public.registro_horas;
CREATE POLICY "solo autenticados registro_horas"
  ON public.registro_horas FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_rh_concurrente ON public.registro_horas(concurrente_id);
CREATE INDEX IF NOT EXISTS idx_rh_prestacion ON public.registro_horas(prestacion_id);
CREATE INDEX IF NOT EXISTS idx_rh_mes ON public.registro_horas(concurrente_id, mes);

DROP TRIGGER IF EXISTS update_registro_horas_updated_at ON public.registro_horas;
CREATE TRIGGER update_registro_horas_updated_at
  BEFORE UPDATE ON public.registro_horas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validación de tipo + mes derivado de la fecha
CREATE OR REPLACE FUNCTION public.validar_registro_horas()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tipo NOT IN ('programada','asistida','recuperada','receso','feriado','justificada','no_asistio') THEN
    RAISE EXCEPTION 'Tipo de registro inválido: %', NEW.tipo;
  END IF;
  IF NEW.horas < 0 THEN
    RAISE EXCEPTION 'Las horas no pueden ser negativas';
  END IF;
  NEW.mes := to_char(NEW.fecha, 'YYYY-MM');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_registro_horas ON public.registro_horas;
CREATE TRIGGER trg_validar_registro_horas
  BEFORE INSERT OR UPDATE ON public.registro_horas
  FOR EACH ROW EXECUTE FUNCTION public.validar_registro_horas();

-- 5) Sincronización concurrentes.prestacion <- prestación principal activa
CREATE OR REPLACE FUNCTION public.sync_prestacion_principal()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_conc uuid;
  v_prest text;
BEGIN
  v_conc := COALESCE(NEW.concurrente_id, OLD.concurrente_id);

  -- una sola principal activa por concurrente
  IF TG_OP <> 'DELETE' AND NEW.principal AND NEW.activa THEN
    UPDATE public.concurrente_prestaciones
       SET principal = false
     WHERE concurrente_id = v_conc AND id <> NEW.id AND principal;
  END IF;

  SELECT prestacion INTO v_prest
    FROM public.concurrente_prestaciones
   WHERE concurrente_id = v_conc AND activa
   ORDER BY principal DESC, COALESCE(fecha_inicio, '1900-01-01'::date) DESC, created_at DESC
   LIMIT 1;

  IF v_prest IS NOT NULL THEN
    UPDATE public.concurrentes
       SET prestacion = v_prest, updated_at = now()
     WHERE id = v_conc AND prestacion IS DISTINCT FROM v_prest;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_prestacion_principal ON public.concurrente_prestaciones;
CREATE TRIGGER trg_sync_prestacion_principal
  AFTER INSERT OR UPDATE OR DELETE ON public.concurrente_prestaciones
  FOR EACH ROW EXECUTE FUNCTION public.sync_prestacion_principal();

-- 6) Resumen mensual APROSS
CREATE OR REPLACE FUNCTION public.resumen_aprossy(p_concurrente_id uuid, p_mes text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_prog numeric := 0; v_asis numeric := 0; v_recu numeric := 0;
  v_just numeric := 0; v_rece numeric := 0; v_feri numeric := 0; v_noas numeric := 0;
  v_fact numeric := 0; v_min numeric := 24;
BEGIN
  SELECT
    COALESCE(SUM(horas) FILTER (WHERE tipo='programada'),0),
    COALESCE(SUM(horas) FILTER (WHERE tipo='asistida'),0),
    COALESCE(SUM(horas) FILTER (WHERE tipo='recuperada'),0),
    COALESCE(SUM(horas) FILTER (WHERE tipo='justificada'),0),
    COALESCE(SUM(horas) FILTER (WHERE tipo='receso'),0),
    COALESCE(SUM(horas) FILTER (WHERE tipo='feriado'),0),
    COALESCE(SUM(horas) FILTER (WHERE tipo='no_asistio'),0)
  INTO v_prog, v_asis, v_recu, v_just, v_rece, v_feri, v_noas
  FROM public.registro_horas
  WHERE concurrente_id = p_concurrente_id AND mes = p_mes;

  v_fact := v_asis + v_recu + v_just + v_feri;

  RETURN jsonb_build_object(
    'mes', p_mes,
    'programadas', v_prog,
    'asistidas', v_asis,
    'recuperadas', v_recu,
    'justificadas', v_just,
    'receso', v_rece,
    'feriado', v_feri,
    'no_asistio', v_noas,
    'facturables', v_fact,
    'faltantes', GREATEST(v_min - v_fact, 0),
    'extras', GREATEST(v_fact - v_prog, 0),
    'minimo', v_min,
    'cumple_minimo', v_fact >= v_min
  );
END;
$$;

-- 7) Mutuales en el catálogo existente
INSERT INTO public.catalogos (tipo, valor)
SELECT 'mutual', v
FROM (VALUES ('APROSS'),('PAMI'),('OSDE'),('Swiss Medical'),('IOSFA'),('Particular'),('Otra')) AS t(v)
WHERE NOT EXISTS (
  SELECT 1 FROM public.catalogos c WHERE c.tipo = 'mutual' AND c.valor = t.v
);