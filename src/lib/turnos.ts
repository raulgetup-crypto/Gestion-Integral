import { supabase } from "@/integrations/supabase/client";
import type { Turno } from "@/lib/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/** Estados operativos del turno. Los históricos "atendido" se migraron a "realizado". */
export const ESTADOS_TURNO = ["pendiente", "confirmado", "realizado", "cancelado", "ausente"] as const;
export type EstadoTurno = (typeof ESTADOS_TURNO)[number];

export const ESTADO_TURNO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  realizado: "Realizado",
  cancelado: "Cancelado",
  ausente: "Ausente",
  atendido: "Realizado",
};

/** Fallback si el catálogo todavía no tiene filas: nunca deja el selector vacío. */
export const TIPOS_TURNO_BASE = [
  "Entrevista de admisión",
  "Encuentro de conocimiento",
  "Valoración",
  "Consulta",
  "Seguimiento",
  "Reunión",
  "Otro",
] as const;

/**
 * Resultados posibles de un turno. Sólo registran lo ocurrido: la admisión
 * se decide siempre de forma explícita desde la pre-admisión.
 */
export const RESULTADOS_TURNO = [
  "",
  "Continúa ingreso",
  "No ingresa",
  "Pendiente de decisión",
  "Pasa a otra instancia",
] as const;

/** Tipos que forman parte del circuito de admisión (los demás no derivan en alta). */
export const TIPOS_CIRCUITO_ADMISION = ["Entrevista de admisión", "Encuentro de conocimiento"] as const;

/** Tipos de turno editables desde `catalogos` (tipo = 'tipos_turno'). */
export async function fetchTiposTurno(): Promise<string[]> {
  const { data, error } = await db
    .from("catalogos")
    .select("valor")
    .eq("tipo", "tipos_turno")
    .order("valor");
  if (error) {
    console.error("Error al leer tipos de turno:", error);
    return [...TIPOS_TURNO_BASE];
  }
  const valores = ((data ?? []) as { valor: string }[]).map((r) => r.valor);
  return valores.length ? valores : [...TIPOS_TURNO_BASE];
}

/** Turnos de una persona (historial completo, más recientes primero). */
export async function fetchTurnosPersona(personaId: string): Promise<Turno[]> {
  const { data, error } = await db
    .from("turnos")
    .select("*")
    .eq("persona_id", personaId)
    .order("fecha", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as Turno[]) ?? [];
}
