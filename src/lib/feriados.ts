// Feriados nacionales de Argentina (cálculo local, sin dependencias externas).

import { toISO, parseISO } from "./format";

export type Feriado = { fecha: string; nombre: string; tipo: "inamovible" | "trasladable" | "puente" };

function pascua(anio: number) {
  // Algoritmo de Meeus/Jones/Butcher (calendario gregoriano)
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(anio, mes - 1, dia);
}

function sumarDias(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(d.getDate() + n);
  return r;
}

// Feriados trasladables: martes/miércoles -> lunes anterior; jueves/viernes -> lunes siguiente.
function trasladar(d: Date) {
  const dow = d.getDay();
  if (dow === 2 || dow === 3) return sumarDias(d, dow === 2 ? -1 : -2);
  if (dow === 4 || dow === 5) return sumarDias(d, dow === 4 ? 4 : 3);
  return d;
}

function lunesNumero(anio: number, mes: number, n: number) {
  const d = new Date(anio, mes, 1);
  const offset = (8 - d.getDay()) % 7;
  return new Date(anio, mes, 1 + offset + (n - 1) * 7);
}

export function feriadosAnio(anio: number): Feriado[] {
  const p = pascua(anio);
  const lista: Feriado[] = [
    { fecha: toISO(new Date(anio, 0, 1)), nombre: "Año Nuevo", tipo: "inamovible" },
    { fecha: toISO(sumarDias(p, -48)), nombre: "Carnaval", tipo: "inamovible" },
    { fecha: toISO(sumarDias(p, -47)), nombre: "Carnaval", tipo: "inamovible" },
    { fecha: toISO(new Date(anio, 2, 24)), nombre: "Día de la Memoria", tipo: "inamovible" },
    { fecha: toISO(sumarDias(p, -2)), nombre: "Viernes Santo", tipo: "inamovible" },
    { fecha: toISO(new Date(anio, 3, 2)), nombre: "Día del Veterano y Caídos en Malvinas", tipo: "inamovible" },
    { fecha: toISO(new Date(anio, 4, 1)), nombre: "Día del Trabajador", tipo: "inamovible" },
    { fecha: toISO(new Date(anio, 4, 25)), nombre: "Revolución de Mayo", tipo: "inamovible" },
    { fecha: toISO(trasladar(new Date(anio, 5, 17))), nombre: "Paso a la Inmortalidad de Güemes", tipo: "trasladable" },
    { fecha: toISO(new Date(anio, 5, 20)), nombre: "Paso a la Inmortalidad de Belgrano", tipo: "inamovible" },
    { fecha: toISO(new Date(anio, 6, 9)), nombre: "Día de la Independencia", tipo: "inamovible" },
    { fecha: toISO(lunesNumero(anio, 7, 3)), nombre: "Paso a la Inmortalidad de San Martín", tipo: "trasladable" },
    { fecha: toISO(trasladar(new Date(anio, 9, 12))), nombre: "Diversidad Cultural Americana", tipo: "trasladable" },
    { fecha: toISO(trasladar(new Date(anio, 10, 20))), nombre: "Día de la Soberanía Nacional", tipo: "trasladable" },
    { fecha: toISO(new Date(anio, 11, 8)), nombre: "Inmaculada Concepción de María", tipo: "inamovible" },
    { fecha: toISO(new Date(anio, 11, 25)), nombre: "Navidad", tipo: "inamovible" },
  ];
  return lista.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

const cache = new Map<number, Map<string, Feriado>>();

export function mapaFeriados(anio: number) {
  let m = cache.get(anio);
  if (!m) {
    m = new Map(feriadosAnio(anio).map((f) => [f.fecha, f]));
    cache.set(anio, m);
  }
  return m;
}

export function esFeriado(iso: string) {
  return mapaFeriados(Number(iso.slice(0, 4))).get(iso);
}

export function feriadosDelMes(mes: string): Feriado[] {
  return feriadosAnio(Number(mes.slice(0, 4))).filter((f) => f.fecha.startsWith(mes));
}

/** Días hábiles (lunes a viernes, sin feriados) de un mes "YYYY-MM". */
export function diasHabiles(mes: string) {
  const [y, m] = mes.split("-").map(Number);
  const feriados = mapaFeriados(y);
  let habiles = 0;
  let finesDeSemana = 0;
  const total = new Date(y, m, 0).getDate();
  for (let d = 1; d <= total; d++) {
    const fecha = new Date(y, m - 1, d);
    const dow = fecha.getDay();
    if (dow === 0 || dow === 6) {
      finesDeSemana++;
      continue;
    }
    if (feriados.has(toISO(fecha))) continue;
    habiles++;
  }
  return { total, habiles, finesDeSemana, feriados: feriadosDelMes(mes).length };
}

/** Resumen de los 12 meses del año. */
export function resumenAnual(anio: number) {
  return Array.from({ length: 12 }, (_, i) => {
    const mes = `${anio}-${String(i + 1).padStart(2, "0")}`;
    return { mes, ...diasHabiles(mes), listaFeriados: feriadosDelMes(mes) };
  });
}

export { parseISO };
