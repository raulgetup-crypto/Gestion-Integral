ALTER TABLE public.admisiones DROP CONSTRAINT IF EXISTS admisiones_estado_check;
ALTER TABLE public.admisiones ADD CONSTRAINT admisiones_estado_check CHECK (estado = ANY (ARRAY[
  'en_curso','consulta_recibida','entrevista_programada','entrevista_realizada',
  'encuentro_programado','encuentro_realizado',
  'documentacion_solicitada','en_evaluacion','admitido','no_ingreso','en_espera'
]));

ALTER TABLE public.turnos ADD COLUMN IF NOT EXISTS resultado text NOT NULL DEFAULT '';