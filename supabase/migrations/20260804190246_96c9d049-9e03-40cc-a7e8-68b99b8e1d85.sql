-- ============ VIANDAS ============
CREATE TABLE public.viandas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concurrente_id uuid REFERENCES public.concurrentes(id) ON DELETE SET NULL,
  nombre_concurrente text NOT NULL DEFAULT '',
  profesional text NOT NULL DEFAULT '',
  administrativo text NOT NULL DEFAULT '',
  mes text NOT NULL DEFAULT '',
  semana integer NOT NULL DEFAULT 1,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  cantidad integer NOT NULL DEFAULT 1,
  precio_unitario numeric NOT NULL DEFAULT 0,
  observaciones text NOT NULL DEFAULT '',
  forma_pago text NOT NULL DEFAULT '',
  comprobante_recibido boolean NOT NULL DEFAULT false,
  fecha_comprobante date,
  fecha_pago date,
  estado text NOT NULL DEFAULT 'pendiente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.viandas TO authenticated;
GRANT ALL ON public.viandas TO service_role;
ALTER TABLE public.viandas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "solo autenticados viandas" ON public.viandas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_viandas_concurrente ON public.viandas(concurrente_id);
CREATE INDEX idx_viandas_mes ON public.viandas(mes);
CREATE INDEX idx_viandas_fecha ON public.viandas(fecha);
CREATE INDEX idx_viandas_estado ON public.viandas(estado);
CREATE TRIGGER update_viandas_updated_at BEFORE UPDATE ON public.viandas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ NOTAS RAPIDAS ============
CREATE TABLE public.notas_rapidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  texto text NOT NULL DEFAULT '',
  categoria text NOT NULL DEFAULT 'Otros',
  prioridad text NOT NULL DEFAULT 'media',
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  estado text NOT NULL DEFAULT 'pendiente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notas_rapidas TO authenticated;
GRANT ALL ON public.notas_rapidas TO service_role;
ALTER TABLE public.notas_rapidas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "solo autenticados notas_rapidas" ON public.notas_rapidas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_notas_estado ON public.notas_rapidas(estado);
CREATE INDEX idx_notas_prioridad ON public.notas_rapidas(prioridad);
CREATE INDEX idx_notas_fecha ON public.notas_rapidas(fecha);
CREATE TRIGGER update_notas_rapidas_updated_at BEFORE UPDATE ON public.notas_rapidas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ DOCUMENTO MAESTRO ============
CREATE TABLE public.documento_maestro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concurrente_id uuid NOT NULL UNIQUE REFERENCES public.concurrentes(id) ON DELETE CASCADE,
  contenido text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1,
  actualizado_por text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documento_maestro TO authenticated;
GRANT ALL ON public.documento_maestro TO service_role;
ALTER TABLE public.documento_maestro ENABLE ROW LEVEL SECURITY;
CREATE POLICY "solo autenticados documento_maestro" ON public.documento_maestro FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_docmaestro_concurrente ON public.documento_maestro(concurrente_id);
CREATE TRIGGER update_documento_maestro_updated_at BEFORE UPDATE ON public.documento_maestro
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.documento_maestro_versiones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concurrente_id uuid REFERENCES public.concurrentes(id) ON DELETE SET NULL,
  documento_id uuid REFERENCES public.documento_maestro(id) ON DELETE SET NULL,
  version integer NOT NULL DEFAULT 1,
  contenido text NOT NULL DEFAULT '',
  usuario text NOT NULL DEFAULT '',
  resumen text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Histórico inmutable: se puede leer e insertar, nunca modificar ni borrar.
GRANT SELECT, INSERT ON public.documento_maestro_versiones TO authenticated;
GRANT ALL ON public.documento_maestro_versiones TO service_role;
ALTER TABLE public.documento_maestro_versiones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lectura versiones doc maestro" ON public.documento_maestro_versiones FOR SELECT TO authenticated USING (true);
CREATE POLICY "alta versiones doc maestro" ON public.documento_maestro_versiones FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX idx_docmaestro_ver_concurrente ON public.documento_maestro_versiones(concurrente_id);
CREATE INDEX idx_docmaestro_ver_documento ON public.documento_maestro_versiones(documento_id);

-- ============ CATALOGOS NUEVOS ============
INSERT INTO public.catalogos (tipo, valor)
SELECT * FROM (VALUES
  ('formas_pago','Efectivo'),
  ('formas_pago','Transferencia'),
  ('formas_pago','Débito'),
  ('formas_pago','Descuento en recibo'),
  ('categorias_nota','Admisiones'),
  ('categorias_nota','Llamados'),
  ('categorias_nota','Familias'),
  ('categorias_nota','Dirección'),
  ('categorias_nota','Transporte'),
  ('categorias_nota','APROSS'),
  ('categorias_nota','ANSES'),
  ('categorias_nota','Documentación'),
  ('categorias_nota','Pendientes'),
  ('categorias_nota','Otros')
) AS nuevos(tipo, valor)
WHERE NOT EXISTS (
  SELECT 1 FROM public.catalogos c WHERE c.tipo = nuevos.tipo AND c.valor = nuevos.valor
);