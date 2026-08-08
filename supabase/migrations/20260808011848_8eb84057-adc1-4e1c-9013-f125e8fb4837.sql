DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname, tablename
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename IN ('documentos','transporte_solicitudes','profesionales')
       AND cmd = 'DELETE'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

REVOKE DELETE ON public.documentos, public.transporte_solicitudes, public.profesionales
  FROM authenticated, anon;