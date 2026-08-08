-- BLOQUE 2: endurecimiento de RLS en tablas con políticas permisivas (ALL true)
-- Patrón núcleo: SELECT autenticados · INSERT/UPDATE admin+edicion · DELETE admin

DO $$
DECLARE
  t text;
  operativas text[] := ARRAY[
    'concurrente_prestaciones','prestacion_horarios','registro_horas',
    'cronograma_administrativo','documento_maestro','documento_maestro_archivos',
    'eventos','facturacion','lotes','lote_items','mensajes','notas_rapidas',
    'planilla_estados','tareas','transporte_servicios','turnos','viandas'
  ];
  configuracion text[] := ARRAY['catalogos','requisitos_documentales','reglas_planilla'];
  pol record;
BEGIN
  -- 1) Quitar las políticas permisivas existentes de estas tablas
  FOR pol IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY (operativas || configuracion || ARRAY['historial'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;

  -- 2) Tablas operativas
  FOREACH t IN ARRAY operativas LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($p$CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)$p$, t||'_select', t);
    EXECUTE format($p$CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.kalen_rol() = ANY (ARRAY['admin','edicion']))$p$, t||'_insert', t);
    EXECUTE format($p$CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.kalen_rol() = ANY (ARRAY['admin','edicion'])) WITH CHECK (public.kalen_rol() = ANY (ARRAY['admin','edicion']))$p$, t||'_update', t);
    EXECUTE format($p$CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.kalen_rol() = 'admin')$p$, t||'_delete', t);
  END LOOP;

  -- 3) Tablas de configuración: escritura exclusiva de admin
  FOREACH t IN ARRAY configuracion LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($p$CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)$p$, t||'_select', t);
    EXECUTE format($p$CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.kalen_rol() = 'admin')$p$, t||'_insert', t);
    EXECUTE format($p$CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.kalen_rol() = 'admin') WITH CHECK (public.kalen_rol() = 'admin')$p$, t||'_update', t);
    EXECUTE format($p$CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.kalen_rol() = 'admin')$p$, t||'_delete', t);
  END LOOP;
END $$;

-- 4) Historial: bitácora append-only (sin UPDATE ni DELETE para nadie)
ALTER TABLE public.historial ENABLE ROW LEVEL SECURITY;
CREATE POLICY historial_select ON public.historial FOR SELECT TO authenticated USING (true);
CREATE POLICY historial_insert ON public.historial FOR INSERT TO authenticated
  WITH CHECK (public.kalen_rol() = ANY (ARRAY['admin','edicion']));

-- 5) Otras bitácoras: cerrar el INSERT libre
DROP POLICY IF EXISTS "planilla_eventos_insert" ON public.planilla_eventos;
CREATE POLICY planilla_eventos_insert ON public.planilla_eventos FOR INSERT TO authenticated
  WITH CHECK (public.kalen_rol() = ANY (ARRAY['admin','edicion']));

DROP POLICY IF EXISTS "alta versiones doc maestro" ON public.documento_maestro_versiones;
CREATE POLICY docmaestro_versiones_insert ON public.documento_maestro_versiones FOR INSERT TO authenticated
  WITH CHECK (public.kalen_rol() = ANY (ARRAY['admin','edicion']));

-- 6) Grants explícitos (RLS por sí sola no alcanza para el Data API)
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.concurrente_prestaciones, public.prestacion_horarios, public.registro_horas,
  public.cronograma_administrativo, public.documento_maestro, public.documento_maestro_archivos,
  public.eventos, public.facturacion, public.lotes, public.lote_items, public.mensajes,
  public.notas_rapidas, public.planilla_estados, public.tareas, public.transporte_servicios,
  public.turnos, public.viandas, public.catalogos, public.requisitos_documentales,
  public.reglas_planilla
TO authenticated;
GRANT SELECT, INSERT ON public.historial, public.planilla_eventos, public.documento_maestro_versiones TO authenticated;