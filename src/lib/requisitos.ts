import type { Concurrente, Documento, Requisito } from "@/lib/api";
import { diasHasta } from "@/lib/format";

export type EstadoRequisito = {
  documento: string;
  obligatorio: boolean;
  cargado: boolean;
  vencido: boolean;
  porVencer: boolean;
  vencimiento: string | null;
};

export type ResumenDocumental = {
  requisitos: EstadoRequisito[];
  faltantes: string[];
  vencidos: string[];
  porVencer: string[];
  completo: boolean;
};

const norm = (s: string) =>
  (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

/** Prestaciones aplicables a un concurrente (su prestación + transporte si corresponde). */
export function prestacionesDe(p: Concurrente) {
  const lista = [p.prestacion].filter(Boolean).map(String);
  if (p.transporte || p.tipo === "transporte") lista.push("Transporte");
  return lista;
}

/** Cruza los requisitos de sus prestaciones con los documentos efectivamente cargados. */
export function resumenDocumental(
  persona: Concurrente,
  docs: Documento[],
  requisitos: Requisito[],
): ResumenDocumental {
  const presta = prestacionesDe(persona).map(norm);
  const exigidos = requisitos.filter((r) => presta.includes(norm(r.prestacion)));
  const propios = docs.filter((d) => d.concurrente_id === persona.id);

  const vistos = new Set<string>();
  const estados: EstadoRequisito[] = [];

  for (const r of exigidos) {
    const clave = norm(r.documento);
    if (vistos.has(clave)) continue;
    vistos.add(clave);

    const coincidencias = propios.filter(
      (d) =>
        norm(d.requisito) === clave ||
        norm(d.tipo) === clave ||
        norm(d.nombre).includes(clave),
    );
    // Se conserva el documento con vencimiento más lejano (el más vigente).
    const doc = coincidencias.sort((a, b) => (b.vencimiento ?? "").localeCompare(a.vencimiento ?? ""))[0];
    const dias = doc ? diasHasta(doc.vencimiento) : null;

    estados.push({
      documento: r.documento,
      obligatorio: r.obligatorio,
      cargado: Boolean(doc),
      vencido: dias !== null && dias < 0,
      porVencer: dias !== null && dias >= 0 && dias <= 30,
      vencimiento: doc?.vencimiento ?? null,
    });
  }

  const faltantes = estados.filter((e) => e.obligatorio && !e.cargado).map((e) => e.documento);
  const vencidos = estados.filter((e) => e.vencido).map((e) => e.documento);
  const porVencer = estados.filter((e) => e.porVencer).map((e) => e.documento);

  return {
    requisitos: estados,
    faltantes,
    vencidos,
    porVencer,
    completo: estados.length > 0 && faltantes.length === 0 && vencidos.length === 0,
  };
}

export const REQUISITO_CUD = "CUD";
export const REQUISITO_ANSES = "Último comprobante de ANSES";
