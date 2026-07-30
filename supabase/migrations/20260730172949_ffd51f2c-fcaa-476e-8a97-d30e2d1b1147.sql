CREATE TABLE public.concurrentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id text,
  nombre text NOT NULL,
  grupo text NOT NULL DEFAULT '',
  prestacion text NOT NULL DEFAULT '',
  obra_social text NOT NULL DEFAULT '',
  n_afiliado text NOT NULL DEFAULT '',
  dias_x_semana text NOT NULL DEFAULT '',
  dias_especificos text NOT NULL DEFAULT '',
  horarios text NOT NULL DEFAULT '',
  responsable text NOT NULL DEFAULT '',
  mail text NOT NULL DEFAULT '',
  wsp text NOT NULL DEFAULT '',
  notas text NOT NULL DEFAULT '',
  observaciones text NOT NULL DEFAULT '',
  tipo text NOT NULL DEFAULT 'prestacion',
  activo boolean NOT NULL DEFAULT true,
  fecha_baja date,
  motivo_baja text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.concurrentes TO anon, authenticated;
GRANT ALL ON public.concurrentes TO service_role;
ALTER TABLE public.concurrentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acceso total concurrentes" ON public.concurrentes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.planilla_estados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concurrente_id uuid NOT NULL REFERENCES public.concurrentes(id) ON DELETE CASCADE,
  mes text NOT NULL,
  estados jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (concurrente_id, mes)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planilla_estados TO anon, authenticated;
GRANT ALL ON public.planilla_estados TO service_role;
ALTER TABLE public.planilla_estados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acceso total planilla" ON public.planilla_estados FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.turnos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL,
  hora text NOT NULL DEFAULT '09:00',
  tipo text NOT NULL DEFAULT 'admision',
  nombre text NOT NULL,
  contacto text NOT NULL DEFAULT '',
  obra_social text NOT NULL DEFAULT '',
  notas text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT 'pendiente',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.turnos TO anon, authenticated;
GRANT ALL ON public.turnos TO service_role;
ALTER TABLE public.turnos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acceso total turnos" ON public.turnos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.tareas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  prioridad text NOT NULL DEFAULT 'media',
  vence date,
  notas text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT 'pendiente',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tareas TO anon, authenticated;
GRANT ALL ON public.tareas TO service_role;
ALTER TABLE public.tareas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acceso total tareas" ON public.tareas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  fecha date NOT NULL,
  hora text NOT NULL DEFAULT '',
  prioridad text NOT NULL DEFAULT 'media',
  categoria text NOT NULL DEFAULT 'general',
  color text NOT NULL DEFAULT 'azul',
  estado text NOT NULL DEFAULT 'pendiente',
  descripcion text NOT NULL DEFAULT '',
  concurrente_id uuid REFERENCES public.concurrentes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eventos TO anon, authenticated;
GRANT ALL ON public.eventos TO service_role;
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acceso total eventos" ON public.eventos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.mensajes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  motivo text NOT NULL DEFAULT '',
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  notas text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT 'pendiente',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mensajes TO anon, authenticated;
GRANT ALL ON public.mensajes TO service_role;
ALTER TABLE public.mensajes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acceso total mensajes" ON public.mensajes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concurrente_id uuid REFERENCES public.concurrentes(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  tipo text NOT NULL DEFAULT 'otro',
  storage_path text NOT NULL DEFAULT '',
  url text NOT NULL DEFAULT '',
  vencimiento date,
  notas text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos TO anon, authenticated;
GRANT ALL ON public.documentos TO service_role;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acceso total documentos" ON public.documentos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.facturacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concurrente_id uuid REFERENCES public.concurrentes(id) ON DELETE CASCADE,
  mes text NOT NULL,
  monto numeric NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'pendiente',
  notas text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facturacion TO anon, authenticated;
GRANT ALL ON public.facturacion TO service_role;
ALTER TABLE public.facturacion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acceso total facturacion" ON public.facturacion FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.catalogos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  valor text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tipo, valor)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalogos TO anon, authenticated;
GRANT ALL ON public.catalogos TO service_role;
ALTER TABLE public.catalogos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acceso total catalogos" ON public.catalogos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.historial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad text NOT NULL,
  entidad_id uuid,
  concurrente_id uuid REFERENCES public.concurrentes(id) ON DELETE CASCADE,
  accion text NOT NULL,
  detalle text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX historial_created_idx ON public.historial (created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.historial TO anon, authenticated;
GRANT ALL ON public.historial TO service_role;
ALTER TABLE public.historial ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acceso total historial" ON public.historial FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO public.catalogos (tipo, valor) VALUES
('prestaciones','IE'),('prestaciones','CET'),('prestaciones','CD'),('prestaciones','TT'),('prestaciones','TCC'),('prestaciones','CET Y TT'),('prestaciones','CD Y TT'),('prestaciones','Transporte'),
('mutuales','APROSS'),('mutuales','APROSS V'),('mutuales','OSECAC'),('mutuales','PAMI'),('mutuales','IOSFA'),('mutuales','PREVENCION SALUD'),('mutuales','OSPECON'),('mutuales','OPSA(L)'),('mutuales','MUTUAL MEDICA'),('mutuales','MUTUAL MUNICIPAL'),('mutuales','OSPLYFC'),('mutuales','OSFATUN'),('mutuales','OSPECOR (L)'),('mutuales','OSUTHGRA'),('mutuales','ASPURC(L)'),
('responsables','HELIANA DEVIGILLI'),('responsables','DANIELA DIALE');