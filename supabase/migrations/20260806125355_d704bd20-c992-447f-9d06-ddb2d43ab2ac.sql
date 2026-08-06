CREATE OR REPLACE FUNCTION public.kalen_rol()
RETURNS TEXT
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT rol FROM public.usuarios WHERE auth_user_id = auth.uid()::text),
        'solo_lectura'
    );
$$;