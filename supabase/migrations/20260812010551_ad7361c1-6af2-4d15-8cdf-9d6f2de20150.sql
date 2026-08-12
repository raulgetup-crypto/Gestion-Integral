CREATE OR REPLACE FUNCTION public.admision_registrar(
  p_admision_id integer,
  p_persona jsonb,
  p_admision jsonb,
  p_usuario_id integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_persona_id uuid;
  v_persona_por_doc uuid;
  v_doc_tipo text := NULLIF(btrim(COALESCE(p_persona->>'documento_tipo','DNI')),'');
  v_doc_num text := NULLIF(btrim(COALESCE(p_persona->>'documento_numero','')),'');
  v_nombre text := COALESCE(NULLIF(btrim(p_persona->>'nombre'),''),'Sin nombre');
  v_apellido text := COALESCE(btrim(p_persona->>'apellido'),'');
  v_estado text := COALESCE(p_admision->>'estado','consulta_recibida');
  v_codigo text := COALESCE(btrim(p_admision->>'motivo_no_ingreso_codigo'),'');
  v_detalle text := COALESCE(btrim(p_admision->>'motivo_no_ingreso_detalle'),'');
  v_sede integer := NULLIF(p_admision->>'sede_id','')::integer;
  v_adm_id integer;
  v_conc_id uuid;
  v_conc_persona_id uuid;
  v_conc_creado boolean := false;
  v_estado_prev text := '';
  v_persona_creada boolean := false;
  v_contacto text;
BEGIN
  IF v_estado = 'no_ingreso' AND v_codigo = '' THEN
    RAISE EXCEPTION 'Debe indicar el motivo de no ingreso';
  END IF;
  IF v_estado = 'no_ingreso' AND v_codigo = 'Otro' AND v_detalle = '' THEN
    RAISE EXCEPTION 'Debe detallar el motivo de no ingreso';
  END IF;

  v_persona_id := NULLIF(p_persona->>'id','')::uuid;

  IF v_doc_num IS NOT NULL THEN
    SELECT id INTO v_persona_por_doc
      FROM public.personas
     WHERE documento_tipo = v_doc_tipo
       AND upper(btrim(documento_numero)) = upper(v_doc_num)
     LIMIT 1;
  END IF;

  IF v_persona_id IS NOT NULL THEN
    PERFORM 1 FROM public.personas WHERE id = v_persona_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'La persona seleccionada ya no existe';
    END IF;
    IF v_persona_por_doc IS NOT NULL AND v_persona_por_doc <> v_persona_id THEN
      RAISE EXCEPTION 'El DNI indicado pertenece a otra persona';
    END IF;
  ELSE
    v_persona_id := v_persona_por_doc;
  END IF;

  IF v_persona_id IS NULL THEN
    INSERT INTO public.personas
      (sede_id, nombre, apellido, documento_tipo, documento_numero, email, telefono,
       fecha_nacimiento, etapa, observaciones, created_by, updated_by)
    VALUES
      (v_sede, v_nombre, v_apellido,
       CASE WHEN v_doc_num IS NULL THEN NULL ELSE v_doc_tipo END, v_doc_num,
       NULLIF(btrim(p_persona->>'email'),''),
       COALESCE(p_persona->>'telefono',''),
       NULLIF(p_persona->>'fecha_nacimiento','')::date,
       'en_admision', COALESCE(p_persona->>'observaciones',''),
       p_usuario_id, p_usuario_id)
    RETURNING id INTO v_persona_id;
    v_persona_creada := true;
  ELSE
    UPDATE public.personas SET
      nombre = v_nombre,
      apellido = v_apellido,
      sede_id = COALESCE(v_sede, sede_id),
      telefono = COALESCE(NULLIF(p_persona->>'telefono',''), telefono),
      email = COALESCE(NULLIF(btrim(p_persona->>'email'),''), email),
      fecha_nacimiento = COALESCE(NULLIF(p_persona->>'fecha_nacimiento','')::date, fecha_nacimiento),
      documento_tipo = COALESCE(documento_tipo, CASE WHEN v_doc_num IS NULL THEN NULL ELSE v_doc_tipo END),
      documento_numero = COALESCE(documento_numero, v_doc_num),
      updated_by = p_usuario_id,
      updated_at = now()
    WHERE id = v_persona_id;
  END IF;

  v_contacto := btrim(v_apellido || ' ' || v_nombre);

  IF p_admision_id IS NOT NULL THEN
    SELECT id, estado, concurrente_id
      INTO v_adm_id, v_estado_prev, v_conc_id
      FROM public.admisiones
     WHERE id = p_admision_id
       AND activo = true
     FOR UPDATE;
    IF v_adm_id IS NULL THEN
      RAISE EXCEPTION 'La pre-admisión ya no existe o está dada de baja';
    END IF;
  END IF;

  IF v_estado = 'admitido' AND v_estado_prev IS DISTINCT FROM 'admitido' THEN
    IF NOT EXISTS (
      SELECT 1
        FROM public.turnos
       WHERE persona_id = v_persona_id
         AND lower(btrim(tipo)) = lower('Entrevista de admisión')
         AND estado IN ('realizado','atendido')
    ) THEN
      RAISE EXCEPTION 'Para admitir, la persona debe tener una Entrevista de admisión realizada';
    END IF;
  END IF;

  IF v_estado = 'admitido' THEN
    SELECT id INTO v_conc_id
      FROM public.concurrentes
     WHERE persona_id = v_persona_id
     LIMIT 1
     FOR UPDATE;

    IF v_conc_id IS NULL AND v_doc_num IS NOT NULL THEN
      SELECT id, persona_id INTO v_conc_id, v_conc_persona_id
        FROM public.concurrentes
       WHERE upper(btrim(dni)) = upper(v_doc_num)
       LIMIT 1
       FOR UPDATE;

      IF v_conc_id IS NOT NULL AND v_conc_persona_id IS NOT NULL AND v_conc_persona_id <> v_persona_id THEN
        RAISE EXCEPTION 'Ya existe una ficha con ese DNI vinculada a otra persona';
      END IF;

      IF v_conc_id IS NOT NULL AND v_conc_persona_id IS NULL THEN
        UPDATE public.concurrentes
           SET persona_id = v_persona_id, updated_at = now(), updated_by = p_usuario_id
         WHERE id = v_conc_id;
      END IF;
    END IF;

    IF v_conc_id IS NULL THEN
      INSERT INTO public.concurrentes
        (sede_id, nombre, apellido, dni, telefono, mail, fecha_nacimiento, observaciones,
         fecha_ingreso, activo, persona_id, created_by, updated_by)
      VALUES
        (v_sede, v_nombre, v_apellido,
         COALESCE(v_doc_num, 'SIN_DNI-A' || COALESCE(p_admision_id::text, nextval('public.admisiones_id_seq')::text)),
         COALESCE(p_admision->>'telefono',''),
         COALESCE(NULLIF(btrim(p_persona->>'email'),''),''),
         NULLIF(p_persona->>'fecha_nacimiento','')::date,
         COALESCE(p_admision->>'motivo_consulta',''),
         CURRENT_DATE, true, v_persona_id, p_usuario_id, p_usuario_id)
      RETURNING id INTO v_conc_id;
      v_conc_creado := true;
    END IF;
  END IF;

  IF p_admision_id IS NOT NULL THEN
    UPDATE public.admisiones SET
      sede_id = v_sede,
      persona_id = v_persona_id,
      concurrente_id = CASE WHEN v_estado = 'admitido' THEN v_conc_id ELSE concurrente_id END,
      fecha_solicitud = NULLIF(p_admision->>'fecha_solicitud','')::date,
      nombre_contacto = v_contacto,
      telefono = COALESCE(p_admision->>'telefono',''),
      medio = COALESCE(p_admision->>'medio',''),
      motivo_consulta = COALESCE(p_admision->>'motivo_consulta',''),
      estado = v_estado,
      motivo_no_ingreso = CASE WHEN v_estado = 'no_ingreso'
                               THEN btrim(v_codigo || CASE WHEN v_detalle <> '' THEN ' · ' || v_detalle ELSE '' END)
                               ELSE '' END,
      motivo_no_ingreso_codigo = CASE WHEN v_estado = 'no_ingreso' THEN v_codigo ELSE '' END,
      motivo_no_ingreso_detalle = CASE WHEN v_estado = 'no_ingreso' THEN v_detalle ELSE '' END,
      fecha_entrevista = NULLIF(p_admision->>'fecha_entrevista','')::date,
      observaciones = COALESCE(p_admision->>'observaciones',''),
      updated_by = p_usuario_id
    WHERE id = v_adm_id;
  ELSE
    INSERT INTO public.admisiones
      (sede_id, persona_id, concurrente_id, fecha_solicitud, nombre_contacto, telefono, medio, motivo_consulta,
       estado, motivo_no_ingreso, motivo_no_ingreso_codigo, motivo_no_ingreso_detalle,
       fecha_entrevista, observaciones, created_by, updated_by)
    VALUES
      (v_sede, v_persona_id, CASE WHEN v_estado = 'admitido' THEN v_conc_id ELSE NULL END,
       NULLIF(p_admision->>'fecha_solicitud','')::date, v_contacto,
       COALESCE(p_admision->>'telefono',''), COALESCE(p_admision->>'medio',''),
       COALESCE(p_admision->>'motivo_consulta',''), v_estado,
       CASE WHEN v_estado = 'no_ingreso'
            THEN btrim(v_codigo || CASE WHEN v_detalle <> '' THEN ' · ' || v_detalle ELSE '' END)
            ELSE '' END,
       CASE WHEN v_estado = 'no_ingreso' THEN v_codigo ELSE '' END,
       CASE WHEN v_estado = 'no_ingreso' THEN v_detalle ELSE '' END,
       NULLIF(p_admision->>'fecha_entrevista','')::date,
       COALESCE(p_admision->>'observaciones',''), p_usuario_id, p_usuario_id)
    RETURNING id INTO v_adm_id;
  END IF;

  IF v_estado = 'admitido' THEN
    UPDATE public.personas
       SET etapa = 'concurrente_activo', updated_at = now(), updated_by = p_usuario_id
     WHERE id = v_persona_id;
  END IF;

  INSERT INTO public.historial (entidad, entidad_id, concurrente_id, accion, detalle, observaciones)
  VALUES ('persona', v_persona_id, v_conc_id,
          CASE WHEN v_persona_creada THEN 'crear' ELSE 'actualizar' END,
          v_contacto || COALESCE(' · doc ' || v_doc_num, ''), '');

  INSERT INTO public.historial (entidad, entidad_id, concurrente_id, accion, detalle, observaciones)
  VALUES ('admision', v_persona_id, v_conc_id,
          CASE WHEN p_admision_id IS NULL THEN 'crear' ELSE 'cambio_estado' END,
          'Admisión #' || v_adm_id || ' · ' || COALESCE(NULLIF(v_estado_prev,'') || ' → ', '') || v_estado,
          CASE WHEN v_estado = 'no_ingreso'
               THEN v_codigo || CASE WHEN v_detalle <> '' THEN ' · ' || v_detalle ELSE '' END
               ELSE '' END);

  IF v_conc_creado THEN
    INSERT INTO public.historial (entidad, entidad_id, concurrente_id, accion, detalle, observaciones)
    VALUES ('concurrente', v_conc_id, v_conc_id, 'crear',
            'Creado automáticamente desde la admisión #' || v_adm_id, '');
  END IF;

  RETURN jsonb_build_object(
    'admision_id', v_adm_id,
    'persona_id', v_persona_id,
    'concurrente_id', v_conc_id,
    'concurrente_creado', v_conc_creado,
    'persona_creada', v_persona_creada
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admision_registrar(integer, jsonb, jsonb, integer) TO authenticated;