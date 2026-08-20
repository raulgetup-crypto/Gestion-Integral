import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Plus, FileText, CheckCircle2, Clock } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, EmptyState, Chip, StatCard } from "@/components/ui-kit";
import { botonPrimario, campo } from "@/components/forms";
import { PlanillaForm } from "@/components/kalen/PlanillaForm";
import { fetchConcurrentes, type Concurrente } from "@/lib/api";
import {
  ESTADOS_RECEPCION,
  ESTADO_FIRMA_LABEL,
  ESTADO_RECEPCION_LABEL,
  diasHasta,
  fetchPlanillas,
  fetchTiposVencimiento,
  type Planilla,
} from "@/lib/kalen";
import { formatFecha } from "@/lib/format";
import { usePermisos } from "@/hooks/use-permisos";

export const Route = createFileRoute("/planillas")({
  head: () => ({
    meta: [
      { title: "Planillas y vencimientos — Kalen" },
      {
        name: "description",
        content:
          "Circuito de planillas: período, fecha límite automática, ubicación, estado de firma y recepción en término.",
      },
      { property: "og:title", content: "Planillas y vencimientos — Kalen" },
      { property: "og:description", content: "Vencimientos, firmas y recepciones bajo control en una sola pantalla." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlanillasPage,
});

const tonoRecepcion = (e: Planilla["estado_recepcion"]) =>
  e === "aprobada" || e === "recibida_termino"
    ? "success"
    : e === "recibida_fuera_termino" || e === "con_observaciones"
      ? "danger"
      : "warning";

function PlanillasPage() {
  const { puedeEditar } = usePermisos();
  const { data: planillas = [], isLoading } = useQuery({ queryKey: ["planillas"], queryFn: fetchPlanillas });
  const { data: concurrentes = [] } = useQuery({ queryKey: ["concurrentes"], queryFn: fetchConcurrentes });
  const { data: tipos = [] } = useQuery({ queryKey: ["tipos-vencimiento"], queryFn: fetchTiposVencimiento });

  const [filtro, setFiltro] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [inicial, setInicial] = useState<Planilla | null>(null);

  const nombre = useMemo(() => {
    const m = new Map(concurrentes.map((c) => [c.id, `${c.apellido || ""} ${c.nombre}`.trim()]));
    return (id: string) => m.get(id) ?? "—";
  }, [concurrentes]);

  const tipoNombre = useMemo(() => {
    const m = new Map(tipos.map((t) => [t.id, t.nombre]));
    return (id: number | null) => (id ? (m.get(id) ?? "—") : "—");
  }, [tipos]);

  const esPlanillaApross = (p: Planilla) => p.tipo_vencimiento_id === 1;

  const periodoActual = useMemo(() => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const aprossStats = useMemo(() => {
    const delPeriodo = planillas.filter((p) => (p.periodo ?? "").slice(0, 7) === periodoActual && esPlanillaApross(p));
    const enviadas = delPeriodo.filter((p) => p.validacion_aprossy_enviada).length;
    return {
      total: delPeriodo.length,
      enviadas,
      pendientes: delPeriodo.length - enviadas,
    };
  }, [planillas, periodoActual]);

  const lista = useMemo(
    () => (filtro ? planillas.filter((p) => p.estado_recepcion === filtro) : planillas),
    [planillas, filtro],
  );

  return (
    <AppShell
      title="Planillas"
      description={`${lista.length} planilla(s) · circuito de vencimiento y firmas`}
      actions={
        puedeEditar ? (
          <button
            className={botonPrimario}
            onClick={() => {
              setInicial(null);
              setAbierto(true);
            }}
          >
            <Plus className="h-4 w-4" /> Nueva planilla
          </button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            icon={FileText}
            label="APROSS período actual"
            value={aprossStats.total}
            hint={`${periodoActual} · APROSS Mensual`}
            tone="default"
          />
          <StatCard
            icon={CheckCircle2}
            label="Validación enviada"
            value={aprossStats.enviadas}
            hint="validacion_aprossy_enviada = true"
            tone="success"
          />
          <StatCard
            icon={Clock}
            label="Pendiente de validación"
            value={aprossStats.pendientes}
            hint="validacion_aprossy_enviada = false"
            tone={aprossStats.pendientes > 0 ? "warning" : "success"}
          />
        </div>

        <select className={`${campo} sm:max-w-xs`} value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="">Todos los estados de recepción</option>
          {ESTADOS_RECEPCION.map((e) => (
            <option key={e} value={e}>
              {ESTADO_RECEPCION_LABEL[e]}
            </option>
          ))}
        </select>

        <Panel title="Circuito de planillas">
          {isLoading ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Cargando…</p>
          ) : lista.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Sin planillas" hint="Creá la primera planilla del período." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">Concurrente</th>
                    <th className="px-4 py-2">Tipo / período</th>
                    <th className="px-4 py-2">Límite</th>
                    <th className="px-4 py-2">Ubicación</th>
                    <th className="px-4 py-2">Firma</th>
                    <th className="px-4 py-2">Recepción</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {lista.map((p) => {
                    const dias = p.estado_recepcion === "pendiente" ? diasHasta(p.fecha_limite) : null;
                    return (
                      <tr key={p.id} className="border-t border-border hover:bg-accent/40">
                        <td className="px-4 py-2 font-medium">{nombre(p.concurrente_id)}</td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {tipoNombre(p.tipo_vencimiento_id)}
                          <span className="block text-xs">{p.periodo?.slice(0, 7) ?? "—"}</span>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {p.fecha_limite ? formatFecha(p.fecha_limite) : "—"}
                          {dias !== null && (
                            <span className={`block text-xs ${dias < 0 ? "text-destructive" : ""}`}>
                              {dias < 0 ? `vencida hace ${Math.abs(dias)} d` : `faltan ${dias} d`}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">{p.ubicacion_actual}</td>
                        <td className="px-4 py-2">
                          <Chip tone={p.estado_firma === "firmada" ? "success" : "muted"}>
                            {ESTADO_FIRMA_LABEL[p.estado_firma]}
                          </Chip>
                          {p.validacion_aprossy_enviada && (
                            <span className="mt-1 block text-xs text-muted-foreground">
                              Validación enviada
                              {p.fecha_validacion_aprossy ? ` · ${formatFecha(p.fecha_validacion_aprossy)}` : ""}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <Chip tone={tonoRecepcion(p.estado_recepcion)}>
                            {ESTADO_RECEPCION_LABEL[p.estado_recepcion]}
                          </Chip>
                        </td>
                        <td className="px-4 py-2 text-right">
                          {puedeEditar ? (
                            <button
                              className="text-xs font-medium text-primary hover:underline"
                              onClick={() => {
                                setInicial(p);
                                setAbierto(true);
                              }}
                            >
                              Editar
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Solo lectura</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <PlanillaForm abierto={abierto} onClose={() => setAbierto(false)} inicial={inicial} />
    </AppShell>
  );
}
