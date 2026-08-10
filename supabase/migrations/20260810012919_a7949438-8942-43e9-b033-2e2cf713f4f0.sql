
-- Segunda sede
INSERT INTO public.sedes (nombre, activa)
SELECT 'Kalen - Banda Norte', true
WHERE NOT EXISTS (SELECT 1 FROM public.sedes WHERE nombre = 'Kalen - Banda Norte');

-- Turnos: vínculo con persona, sede y responsable
ALTER TABLE public.turnos
  ADD COLUMN IF NOT EXISTS persona_id uuid REFERENCES public.personas(id),
  ADD COLUMN IF NOT EXISTS dni text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sede_id integer REFERENCES public.sedes(id),
  ADD COLUMN IF NOT EXISTS profesional text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.turnos SET sede_id = (SELECT min(id) FROM public.sedes) WHERE sede_id IS NULL;
UPDATE public.turnos SET estado = 'realizado' WHERE estado = 'atendido';

CREATE INDEX IF NOT EXISTS idx_turnos_persona ON public.turnos(persona_id);
CREATE INDEX IF NOT EXISTS idx_turnos_sede ON public.turnos(sede_id);

DROP TRIGGER IF EXISTS set_turnos_updated_at ON public.turnos;
CREATE TRIGGER set_turnos_updated_at
BEFORE UPDATE ON public.turnos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Catálogo editable de tipos de turno
INSERT INTO public.catalogos (tipo, valor)
SELECT 'tipos_turno', v
FROM (VALUES
  ('Entrevista de admisión'),
  ('Valoración'),
  ('Entrevista'),
  ('Seguimiento'),
  ('Reunión'),
  ('Otro')
) AS t(v)
WHERE NOT EXISTS (
  SELECT 1 FROM public.catalogos c WHERE c.tipo = 'tipos_turno' AND c.valor = t.v
);
