-- Corregir tablas para que coincidan con la UI y los tipos esperados
DROP TABLE IF EXISTS public.documentos_institucionales CASCADE;
CREATE TABLE public.documentos_institucionales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT '',
    area TEXT NOT NULL DEFAULT '',
    sede_id INTEGER REFERENCES public.sedes(id),
    storage_path TEXT NOT NULL DEFAULT '',
    archivo_nombre TEXT,
    fecha DATE,
    responsable TEXT NOT NULL DEFAULT '',
    observaciones TEXT NOT NULL DEFAULT '',
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by INTEGER REFERENCES public.usuarios(id),
    updated_by INTEGER REFERENCES public.usuarios(id)
);
GRANT ALL ON public.documentos_institucionales TO authenticated;
GRANT ALL ON public.documentos_institucionales TO service_role;
ALTER TABLE public.documentos_institucionales ENABLE ROW LEVEL SECURITY;
CREATE POLICY documentos_institucionales_select ON public.documentos_institucionales FOR SELECT TO authenticated USING (true);
CREATE POLICY documentos_institucionales_all ON public.documentos_institucionales FOR ALL TO authenticated USING (public.kalen_rol() IN ('admin', 'edicion'));

DROP TABLE IF EXISTS public.informes_valoracion CASCADE;
CREATE TABLE public.informes_valoracion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    persona_id UUID REFERENCES public.personas(id),
    fecha_entrega DATE,
    entregado BOOLEAN NOT NULL DEFAULT false,
    metodo_entrega TEXT NOT NULL DEFAULT '',
    observaciones TEXT NOT NULL DEFAULT '',
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by INTEGER REFERENCES public.usuarios(id),
    updated_by INTEGER REFERENCES public.usuarios(id)
);
GRANT ALL ON public.informes_valoracion TO authenticated;
GRANT ALL ON public.informes_valoracion TO service_role;
ALTER TABLE public.informes_valoracion ENABLE ROW LEVEL SECURITY;
CREATE POLICY informes_valoracion_select ON public.informes_valoracion FOR SELECT TO authenticated USING (true);
CREATE POLICY informes_valoracion_all ON public.informes_valoracion FOR ALL TO authenticated USING (public.kalen_rol() IN ('admin', 'edicion'));

DROP TABLE IF EXISTS public.legajos_personal CASCADE;
CREATE TABLE public.legajos_personal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id INTEGER REFERENCES public.usuarios(id),
    nombre TEXT NOT NULL DEFAULT '',
    categoria TEXT NOT NULL DEFAULT '',
    storage_path TEXT NOT NULL DEFAULT '',
    archivo_nombre TEXT,
    vencimiento DATE,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by INTEGER REFERENCES public.usuarios(id),
    updated_by INTEGER REFERENCES public.usuarios(id)
);
GRANT ALL ON public.legajos_personal TO authenticated;
GRANT ALL ON public.legajos_personal TO service_role;
ALTER TABLE public.legajos_personal ENABLE ROW LEVEL SECURITY;
CREATE POLICY legajos_personal_select ON public.legajos_personal FOR SELECT TO authenticated USING (true);
CREATE POLICY legajos_personal_all ON public.legajos_personal FOR ALL TO authenticated USING (public.kalen_rol() IN ('admin', 'edicion'));
