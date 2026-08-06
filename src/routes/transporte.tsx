import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bus, Plus, Search, Trash2, ClipboardList, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { PlanillaMensual } from "@/components/PlanillaMensual";
import { Panel, Chip, EmptyState, StatCard } from "@/components/ui-kit";
import { Exportar } from "@/components/Exportar";
import { botonPrimario, Segmentado } from "@/components/forms";
import { TransporteForm } from "@/components/kalen/TransporteForm";
import { usePermisos } from "@/hooks/use-permisos";
import { fetchConcurrentes } from "@/lib/api";
import {
  ESTADO_TRASLADO_LABEL,
  TIPO_TRASLADO_LABEL,
  bajaSolicitudTransporte,
  fetchSolicitudesTransporte,
  type EstadoTraslado,
  type SolicitudTransporte,
} from "@/lib/kalen";
import { formatFecha } from "@/lib/format";

export const Route = createFileRoute("/transporte")({
  head: () => ({
    meta: [
      { title: "Transporte — Centro de Día" },
      {
        name: "description",
        content:
          "Solicitudes de traslado por concurrente y admisión, con estado del trámite, recorrido, financiador y planilla mensual del servicio.",
      },
      { property: "og:title", content: "Transporte — Centro de Día" },
      {
        property: "og:description",
        content: "Gestión de solicitudes de traslado y del servicio mensual de transporte de concurrentes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TransportePage,
});

const FILTROS: { value: "todas" | EstadoTraslado; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "solicitado", label: "Solicitadas" },
  { value: "en_gestion", label: "En gestión" },
  { value: "autorizado", label: "Autorizadas" },
  { value: "activo", label: "Activas" },
  { value: "rechazado", label: "Rechazadas" },
  { value: "finalizado", label: "Finalizadas" },
];

const TONO: Record<EstadoTraslado, "default" | "success" | "warning" | "danger" | "info" | "muted"> = {
  solicitado: "info",
  en_gestion: "warning",
  autorizado: "info",
  activo: "success",
  suspendido: "warning",
  rechazado: "danger",
  finalizado: "muted",
};

function TransportePage() {
  const qc = useQueryClient();
  const { puedeEditar, esAdmin, usuarioId } = usePermisos();
  const [abierto, setAbierto] = useState(false);
  const [editar, setEditar] = useState<SolicitudTransporte | null>(null);
  const [filtro, setFiltro] = useState<"todas" | EstadoTraslado>("todas");
  const [busqueda, setBusqueda] = useState("");

  const { data: solicitudes = [] } = useQuery({
    queryKey: ["transporte-solicitudes"],
    queryFn: fetchSolicitudesTransporte,
  });
  const { data: personas = [] } = useQuery({ queryKey: ["concurrentes"], queryFn: fetchConcurrentes });

  const nombre = (id: string | null) => {
    const p = personas.find((x) => x.id === id);
    return p ? `${p.apellido || ""} ${p.nombre}`.trim() : "Sin concurrente";
  };

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return solicitudes.filter((s) => {
      if (filtro !== "todas" && s.estado !== filtro) return false;
      if (!q) return true;
      return [nombre(s.concurrente_id), s.empresa, s.chofer, s.domicilio_origen, s.financiador]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solicitudes, filtro, busqueda, personas]);

  const pendientes = solicitudes.filter((s) => s.estado === "solicitado" || s.estado === "en_gestion").length;
  const activas = solicitudes.filter((s) => s.estado === "activo" || s.estado === "autorizado").length;
  const costo = solicitudes
    .filter((s) => s.estado === "activo")
    .reduce((acc, s) => acc + Number(s.monto_mensual || 0), 0);

  const baja = useMutation({
    mutationFn: (id: string) => bajaSolicitudTransporte(id, usuarioId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transporte-solicitudes"] });
      toast.success("Solicitud dada de baja");
    },
    onError: (e: Error) => toast.error(`No se pudo dar de baja: ${e.message}`),
  });

  return (
    <AppShell title="Transporte" description="Solicitudes de traslado y planilla mensual del servicio">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={ClipboardList} label="Solicitudes" value={solicitudes.length} hint="Registradas y vigentes" />
        <StatCard icon={Clock} label="En trámite" value={pendientes} tone="warning" hint="Solicitadas o en gestión" />
        <StatCard
          icon={CheckCircle2}
          label="Traslados activos"
          value={activas}
          tone="success"
          hint={costo > 0 ? `Costo mensual $${costo.toLocaleString("es-AR")}` : "Sin costo cargado"}
        />
      </div>

      <div className="mt-4">
        <Panel
          title="Solicitudes de traslado"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar…"
                  className="h-8 w-32 rounded-lg border border-input bg-card pl-7 pr-2 text-xs sm:w-48"
                />
              </div>
              <Exportar
                filas={lista.map((s) => ({
                  Concurrente: nombre(s.concurrente_id),
                  Admisión: s.admision_id ?? "",
                  Solicitud: s.fecha_solicitud ?? "",
                  Tipo: TIPO_TRASLADO_LABEL[s.tipo_traslado] ?? s.tipo_traslado,
                  Estado: ESTADO_TRASLADO_LABEL[s.estado] ?? s.estado,
                  Origen: s.domicilio_origen,
                  Destino: s.domicilio_destino,
                  Días: s.dias,
                  Empresa: s.empresa,
                  Financiador: s.financiador,
                  Monto: s.monto_mensual,
                }))}
                nombre="solicitudes-transporte"
              />
              {puedeEditar && (
                <button
                  className={botonPrimario}
                  onClick={() => {
                    setEditar(null);
                    setAbierto(true);
                  }}
                >
                  <Plus className="h-4 w-4" /> Nueva solicitud
                </button>
              )}
            </div>
          }
        >
          <div className="border-b border-border px-4 py-2">
            <Segmentado opciones={FILTROS} value={filtro} onChange={(v) => setFiltro(v)} />
          </div>

          {lista.length === 0 ? (
            <EmptyState
              icon={Bus}
              title="Sin solicitudes de traslado"
              hint="Registrá el pedido de transporte del concurrente y seguí su estado hasta la autorización."
            />
          ) : (
            <ul className="divide-y divide-border">
              {lista.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {nombre(s.concurrente_id)}
                      {s.admision_id ? (
                        <span className="ml-2 text-xs text-muted-foreground">admisión #{s.admision_id}</span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {TIPO_TRASLADO_LABEL[s.tipo_traslado] ?? s.tipo_traslado}
                      {s.dias ? ` · ${s.dias}` : ""}
                      {s.domicilio_origen ? ` · desde ${s.domicilio_origen}` : ""}
                      {s.empresa ? ` · ${s.empresa}` : ""}
                      {s.fecha_solicitud ? ` · solicitado ${formatFecha(s.fecha_solicitud)}` : ""}
                    </p>
                    {s.estado === "rechazado" && s.motivo_rechazo && (
                      <p className="truncate text-xs text-destructive">Motivo: {s.motivo_rechazo}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {s.requiere_acompanante && <Chip tone="info">Acompañante</Chip>}
                    {s.financiador && <Chip>{s.financiador}</Chip>}
                    <Chip tone={TONO[s.estado] ?? "default"}>{ESTADO_TRASLADO_LABEL[s.estado] ?? s.estado}</Chip>
                    {puedeEditar && (
                      <button
                        className="rounded-md px-2 py-1 text-xs text-primary hover:underline"
                        onClick={() => {
                          setEditar(s);
                          setAbierto(true);
                        }}
                      >
                        Abrir
                      </button>
                    )}
                    {esAdmin && (
                      <button
                        className="rounded-md p-1 text-muted-foreground hover:text-destructive"
                        title="Dar de baja"
                        onClick={() => {
                          if (confirm("¿Dar de baja esta solicitud de traslado?")) baja.mutate(s.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <TransporteForm abierto={abierto} onClose={() => setAbierto(false)} inicial={editar} />

      <div className="mt-4">
        <PlanillaMensual tipo="transporte" />
      </div>
    </AppShell>
  );
}
