-- Historial de etapas de Personas (mismo patrón que historial_estados_admisiones)

CREATE TABLE IF NOT EXISTS public.historial_etapas_personas (
  id serial PRIMARY KEY,
  persona_id uuid NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  sede_id integer REFERENCES public.sedes(id),
  etapa_anterior text NOT NULL DEFAULT '',
  etapa_nueva text NOT NULL,
  observacion text NOT NULL DEFAULT '',
  usuario_id integer REFERENCES public.usuarios(id),
  fecha_hora timestamptz NOT NULL DEFAULT now(),
  created_by integer REFERENCES public.usuarios(id),
  updated_by integer REFERENCES public.usuarios(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hist_per_persona ON public.historial_etapas_personas(persona_id);

GRANT SELECT, INSERT ON public.historial_etapas_personas TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.historial_etapas_personas_id_seq TO authenticated;
GRANT ALL ON public.historial_etapas_personas TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.historial_etapas_personas_id_seq TO service_role;

ALTER TABLE public.historial_etapas_personas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hist_per_select" ON public.historial_etapas_personas;
CREATE POLICY "hist_per_select" ON public.historial_etapas_personas
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "hist_per_insert" ON public.historial_etapas_personas;
CREATE POLICY "hist_per_insert" ON public.historial_etapas_personas
  FOR INSERT TO authenticated WITH CHECK (public.kalen_rol() IN ('admin','edicion'));

-- Registro automático de cada cambio de etapa
CREATE OR REPLACE FUNCTION public.registrar_etapa_persona()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE v_usuario integer;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.etapa IS NOT DISTINCT FROM OLD.etapa THEN
    RETURN NEW;
  END IF;

  v_usuario := COALESCE(NEW.updated_by, NEW.created_by);

  INSERT INTO public.historial_etapas_personas (
    persona_id, sede_id, etapa_anterior, etapa_nueva,
    observacion, usuario_id, created_by, updated_by
  ) VALUES (
    NEW.id, NEW.sede_id,
    CASE WHEN TG_OP = 'UPDATE' THEN COALESCE(OLD.etapa,'') ELSE '' END,
    NEW.etapa, COALESCE(NEW.observaciones,''),
    v_usuario, v_usuario, v_usuario
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_registrar_etapa_persona ON public.personas;
CREATE TRIGGER trg_registrar_etapa_persona
AFTER INSERT OR UPDATE OF etapa ON public.personas
FOR EACH ROW EXECUTE FUNCTION public.registrar_etapa_persona();

DROP TRIGGER IF EXISTS update_hist_per_updated_at ON public.historial_etapas_personas;
CREATE TRIGGER update_hist_per_updated_at
BEFORE UPDATE ON public.historial_etapas_personas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();