CREATE TABLE public.profesionales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL DEFAULT '',
  apellido text NOT NULL DEFAULT '',
  dni text NOT NULL DEFAULT '',
  profesion text NOT NULL DEFAULT '',
  matricula text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  telefono text NOT NULL DEFAULT '',
  sede_id integer REFERENCES public.sedes(id),
  fecha_ingreso date,
  activo boolean NOT NULL DEFAULT true,
  observaciones text NOT NULL DEFAULT '',
  created_by integer REFERENCES public.usuarios(id),
  updated_by integer REFERENCES public.usuarios(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profesionales TO authenticated;
GRANT ALL ON public.profesionales TO service_role;
ALTER TABLE public.profesionales ENABLE ROW LEVEL SECURITY;

CREATE POLICY profesionales_select ON public.profesionales FOR SELECT TO authenticated USING (true);
CREATE POLICY profesionales_insert ON public.profesionales FOR INSERT TO authenticated WITH CHECK (kalen_rol() = ANY (ARRAY['admin','edicion']));
CREATE POLICY profesionales_update ON public.profesionales FOR UPDATE TO authenticated USING (kalen_rol() = ANY (ARRAY['admin','edicion'])) WITH CHECK (kalen_rol() = ANY (ARRAY['admin','edicion']));
CREATE POLICY profesionales_delete ON public.profesionales FOR DELETE TO authenticated USING (kalen_rol() = 'admin');

CREATE UNIQUE INDEX profesionales_dni_uniq ON public.profesionales (dni) WHERE dni <> '';
CREATE INDEX profesionales_sede_idx ON public.profesionales (sede_id);
CREATE INDEX profesionales_activo_idx ON public.profesionales (activo);

CREATE TRIGGER update_profesionales_updated_at BEFORE UPDATE ON public.profesionales
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.concurrente_profesionales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concurrente_id uuid NOT NULL REFERENCES public.concurrentes(id) ON DELETE CASCADE,
  profesional_id uuid NOT NULL REFERENCES public.profesionales(id) ON DELETE CASCADE,
  rol text NOT NULL DEFAULT 'equipo',
  referente boolean NOT NULL DEFAULT false,
  fecha_inicio date,
  fecha_fin date,
  activa boolean NOT NULL DEFAULT true,
  observaciones text NOT NULL DEFAULT '',
  created_by integer REFERENCES public.usuarios(id),
  updated_by integer REFERENCES public.usuarios(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (concurrente_id, profesional_id, rol)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.concurrente_profesionales TO authenticated;
GRANT ALL ON public.concurrente_profesionales TO service_role;
ALTER TABLE public.concurrente_profesionales ENABLE ROW LEVEL SECURITY;

CREATE POLICY conc_prof_select ON public.concurrente_profesionales FOR SELECT TO authenticated USING (true);
CREATE POLICY conc_prof_insert ON public.concurrente_profesionales FOR INSERT TO authenticated WITH CHECK (kalen_rol() = ANY (ARRAY['admin','edicion']));
CREATE POLICY conc_prof_update ON public.concurrente_profesionales FOR UPDATE TO authenticated USING (kalen_rol() = ANY (ARRAY['admin','edicion'])) WITH CHECK (kalen_rol() = ANY (ARRAY['admin','edicion']));
CREATE POLICY conc_prof_delete ON public.concurrente_profesionales FOR DELETE TO authenticated USING (kalen_rol() = 'admin');

CREATE INDEX conc_prof_concurrente_idx ON public.concurrente_profesionales (concurrente_id);
CREATE INDEX conc_prof_profesional_idx ON public.concurrente_profesionales (profesional_id);

CREATE TRIGGER update_conc_prof_updated_at BEFORE UPDATE ON public.concurrente_profesionales
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();