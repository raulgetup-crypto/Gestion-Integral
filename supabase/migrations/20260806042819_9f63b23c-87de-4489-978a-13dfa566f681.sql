-- Etapa 2: circuito completo de admisiones + historial de estados

-- 2.1 Nuevos estados del circuito
ALTER TABLE public.admisiones DROP CONSTRAINT IF EXISTS admisiones_estado_check;
ALTER TABLE public.admisiones ADD CONSTRAINT admisiones_estado_check CHECK (estado = ANY (ARRAY[
  'en_curso','consulta_recibida','entrevista_programada','entrevista_realizada',
  'documentacion_solicitada','en_evaluacion','admitido','no_ingreso','en_espera'
]));

-- 2.3 Historial de estados
CREATE TABLE IF NOT EXISTS public.historial_estados_admisiones (
  id serial PRIMARY KEY,
  admision_id integer NOT NULL REFERENCES public.admisiones(id) ON DELETE CASCADE,
  concurrente_id uuid REFERENCES public.concurrentes(id) ON DELETE SET NULL,
  sede_id integer REFERENCES public.sedes(id),
  estado_anterior text NOT NULL DEFAULT '',
  estado_nuevo text NOT NULL,
  motivo_no_ingreso text NOT NULL DEFAULT '',
  observacion text NOT NULL DEFAULT '',
  usuario_id integer REFERENCES public.usuarios(id),
  fecha_hora timestamptz NOT NULL DEFAULT now(),
  created_by integer REFERENCES public.usuarios(id),
  updated_by integer REFERENCES public.usuarios(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hist_adm_admision ON public.historial_estados_admisiones(admision_id);
CREATE INDEX IF NOT EXISTS idx_hist_adm_concurrente ON public.historial_estados_admisiones(concurrente_id);

GRANT SELECT, INSERT ON public.historial_estados_admisiones TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.historial_estados_admisiones_id_seq TO authenticated;
GRANT ALL ON public.historial_estados_admisiones TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.historial_estados_admisiones_id_seq TO service_role;

ALTER TABLE public.historial_estados_admisiones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hist_adm_select" ON public.historial_estados_admisiones;
CREATE POLICY "hist_adm_select" ON public.historial_estados_admisiones
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "hist_adm_insert" ON public.historial_estados_admisiones;
CREATE POLICY "hist_adm_insert" ON public.historial_estados_admisiones
  FOR INSERT TO authenticated WITH CHECK (public.kalen_rol() IN ('admin','edicion'));

-- Registro automático de cada cambio de estado
CREATE OR REPLACE FUNCTION public.registrar_estado_admision()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE v_usuario integer;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.estado IS NOT DISTINCT FROM OLD.estado THEN
    RETURN NEW;
  END IF;

  v_usuario := COALESCE(NEW.updated_by, NEW.created_by);

  INSERT INTO public.historial_estados_admisiones (
    admision_id, concurrente_id, sede_id, estado_anterior, estado_nuevo,
    motivo_no_ingreso, observacion, usuario_id, created_by, updated_by
  ) VALUES (
    NEW.id, NEW.concurrente_id, NEW.sede_id,
    CASE WHEN TG_OP = 'UPDATE' THEN COALESCE(OLD.estado,'') ELSE '' END,
    NEW.estado, COALESCE(NEW.motivo_no_ingreso,''), COALESCE(NEW.observaciones,''),
    v_usuario, v_usuario, v_usuario
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_registrar_estado_admision ON public.admisiones;
CREATE TRIGGER trg_registrar_estado_admision
AFTER INSERT OR UPDATE OF estado ON public.admisiones
FOR EACH ROW EXECUTE FUNCTION public.registrar_estado_admision();

DROP TRIGGER IF EXISTS update_hist_adm_updated_at ON public.historial_estados_admisiones;
CREATE TRIGGER update_hist_adm_updated_at
BEFORE UPDATE ON public.historial_estados_admisiones
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2.4 Timeline con cambios de estado de admisión
CREATE OR REPLACE FUNCTION public.get_concurrente_timeline(p_concurrente_id uuid)
 RETURNS TABLE(fecha timestamp with time zone, tipo_evento text, descripcion text, estado text, link_id text, origen_tabla text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $$
  SELECT a.created_at, 'admision'::text,
         COALESCE(NULLIF(a.motivo_consulta,''),'Solicitud de admisión'),
         a.estado, a.id::text, 'admisiones'::text
    FROM public.admisiones a WHERE a.concurrente_id = p_concurrente_id
  UNION ALL
  SELECT h.fecha_hora, 'admision_estado'::text,
         CASE WHEN COALESCE(h.estado_anterior,'') = '' THEN 'Alta de admisión'
              ELSE 'Cambio de estado: ' || h.estado_anterior || ' → ' || h.estado_nuevo END
           || CASE WHEN COALESCE(h.motivo_no_ingreso,'') <> '' THEN ' · ' || h.motivo_no_ingreso ELSE '' END,
         h.estado_nuevo, h.admision_id::text, 'historial_estados_admisiones'::text
    FROM public.historial_estados_admisiones h WHERE h.concurrente_id = p_concurrente_id
  UNION ALL
  SELECT d.created_at, 'documento'::text,
         COALESCE(NULLIF(d.tipo_documento,''), d.nombre),
         d.estado, d.id::text, 'documentos'::text
    FROM public.documentos d WHERE d.concurrente_id = p_concurrente_id
  UNION ALL
  SELECT p.created_at, 'planilla'::text,
         COALESCE((SELECT t.nombre FROM public.tipos_vencimiento t WHERE t.id = p.tipo_vencimiento_id), 'Planilla')
           || COALESCE(' · ' || to_char(p.periodo,'YYYY-MM'), ''),
         p.estado_recepcion, p.id::text, 'planillas'::text
    FROM public.planillas p WHERE p.concurrente_id = p_concurrente_id
  UNION ALL
  SELECT c.fecha, 'comunicacion'::text,
         COALESCE(NULLIF(c.mensaje_enviado,''),'Comunicación') ,
         COALESCE(NULLIF(c.medio,''),''), c.id::text, 'comunicaciones'::text
    FROM public.comunicaciones c WHERE c.concurrente_id = p_concurrente_id
  ORDER BY 1 DESC;
$$;