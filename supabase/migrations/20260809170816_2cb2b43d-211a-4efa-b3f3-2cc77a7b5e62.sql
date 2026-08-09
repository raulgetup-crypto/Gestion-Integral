CREATE OR REPLACE FUNCTION public.test_rls_directorio()
RETURNS TABLE(rol text, operacion text, esperado text, obtenido text, ok boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rol text;
  v_uid text;
  v_id uuid;
  v_seed uuid;
  v_res text;
  v_n int;
BEGIN
  -- fila semilla creada por el owner (bypassea RLS) para probar SELECT/UPDATE/DELETE
  INSERT INTO public.directorio (nombre, institucion, activo)
  VALUES ('__test_rls_seed__', 'QA', true)
  RETURNING id INTO v_seed;

  FOREACH v_rol IN ARRAY ARRAY['admin','edicion','solo_lectura'] LOOP
    v_uid := 'test-rls-' || v_rol;
    DELETE FROM public.usuarios WHERE auth_user_id = v_uid;
    INSERT INTO public.usuarios (nombre, email, auth_user_id, rol, activo)
    VALUES ('QA ' || v_rol, v_uid || '@test.local', v_uid, v_rol, true);

    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;

    -- SELECT
    BEGIN
      SELECT count(*) INTO v_n FROM public.directorio WHERE id = v_seed;
      v_res := CASE WHEN v_n = 1 THEN 'permitido' ELSE 'denegado' END;
    EXCEPTION WHEN OTHERS THEN v_res := 'denegado';
    END;
    rol := v_rol; operacion := 'SELECT'; esperado := 'permitido'; obtenido := v_res;
    ok := (obtenido = esperado); RETURN NEXT;

    -- INSERT
    BEGIN
      INSERT INTO public.directorio (nombre, institucion, activo)
      VALUES ('__test_rls_' || v_rol || '__', 'QA', true) RETURNING id INTO v_id;
      v_res := 'permitido';
    EXCEPTION WHEN OTHERS THEN v_res := 'denegado'; v_id := NULL;
    END;
    rol := v_rol; operacion := 'INSERT';
    esperado := CASE WHEN v_rol = 'solo_lectura' THEN 'denegado' ELSE 'permitido' END;
    obtenido := v_res; ok := (obtenido = esperado); RETURN NEXT;

    -- UPDATE
    BEGIN
      UPDATE public.directorio SET observaciones = 'qa-' || v_rol WHERE id = v_seed;
      GET DIAGNOSTICS v_n = ROW_COUNT;
      v_res := CASE WHEN v_n > 0 THEN 'permitido' ELSE 'denegado' END;
    EXCEPTION WHEN OTHERS THEN v_res := 'denegado';
    END;
    rol := v_rol; operacion := 'UPDATE';
    esperado := CASE WHEN v_rol = 'solo_lectura' THEN 'denegado' ELSE 'permitido' END;
    obtenido := v_res; ok := (obtenido = esperado); RETURN NEXT;

    -- DELETE (borrado fisico revocado para todos los roles de la app)
    BEGIN
      DELETE FROM public.directorio WHERE id = v_seed;
      GET DIAGNOSTICS v_n = ROW_COUNT;
      v_res := CASE WHEN v_n > 0 THEN 'permitido' ELSE 'denegado' END;
    EXCEPTION WHEN OTHERS THEN v_res := 'denegado';
    END;
    rol := v_rol; operacion := 'DELETE'; esperado := 'denegado'; obtenido := v_res;
    ok := (obtenido = esperado); RETURN NEXT;

    RESET ROLE;
    PERFORM set_config('request.jwt.claims', NULL, true);

    -- limpieza de la fila insertada por el rol
    IF v_id IS NOT NULL THEN
      DELETE FROM public.directorio WHERE id = v_id;
    END IF;
    DELETE FROM public.usuarios WHERE auth_user_id = v_uid;
  END LOOP;

  DELETE FROM public.directorio WHERE id = v_seed;
  DELETE FROM public.directorio WHERE nombre LIKE '\_\_test\_rls\_%';
  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.test_rls_directorio() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.test_rls_directorio() TO service_role;