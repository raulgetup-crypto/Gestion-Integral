CREATE OR REPLACE FUNCTION public.bloquear_edicion_anulado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Un registro dado de baja sólo admite su reactivación; el resto queda congelado.
  IF OLD.activo = false AND NEW.activo = false THEN
    RAISE EXCEPTION 'El registro está dado de baja: reactivalo antes de modificarlo';
  END IF;
  IF OLD.activo = false AND NEW.activo = true THEN
    NEW.fecha_baja := NULL;
    NEW.usuario_baja := NULL;
    NEW.motivo_baja := '';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bloquear_edicion_anulado ON public.admisiones;
CREATE TRIGGER trg_bloquear_edicion_anulado BEFORE UPDATE ON public.admisiones
  FOR EACH ROW EXECUTE FUNCTION public.bloquear_edicion_anulado();

DROP TRIGGER IF EXISTS trg_bloquear_edicion_anulado ON public.planillas;
CREATE TRIGGER trg_bloquear_edicion_anulado BEFORE UPDATE ON public.planillas
  FOR EACH ROW EXECUTE FUNCTION public.bloquear_edicion_anulado();

DROP TRIGGER IF EXISTS trg_bloquear_edicion_anulado ON public.comunicaciones;
CREATE TRIGGER trg_bloquear_edicion_anulado BEFORE UPDATE ON public.comunicaciones
  FOR EACH ROW EXECUTE FUNCTION public.bloquear_edicion_anulado();