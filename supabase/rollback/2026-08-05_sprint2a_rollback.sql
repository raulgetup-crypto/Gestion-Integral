-- Rollback Sprint 2A · Núcleo administrativo del concurrente
-- Ejecutar solo si se necesita revertir por completo el sprint.

DROP FUNCTION IF EXISTS public.resumen_aprossy(uuid, text);

DROP TRIGGER IF EXISTS trg_sync_prestacion_principal ON public.concurrente_prestaciones;
DROP FUNCTION IF EXISTS public.sync_prestacion_principal();

DROP TRIGGER IF EXISTS trg_validar_registro_horas ON public.registro_horas;
DROP FUNCTION IF EXISTS public.validar_registro_horas();

DROP TRIGGER IF EXISTS trg_validar_prestacion_horario ON public.prestacion_horarios;
DROP FUNCTION IF EXISTS public.validar_prestacion_horario();

DROP TABLE IF EXISTS public.registro_horas;
DROP TABLE IF EXISTS public.prestacion_horarios;
DROP TABLE IF EXISTS public.concurrente_prestaciones;

ALTER TABLE public.concurrentes
  DROP COLUMN IF EXISTS mutual,
  DROP COLUMN IF EXISTS observaciones_administrativas;

-- Mutuales agregadas al catálogo por el sprint (borrar solo si no se usan)
-- DELETE FROM public.catalogos WHERE tipo = 'mutuales' AND valor IN ('APROSS','PAMI','OSDE','Swiss Medical','IOSFA','Particular','Otra');

-- NOTA: el RPC importar_concurrentes_lote debe restaurarse a su versión previa
-- (sin mutual ni observaciones_administrativas) desde el rollback del sprint anterior.
