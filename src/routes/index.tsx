import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  UserPlus,
  UserMinus,
  CalendarClock,
  CalendarDays,
  FolderOpen,
  Receipt,
  ClipboardList,
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
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
  type Concurrente,
} from "@/lib/api";
import { mesActual, nombreMes, formatFecha, tiempoRelativo, diasHasta, hoyISO, moneda } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Inicio — Centro de Día" },
      {
        name: "description",
        content:
          "Panel operativo con concurrentes activos, altas y bajas del mes, vencimientos, eventos de hoy y pendientes de documentación, facturación y planillas.",
      },
      { property: "og:title", content: "Inicio — Centro de Día" },
      {
        property: "og:description",
        content: "Pendientes reales del día: vencimientos, eventos, documentación, facturación y planillas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function ListaPendientes({
  items,
}: {
  items: { id: string; titulo: string; sub: string; chip?: string; tone?: "danger" | "warning" | "muted" | "info"; to?: string; search?: Record<string, string> }[];
}) {
  return (
    <ul className="divide-y divide-border">
      {items.map((i) => {
        const contenido = (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{i.titulo}</p>
              <p className="truncate text-xs text-muted-foreground">{i.sub}</p>
            </div>
            {i.chip && <Chip tone={i.tone ?? "muted"}>{i.chip}</Chip>}
          </>
        );
        return (
          <li key={i.id} className="px-4 py-3">
            {i.to ? (
              <Link to={i.to} search={i.search} className="flex items-center gap-3 text-left hover:opacity-80">
                {contenido}
              </Link>
            ) : (
              <div className="flex items-center gap-3">{contenido}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Dashboard() {
  const mes = mesActual();
  const hoy = hoyISO();

  const { data: personas = [] } = useQuery({ queryKey: ["concurrentes"], queryFn: fetchConcurrentes });
  const { data: planilla = [] } = useQuery({ queryKey: ["planilla", mes], queryFn: () => fetchPlanilla(mes) });
  const { data: eventos = [] } = useQuery({ queryKey: ["eventos"], queryFn: eventosApi.list });
  const { data: docs = [] } = useQuery({ queryKey: ["documentos"], queryFn: documentosApi.list });
  const { data: facturas = [] } = useQuery({ queryKey: ["facturacion"], queryFn: facturacionApi.list });
  const { data: turnos = [] } = useQuery({ queryKey: ["turnos"], queryFn: turnosApi.list });
  const { data: historial = [] } = useQuery({ queryKey: ["historial"], queryFn: () => fetchHistorial(12) });

  const activos = personas.filter((p) => p.activo);
  const porId = new Map<string, Concurrente>(personas.map((p) => [p.id, p]));
  const nombreDe = (id?: string | null) => (id && porId.get(id)?.nombre) || "General";

  /* ---- Altas y bajas del mes ---- */
  const altasMes = personas.filter((p) => (p.created_at || "").slice(0, 7) === mes);
  const bajasMes = personas.filter((p) => !p.activo && (p.fecha_baja || "").slice(0, 7) === mes);
  const bajasTotal = personas.filter((p) => !p.activo);

  /* ---- Vencimientos ---- */
  const conVencimiento = docs
    .filter((d) => d.vencimiento)
    .map((d) => ({ ...d, dias: diasHasta(d.vencimiento) ?? 0 }))
    .sort((a, b) => a.dias - b.dias);
  const vencidos = conVencimiento.filter((d) => d.dias < 0);
  const porVencer = conVencimiento.filter((d) => d.dias >= 0 && d.dias <= 30);

  /* ---- Hoy ---- */
  const eventosHoy = eventos.filter((e) => e.fecha === hoy && e.estado !== "hecho");
  const turnosHoy = turnos.filter((t) => t.fecha === hoy && t.estado !== "cancelado");
  const agendaHoy = [
    ...turnosHoy.map((t) => ({ id: `t-${t.id}`, hora: t.hora || "", titulo: t.nombre, sub: `Turno · ${t.tipo}` })),
    ...eventosHoy.map((e) => ({ id: `e-${e.id}`, hora: e.hora || "", titulo: e.titulo, sub: `Evento · ${e.categoria}` })),
  ].sort((a, b) => a.hora.localeCompare(b.hora));

  /* ---- Documentación pendiente: activos sin ningún documento cargado ---- */
  const conDocs = new Set(docs.map((d) => d.concurrente_id).filter(Boolean) as string[]);
  const sinDocumentacion = activos.filter((p) => !conDocs.has(p.id));
  const docsPendientes = sinDocumentacion.length + vencidos.length;

  /* ---- Facturación pendiente ---- */
  const facturasPendientes = facturas.filter((f) => f.estado !== "cobrado");
  const montoPendiente = facturasPendientes.reduce((a, f) => a + Number(f.monto || 0), 0);

  /* ---- Planillas pendientes: activos sin el circuito completo del mes ---- */
  const estadoPlanilla = new Map(planilla.map((p) => [p.concurrente_id, p.estados || {}]));
  const planillasPendientes = activos.filter((p) => {
    const e = estadoPlanilla.get(p.id) || {};
    return !ESTADOS_PLANILLA.every((s) => e[s.key]);
  });
  const avance = ESTADOS_PLANILLA.map((e) => {
    const total = activos.filter((p) => (estadoPlanilla.get(p.id) || {})[e.key]).length;
    return { ...e, total, pct: activos.length ? Math.round((total / activos.length) * 100) : 0 };
  });

  return (
    <AppShell title="Inicio" description={`Pendientes y actividad · ${nombreMes(mes)}`}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Concurrentes activos" value={activos.length} hint={`${personas.length} en total`} tone="info" />
        <StatCard icon={UserPlus} label="Altas del mes" value={altasMes.length} hint={nombreMes(mes)} tone="success" />
        <StatCard icon={UserMinus} label="Bajas del mes" value={bajasMes.length} hint={`${bajasTotal.length} bajas históricas`} tone="danger" />
        <StatCard
          icon={CalendarClock}
          label="Próximos vencimientos"
          value={porVencer.length + vencidos.length}
          hint={`${vencidos.length} vencidos · ${porVencer.length} en 30 días`}
          tone={vencidos.length ? "danger" : porVencer.length ? "warning" : "success"}
        />
        <StatCard
          icon={CalendarDays}
          label="Eventos de hoy"
          value={agendaHoy.length}
          hint={`${turnosHoy.length} turnos · ${eventosHoy.length} eventos`}
          tone="info"
        />
        <StatCard
          icon={FolderOpen}
          label="Documentación pendiente"
          value={docsPendientes}
          hint={`${sinDocumentacion.length} sin legajo · ${vencidos.length} vencidos`}
          tone={docsPendientes ? "warning" : "success"}
        />
        <StatCard
          icon={Receipt}
          label="Facturación pendiente"
          value={facturasPendientes.length}
          hint={moneda(montoPendiente)}
          tone={facturasPendientes.length ? "warning" : "success"}
        />
        <StatCard
          icon={ClipboardList}
          label="Planillas pendientes"
          value={planillasPendientes.length}
          hint={`de ${activos.length} activos · ${nombreMes(mes)}`}
          tone={planillasPendientes.length ? "warning" : "success"}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel
          title="Agenda de hoy"
          action={
            <Link to="/calendario" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Calendario <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          {agendaHoy.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Sin actividades para hoy" hint="No hay turnos ni eventos agendados." />
          ) : (
            <ul className="divide-y divide-border">
              {agendaHoy.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="grid h-9 w-14 shrink-0 place-items-center rounded-lg bg-accent text-xs font-bold text-accent-foreground">
                    {a.hora || "—"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.titulo}</p>
                    <p className="truncate text-xs text-muted-foreground">{a.sub}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Próximos vencimientos"
          action={
            <Link to="/documentacion" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Documentación <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          {vencidos.length + porVencer.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Todo al día" hint="No hay documentos vencidos ni próximos a vencer." />
          ) : (
            <ListaPendientes
              items={[...vencidos, ...porVencer].slice(0, 7).map((d) => ({
                id: d.id,
                titulo: d.nombre,
                sub: `${nombreDe(d.concurrente_id)} · vence ${formatFecha(d.vencimiento)}`,
                chip: d.dias < 0 ? `Vencido ${Math.abs(d.dias)} d` : `${d.dias} d`,
                tone: d.dias < 0 ? "danger" : "warning",
              }))}
            />
          )}
        </Panel>

        <Panel
          title="Documentación pendiente"
          action={
            <Link to="/documentacion" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Cargar <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          {sinDocumentacion.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Legajos completos" hint="Todos los activos tienen documentación cargada." />
          ) : (
            <ListaPendientes
              items={sinDocumentacion.slice(0, 7).map((p) => ({
                id: p.id,
                titulo: p.nombre,
                sub: [p.prestacion, p.obra_social].filter(Boolean).join(" · ") || "Sin datos",
                chip: "Sin legajo",
                tone: "warning",
                to: "/concurrentes",
                search: { id: p.id },
              }))}
            />
          )}
        </Panel>

        <Panel
          title="Facturación pendiente"
          action={
            <Link to="/facturacion" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Facturación <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          {facturasPendientes.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Sin pendientes" hint="No hay facturas por emitir ni por cobrar." />
          ) : (
            <ListaPendientes
              items={facturasPendientes.slice(0, 7).map((f) => ({
                id: f.id,
                titulo: nombreDe(f.concurrente_id),
                sub: `${nombreMes(f.mes)} · ${moneda(Number(f.monto || 0))}`,
                chip: f.estado,
                tone: f.estado === "pendiente" ? "warning" : "info",
              }))}
            />
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel
          title={`Planillas pendientes · ${nombreMes(mes)}`}
          className="lg:col-span-2"
          action={
            <Link to="/prestaciones" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Ver planilla <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          <div className="space-y-4 border-b border-border p-4">
            {avance.map((e) => (
              <div key={e.key}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium">{e.full}</span>
                  <span className="text-muted-foreground">
                    faltan {activos.length - e.total} · {e.pct}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${e.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          {planillasPendientes.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Circuito completo" hint="Todos los activos tienen la planilla del mes cerrada." />
          ) : (
            <ListaPendientes
              items={planillasPendientes.slice(0, 6).map((p) => {
                const e = estadoPlanilla.get(p.id) || {};
                const falta = ESTADOS_PLANILLA.filter((s) => !e[s.key]).map((s) => s.full);
                return {
                  id: p.id,
                  titulo: p.nombre,
                  sub: `Falta: ${falta.join(", ")}`,
                  chip: `${ESTADOS_PLANILLA.length - falta.length}/${ESTADOS_PLANILLA.length}`,
                  tone: "warning" as const,
                };
              })}
            />
          )}
        </Panel>

        <Panel title="Últimas actividades" action={<Chip tone="muted">Automático</Chip>}>
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
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {(vencidos.length > 0 || facturasPendientes.length > 0) && (
        <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5 text-warning" />
          Los pendientes se recalculan automáticamente con cada cambio guardado.
        </p>
      )}
    </AppShell>
  );
}
