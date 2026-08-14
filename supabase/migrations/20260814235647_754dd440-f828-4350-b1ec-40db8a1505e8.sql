CREATE TABLE public.informes_valoracion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    persona_id UUID REFERENCES public.personas(id),
    fecha_entrega DATE,
    entregado BOOLEAN DEFAULT false,
    metodo_entrega TEXT,
    observaciones TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by INTEGER REFERENCES public.usuarios(id),
    updated_by INTEGER REFERENCES public.usuarios(id)
);
GRANT ALL ON public.informes_valoracion TO authenticated;
GRANT ALL ON public.informes_valoracion TO service_role;
ALTER TABLE public.informes_valoracion ENABLE ROW LEVEL SECURITY;
CREATE POLICY informes_valoracion_select ON public.informes_valoracion FOR SELECT TO authenticated USING (true);
CREATE POLICY informes_valoracion_all ON public.informes_valoracion FOR ALL TO authenticated USING (public.kalen_rol() IN ('admin', 'edicion'));

CREATE TABLE public.documentos_institucionales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    categoria TEXT,
    storage_path TEXT,
    archivo_nombre TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by INTEGER REFERENCES public.usuarios(id),
    updated_by INTEGER REFERENCES public.usuarios(id)
);
GRANT ALL ON public.documentos_institucionales TO authenticated;
GRANT ALL ON public.documentos_institucionales TO service_role;
ALTER TABLE public.documentos_institucionales ENABLE ROW LEVEL SECURITY;
CREATE POLICY documentos_institucionales_select ON public.documentos_institucionales FOR SELECT TO authenticated USING (true);
CREATE POLICY documentos_institucionales_all ON public.documentos_institucionales FOR ALL TO authenticated USING (public.kalen_rol() IN ('admin', 'edicion'));

CREATE TABLE public.legajos_personal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id INTEGER REFERENCES public.usuarios(id),
    nombre TEXT,
    categoria TEXT,
    storage_path TEXT,
    archivo_nombre TEXT,
    vencimiento DATE,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by INTEGER REFERENCES public.usuarios(id),
    updated_by INTEGER REFERENCES public.usuarios(id)
);
GRANT ALL ON public.legajos_personal TO authenticated;
GRANT ALL ON public.legajos_personal TO service_role;
ALTER TABLE public.legajos_personal ENABLE ROW LEVEL SECURITY;
CREATE POLICY legajos_personal_select ON public.legajos_personal FOR SELECT TO authenticated USING (true);
CREATE POLICY legajos_personal_all ON public.legajos_personal FOR ALL TO authenticated USING (public.kalen_rol() IN ('admin', 'edicion'));
