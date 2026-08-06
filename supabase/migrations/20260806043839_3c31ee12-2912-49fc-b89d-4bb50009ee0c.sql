CREATE TABLE public.transporte_solicitudes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concurrente_id uuid REFERENCES public.concurrentes(id) ON DELETE CASCADE,
  admision_id integer REFERENCES public.admisiones(id) ON DELETE SET NULL,
  sede_id integer REFERENCES public.sedes(id),
  fecha_solicitud date NOT NULL DEFAULT CURRENT_DATE,
  tipo_traslado text NOT NULL DEFAULT 'ida_vuelta',
  estado text NOT NULL DEFAULT 'solicitado',
  empresa text NOT NULL DEFAULT '',
  chofer text NOT NULL DEFAULT '',
  telefono_transportista text NOT NULL DEFAULT '',
  domicilio_origen text NOT NULL DEFAULT '',
  domicilio_destino text NOT NULL DEFAULT '',
  dias text NOT NULL DEFAULT '',
  hora_ida text NOT NULL DEFAULT '',
  hora_vuelta text NOT NULL DEFAULT '',
  requiere_acompanante boolean NOT NULL DEFAULT false,
  financiador text NOT NULL DEFAULT '',
  monto_mensual numeric NOT NULL DEFAULT 0,
  fecha_inicio date,
  fecha_fin date,
  motivo_rechazo text NOT NULL DEFAULT '',
  observaciones text NOT NULL DEFAULT '',
  activo boolean NOT NULL DEFAULT true,
  created_by integer REFERENCES public.usuarios(id),
  updated_by integer REFERENCES public.usuarios(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transporte_solicitudes TO authenticated;
GRANT ALL ON public.transporte_solicitudes TO service_role;

ALTER TABLE public.transporte_solicitudes ENABLE ROW LEVEL SECURITY;

CREATE POLICY transporte_solicitudes_select ON public.transporte_solicitudes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY transporte_solicitudes_insert ON public.transporte_solicitudes
  FOR INSERT TO authenticated WITH CHECK (public.kalen_rol() = ANY (ARRAY['admin','edicion']));
CREATE POLICY transporte_solicitudes_update ON public.transporte_solicitudes
  FOR UPDATE TO authenticated USING (public.kalen_rol() = ANY (ARRAY['admin','edicion']))
  WITH CHECK (public.kalen_rol() = ANY (ARRAY['admin','edicion']));
CREATE POLICY transporte_solicitudes_delete ON public.transporte_solicitudes
  FOR DELETE TO authenticated USING (public.kalen_rol() = 'admin');

CREATE INDEX idx_transporte_solicitudes_concurrente ON public.transporte_solicitudes(concurrente_id);
CREATE INDEX idx_transporte_solicitudes_admision ON public.transporte_solicitudes(admision_id);
CREATE INDEX idx_transporte_solicitudes_estado ON public.transporte_solicitudes(estado);

CREATE TRIGGER update_transporte_solicitudes_updated_at
  BEFORE UPDATE ON public.transporte_solicitudes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();