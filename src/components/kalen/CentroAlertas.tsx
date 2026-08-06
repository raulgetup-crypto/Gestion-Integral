import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ClipboardList, PenLine, Clock } from "lucide-react";
import { Panel, Chip, EmptyState } from "@/components/ui-kit";
import { fetchConcurrentes } from "@/lib/api";
import {
  diasHasta,
  fetchDocumentosKalen,
  fetchPlanillas,
  ESTADO_FIRMA_LABEL,
  type Planilla,
} from "@/lib/kalen";

type Alerta = {
  id: string;
  titulo: string;
  sub: string;
  chip: string;
  tone: "danger" | "warning" | "info" | "muted";
  concurrenteId: string | null;
};

function Bloque({ titulo, icono: Icono, alertas }: { titulo: string; icono: typeof AlertTriangle; alertas: Alerta[] }) {
  return (
    <Panel title={`${titulo} · ${alertas.length}`}>
      {alertas.length === 0 ? (
        <EmptyState icon={Icono} title="Sin pendientes" />
      ) : (
        <ul className="divide-y divide-border">
          {alertas.map((a) => (
            <li key={a.id}>
              <Link
                to="/vista-360"
                search={{ id: a.concurrenteId ?? "" }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.titulo}</p>
                  <p className="truncate text-xs text-muted-foreground">{a.sub}</p>
                </div>
                <Chip tone={a.tone}>{a.chip}</Chip>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

const periodoDe = (p: Planilla) => p.periodo?.slice(0, 7) ?? "sin período";

export function CentroAlertas() {
  const { data: concurrentes = [] } = useQuery({ queryKey: ["concurrentes"], queryFn: fetchConcurrentes });
  const { data: documentos = [] } = useQuery({ queryKey: ["documentos-kalen"], queryFn: fetchDocumentosKalen });
  const { data: planillas = [] } = useQuery({ queryKey: ["planillas"], queryFn: fetchPlanillas });

  const nombreDe = useMemo(() => {
    const map = new Map(concurrentes.map((c) => [c.id, `${c.apellido || ""} ${c.nombre}`.trim()]));
    return (id: string | null) => (id && map.get(id)) || "Sin concurrente";
  }, [concurrentes]);

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
        tone: dias < 0 ? ("danger" as const) : ("warning" as const),
        concurrenteId: d.concurrente_id,
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
      tone: "warning" as const,
      concurrenteId: p.concurrente_id,
    }));

  const firmasPendientes: Alerta[] = planillas
    .filter((p) => p.estado_firma === "pendiente_firma")
    .map((p) => ({
      id: `fi-${p.id}`,
      titulo: `Planilla ${periodoDe(p)} · ${nombreDe(p.concurrente_id)}`,
      sub: `${ESTADO_FIRMA_LABEL[p.estado_firma]} · ${p.responsable || "sin responsable"}`,
      chip: "Firma pendiente",
      tone: "info" as const,
      concurrenteId: p.concurrente_id,
    }));

  const demoradas: Alerta[] = planillas
    .filter((p) => p.estado_recepcion === "recibida_fuera_termino" || p.motivo_demora?.trim())
    .map((p) => ({
      id: `de-${p.id}`,
      titulo: `Planilla ${periodoDe(p)} · ${nombreDe(p.concurrente_id)}`,
      sub: p.motivo_demora || "Sin motivo cargado",
      chip: "Demorada",
      tone: "danger" as const,
      concurrenteId: p.concurrente_id,
    }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Bloque titulo="Documentos por vencer o vencidos" icono={AlertTriangle} alertas={docsVencen} />
      <Bloque titulo="Planillas pendientes de recepción" icono={ClipboardList} alertas={sinRecepcion} />
      <Bloque titulo="Firmas pendientes" icono={PenLine} alertas={firmasPendientes} />
      <Bloque titulo="Planillas con demora justificada" icono={Clock} alertas={demoradas} />
    </div>
  );
}
