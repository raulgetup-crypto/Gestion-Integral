import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type ResultadoRls = {
  rol: string;
  operacion: string;
  esperado: "permitido" | "denegado";
  obtenido: "permitido" | "denegado";
  ok: boolean;
  detalle?: string;
};

const ROLES = ["admin", "edicion", "solo_lectura"] as const;
type RolPrueba = (typeof ROLES)[number];

const esperadoPara = (rol: RolPrueba, op: string): "permitido" | "denegado" => {
  if (op === "SELECT") return "permitido";
  if (op === "DELETE") return "denegado"; // borrado físico revocado: solo baja lógica
  return rol === "solo_lectura" ? "denegado" : "permitido";
};

/**
 * Pruebas de integración reales contra la Data API:
 * crea un usuario efímero por rol (admin, edicion, solo_lectura), inicia sesión con cada uno
 * y ejecuta SELECT / INSERT / UPDATE / DELETE sobre `directorio`, comparando con lo esperado.
 * Al terminar borra usuarios y filas de prueba. Solo un administrador puede lanzarla.
 */
export const ejecutarPruebasRlsDirectorio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ResultadoRls[]> => {
    const { data: yo, error: errorYo } = await context.supabase
      .from("usuarios")
      .select("rol, activo")
      .eq("auth_user_id", context.userId)
      .maybeSingle();

    if (errorYo) throw new Error(errorYo.message);
    if (!yo || !yo.activo || yo.rol !== "admin") {
      throw new Error("Solo un administrador puede ejecutar las pruebas de permisos");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const url = process.env["SUPABASE_URL"]!;
    const publishable = process.env["SUPABASE_PUBLISHABLE_KEY"]!;

    const marca = `qa-rls-${Date.now()}`;
    const resultados: ResultadoRls[] = [];
    const creados: { authId: string; email: string }[] = [];
    const filasCreadas: string[] = [];

    // Fila semilla creada con privilegios de servicio para probar SELECT/UPDATE/DELETE.
    const { data: semilla, error: errorSemilla } = await supabaseAdmin
      .from("directorio")
      .insert({ nombre: `${marca}-semilla`, institucion: "QA", activo: true })
      .select("id")
      .single();
    if (errorSemilla) throw new Error(errorSemilla.message);
    filasCreadas.push(semilla.id);

    try {
      for (const rol of ROLES) {
        const email = `${marca}-${rol}@kalen.test`;
        const password = `Qa!${marca}-${rol}`;

        const { data: creado, error: errorAlta } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        if (errorAlta || !creado.user) throw new Error(errorAlta?.message ?? "No se pudo crear el usuario de prueba");
        creados.push({ authId: creado.user.id, email });

        const { error: errorUsuario } = await supabaseAdmin.from("usuarios").insert({
          nombre: `QA ${rol}`,
          email,
          auth_user_id: creado.user.id,
          rol,
          activo: true,
        });
        if (errorUsuario) throw new Error(errorUsuario.message);

        const cliente = createClient<Database>(url, publishable, {
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });
        const { error: errorLogin } = await cliente.auth.signInWithPassword({ email, password });
        if (errorLogin) throw new Error(errorLogin.message);

        const registrar = (operacion: string, permitido: boolean, detalle?: string) => {
          const esperado = esperadoPara(rol, operacion);
          const obtenido = permitido ? "permitido" : "denegado";
          resultados.push({ rol, operacion, esperado, obtenido, ok: obtenido === esperado, detalle });
        };

        // SELECT
        const sel = await cliente.from("directorio").select("id").eq("id", semilla.id);
        registrar("SELECT", !sel.error && (sel.data?.length ?? 0) === 1, sel.error?.message);

        // INSERT
        const ins = await cliente
          .from("directorio")
          .insert({ nombre: `${marca}-${rol}`, institucion: "QA", activo: true })
          .select("id");
        if (!ins.error && ins.data?.[0]) filasCreadas.push(ins.data[0].id);
        registrar("INSERT", !ins.error && (ins.data?.length ?? 0) === 1, ins.error?.message);

        // UPDATE
        const upd = await cliente
          .from("directorio")
          .update({ observaciones: `qa-${rol}` })
          .eq("id", semilla.id)
          .select("id");
        registrar("UPDATE", !upd.error && (upd.data?.length ?? 0) === 1, upd.error?.message);

        // DELETE (debe estar denegado para todos: solo baja lógica)
        const del = await cliente.from("directorio").delete().eq("id", semilla.id).select("id");
        registrar("DELETE", !del.error && (del.data?.length ?? 0) === 1, del.error?.message);

        await cliente.auth.signOut();
      }
    } finally {
      // Limpieza total: filas y usuarios de prueba.
      if (filasCreadas.length) {
        await supabaseAdmin.from("directorio").delete().in("id", filasCreadas);
      }
      for (const u of creados) {
        await supabaseAdmin.from("usuarios").delete().eq("auth_user_id", u.authId);
        await supabaseAdmin.auth.admin.deleteUser(u.authId);
      }
    }

    return resultados;
  });
