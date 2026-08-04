-- Rollback: quita dias_especificos de la función de importación masiva
-- (restaura la versión previa de public.importar_concurrentes_lote)
CREATE OR REPLACE FUNCTION public.importar_concurrentes_lote(p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  item jsonb; d jsonb; acc text; v_dni text; v_id uuid;
  n_ins int := 0; n_upd int := 0; idx int := 0;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb))
  LOOP
    idx := idx + 1;
    acc := COALESCE(item->>'accion', 'insert');
    d := COALESCE(item->'datos', '{}'::jsonb);
    v_dni := NULLIF(btrim(COALESCE(d->>'dni','')), '');
    IF COALESCE(btrim(d->>'nombre'), '') = '' THEN
      RAISE EXCEPTION 'Fila %: falta nombre', idx;
    END IF;
    IF acc = 'update' THEN
      IF v_dni IS NULL THEN RAISE EXCEPTION 'Fila %: no se puede actualizar sin DNI', idx; END IF;
      SELECT id INTO v_id FROM public.concurrentes WHERE dni = v_dni LIMIT 1;
      IF v_id IS NULL THEN RAISE EXCEPTION 'Fila %: no existe concurrente con DNI %', idx, v_dni; END IF;
      UPDATE public.concurrentes c SET
        nombre = COALESCE(d->>'nombre', c.nombre),
        apellido = COALESCE(d->>'apellido', c.apellido),
        fecha_nacimiento = NULLIF(d->>'fecha_nacimiento','')::date,
        obra_social = COALESCE(d->>'obra_social', c.obra_social),
        n_afiliado = COALESCE(d->>'n_afiliado', c.n_afiliado),
        prestacion = COALESCE(d->>'prestacion', c.prestacion),
        responsable = COALESCE(d->>'responsable', c.responsable),
        telefono = COALESCE(d->>'telefono', c.telefono),
        wsp = COALESCE(d->>'wsp', c.wsp),
        mail = COALESCE(d->>'mail', c.mail),
        direccion = COALESCE(d->>'direccion', c.direccion),
        lugar_firma = COALESCE(d->>'lugar_firma', c.lugar_firma),
        dias_x_semana = COALESCE(d->>'dias_x_semana', c.dias_x_semana),
        horarios = COALESCE(d->>'horarios', c.horarios),
        transporte = COALESCE((d->>'transporte')::boolean, c.transporte),
        observaciones = COALESCE(d->>'observaciones', c.observaciones),
        tipo = COALESCE(d->>'tipo', c.tipo),
        updated_at = now()
      WHERE c.id = v_id;
      n_upd := n_upd + 1;
    ELSE
      INSERT INTO public.concurrentes (
        nombre, apellido, dni, fecha_nacimiento, obra_social, n_afiliado, prestacion,
        responsable, telefono, wsp, mail, direccion, lugar_firma, dias_x_semana,
        horarios, transporte, observaciones, tipo, activo
      ) VALUES (
        COALESCE(d->>'nombre',''), COALESCE(d->>'apellido',''), COALESCE(v_dni,''),
        NULLIF(d->>'fecha_nacimiento','')::date, COALESCE(d->>'obra_social',''),
        COALESCE(d->>'n_afiliado',''), COALESCE(d->>'prestacion',''),
        COALESCE(d->>'responsable',''), COALESCE(d->>'telefono',''), COALESCE(d->>'wsp',''),
        COALESCE(d->>'mail',''), COALESCE(d->>'direccion',''),
        COALESCE(NULLIF(d->>'lugar_firma',''),'Kalen'), COALESCE(d->>'dias_x_semana',''),
        COALESCE(d->>'horarios',''), COALESCE((d->>'transporte')::boolean, false),
        COALESCE(d->>'observaciones',''), COALESCE(NULLIF(d->>'tipo',''),'prestacion'), true
      );
      n_ins := n_ins + 1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('insertados', n_ins, 'actualizados', n_upd);
END;
$function$;
