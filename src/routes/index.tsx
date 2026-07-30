import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  UserMinus,
  FileSpreadsheet,
  Bus,
  CalendarDays,
  FolderOpen,
  Receipt,
  ClipboardList,
  Activity,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { StatCard, Panel, EmptyState, Chip } from "@/components/ui-kit";
import {
  fetchConcurrentes,
  fetchPlanilla,
  fetchHistorial,
  eventosApi,
  documentosApi,
  facturacionApi,
  turnosApi,
  ESTADOS_PLANILLA,
} from "@/lib/api";
import { mesActual, nombreMes, formatFecha, tiempoRelativo, diasHasta, hoyISO } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Inicio — Centro de Día" },
      {
        name: "description",
        content:
          "Panel general con concurrentes activos, prestaciones, transportes, eventos, documentación y facturación del Centro de Día.",
      },
      { property: "og:title", content: "Inicio — Centro de Día" },
      {
        property: "og:description",
        content: "Indicadores en tiempo real de concurrentes, prestaciones, turnos y documentación.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const mes = mesActual();
  const { data: personas = [] } = useQuery({ queryKey: ["concurrentes"], queryFn: fetchConcurrentes });
  const { data: planilla = [] } = useQuery({ queryKey: ["planilla", mes], queryFn: () => fetchPlanilla(mes) });
  const { data: eventos = [] } = useQuery({ queryKey: ["eventos"], queryFn: eventosApi.list });
  const { data: docs = [] } = useQuery({ queryKey: ["documentos"], queryFn: documentosApi.list });
  const { data: facturas = [] } = useQuery({ queryKey: ["facturacion"], queryFn: facturacionApi.list });
  const { data: turnos = [] } = useQuery({ queryKey: ["turnos"], queryFn: turnosApi.list });
  const { data: historial = [] } = useQuery({ queryKey: ["historial"], queryFn: () => fetchHistorial(12) });

  const activos = personas.filter((p) => p.activo);
  const bajas = personas.filter((p) => !p.activo);
  const prestaciones = activos.filter((p) => p.tipo === "prestacion");
  const transportes = activos.filter((p) => p.tipo === "transporte");

  const hoy = hoyISO();
  const proximos = eventos
    .filter((e) => e.fecha >= hoy && e.estado !== "hecho")
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(0, 5);
  const turnosHoy = turnos.filter((t) => t.fecha === hoy);

  const docsVencidos = docs.filter((d) => d.vencimiento && (diasHasta(d.vencimiento) ?? 99) < 0);
  const docsPorVencer = docs.filter((d) => {
    const dias = diasHasta(d.vencimiento);
    return dias !== null && dias >= 0 && dias <= 30;
  });

  const cobrado = facturas.filter((f) => f.estado === "cobrado").reduce((a, f) => a + Number(f.monto), 0);
  const pendienteCobro = facturas
    .filter((f) => f.estado !== "cobrado")
    .reduce((a, f) => a + Number(f.monto), 0);

  const avance = ESTADOS_PLANILLA.map((e) => {
    const total = planilla.filter((p) => p.estados?.[e.key]).length;
    return { ...e, total, pct: activos.length ? Math.round((total / activos.length) * 100) : 0 };
  });

  return (
    <AppShell title="Inicio" description={`Resumen general · ${nombreMes(mes)}`}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Concurrentes activos" value={activos.length} hint={`${personas.length} en total`} tone="info" />
        <StatCard icon={UserMinus} label="Dados de baja" value={bajas.length} hint="Historial conservado" tone="danger" />
        <StatCard icon={FileSpreadsheet} label="Prestaciones" value={prestaciones.length} hint="Concurrentes con prestación" />
        <StatCard icon={Bus} label="Transportes" value={transportes.length} hint="Servicio de transporte" tone="warning" />
        <StatCard icon={CalendarDays} label="Eventos próximos" value={proximos.length} hint={`${turnosHoy.length} turnos hoy`} tone="info" />
        <StatCard
          icon={FolderOpen}
          label="Documentación"
          value={docs.length}
          hint={`${docsVencidos.length} vencidos · ${docsPorVencer.length} por vencer`}
          tone={docsVencidos.length ? "danger" : "success"}
        />
        <StatCard icon={Receipt} label="Facturado cobrado" value={`$${cobrado.toLocaleString("es-AR")}`} hint={`$${pendienteCobro.toLocaleString("es-AR")} pendiente`} tone="success" />
        <StatCard
          icon={ClipboardList}
          label="Planilla del mes"
          value={`${avance[4]?.pct ?? 0}%`}
          hint={`${avance[4]?.total ?? 0} de ${activos.length} cobrados`}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Panel
          title={`Avance de planilla · ${nombreMes(mes)}`}
          className="lg:col-span-2"
          action={
            <Link to="/prestaciones" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Ver planilla <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          <div className="space-y-4 p-4">
            {avance.map((e) => (
              <div key={e.key}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium">{e.full}</span>
                  <span className="text-muted-foreground">
                    {e.total}/{activos.length} · {e.pct}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${e.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Próximas fechas"
          action={
            <Link to="/calendario" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Calendario <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          {proximos.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Sin eventos próximos" hint="Agregá fechas desde el calendario." />
          ) : (
            <ul className="divide-y divide-border">
              {proximos.map((e) => (
                <li key={e.id} className="flex items-start gap-3 px-4 py-3">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-xs font-bold text-accent-foreground">
                    {e.fecha.slice(8, 10)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{e.titulo}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatFecha(e.fecha)} {e.hora && `· ${e.hora}`}
                    </p>
                  </div>
                  {e.prioridad === "alta" && <Chip tone="danger">Alta</Chip>}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Documentación por vencer" className="lg:col-span-1">
          {docsVencidos.length + docsPorVencer.length === 0 ? (
            <EmptyState icon={FolderOpen} title="Todo al día" hint="No hay documentos vencidos ni próximos a vencer." />
          ) : (
            <ul className="divide-y divide-border">
              {[...docsVencidos, ...docsPorVencer].slice(0, 6).map((d) => {
                const dias = diasHasta(d.vencimiento) ?? 0;
                return (
                  <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                    <AlertTriangle className={dias < 0 ? "h-4 w-4 shrink-0 text-destructive" : "h-4 w-4 shrink-0 text-warning"} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{d.nombre}</p>
                      <p className="truncate text-xs text-muted-foreground">{formatFecha(d.vencimiento)}</p>
                    </div>
                    <Chip tone={dias < 0 ? "danger" : "warning"}>{dias < 0 ? "Vencido" : `${dias} d`}</Chip>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel
          title="Últimas actividades"
          className="lg:col-span-2"
          action={<Chip tone="muted">Historial automático</Chip>}
        >
          {historial.length === 0 ? (
            <EmptyState icon={Activity} title="Sin actividad registrada" hint="Las acciones del sistema se registran automáticamente." />
          ) : (
            <ul className="divide-y divide-border">
              {historial.map((h) => (
                <li key={h.id} className="flex items-start gap-3 px-4 py-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{h.detalle || `${h.entidad}: ${h.accion}`}</p>
                    <p className="text-xs text-muted-foreground">{tiempoRelativo(h.created_at)}</p>
                  </div>
                  <Chip tone="muted">{h.entidad}</Chip>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
