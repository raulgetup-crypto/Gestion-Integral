CREATE TABLE public.rutinas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descripcion text,
  frecuencia text NOT NULL CHECK (frecuencia IN ('diaria', 'semanal', 'mensual')),
  orden integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  ultima_completada timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.rutinas TO authenticated;
GRANT ALL ON public.rutinas TO service_role;
ALTER TABLE public.rutinas ENABLE ROW LEVEL SECURITY;
CREATE POLICY rutinas_select ON public.rutinas FOR SELECT TO authenticated USING (true);
CREATE POLICY rutinas_insert ON public.rutinas FOR INSERT TO authenticated WITH CHECK (public.kalen_rol() IN ('admin', 'edicion'));
CREATE POLICY rutinas_update ON public.rutinas FOR UPDATE TO authenticated USING (public.kalen_rol() IN ('admin', 'edicion')) WITH CHECK (public.kalen_rol() IN ('admin', 'edicion'));
CREATE TRIGGER rutinas_updated_at BEFORE UPDATE ON public.rutinas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.papeletas_salida (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id uuid REFERENCES public.personas(id),
  fecha_salida date NOT NULL DEFAULT current_date,
  hora_salida time,
  motivo text NOT NULL,
  solicitado_por text NOT NULL,
  autoriza text NOT NULL DEFAULT '',
  observaciones text NOT NULL DEFAULT '',
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.papeletas_salida TO authenticated;
GRANT ALL ON public.papeletas_salida TO service_role;
ALTER TABLE public.papeletas_salida ENABLE ROW LEVEL SECURITY;
CREATE POLICY papeletas_salida_select ON public.papeletas_salida FOR SELECT TO authenticated USING (true);
CREATE POLICY papeletas_salida_insert ON public.papeletas_salida FOR INSERT TO authenticated WITH CHECK (public.kalen_rol() IN ('admin', 'edicion'));
CREATE POLICY papeletas_salida_update ON public.papeletas_salida FOR UPDATE TO authenticated USING (public.kalen_rol() IN ('admin', 'edicion')) WITH CHECK (public.kalen_rol() IN ('admin', 'edicion'));
CREATE INDEX papeletas_salida_persona_idx ON public.papeletas_salida(persona_id);
CREATE INDEX papeletas_salida_fecha_idx ON public.papeletas_salida(fecha_salida DESC);
CREATE TRIGGER papeletas_salida_updated_at BEFORE UPDATE ON public.papeletas_salida FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();