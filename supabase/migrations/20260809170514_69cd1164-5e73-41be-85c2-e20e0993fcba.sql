REVOKE ALL ON public.directorio FROM anon;
REVOKE DELETE ON public.directorio FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.directorio TO authenticated;
GRANT ALL ON public.directorio TO service_role;