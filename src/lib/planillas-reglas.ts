import type { ConcurrentePrestacion, Concurrente, ReglaPlanilla } from "@/lib/api";
import { prestacionControlaHoras } from "@/lib/aprossy-horas";

/** Modo de facturación derivado de la prestación (Sprint 2A: solo DAI/MIE/IE controlan horas). */
export function modoFacturacion(prestacion: string): "horas" | "modulo" {
  return prestacionControlaHoras(prestacion) ? "horas" : "modulo";
}

const norm = (s: string) =>
  (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

/** ¿La regla aplica a esta combinación? Campo vacío en la regla = comodín. */
function reglaAplica(
  regla: ReglaPlanilla,
  ctx: { prestacion: string; mutual: string; modo: string },
): boolean {
  if (!regla.activa) return false;
  if (regla.prestacion && norm(regla.prestacion) !== norm(ctx.prestacion)) return false;
  if (regla.mutual && norm(regla.mutual) !== norm(ctx.mutual)) return false;
  if (regla.modo_facturacion && norm(regla.modo_facturacion) !== norm(ctx.modo)) return false;
  return true;
}

export type PlanillaSugerida = {
  tipo: string;
  prestacion: string;
  modo: "horas" | "modulo";
  regla: string;
};

/**
 * Resuelve qué planillas corresponden a un concurrente en función de sus
 * prestaciones activas, la mutual y el modo de facturación.
 * Si ninguna regla coincide, se cae al tipo "general" para no perder cobertura.
 */
export function planillasDe(
  concurrente: Pick<Concurrente, "prestacion" | "mutual" | "transporte">,
  prestaciones: ConcurrentePrestacion[],
  reglas: ReglaPlanilla[],
): PlanillaSugerida[] {
  const activas = prestaciones.filter((p) => p.activa).map((p) => p.prestacion);
  const lista = activas.length > 0 ? activas : [concurrente.prestacion].filter(Boolean);
  const ordenadas = [...reglas].sort((a, b) => a.prioridad - b.prioridad);

  const salida = new Map<string, PlanillaSugerida>();
  for (const prestacion of lista) {
    const modo = modoFacturacion(prestacion);
    const regla = ordenadas.find((r) => reglaAplica(r, { prestacion, mutual: concurrente.mutual ?? "", modo }));
    const tipo = regla?.tipo_planilla ?? "general";
    if (!salida.has(tipo)) {
      salida.set(tipo, { tipo, prestacion, modo, regla: regla?.nombre ?? "Sin regla (general)" });
    }
  }

  if (concurrente.transporte) {
    const reglaT = ordenadas.find((r) => norm(r.tipo_planilla) === "transporte");
    if (reglaT && !salida.has(reglaT.tipo_planilla)) {
      salida.set(reglaT.tipo_planilla, {
        tipo: reglaT.tipo_planilla,
        prestacion: "Transporte",
        modo: "modulo",
        regla: reglaT.nombre,
      });
    }
  }

  if (salida.size === 0) {
    salida.set("general", { tipo: "general", prestacion: "—", modo: "modulo", regla: "Sin regla (general)" });
  }
  return [...salida.values()];
}
