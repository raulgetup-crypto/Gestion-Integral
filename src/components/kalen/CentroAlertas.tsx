import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ClipboardList,
  PenLine,
  Clock,
  Bus,
  UtensilsCrossed,
  UserPlus,
  FileWarning,
  CheckCircle2,
} from "lucide-react";
import { Panel, Chip, EmptyState, StatCard } from "@/components/ui-kit";
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

type Tone = "danger" | "warning" | "info" | "muted";

type Alerta = {
  id: string;
  titulo: string;
  sub: string;
  chip: string;
  tone: Tone;
  concurrenteId: string | null;
  /** Destino alternativo cuando la alerta no corresponde a un concurrente puntual. */
  modulo?: string;
};

function Fila({ a }: { a: Alerta }) {
  const contenido = (
    <>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{a.titulo}</p>
        <p className="truncate text-xs text-muted-foreground">{a.sub}</p>
      </div>
      <Chip tone={a.tone}>{a.chip}</Chip>
    </>
  );
  const clase = "flex items-center gap-3 px-4 py-3 hover:bg-accent/40";
  return (
    <li>
      {a.concurrenteId ? (
        <Link to="/vista-360" search={{ id: a.concurrenteId }} className={clase}>
          {contenido}
        </Link>
      ) : (
        <Link to={a.modulo ?? "/alertas"} className={clase}>
          {contenido}
        </Link>
      )}
    </li>
  );
}

function Bloque({
  titulo,
  icono: Icono,
  alertas,
  modulo,
}: {
  titulo: string;
  icono: typeof AlertTriangle;
  alertas: Alerta[];
  modulo?: string;
}) {
  const [verTodo, setVerTodo] = useState(false);
  const visibles = verTodo ? alertas : alertas.slice(0, 6);
  return (
    <Panel
      title={`${titulo} · ${alertas.length}`}
      action={
        modulo ? (
          <Link to={modulo} className="text-xs font-medium text-primary hover:underline">
            Ir al módulo
          </Link>
        ) : undefined
      }
    >
      {alertas.length === 0 ? (
        <EmptyState icon={Icono} title="Sin pendientes" />
      ) : (
        <>
          <ul className="divide-y divide-border">
            {visibles.map((a) => (
              <Fila key={a.id} a={a} />
            ))}
          </ul>
          {alertas.length > 6 && (
            <button
              type="button"
              onClick={() => setVerTodo((v) => !v)}
              className="w-full border-t border-border px-4 py-2 text-xs font-medium text-primary hover:bg-accent/40"
            >
              {verTodo ? "Ver menos" : `Ver las ${alertas.length}`}
            </button>
          )}
        </>
      )}
    </Panel>
  );
}

const periodoDe = (p: Planilla) => p.periodo?.slice(0, 7) ?? "sin período";

