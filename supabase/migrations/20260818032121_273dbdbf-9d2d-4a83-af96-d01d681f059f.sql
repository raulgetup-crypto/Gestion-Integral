ALTER TABLE public.planillas
ADD COLUMN IF NOT EXISTS validacion_aprossy_enviada boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS fecha_validacion_aprossy date;