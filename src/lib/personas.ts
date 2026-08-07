import { supabase } from "@integrations/supabase/client";

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
  nombres: string;
  apellidos: string;
  documento_tipo: string | null;
  documento_numero: string | null;
  email: string | null;
  telefono: string | null;
  fecha_nacimiento: string | null;
  etapa: EtapaPersona;
  created_at: string;
  updated_at: string;
}

export interface CrearPersonaInput {
  nombres: string;
  apellidos: string;
  documento_tipo?: string | null;
  documento_numero?: string | null;
  email?: string | null;
  telefono?: string | null;
  fecha_nacimiento?: string | null;
  etapa?: EtapaPersona;
}

export interface ActualizarPersonaInput {
  nombres?: string;
  apellidos?: string;
  documento_tipo?: string | null;
  documento_numero?: string | null;
  email?: string | null;
  telefono?: string | null;
  fecha_nacimiento?: string | null;
  etapa?: EtapaPersona;
}

export async function crearPersona(input: CrearPersonaInput): Promise<Persona> {
  const { data, error } = await supabase
    .from("personas")
    .insert({
      nombres: input.nombres,
      apellidos: input.apellidos,
      documento_tipo: input.documento_tipo ?? null,
      documento_numero: input.documento_numero ?? null,
      email: input.email ?? null,
      telefono: input.telefono ?? null,
      fecha_nacimiento: input.fecha_nacimiento ?? null,
      etapa: input.etapa ?? "contacto_inicial",
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
  const { data, error } = await supabase
    .from("personas")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("Error al obtener persona:", error);
    throw new Error(`Error al obtener persona: ${error.message}`);
  }

  return data as Persona;
}

export async function actualizarPersona(
  id: string,
  input: ActualizarPersonaInput
): Promise<Persona> {
  const { data, error } = await supabase
    .from("personas")
    .update({
      nombres: input.nombres,
      apellidos: input.apellidos,
      documento_tipo: input.documento_tipo ?? undefined,
      documento_numero: input.documento_numero ?? undefined,
      email: input.email ?? undefined,
      telefono: input.telefono ?? undefined,
      fecha_nacimiento: input.fecha_nacimiento ?? undefined,
      etapa: input.etapa,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Error al actualizar persona:", error);
    throw new Error(`No se pudo actualizar la persona: ${error.message}`);
  }

  return data as Persona;
}

export async function buscarPersonaPorDocumento(
  tipo: string,
  numero: string
): Promise<Persona | null> {
  const { data, error } = await supabase
    .from("personas")
    .select("*")
    .eq("documento_tipo", tipo)
    .eq("documento_numero", numero)
    .maybeSingle();

  if (error) {
    console.error("Error al buscar persona por documento:", error);
    throw new Error(`Error en búsqueda por documento: ${error.message}`);
  }

  return data as Persona | null;
}
