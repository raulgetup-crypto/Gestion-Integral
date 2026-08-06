-- 0. Extensiones
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. SEDES
CREATE TABLE IF NOT EXISTS public.sedes (
  id serial PRIMARY KEY,
  nombre text UNIQUE NOT NULL,
  activa boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.sedes TO authenticated;
GRANT ALL ON public.sedes TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.sedes_id_seq TO authenticated, service_role;
INSERT INTO public.sedes (nombre) VALUES ('Kalen - Sede Central') ON CONFLICT (nombre) DO NOTHING;

-- 2. USUARIOS
CREATE TABLE IF NOT EXISTS public.usuarios (
  id serial PRIMARY KEY,
  nombre text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  auth_user_id text UNIQUE,
  rol text NOT NULL DEFAULT 'edicion' CHECK (rol IN ('admin','edicion','solo_lectura')),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.usuarios TO authenticated;
GRANT ALL ON public.usuarios TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.usuarios_id_seq TO authenticated, service_role;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "usuarios_select_auth" ON public.usuarios;
CREATE POLICY "usuarios_select_auth" ON public.usuarios FOR SELECT TO authenticated USING (true);

INSERT INTO public.usuarios (nombre, email, rol)
SELECT 'Raúl Sayal', 'admin@kalen.com', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM public.usuarios WHERE email = 'admin@kalen.com');

-- 3. TIPOS_VENCIMIENTO
CREATE TABLE IF NOT EXISTS public.tipos_vencimiento (
  id serial PRIMARY KEY,
  nombre text UNIQUE NOT NULL,
  dias_plazo integer NOT NULL DEFAULT 30,
  activo boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.tipos_vencimiento TO authenticated;
GRANT ALL ON public.tipos_vencimiento TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.tipos_vencimiento_id_seq TO authenticated, service_role;
INSERT INTO public.tipos_vencimiento (nombre, dias_plazo) VALUES
  ('APROSS Mensual', 30), ('UGP Transporte', 30), ('Incluir Salud', 5)
ON CONFLICT (nombre) DO NOTHING;

-- 4. CONCURRENTES (existente, uuid): agregar columnas nuevas
ALTER TABLE public.concurrentes
  ADD COLUMN IF NOT EXISTS sede_id integer REFERENCES public.sedes(id),
  ADD COLUMN IF NOT EXISTS colegio text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS numero_institucion text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fecha_ingreso date,
  ADD COLUMN IF NOT EXISTS created_by integer REFERENCES public.usuarios(id),
  ADD COLUMN IF NOT EXISTS updated_by integer REFERENCES public.usuarios(id),
  ADD COLUMN IF NOT EXISTS revisar_dni boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS concurrentes_nombre_trgm ON public.concurrentes USING gin (nombre gin_trgm_ops);
CREATE INDEX IF NOT EXISTS concurrentes_apellido_trgm ON public.concurrentes USING gin (apellido gin_trgm_ops);
CREATE INDEX IF NOT EXISTS concurrentes_sede_idx ON public.concurrentes (sede_id);

-- 11. Migración de datos existentes
UPDATE public.concurrentes SET
  sede_id = COALESCE(sede_id, (SELECT id FROM public.sedes WHERE nombre = 'Kalen - Sede Central')),
  created_by = COALESCE(created_by, (SELECT id FROM public.usuarios WHERE email = 'admin@kalen.com')),
  updated_by = COALESCE(updated_by, (SELECT id FROM public.usuarios WHERE email = 'admin@kalen.com'));

UPDATE public.concurrentes
   SET dni = 'SIN_DNI-' || left(id::text, 8), revisar_dni = true
 WHERE dni IS NULL OR btrim(dni) = '';

-- 5. ADMISIONES
CREATE TABLE IF NOT EXISTS public.admisiones (
  id serial PRIMARY KEY,
  sede_id integer REFERENCES public.sedes(id),
  concurrente_id uuid REFERENCES public.concurrentes(id) ON DELETE SET NULL,
  fecha_solicitud date,
  nombre_contacto text NOT NULL DEFAULT '',
  telefono text NOT NULL DEFAULT '',
  medio text NOT NULL DEFAULT '',
  motivo_consulta text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT 'en_curso' CHECK (estado IN ('en_curso','entrevista_realizada','admitido','no_ingreso','en_espera')),
  motivo_no_ingreso text NOT NULL DEFAULT '',
  fecha_entrevista date,
  observaciones text NOT NULL DEFAULT '',
  created_by integer REFERENCES public.usuarios(id),
  updated_by integer REFERENCES public.usuarios(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admisiones TO authenticated;
GRANT ALL ON public.admisiones TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.admisiones_id_seq TO authenticated, service_role;
CREATE INDEX IF NOT EXISTS admisiones_concurrente_idx ON public.admisiones (concurrente_id);
CREATE INDEX IF NOT EXISTS admisiones_sede_idx ON public.admisiones (sede_id);

-- 6. DOCUMENTOS (existente, uuid): agregar columnas nuevas
ALTER TABLE public.documentos
  ADD COLUMN IF NOT EXISTS tipo_documento text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fecha_solicitud date,
  ADD COLUMN IF NOT EXISTS fecha_recepcion date,
  ADD COLUMN IF NOT EXISTS fecha_vencimiento date,
  ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_by integer REFERENCES public.usuarios(id),
  ADD COLUMN IF NOT EXISTS updated_by integer REFERENCES public.usuarios(id),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.documentos SET
  tipo_documento = COALESCE(NULLIF(tipo_documento,''), tipo),
  fecha_vencimiento = COALESCE(fecha_vencimiento, vencimiento),
  created_by = COALESCE(created_by, (SELECT id FROM public.usuarios WHERE email='admin@kalen.com')),
  updated_by = COALESCE(updated_by, (SELECT id FROM public.usuarios WHERE email='admin@kalen.com'));

ALTER TABLE public.documentos DROP CONSTRAINT IF EXISTS documentos_estado_check;
ALTER TABLE public.documentos ADD CONSTRAINT documentos_estado_check
  CHECK (estado IN ('completo','pendiente','en_revision','vencido'));
CREATE INDEX IF NOT EXISTS documentos_concurrente_idx ON public.documentos (concurrente_id);

-- 7. PLANILLAS
CREATE TABLE IF NOT EXISTS public.planillas (
  id serial PRIMARY KEY,
  concurrente_id uuid NOT NULL REFERENCES public.concurrentes(id) ON DELETE CASCADE,
  tipo_vencimiento_id integer REFERENCES public.tipos_vencimiento(id),
  periodo date,
  fecha_limite date,
  fecha_recepcion date,
  ubicacion_actual text NOT NULL DEFAULT 'Secretaría' CHECK (ubicacion_actual IN ('Secretaría','Banda Norte','Coordinación','Facturación','Archivo')),
  estado_firma text NOT NULL DEFAULT 'pendiente_firma' CHECK (estado_firma IN ('pendiente_firma','enviada_coordinacion','firmada','devuelta_obs')),
  estado_recepcion text NOT NULL DEFAULT 'pendiente' CHECK (estado_recepcion IN ('pendiente','recibida_termino','recibida_fuera_termino','con_observaciones','aprobada')),
  motivo_demora text NOT NULL DEFAULT '',
  responsable text NOT NULL DEFAULT '',
  created_by integer REFERENCES public.usuarios(id),
  updated_by integer REFERENCES public.usuarios(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT planillas_unicas UNIQUE (concurrente_id, tipo_vencimiento_id, periodo)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planillas TO authenticated;
GRANT ALL ON public.planillas TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.planillas_id_seq TO authenticated, service_role;
CREATE INDEX IF NOT EXISTS planillas_concurrente_idx ON public.planillas (concurrente_id);
CREATE INDEX IF NOT EXISTS planillas_periodo_idx ON public.planillas (periodo);

CREATE OR REPLACE FUNCTION public.calcular_fecha_limite_planilla()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE v_dias integer;
BEGIN
  IF NEW.fecha_limite IS NULL AND NEW.periodo IS NOT NULL AND NEW.tipo_vencimiento_id IS NOT NULL THEN
    SELECT dias_plazo INTO v_dias FROM public.tipos_vencimiento WHERE id = NEW.tipo_vencimiento_id;
    IF v_dias IS NOT NULL THEN
      NEW.fecha_limite := NEW.periodo + (v_dias || ' days')::interval;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_calcular_fecha_limite_planilla ON public.planillas;
CREATE TRIGGER trg_calcular_fecha_limite_planilla
  BEFORE INSERT OR UPDATE ON public.planillas
  FOR EACH ROW EXECUTE FUNCTION public.calcular_fecha_limite_planilla();

DROP TRIGGER IF EXISTS update_planillas_updated_at ON public.planillas;
CREATE TRIGGER update_planillas_updated_at BEFORE UPDATE ON public.planillas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_admisiones_updated_at ON public.admisiones;
CREATE TRIGGER update_admisiones_updated_at BEFORE UPDATE ON public.admisiones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. COMUNICACIONES (documento_id es uuid porque documentos usa uuid)
CREATE TABLE IF NOT EXISTS public.comunicaciones (
  id serial PRIMARY KEY,
  concurrente_id uuid REFERENCES public.concurrentes(id) ON DELETE CASCADE,
  planilla_id integer REFERENCES public.planillas(id) ON DELETE SET NULL,
  documento_id uuid REFERENCES public.documentos(id) ON DELETE SET NULL,
  fecha timestamptz NOT NULL DEFAULT now(),
  destinatario text NOT NULL DEFAULT '',
  medio text NOT NULL DEFAULT '',
  mensaje_enviado text NOT NULL DEFAULT '',
  respuesta text NOT NULL DEFAULT '',
  compromiso text NOT NULL DEFAULT '',
  created_by integer REFERENCES public.usuarios(id),
  updated_by integer REFERENCES public.usuarios(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comunicaciones TO authenticated;
GRANT ALL ON public.comunicaciones TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.comunicaciones_id_seq TO authenticated, service_role;
CREATE INDEX IF NOT EXISTS comunicaciones_concurrente_idx ON public.comunicaciones (concurrente_id);
DROP TRIGGER IF EXISTS update_comunicaciones_updated_at ON public.comunicaciones;
CREATE TRIGGER update_comunicaciones_updated_at BEFORE UPDATE ON public.comunicaciones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_documentos_updated_at ON public.documentos;
CREATE TRIGGER update_documentos_updated_at BEFORE UPDATE ON public.documentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. TIMELINE 360
CREATE OR REPLACE FUNCTION public.get_concurrente_timeline(p_concurrente_id uuid)
RETURNS TABLE (fecha timestamptz, tipo_evento text, descripcion text, estado text, link_id text, origen_tabla text)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT a.created_at, 'admision'::text,
         COALESCE(NULLIF(a.motivo_consulta,''),'Solicitud de admisión'),
         a.estado, a.id::text, 'admisiones'::text
    FROM public.admisiones a WHERE a.concurrente_id = p_concurrente_id
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
GRANT EXECUTE ON FUNCTION public.get_concurrente_timeline(uuid) TO authenticated, service_role;

-- 10. RLS por rol
CREATE OR REPLACE FUNCTION public.kalen_rol()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT u.rol FROM public.usuarios u
      WHERE u.auth_user_id = auth.uid()::text AND u.activo LIMIT 1),
    'edicion')
$$;
GRANT EXECUTE ON FUNCTION public.kalen_rol() TO authenticated, service_role;

DO $$
DECLARE t text; p record;
BEGIN
  FOREACH t IN ARRAY ARRAY['concurrentes','admisiones','documentos','planillas','comunicaciones'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)', t||'_select', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.kalen_rol() IN (''admin'',''edicion''))', t||'_insert', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.kalen_rol() IN (''admin'',''edicion'')) WITH CHECK (public.kalen_rol() IN (''admin'',''edicion''))', t||'_update', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.kalen_rol() = ''admin'')', t||'_delete', t);
  END LOOP;
END $$;