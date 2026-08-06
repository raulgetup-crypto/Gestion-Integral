import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchConcurrentes,
  documentosApi,
  fetchRequisitos,
  transporteApi,
  viandasApi,
} from "@/lib/api";
import { resumenDocumental } from "@/lib/requisitos";
import {
  diasHasta,
  fetchAdmisiones,
  fetchDocumentosKalen,
  fetchPlanillas,
  ESTADO_FIRMA_LABEL,
  ESTADO_ADMISION_LABEL,
  type Planilla,
} from "@/lib/kalen";

export type NivelAlerta = "rojo" | "amarillo";

export type Alerta = {
  id: string;
  titulo: string;
  sub: string;
  chip: string;
  nivel: NivelAlerta;
  concurrenteId: string | null;
  /** Destino alternativo cuando la alerta no corresponde a un concurrente puntual. */
  modulo?: string;
};

export type GruposAlertas = {
  docsVencen: Alerta[];
  checklistFaltante: Alerta[];
  sinRecepcion: Alerta[];
  firmasPendientes: Alerta[];
  demoradas: Alerta[];
  ansesPendientes: Alerta[];
  viandasPendientes: Alerta[];
  admisionesDemoradas: Alerta[];
};

const periodoDe = (p: Planilla) => p.periodo?.slice(0, 7) ?? "sin período";

/** Rojo si está vencido o la demora supera los 15 días; amarillo en el resto. */
const nivelPorDias = (dias: number): NivelAlerta => (dias < 0 || dias > 15 ? "rojo" : "amarillo");

/**
 * Alertas consolidadas de todos los módulos, calculadas en tiempo real
 * a partir de los datos de origen (no se persisten).
 */
