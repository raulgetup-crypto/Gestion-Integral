import { supabase } from "@/integrations/supabase/client";

// El esquema es dinámico (tabla fuera de los tipos generados): se valida en runtime.
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

export const ETAPAS_PERSONA_LABEL: Record<EtapaPersona, string> = {
  contacto_inicial: "Contacto inicial",
  en_admision: "En admisión",
  concurrente_activo: "Concurrente activo",
  concurrente_baja: "Concurrente de baja",
  archivo: "Archivo",
};

export interface Persona {
  id: string;
  sede_id: number | null;
  nombre: string;
  apellido: string;
  documento_tipo: string | null;
  documento_numero: string | null;
  email: string | null;
  telefono: string;
  telefono_familiar: string;
  direccion: string;
  fecha_nacimiento: string | null;
  etapa: EtapaPersona;
  observaciones: string;
  created_at: string;
  updated_at: string;
}

export interface CrearPersonaInput {
  nombre: string;
  apellido?: string;
  sede_id?: number | null;
  documento_tipo?: string | null;
  documento_numero?: string | null;
  email?: string | null;
  telefono?: string;
  telefono_familiar?: string;
  direccion?: string;
  fecha_nacimiento?: string | null;
  etapa?: EtapaPersona;
  observaciones?: string;
}

export type ActualizarPersonaInput = Partial<CrearPersonaInput>;

function auditoria(usuarioId: number | null | undefined, esAlta: boolean) {
  const campos: Record<string, unknown> = { updated_by: usuarioId ?? null };
  if (esAlta) campos.created_by = usuarioId ?? null;
  return campos;
}

export async function crearPersona(
  input: CrearPersonaInput,
  usuarioId?: number | null,
): Promise<Persona> {
  const { data, error } = await db
    .from("personas")
    .insert({
      nombre: input.nombre,
      apellido: input.apellido ?? "",
      sede_id: input.sede_id ?? null,
      documento_tipo: input.documento_tipo ?? null,
      documento_numero: input.documento_numero ?? null,
      email: input.email ?? null,
      telefono: input.telefono ?? "",
      telefono_familiar: input.telefono_familiar ?? "",
      direccion: input.direccion ?? "",
      fecha_nacimiento: input.fecha_nacimiento || null,
      etapa: input.etapa ?? "contacto_inicial",
      observaciones: input.observaciones ?? "",
      ...auditoria(usuarioId, true),
    })
    .select("*")
    .single();

  if (error) {
    console.error("Error al crear persona:", error);
    throw new Error(`No se pudo crear la persona: ${error.message}`);
  }

  return data as Persona;
}

export async function obtenerPersona(id: string): Promise<Persona | null> {
  const { data, error } = await db.from("personas").select("*").eq("id", id).maybeSingle();

  if (error) {
    console.error("Error al obtener persona:", error);
    throw new Error(`Error al obtener persona: ${error.message}`);
  }

  return (data as Persona) ?? null;
}

export async function actualizarPersona(
  id: string,
  input: ActualizarPersonaInput,
  usuarioId?: number | null,
): Promise<Persona> {
  const payload: Record<string, unknown> = { ...auditoria(usuarioId, false), updated_at: new Date().toISOString() };
  for (const [clave, valor] of Object.entries(input)) {
    if (valor !== undefined) payload[clave] = valor;
  }

  const { data, error } = await db.from("personas").update(payload).eq("id", id).select("*").single();

  if (error) {
    console.error("Error al actualizar persona:", error);
    throw new Error(`No se pudo actualizar la persona: ${error.message}`);
  }

  return data as Persona;
}

export async function buscarPersonaPorDocumento(
  tipo: string,
  numero: string,
): Promise<Persona | null> {
  const { data, error } = await db
    .from("personas")
    .select("*")
    .eq("documento_tipo", tipo)
    .eq("documento_numero", numero)
    .maybeSingle();

  if (error) {
    console.error("Error al buscar persona por documento:", error);
    throw new Error(`Error en búsqueda por documento: ${error.message}`);
  }

  return (data as Persona) ?? null;
}

/** Todas las personas, para el cruce de alertas de seguimiento (no filtra por etapa acá). */
export async function listarPersonas(): Promise<Persona[]> {
  const { data, error } = await db.from("personas").select("*");

  if (error) {
    console.error("Error al listar personas:", error);
    throw new Error(`No se pudo listar personas: ${error.message}`);
  }

  return (data as Persona[]) ?? [];
}
