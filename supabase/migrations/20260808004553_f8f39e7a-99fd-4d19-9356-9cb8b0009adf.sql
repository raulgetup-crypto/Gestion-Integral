-- 1. Columnas estructuradas de motivo de no ingreso
ALTER TABLE public.admisiones
  ADD COLUMN IF NOT EXISTS motivo_no_ingreso_codigo text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS motivo_no_ingreso_detalle text NOT NULL DEFAULT '';

UPDATE public.admisiones
   SET motivo_no_ingreso_codigo = 'Otro',
       motivo_no_ingreso_detalle = motivo_no_ingreso
 WHERE estado = 'no_ingreso'
   AND COALESCE(motivo_no_ingreso,'') <> ''
   AND motivo_no_ingreso_codigo = '';

-- 2. Backfill de personas desde concurrentes (uno a uno, sin borrar nada)
WITH nuevos AS (
  INSERT INTO public.personas
    (sede_id, nombre, apellido, documento_tipo, documento_numero, email, telefono,
     fecha_nacimiento, etapa, observaciones)
  SELECT c.sede_id,
         COALESCE(NULLIF(btrim(c.nombre),''), 'Sin nombre'),
         COALESCE(c.apellido,''),
         CASE WHEN COALESCE(btrim(c.dni),'') = '' THEN NULL ELSE 'DNI' END,
         NULLIF(btrim(c.dni),''),
         NULLIF(btrim(c.mail),''),
         COALESCE(c.telefono,''),
         c.fecha_nacimiento,
         CASE WHEN c.activo THEN 'concurrente_activo' ELSE 'concurrente_baja' END,
         ''
    FROM public.concurrentes c
   WHERE c.persona_id IS NULL
  RETURNING id, documento_numero, nombre, apellido
)
UPDATE public.concurrentes c
   SET persona_id = n.id
  FROM nuevos n
 WHERE c.persona_id IS NULL
   AND NULLIF(btrim(c.dni),'') IS NOT DISTINCT FROM n.documento_numero
   AND COALESCE(NULLIF(btrim(c.nombre),''),'Sin nombre') = n.nombre
   AND COALESCE(c.apellido,'') = n.apellido;

-- 3. Admisiones existentes: si tienen concurrente, heredan su persona
UPDATE public.admisiones a
   SET persona_id = c.persona_id
  FROM public.concurrentes c
 WHERE a.persona_id IS NULL
   AND a.concurrente_id = c.id
   AND c.persona_id IS NOT NULL;

-- 4. Admisiones sueltas: se crea su propia persona (sin documento conocido)
WITH pend AS (
  SELECT a.id,
         a.sede_id,
         a.telefono,
         btrim(a.nombre_contacto) AS contacto
    FROM public.admisiones a
   WHERE a.persona_id IS NULL
), ins AS (
  INSERT INTO public.personas (sede_id, nombre, apellido, telefono, etapa, observaciones)
  SELECT p.sede_id,
         COALESCE(NULLIF(split_part(p.contacto,' ',1),''),'Sin nombre'),
         btrim(substr(p.contacto, length(split_part(p.contacto,' ',1)) + 1)),
         COALESCE(p.telefono,''),
         'en_admision',
         'Creada por backfill desde admisión #' || p.id
    FROM pend p
  RETURNING id, observaciones
)
UPDATE public.admisiones a
   SET persona_id = i.id
  FROM ins i
 WHERE i.observaciones = 'Creada por backfill desde admisión #' || a.id;

-- 5. Restricciones de unicidad (los datos actuales ya fueron verificados sin duplicados)
CREATE UNIQUE INDEX IF NOT EXISTS personas_documento_unico
  ON public.personas (documento_tipo, upper(btrim(documento_numero)))
  WHERE documento_numero IS NOT NULL AND btrim(documento_numero) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS concurrentes_persona_unico
  ON public.concurrentes (persona_id)
  WHERE persona_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS admisiones_persona_idx ON public.admisiones (persona_id);

