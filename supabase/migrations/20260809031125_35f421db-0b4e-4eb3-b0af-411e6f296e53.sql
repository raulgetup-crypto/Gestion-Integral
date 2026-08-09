CREATE TABLE public.directorio (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  cargo text,
  institucion text,
  area text,
  telefono text,
  telefono_alternativo text,
  email text,
  sede_id integer,
  observaciones text,
  activo boolean not null default true,
  fecha_baja timestamptz,
  usuario_baja integer,
  motivo_baja text,
  created_by integer,
  updated_by integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE ON public.directorio TO authenticated;
GRANT ALL ON public.directorio TO service_role;
ALTER TABLE public.directorio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "directorio_select" ON public.directorio FOR SELECT TO authenticated USING (true);
CREATE POLICY "directorio_insert" ON public.directorio FOR INSERT TO authenticated WITH CHECK (public.kalen_rol() IN ('admin','edicion'));
CREATE POLICY "directorio_update" ON public.directorio FOR UPDATE TO authenticated USING (public.kalen_rol() IN ('admin','edicion')) WITH CHECK (public.kalen_rol() IN ('admin','edicion'));
CREATE INDEX idx_directorio_activo ON public.directorio(activo);