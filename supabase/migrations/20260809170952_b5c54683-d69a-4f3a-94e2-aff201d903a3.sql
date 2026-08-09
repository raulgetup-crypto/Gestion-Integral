REVOKE ALL ON FUNCTION public.test_rls_directorio() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.test_rls_directorio() TO service_role;