-- 6. Operación atómica: persona + admisión + concurrente
CREATE OR REPLACE FUNCTION public.admision_registrar(
  p_admision_id integer,
  p_persona jsonb,
  p_admision jsonb,
  p_usuario_id integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_persona_id uuid;
  v_doc_tipo text := NULLIF(btrim(COALESCE(p_persona->>'documento_tipo','DNI')),'');
  v_doc_num  text := NULLIF(btrim(COALESCE(p_persona->>'documento_numero','')),'');
  v_nombre   text := COALESCE(NULLIF(btrim(p_persona->>'nombre'),''),'Sin nombre');
  v_apellido text := COALESCE(btrim(p_persona->>'apellido'),'');
  v_estado   text := COALESCE(p_admision->>'estado','consulta_recibida');
  v_codigo   text := COALESCE(btrim(p_admision->>'motivo_no_ingreso_codigo'),'');
  v_detalle  text := COALESCE(btrim(p_admision->>'motivo_no_ingreso_detalle'),'');
  v_sede     integer := NULLIF(p_admision->>'sede_id','')::integer;
  v_adm_id   integer;
  v_conc_id  uuid;
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

  -- Persona: por id, por documento o nueva
  v_persona_id := NULLIF(p_persona->>'id','')::uuid;

  IF v_persona_id IS NULL AND v_doc_num IS NOT NULL THEN
    SELECT id INTO v_persona_id
      FROM public.personas
     WHERE documento_tipo = v_doc_tipo
       AND upper(btrim(documento_numero)) = upper(v_doc_num)
     LIMIT 1;
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

  -- Admisión
  IF p_admision_id IS NOT NULL THEN
    SELECT estado, concurrente_id INTO v_estado_prev, v_conc_id
      FROM public.admisiones WHERE id = p_admision_id FOR UPDATE;

    UPDATE public.admisiones SET
      sede_id = v_sede,
      persona_id = v_persona_id,
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
    WHERE id = p_admision_id
    RETURNING id, concurrente_id INTO v_adm_id, v_conc_id;
  ELSE
    INSERT INTO public.admisiones
      (sede_id, persona_id, fecha_solicitud, nombre_contacto, telefono, medio, motivo_consulta,
       estado, motivo_no_ingreso, motivo_no_ingreso_codigo, motivo_no_ingreso_detalle,
       fecha_entrevista, observaciones, created_by, updated_by)
    VALUES
      (v_sede, v_persona_id, NULLIF(p_admision->>'fecha_solicitud','')::date, v_contacto,
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

  -- Concurrente derivado (uno solo por persona)
  IF v_estado = 'admitido' THEN
    SELECT id INTO v_conc_id FROM public.concurrentes WHERE persona_id = v_persona_id LIMIT 1;

    IF v_conc_id IS NULL AND v_doc_num IS NOT NULL THEN
      SELECT id INTO v_conc_id FROM public.concurrentes WHERE btrim(dni) = v_doc_num LIMIT 1;
      IF v_conc_id IS NOT NULL THEN
        UPDATE public.concurrentes SET persona_id = v_persona_id, updated_at = now()
         WHERE id = v_conc_id AND persona_id IS NULL;
      END IF;
    END IF;

    IF v_conc_id IS NULL THEN
      INSERT INTO public.concurrentes
        (sede_id, nombre, apellido, dni, telefono, mail, fecha_nacimiento, observaciones,
         fecha_ingreso, activo, persona_id, created_by, updated_by)
      VALUES
        (v_sede, v_nombre, v_apellido,
         COALESCE(v_doc_num, 'SIN_DNI-A' || v_adm_id::text),
         COALESCE(p_admision->>'telefono',''),
         COALESCE(NULLIF(btrim(p_persona->>'email'),''),''),
         NULLIF(p_persona->>'fecha_nacimiento','')::date,
         COALESCE(p_admision->>'motivo_consulta',''),
         CURRENT_DATE, true, v_persona_id, p_usuario_id, p_usuario_id)
      RETURNING id INTO v_conc_id;
      v_conc_creado := true;
    END IF;

    UPDATE public.admisiones SET concurrente_id = v_conc_id WHERE id = v_adm_id;
    UPDATE public.personas SET etapa = 'concurrente_activo', updated_at = now() WHERE id = v_persona_id;
  END IF;

  -- Trazabilidad
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