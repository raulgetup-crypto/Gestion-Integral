ALTER TABLE public.planillas
  ADD COLUMN IF NOT EXISTS confirmacion_aprossy_recibida boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_confirmacion_aprossy date,
  ADD COLUMN IF NOT EXISTS observacion_confirmacion_aprossy text NOT NULL DEFAULT '';