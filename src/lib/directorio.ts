import { supabase } from "@/integrations/supabase/client";
import { logHistorial } from "@/lib/api";

/** Contacto del directorio institucional (mutuales, transporte, proveedores, internos). */
export type Directorio = {
  id: string;
  nombre: string;
  cargo: string | null;
  institucion: string | null;
  area: string | null;
  telefono: string | null;
  telefono_alternativo: string | null;
  email: string | null;
  sede_id: number | null;
  observaciones: string | null;
  activo: boolean;
};

const tabla = () => (supabase as any).from("directorio");

function ok<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export async function fetchDirectorio(): Promise<Directorio[]> {
  const res = await tabla().select("*").eq("activo", true).order("nombre");
  return (ok(res) ?? []) as Directorio[];
}

export async function crearContacto(
  datos: Partial<Directorio> & { nombre: string },
  usuarioId: number | null,
): Promise<Directorio> {
  const { id: _omit, ...campos } = datos;
  const res = await tabla()
    .insert({ ...campos, created_by: usuarioId ?? null, updated_by: usuarioId ?? null })
    .select()
    .single();
  const fila = ok(res) as Directorio;
  await logHistorial({
    entidad: "directorio",
    accion: "alta",
    detalle: `Contacto agregado: ${fila.nombre}`,
    entidad_id: fila.id,
    concurrente_id: null,
    observaciones: "",
  });
  return fila;
}

export async function actualizarContacto(
  id: string,
  datos: Partial<Directorio>,
  usuarioId: number | null,
): Promise<void> {
  const { id: _omit, ...campos } = datos;
  ok(
    await tabla()
      .update({ ...campos, updated_by: usuarioId ?? null, updated_at: new Date().toISOString() })
      .eq("id", id),
  );
  await logHistorial({
    entidad: "directorio",
    accion: "edicion",
    detalle: `Contacto actualizado: ${datos.nombre ?? id}`,
    entidad_id: id,
    concurrente_id: null,
    observaciones: "",
  });
}

/** Baja lógica: el contacto deja de listarse pero se conserva para auditoría. */
export async function bajaContacto(id: string, usuarioId: number | null): Promise<void> {
  ok(
    await tabla()
      .update({
        activo: false,
        fecha_baja: new Date().toISOString(),
        usuario_baja: usuarioId ?? null,
        updated_by: usuarioId ?? null,
      })
      .eq("id", id),
  );
  await logHistorial({
    entidad: "directorio",
    accion: "baja",
    detalle: `Contacto dado de baja (#${id})`,
    entidad_id: id,
    concurrente_id: null,
    observaciones: "",
  });
}
