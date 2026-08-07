import { supabase } from "@/integrations/supabase/client";
import { logHistorial } from "@/lib/api";
import { auditoria } from "@/lib/kalen";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const ETAPAS_PERSONA = [
  "contacto_inicial",
  "en_admision",
  "concurrente_activo",
  "concurrente_baja",
  "archivo",
] as const;
export type EtapaPersona = (typeof ETAPAS_PERSONA)[number];

export const ETAPA_PERSONA_LABEL: Record<EtapaPersona, string> = {
  contacto_inicial: "Contacto inicial",
  en_admision: "En admisión",
  concurrente_activo: "Concurrente activo",
  concurrente_baja: "Concurrente de baja",
  archivo: "Archivo",
};

export type Persona = {
  id: string;
  nombre: string;
  apellido: string;
  dni: string | null;
  fecha_nacimiento: string | null;
  telefono: string;
  telefono_familiar: string;
  email: string;
  direccion: string;
  sede_id: number | null;
  etapa: EtapaPersona;
  observaciones: string;
  created_at: string;
  updated_at: string;
};

function ok<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export async function fetchPersonas(): Promise<Persona[]> {
  return ok(await db.from("personas").select("*").order("created_at", { ascending: false })) ?? [];
}

export async function fetchPersona(id: string): Promise<Persona | null> {
  const { data } = await db.from("personas").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}

/** Busca personas por nombre/apellido/telefono/dni para el buscador global. */
export async function buscarPersonas(texto: string, limite = 8): Promise<Persona[]> {
  if (!texto.trim()) return [];
  const q = `%${texto.trim()}%`;
  return (
    ok(
      await db
        .from("personas")
        .select("*")
        .or(`nombre.ilike.${q},apellido.ilike.${q},telefono.ilike.${q},dni.ilike.${q}`)
        .limit(limite),
    ) ?? []
  );
}

export async function crearPersona(
  datos: Partial<Persona> & { nombre: string },
  usuarioId: number | null,
): Promise<Persona> {
  const payload = {
    nombre: datos.nombre,
    apellido: datos.apellido ?? "",
    dni: datos.dni ?? null,
    fecha_nacimiento: datos.fecha_nacimiento ?? null,
    telefono: datos.telefono ?? "",
    telefono_familiar: datos.telefono_familiar ?? "",
    email: datos.email ?? "",
    direccion: datos.direccion ?? "",
    sede_id: datos.sede_id ?? null,
    etapa: datos.etapa ?? "contacto_inicial",
    observaciones: datos.observaciones ?? "",
    ...auditoria(usuarioId, true),
  };
  const creada = ok(await db.from("personas").insert(payload).select().single()) as Persona;
  await logHistorial({ entidad: "persona", accion: "alta", entidad_id: creada.id, detalle: creada.nombre });
  return creada;
}

export async function actualizarPersona(
  id: string,
  cambios: Partial<Persona>,
  usuarioId: number | null,
): Promise<Persona> {
  const payload = { ...cambios, ...auditoria(usuarioId, false) };
  const actualizada = ok(
    await db.from("personas").update(payload).eq("id", id).select().single(),
  ) as Persona;
  await logHistorial({ entidad: "persona", accion: "edicion", entidad_id: id, detalle: actualizada.nombre });
  return actualizada;
}

export async function cambiarEtapaPersona(
  id: string,
  etapa: EtapaPersona,
  usuarioId: number | null,
): Promise<Persona> {
  return actualizarPersona(id, { etapa }, usuarioId);
}
