ALTER TABLE public.concurrentes
  ADD COLUMN IF NOT EXISTS modalidad_ingreso text NOT NULL DEFAULT 'obra_social',
  ADD COLUMN IF NOT EXISTS servicio_beca text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS genera_planilla boolean NOT NULL DEFAULT true;

UPDATE public.concurrentes
   SET modalidad_ingreso = 'obra_social'
 WHERE modalidad_ingreso IS NULL OR modalidad_ingreso NOT IN ('particular','obra_social','becado','otro');

UPDATE public.concurrentes SET genera_planilla = true WHERE genera_planilla IS NULL;

ALTER TABLE public.concurrentes
  DROP CONSTRAINT IF EXISTS concurrentes_modalidad_ingreso_check;

ALTER TABLE public.concurrentes
  ADD CONSTRAINT concurrentes_modalidad_ingreso_check
  CHECK (modalidad_ingreso IN ('particular','obra_social','becado','otro'));