export function CentroAlertas() {
  const { data: concurrentes = [] } = useQuery({ queryKey: ["concurrentes"], queryFn: fetchConcurrentes });
  const { data: documentos = [] } = useQuery({ queryKey: ["documentos-kalen"], queryFn: fetchDocumentosKalen });
  const { data: planillas = [] } = useQuery({ queryKey: ["planillas"], queryFn: fetchPlanillas });
  const { data: admisiones = [] } = useQuery({ queryKey: ["admisiones"], queryFn: fetchAdmisiones });
  const { data: transportes = [] } = useQuery({ queryKey: ["transporte"], queryFn: transporteApi.list });
  const { data: viandas = [] } = useQuery({ queryKey: ["viandas"], queryFn: viandasApi.list });
  const { data: docsLegajo = [] } = useQuery({ queryKey: ["documentos"], queryFn: documentosApi.list });
  const { data: requisitos = [] } = useQuery({ queryKey: ["requisitos"], queryFn: fetchRequisitos });

  const nombreDe = useMemo(() => {
    const map = new Map(concurrentes.map((c) => [c.id, `${c.apellido || ""} ${c.nombre}`.trim()]));
    return (id: string | null) => (id && map.get(id)) || "Sin concurrente";
  }, [concurrentes]);

  const grupos = useMemo(() => {
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
          chip: dias < 0 ? `Vencido hace ${Math.abs(dias)} d` : `Vence en ${dias} d`,
          tone: (dias < 0 ? "danger" : "warning") as Tone,
          concurrenteId: d.concurrente_id,
          modulo: "/documentacion",
        };
      })
      .sort((a, b) => a.titulo.localeCompare(b.titulo));

    const sinRecepcion: Alerta[] = planillas
      .filter((p) => !p.fecha_recepcion)
      .map((p) => ({
        id: `pl-${p.id}`,
        titulo: `Planilla ${periodoDe(p)} · ${nombreDe(p.concurrente_id)}`,
        sub: `Límite: ${p.fecha_limite ?? "sin fecha"} · ${p.ubicacion_actual}`,
        chip: "Sin recepción",
        tone: "warning" as Tone,
        concurrenteId: p.concurrente_id,
        modulo: "/planillas",
      }));

    const firmasPendientes: Alerta[] = planillas
      .filter((p) => p.estado_firma === "pendiente_firma")
      .map((p) => ({
        id: `fi-${p.id}`,
        titulo: `Planilla ${periodoDe(p)} · ${nombreDe(p.concurrente_id)}`,
        sub: `${ESTADO_FIRMA_LABEL[p.estado_firma]} · ${p.responsable || "sin responsable"}`,
        chip: "Firma pendiente",
        tone: "info" as Tone,
        concurrenteId: p.concurrente_id,
        modulo: "/firmas",
      }));

    const demoradas: Alerta[] = planillas
      .filter((p) => p.estado_recepcion === "recibida_fuera_termino" || p.motivo_demora?.trim())
      .map((p) => ({
        id: `de-${p.id}`,
        titulo: `Planilla ${periodoDe(p)} · ${nombreDe(p.concurrente_id)}`,
        sub: p.motivo_demora || "Sin motivo cargado",
        chip: "Demorada",
        tone: "danger" as Tone,
        concurrenteId: p.concurrente_id,
        modulo: "/planillas",
      }));

    const ansesPendientes: Alerta[] = transportes
      .filter((t) => t.estado !== "finalizado" && !t.comprobante_anses)
      .map((t) => ({
        id: `an-${t.id}`,
        titulo: `Transporte ${t.mes || "sin mes"} · ${nombreDe(t.concurrente_id)}`,
        sub: `${t.empresa || "Sin empresa"} · comprobante ANSES pendiente`,
        chip: "ANSES pendiente",
        tone: "warning" as Tone,
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
        tone: "warning" as Tone,
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
          titulo: `${a.nombre_contacto || "Consulta sin nombre"}`,
          sub: `${ESTADO_ADMISION_LABEL[a.estado] ?? a.estado} · sin entrevista programada`,
          chip: `Hace ${dias} d`,
          tone: "danger" as Tone,
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
        tone: "info" as Tone,
        concurrenteId: c.id,
        modulo: "/documentacion",
      }));

    return {
      docsVencen,
      sinRecepcion,
      firmasPendientes,
      demoradas,
      ansesPendientes,
      viandasPendientes,
      admisionesDemoradas,
      checklistFaltante,
    };
  }, [documentos, planillas, transportes, viandas, admisiones, concurrentes, docsLegajo, requisitos, nombreDe]);

  const criticas =
    grupos.docsVencen.filter((a) => a.tone === "danger").length +
    grupos.demoradas.length +
    grupos.admisionesDemoradas.length;
  const total =
    grupos.docsVencen.length +
    grupos.sinRecepcion.length +
    grupos.firmasPendientes.length +
    grupos.demoradas.length +
    grupos.ansesPendientes.length +
    grupos.viandasPendientes.length +
    grupos.admisionesDemoradas.length +
    grupos.checklistFaltante.length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={AlertTriangle} label="Alertas totales" value={total} tone={total ? "warning" : "muted"} />
        <StatCard icon={FileWarning} label="Críticas" value={criticas} tone={criticas ? "danger" : "muted"} />
        <StatCard icon={ClipboardList} label="Planillas pendientes" value={grupos.sinRecepcion.length + grupos.firmasPendientes.length} tone="info" />
        <StatCard
          icon={CheckCircle2}
          label="Comprobantes pendientes"
          value={grupos.ansesPendientes.length + grupos.viandasPendientes.length}
          tone="warning"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Bloque titulo="Documentos por vencer o vencidos" icono={AlertTriangle} alertas={grupos.docsVencen} modulo="/documentacion" />
        <Bloque titulo="Documentación requerida faltante" icono={FileWarning} alertas={grupos.checklistFaltante} modulo="/documentacion" />
        <Bloque titulo="Planillas pendientes de recepción" icono={ClipboardList} alertas={grupos.sinRecepcion} modulo="/planillas" />
        <Bloque titulo="Firmas pendientes" icono={PenLine} alertas={grupos.firmasPendientes} modulo="/firmas" />
        <Bloque titulo="Planillas con demora justificada" icono={Clock} alertas={grupos.demoradas} modulo="/planillas" />
        <Bloque titulo="Comprobantes ANSES pendientes" icono={Bus} alertas={grupos.ansesPendientes} modulo="/transporte" />
        <Bloque titulo="Comprobantes de viandas pendientes" icono={UtensilsCrossed} alertas={grupos.viandasPendientes} modulo="/viandas" />
        <Bloque titulo="Admisiones sin entrevista (+5 días)" icono={UserPlus} alertas={grupos.admisionesDemoradas} modulo="/admisiones" />
      </div>
    </div>
  );
}
