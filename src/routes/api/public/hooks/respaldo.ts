import { createFileRoute } from "@tanstack/react-router";

/** Tablas incluidas en cada copia de seguridad. */
export const TABLAS_RESPALDO = [
  "sedes",
  "usuarios",
  "tipos_vencimiento",
  "catalogos",
  "concurrentes",
  "concurrente_prestaciones",
  "prestacion_horarios",
  "concurrente_profesionales",
  "profesionales",
  "admisiones",
  "historial_estados_admisiones",
  "documentos",
  "documento_versiones",
  "documento_maestro",
  "documento_maestro_versiones",
  "documento_maestro_archivos",
  "planillas",
  "planilla_estados",
  "planilla_eventos",
  "lotes",
  "lote_items",
  "comunicaciones",
  "transporte_solicitudes",
  "transporte_servicios",
  "viandas",
  "registro_horas",
  "facturacion",
  "turnos",
  "tareas",
  "eventos",
  "mensajes",
  "notas_rapidas",
  "cronograma_administrativo",
  "reglas_planilla",
  "requisitos_documentales",
  "historial",
] as const;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const Route = createFileRoute("/api/public/hooks/respaldo")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Autorización: secreto real del servidor (cron/externo) o sesión de un usuario admin.
        const webhookSecret = process.env["RESPALDO_WEBHOOK_SECRET"];
        if (!webhookSecret) {
          return json({ error: "Servidor mal configurado: falta RESPALDO_WEBHOOK_SECRET" }, 500);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = supabaseAdmin as any;

        const enviado = request.headers.get("x-webhook-secret") ?? "";
        let autorizado = enviado.length > 0 && enviado === webhookSecret;

        if (!autorizado && enviado.length > 0) {
          // Token interno del respaldo automático (pg_cron), nunca expuesto al navegador.
          const { data: tokenCron } = await db.rpc("respaldo_cron_token");
          autorizado = typeof tokenCron === "string" && tokenCron.length > 0 && tokenCron === enviado;
        }

        if (!autorizado) {
          // Respaldo manual desde la app: exige sesión activa con rol admin.
          const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
          if (bearer) {
            const { data: auth } = await db.auth.getUser(bearer);
            const uid = auth?.user?.id;
            if (uid) {
              const { data: perfil } = await db
                .from("usuarios")
                .select("rol, activo")
                .eq("auth_user_id", uid)
                .maybeSingle();
              autorizado = Boolean(perfil?.activo) && perfil?.rol === "admin";
            }
          }
        }

        if (!autorizado) return json({ error: "No autorizado" }, 401);



        let body: { tipo?: string; usuario?: string } = {};
        try {
          body = (await request.json()) as typeof body;
        } catch {
          body = {};
        }
        const tipo = body.tipo === "manual" ? "manual" : "automatico";




        const contenido: Record<string, unknown[]> = {};
        const errores: string[] = [];
        let total = 0;

        for (const tabla of TABLAS_RESPALDO) {
          const { data, error } = await db.from(tabla).select("*").limit(50000);
          if (error) {
            errores.push(`${tabla}: ${error.message}`);
            continue;
          }
          contenido[tabla] = data ?? [];
          total += data?.length ?? 0;
        }

        const ahora = new Date();
        const sello = ahora.toISOString().replace(/[:.]/g, "-");
        const ruta = `${ahora.getUTCFullYear()}/respaldo-${sello}.json`;
        const texto = JSON.stringify(
          { generado: ahora.toISOString(), tipo, version: 1, tablas: Object.keys(contenido), datos: contenido },
          null,
          0,
        );
        const bytes = new TextEncoder().encode(texto);

        const { error: errSubida } = await db.storage
          .from("respaldos")
          .upload(ruta, bytes, { contentType: "application/json", upsert: true });

        const estado = errSubida ? "error" : errores.length > 0 ? "parcial" : "ok";
        const detalle = [errSubida ? `Subida: ${errSubida.message}` : "", ...errores].filter(Boolean).join(" | ");

        await db.from("respaldos").insert({
          tipo,
          origen: tipo === "manual" ? "app" : "cron",
          storage_path: errSubida ? "" : ruta,
          tablas: Object.keys(contenido).join(", "),
          total_registros: total,
          tamano: bytes.byteLength,
          estado,
          detalle: detalle.slice(0, 4000),
          usuario: (body.usuario ?? "").slice(0, 120),
        });

        return json({ ok: estado !== "error", estado, ruta, total_registros: total, detalle }, estado === "error" ? 500 : 200);
      },
    },
  },
});
