GRANT SELECT, INSERT, UPDATE, DELETE ON public.notas_rapidas TO authenticated;
GRANT ALL ON public.notas_rapidas TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.procedimientos TO authenticated;
GRANT ALL ON public.procedimientos TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.glosario TO authenticated;
GRANT ALL ON public.glosario TO service_role;
NOTIFY pgrst, 'reload schema';