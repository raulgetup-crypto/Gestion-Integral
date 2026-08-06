import { supabase } from "@/integrations/supabase/client";

// Tablas nuevas fuera de los tipos generados: se validan en runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type Respaldo = {
  id: string;
  tipo: "automatico" | "manual";
  origen: string;
  storage_path: string;
  tablas: string;
  total_registros: number;
  tamano: number;
  estado: "ok" | "parcial" | "error";
  detalle: string;
  usuario: string;
  created_at: string;
};

/** Tablas que se incluyen en la exportación general (mismo alcance que el respaldo). */
export const TABLAS_EXPORTABLES: { tabla: string; etiqueta: string }[] = [
  { tabla: "concurrentes", etiqueta: "Concurrentes" },
  { tabla: "concurrente_prestaciones", etiqueta: "Prestaciones" },
  { tabla: "prestacion_horarios", etiqueta: "Horarios de prestación" },
  { tabla: "admisiones", etiqueta: "Admisiones" },
  { tabla: "historial_estados_admisiones", etiqueta: "Historial de admisiones" },
  { tabla: "documentos", etiqueta: "Documentos" },
  { tabla: "documento_versiones", etiqueta: "Versiones de documentos" },
  { tabla: "planillas", etiqueta: "Planillas" },
  { tabla: "planilla_estados", etiqueta: "Estados de planillas" },
  { tabla: "planilla_eventos", etiqueta: "Eventos de planillas" },
  { tabla: "lotes", etiqueta: "Lotes" },
  { tabla: "lote_items", etiqueta: "Ítems de lotes" },
  { tabla: "comunicaciones", etiqueta: "Comunicaciones" },
  { tabla: "transporte_solicitudes", etiqueta: "Transporte" },
  { tabla: "viandas", etiqueta: "Viandas" },
  { tabla: "profesionales", etiqueta: "Profesionales" },
  { tabla: "concurrente_profesionales", etiqueta: "Equipo por concurrente" },
  { tabla: "registro_horas", etiqueta: "Registro de horas" },
  { tabla: "facturacion", etiqueta: "Facturación" },
  { tabla: "notas_rapidas", etiqueta: "Notas rápidas" },
  { tabla: "cronograma_administrativo", etiqueta: "Cronograma" },
  { tabla: "historial", etiqueta: "Historial general" },
];

export const respaldosApi = {
  async listar(): Promise<Respaldo[]> {
    const { data, error } = await db
      .from("respaldos")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data ?? []) as Respaldo[];
  },

  /** Ejecuta una copia de seguridad completa en el servidor. */
  async ejecutar(usuario: string): Promise<{ ok: boolean; estado: string; total_registros: number; detalle: string }> {
    const { data: sesion } = await supabase.auth.getSession();
    const token = sesion.session?.access_token;
    if (!token) throw new Error("Iniciá sesión para generar un respaldo");
    const res = await fetch("/api/public/hooks/respaldo", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tipo: "manual", usuario }),
    });

    const json = (await res.json()) as { ok?: boolean; estado?: string; total_registros?: number; detalle?: string; error?: string };
    if (!res.ok) throw new Error(json.error ?? json.detalle ?? "No se pudo generar el respaldo");
    return {
      ok: Boolean(json.ok),
      estado: json.estado ?? "ok",
      total_registros: json.total_registros ?? 0,
      detalle: json.detalle ?? "",
    };
  },

  /** Enlace temporal de descarga (1 hora). */
  async urlDescarga(path: string): Promise<string> {
    const { data, error } = await db.storage.from("respaldos").createSignedUrl(path, 3600);
    if (error) throw error;
    return data.signedUrl as string;
  },

  async eliminar(r: Respaldo): Promise<void> {
    if (r.storage_path) await db.storage.from("respaldos").remove([r.storage_path]);
    const { error } = await db.from("respaldos").delete().eq("id", r.id);
    if (error) throw error;
  },
};

/** Descarga completa de una tabla respetando los permisos del usuario. */
export async function leerTabla(tabla: string): Promise<Record<string, unknown>[]> {
  const { data, error } = await db.from(tabla).select("*").limit(20000);
  if (error) throw error;
  return (data ?? []) as Record<string, unknown>[];
}

/** Aplana valores complejos para que Excel/CSV los muestre legibles. */
export function aplanar(filas: Record<string, unknown>[]): Record<string, string | number>[] {
  return filas.map((f) => {
    const out: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(f)) {
      out[k] = v == null ? "" : typeof v === "number" ? v : typeof v === "object" ? JSON.stringify(v) : String(v);
    }
    return out;
  });
}

export function formatoTamano(bytes: number): string {
  if (!bytes) return "—";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(2)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}