export function useAlertas() {
  const opciones = { staleTime: 60_000 } as const;
  const { data: concurrentes = [] } = useQuery({ queryKey: ["concurrentes"], queryFn: fetchConcurrentes, ...opciones });
  const { data: documentos = [] } = useQuery({ queryKey: ["documentos-kalen"], queryFn: fetchDocumentosKalen, ...opciones });
  const { data: planillas = [] } = useQuery({ queryKey: ["planillas"], queryFn: fetchPlanillas, ...opciones });
  const { data: admisiones = [] } = useQuery({ queryKey: ["admisiones"], queryFn: fetchAdmisiones, ...opciones });
  const { data: transportes = [] } = useQuery({ queryKey: ["transporte"], queryFn: transporteApi.list, ...opciones });
  const { data: viandas = [] } = useQuery({ queryKey: ["viandas"], queryFn: viandasApi.list, ...opciones });
  const { data: docsLegajo = [] } = useQuery({ queryKey: ["documentos"], queryFn: documentosApi.list, ...opciones });
  const { data: requisitos = [] } = useQuery({ queryKey: ["requisitos"], queryFn: fetchRequisitos, ...opciones });

  const nombreDe = useMemo(() => {
    const map = new Map(concurrentes.map((c) => [c.id, `${c.apellido || ""} ${c.nombre}`.trim()]));
    return (id: string | null) => (id && map.get(id)) || "Sin concurrente";
  }, [concurrentes]);

  const grupos: GruposAlertas = useMemo(() => {
    const docsVencen: Alerta[] = documentos
      .filter((d) => {
        const dias = diasHasta(d.fecha_vencimiento);
        return dias !== null && dias <= 15;
      })
      .map((d) => {
        const dias = diasHasta(d.fecha_vencimiento)!;
        return {
          id: `doc-${d.id}`,
          titulo: `${d.tipo_documento || d.nombre} · ${nombreDe(d.concurrente_id)}`,
          sub: `Vence el ${d.fecha_vencimiento}`,
          chip: dias < 0 ? `VENCIDO hace ${Math.abs(dias)} d` : `Vence en ${dias} d`,
          nivel: (dias < 0 ? "rojo" : "amarillo") as NivelAlerta,
          concurrenteId: d.concurrente_id,
          modulo: "/documentacion",
        };
      })
      .sort((a, b) => a.titulo.localeCompare(b.titulo));

    const sinRecepcion: Alerta[] = planillas
      .filter((p) => {
        if (p.fecha_recepcion) return false;
        const dias = diasHasta(p.fecha_limite);
        return dias !== null && dias < 0;
      })
      .map((p) => {
        const demora = Math.abs(diasHasta(p.fecha_limite) ?? 0);
        return {
          id: `pl-${p.id}`,
          titulo: `Planilla ${periodoDe(p)} · ${nombreDe(p.concurrente_id)}`,
          sub: `Límite: ${p.fecha_limite ?? "sin fecha"} · ${p.ubicacion_actual || "sin ubicación"}`,
          chip: `${demora} d de demora`,
          nivel: nivelPorDias(demora > 15 ? 16 : demora),
          concurrenteId: p.concurrente_id,
          modulo: "/planillas",
        };
      });

    const firmasPendientes: Alerta[] = planillas
      .filter((p) => p.estado_firma === "pendiente_firma")
      .map((p) => {
        const dias = diasHasta(p.fecha_limite);
        return {
          id: `fi-${p.id}`,
          titulo: `Planilla ${periodoDe(p)} · ${nombreDe(p.concurrente_id)}`,
          sub: `${ESTADO_FIRMA_LABEL[p.estado_firma]} · ${p.responsable || "sin responsable"}`,
          chip: "Firma pendiente",
          nivel: (dias !== null && dias < -15 ? "rojo" : "amarillo") as NivelAlerta,
          concurrenteId: p.concurrente_id,
          modulo: "/firmas",
        };
      });

    const demoradas: Alerta[] = planillas
      .filter((p) => p.estado_recepcion === "recibida_fuera_termino" || p.motivo_demora?.trim())
      .map((p) => {
        const dias = diasHasta(p.fecha_limite);
        const demora = dias !== null && dias < 0 ? Math.abs(dias) : 0;
        return {
          id: `de-${p.id}`,
          titulo: `Planilla ${periodoDe(p)} · ${nombreDe(p.concurrente_id)}`,
          sub: p.motivo_demora || "Sin motivo cargado",
          chip: demora ? `${demora} d de demora` : "Demorada",
          nivel: (demora > 15 ? "rojo" : "amarillo") as NivelAlerta,
          concurrenteId: p.concurrente_id,
          modulo: "/planillas",
        };
      });

    const ansesPendientes: Alerta[] = transportes
      .filter((t) => t.estado !== "finalizado" && !t.comprobante_anses)
      .map((t) => ({
        id: `an-${t.id}`,
        titulo: `Transporte ${t.mes || "sin mes"} · ${nombreDe(t.concurrente_id)}`,
        sub: `${t.empresa || "Sin empresa"} · comprobante ANSES pendiente`,
        chip: "ANSES pendiente",
        nivel: "amarillo" as NivelAlerta,
        concurrenteId: t.concurrente_id,
        modulo: "/transporte",
      }));

    const viandasPendientes: Alerta[] = viandas
      .filter((v) => v.estado !== "anulado" && !v.comprobante_recibido)
      .map((v) => ({
        id: `vi-${v.id}`,
        titulo: `Vianda ${v.fecha || v.mes} · ${v.nombre_concurrente || nombreDe(v.concurrente_id)}`,
        sub: `${v.cantidad} vianda(s) · comprobante sin recibir`,
        chip: "Sin comprobante",
        nivel: "amarillo" as NivelAlerta,
        concurrenteId: v.concurrente_id,
        modulo: "/viandas",
      }));

    const admisionesDemoradas: Alerta[] = admisiones
      .filter((a) => {
        if (a.estado !== "consulta_recibida" || a.fecha_entrevista) return false;
        const dias = diasHasta(a.fecha_solicitud);
        return dias !== null && dias <= -5;
      })
      .map((a) => {
        const dias = Math.abs(diasHasta(a.fecha_solicitud) ?? 0);
        return {
          id: `ad-${a.id}`,
          titulo: a.nombre_contacto || "Consulta sin nombre",
          sub: `${ESTADO_ADMISION_LABEL[a.estado] ?? a.estado} · consulta del ${a.fecha_solicitud ?? "sin fecha"} · sin entrevista programada`,
          chip: `${dias} d sin seguimiento`,
          nivel: (dias > 15 ? "rojo" : "amarillo") as NivelAlerta,
          concurrenteId: a.concurrente_id,
          modulo: "/admisiones",
        };
      });

    const checklistFaltante: Alerta[] = concurrentes
      .filter((c) => c.activo)
      .map((c) => ({ c, r: resumenDocumental(c, docsLegajo, requisitos) }))
      .filter(({ r }) => r.faltantes.length > 0)
      .map(({ c, r }) => ({
        id: `ck-${c.id}`,
        titulo: `${c.apellido || ""} ${c.nombre}`.trim(),
        sub: `Faltan: ${r.faltantes.join(", ")}`,
        chip: `${r.faltantes.length} doc.`,
        nivel: "amarillo" as NivelAlerta,
        concurrenteId: c.id,
        modulo: "/documentacion",
      }));

    return {
      docsVencen,
      checklistFaltante,
      sinRecepcion,
      firmasPendientes,
      demoradas,
      ansesPendientes,
      viandasPendientes,
      admisionesDemoradas,
    };
  }, [documentos, planillas, transportes, viandas, admisiones, concurrentes, docsLegajo, requisitos, nombreDe]);

  const todas = useMemo(() => Object.values(grupos).flat() as Alerta[], [grupos]);
  const total = todas.length;
  const rojas = todas.filter((a) => a.nivel === "rojo").length;

  return { grupos, todas, total, rojas, amarillas: total - rojas };
}
