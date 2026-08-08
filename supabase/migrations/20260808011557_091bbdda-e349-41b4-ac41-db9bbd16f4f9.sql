-- ============ BLOQUE 3A: bajas lógicas + trazabilidad ============

-- 1. Campos de baja lógica (idempotente, no destructivo)
ALTER TABLE public.admisiones
  ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS fecha_baja timestamptz,
  ADD COLUMN IF NOT EXISTS usuario_baja integer REFERENCES public.usuarios(id),
  ADD COLUMN IF NOT EXISTS motivo_baja text NOT NULL DEFAULT '';

ALTER TABLE public.planillas
  ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS fecha_baja timestamptz,
  ADD COLUMN IF NOT EXISTS usuario_baja integer REFERENCES public.usuarios(id),
  ADD COLUMN IF NOT EXISTS motivo_baja text NOT NULL DEFAULT '';

ALTER TABLE public.comunicaciones
  ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS fecha_baja timestamptz,
  ADD COLUMN IF NOT EXISTS usuario_baja integer REFERENCES public.usuarios(id),
  ADD COLUMN IF NOT EXISTS motivo_baja text NOT NULL DEFAULT '';

-- concurrente_profesionales ya tiene "activa": no se duplica el flag
ALTER TABLE public.concurrente_profesionales
  ADD COLUMN IF NOT EXISTS fecha_baja timestamptz,
  ADD COLUMN IF NOT EXISTS usuario_baja integer REFERENCES public.usuarios(id),
  ADD COLUMN IF NOT EXISTS motivo_baja text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_admisiones_activo ON public.admisiones(activo);
CREATE INDEX IF NOT EXISTS idx_planillas_activo ON public.planillas(activo);
CREATE INDEX IF NOT EXISTS idx_comunicaciones_activo ON public.comunicaciones(activo);
CREATE INDEX IF NOT EXISTS idx_conc_prof_activa ON public.concurrente_profesionales(activa);

-- 2. Prohibir DELETE físico desde la aplicación en entidades operativas trazables.
--    service_role (backend/respaldos) conserva su acceso; ningún rol de app puede borrar.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname, tablename
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename IN ('admisiones','planillas','comunicaciones','concurrente_profesionales')
       AND cmd = 'DELETE'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

REVOKE DELETE ON public.admisiones, public.planillas, public.comunicaciones,
                 public.concurrente_profesionales FROM authenticated, anon;

-- 3. Historial append-only: se reafirma que no hay UPDATE/DELETE posible
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname, tablename
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename IN ('historial','historial_estados_admisiones','planilla_eventos',
                         'documento_versiones','documento_maestro_versiones')
       AND cmd IN ('UPDATE','DELETE')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

REVOKE UPDATE, DELETE ON public.historial, public.historial_estados_admisiones,
                          public.planilla_eventos, public.documento_versiones,
                          public.documento_maestro_versiones FROM authenticated, anon;