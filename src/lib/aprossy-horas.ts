/**
 * Utilidades de cálculo horario y control APROSS.
 * Regla de negocio: el mínimo facturable mensual es de 24 horas.
 */
import type { RegistroHoras, PrestacionHorario } from "@/lib/api";

export const MINIMO_APROSS = 24;

export const DIAS_SEMANA = [
  { valor: 1, label: "Lunes", corto: "Lun" },
  { valor: 2, label: "Martes", corto: "Mar" },
  { valor: 3, label: "Miércoles", corto: "Mié" },
  { valor: 4, label: "Jueves", corto: "Jue" },
  { valor: 5, label: "Viernes", corto: "Vie" },
  { valor: 6, label: "Sábado", corto: "Sáb" },
  { valor: 0, label: "Domingo", corto: "Dom" },
] as const;

export const TIPOS_REGISTRO = [
  { valor: "programada", label: "Programada", factura: false },
  { valor: "asistida", label: "Asistida", factura: true },
  { valor: "recuperada", label: "Recuperada", factura: true },
  { valor: "justificada", label: "Justificada", factura: true },
  { valor: "feriado", label: "Feriado", factura: true },
  { valor: "receso", label: "Receso", factura: false },
  { valor: "no_asistio", label: "No asistió", factura: false },
] as const;

export type TipoRegistro = (typeof TIPOS_REGISTRO)[number]["valor"];

export const TIPO_LABEL: Record<string, string> = Object.fromEntries(
  TIPOS_REGISTRO.map((t) => [t.valor, t.label]),
);

/** Horas decimales entre dos horarios "HH:MM". Devuelve 0 si el rango es inválido. */
export function horasEntre(inicio: string, fin: string): number {
  const min = (h: string) => {
    const [a, b] = (h || "").split(":");
    const hh = Number(a);
    const mm = Number(b ?? 0);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return NaN;
    return hh * 60 + mm;
  };
  const a = min(inicio);
  const b = min(fin);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
  return Math.round(((b - a) / 60) * 100) / 100;
}

/** Total semanal de horas según el cronograma cargado. */
export function horasSemanales(horarios: PrestacionHorario[]): number {
  return redondear(horarios.reduce((s, h) => s + (Number(h.horas) || horasEntre(h.hora_inicio, h.hora_fin)), 0));
}

export function redondear(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export type ResumenAprossy = {
  mes: string;
  programadas: number;
  asistidas: number;
  recuperadas: number;
  justificadas: number;
  receso: number;
  feriado: number;
  no_asistio: number;
  facturables: number;
  faltantes: number;
  extras: number;
  minimo: number;
  cumpleMinimo: boolean;
};

/** Resumen mensual APROSS calculado a partir de los registros de horas. */
export function resumenAprossy(registros: RegistroHoras[], mes: string): ResumenAprossy {
  const suma = (tipo: TipoRegistro) =>
    redondear(registros.filter((r) => r.mes === mes && r.tipo === tipo).reduce((s, r) => s + Number(r.horas || 0), 0));

  const programadas = suma("programada");
  const asistidas = suma("asistida");
  const recuperadas = suma("recuperada");
  const justificadas = suma("justificada");
  const receso = suma("receso");
  const feriado = suma("feriado");
  const no_asistio = suma("no_asistio");
  const facturables = redondear(asistidas + recuperadas + justificadas + feriado);

  return {
    mes,
    programadas,
    asistidas,
    recuperadas,
    justificadas,
    receso,
    feriado,
    no_asistio,
    facturables,
    faltantes: redondear(Math.max(MINIMO_APROSS - facturables, 0)),
    extras: redondear(Math.max(facturables - programadas, 0)),
    minimo: MINIMO_APROSS,
    cumpleMinimo: facturables >= MINIMO_APROSS,
  };
}

/** Meses disponibles en los registros, del más reciente al más antiguo. */
export function mesesConRegistros(registros: RegistroHoras[]): string[] {
  return [...new Set(registros.map((r) => r.mes))].sort((a, b) => b.localeCompare(a));
}
