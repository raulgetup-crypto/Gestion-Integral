CREATE OR REPLACE FUNCTION public.kalen_rol()
 RETURNS text
 LANGUAGE sql
 STABLE
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT u.rol FROM public.usuarios u
      WHERE u.auth_user_id = auth.uid()::text AND u.activo LIMIT 1),
    'solo_lectura')
$function$;