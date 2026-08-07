CREATE TABLE IF NOT EXISTS public.personas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sede_id INTEGER REFERENCES public.sedes(id),
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL DEFAULT '',
  documento_tipo TEXT,
  documento_numero TEXT,
  email TEXT,
  telefono TEXT NOT NULL DEFAULT '',
  fecha_nacimiento DATE,
  etapa TEXT NOT NULL DEFAULT 'contacto_inicial',
  observaciones TEXT NOT NULL DEFAULT '',
  created_by INTEGER,
  updated_by INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.personas TO authenticated;
GRANT ALL ON public.personas TO service_role;
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS personas_select ON public.personas;
DROP POLICY IF EXISTS personas_insert ON public.personas;
DROP POLICY IF EXISTS personas_update ON public.personas;
DROP POLICY IF EXISTS personas_delete ON public.personas;

CREATE POLICY personas_select ON public.personas FOR SELECT TO authenticated USING (true);
CREATE POLICY personas_insert ON public.personas FOR INSERT TO authenticated WITH CHECK (public.kalen_rol() IN ('admin','edicion'));
CREATE POLICY personas_update ON public.personas FOR UPDATE TO authenticated USING (public.kalen_rol() IN ('admin','edicion')) WITH CHECK (public.kalen_rol() IN ('admin','edicion'));
CREATE POLICY personas_delete ON public.personas FOR DELETE TO authenticated USING (public.kalen_rol() = 'admin');

CREATE INDEX IF NOT EXISTS personas_documento_idx ON public.personas (documento_tipo, documento_numero);

ALTER TABLE public.admisiones ADD COLUMN IF NOT EXISTS persona_id UUID REFERENCES public.personas(id);
ALTER TABLE public.concurrentes ADD COLUMN IF NOT EXISTS persona_id UUID REFERENCES public.personas(id);
CREATE INDEX IF NOT EXISTS admisiones_persona_id_idx ON public.admisiones (persona_id);
CREATE INDEX IF NOT EXISTS concurrentes_persona_id_idx ON public.concurrentes (persona_id);