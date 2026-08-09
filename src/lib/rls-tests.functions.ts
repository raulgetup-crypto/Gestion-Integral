import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ResultadoRls = {
  rol: string;
  operacion: string;
  esperado: string;
  obtenido: string;
  ok: boolean;
};

/**
 * Ejecuta la batería de pruebas de integración de RLS sobre la tabla `directorio`.
 * Verifica SELECT/INSERT/UPDATE/DELETE para los roles admin, edicion y solo_lectura.
 * Solo un administrador autenticado puede lanzarla.
 */
export const ejecutarPruebasRlsDirectorio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ResultadoRls[]> => {
    const { data: usuario, error: errorUsuario } = await context.supabase
      .from("usuarios")
      .select("rol, activo")
      .eq("auth_user_id", context.userId)
      .maybeSingle();

    if (errorUsuario) throw new Error(errorUsuario.message);
    if (!usuario || !usuario.activo || usuario.rol !== "admin") {
      throw new Error("Solo un administrador puede ejecutar las pruebas de permisos");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("test_rls_directorio");
    if (error) throw new Error(error.message);

    return (data ?? []) as ResultadoRls[];
  });
