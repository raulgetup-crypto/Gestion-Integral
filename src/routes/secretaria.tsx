import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Gauge,
  CalendarClock,
  Boxes,
  Send,
  BookOpen,
  Book,
  PenLine,
  Receipt,
  FolderOpen,
  BarChart3,
  ClipboardCheck,
  ArrowRight,
  FileSpreadsheet,
  AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, StatCard, EmptyState } from "@/components/ui-kit";
import {
  fetchPlanilla,
  cronogramaApi,
  transporteApi,
  viandasApi,
  documentosApi,
  facturacionApi,
} from "@/lib/api";
import { mesActual, nombreMes, hoyISO, diasHasta, moneda } from "@/lib/format";

export const Route = createFileRoute("/secretaria")({
  head: () => ({
    meta: [
      { title: "Secretaría — Centro de Día" },
      {
        name: "description",
        content: "Hub administrativo con acceso rápido a todas las funciones de secretaría.",
      },
    ],
  }),
  component: SecretariaPage,
});

const MODULOS = [
  { to: "/centro-control", label: "Centro de control", icon: Gauge, desc: "Indicadores del mes" },
  { to: "/cronograma", label: "Cronograma", icon: CalendarClock, desc: "Hitos y vencimientos" },
  { to: "/lotes", label: "Lotes", icon: Boxes, desc: "Gestión de lotes" },
  { to: "/envios-mensuales", label: "Envíos mensuales", icon: Send, desc: "Envíos a organismos" },
  { to: "/procedimientos", label: "Procedimientos", icon: BookOpen, desc: "Base de conocimiento" },
  { to: "/glosario", label: "Glosario", icon: Book, desc: "Términos y definiciones" },
  { to: "/firmas", label: "Firmas", icon: PenLine, desc: "Control de firmas" },
  { to: "/facturacion", label: "Facturación", icon: Receipt, desc: "Facturas pendientes" },
  { to: "/documentacion", label: "Documentación", icon: FolderOpen, desc: "Documentos y vencimientos" },
  { to: "/reportes", label: "Reportes", icon: BarChart3, desc: "Reportes e informes" },
  { to: "/informe-mensual", label: "Informe mensual", icon: FileSpreadsheet, desc: "Resumen del mes" },
  { to: "/kanban", label: "Kanban", icon: ClipboardCheck, desc: "Tareas administrativas" },
];

function SecretariaPage() {
  const mes = mesActual();
  const hoy = hoyISO();

  const { data: planilla = [] } = useQuery({
    queryKey: ["planilla", mes],
    queryFn: () => fetchPlanilla(mes),
  });
  const { data: hitos = [] } = useQuery({
    queryKey: ["cronograma"],
    queryFn: cronogramaApi.list,
  });
  const { data: transportes = [] } = useQuery({
    queryKey: ["transporte-servicios"],
    queryFn: transporteApi.list,
  });
  const { data: viandas = [] } = useQuery({
    queryKey: ["viandas"],
    queryFn: viandasApi.list,
  });
  const { data: documentos = [] } = useQuery({
    queryKey: ["documentos"],
    queryFn: documentosApi.list,
  });
  const { data: facturas = [] } = useQuery({
    queryKey: ["facturacion"],
    queryFn: facturacionApi.list,
  });

  const planillasPendientes = planilla.filter((p) => (p.ciclo ?? "pendiente") === "pendiente").length;
  const hitosVencidos = hitos.filter((h) => h.estado !== "cumplido" && h.fecha < hoy).length;
  const hitosProximos = hitos.filter((h) => {
    const d = diasHasta(h.fecha);
    return h.estado !== "cumplido" && d !== null && d >= 0 && d <= 7;
  }).length;
  const transporteSinAnses = transportes.filter((t) => t.mes === mes && !t.comprobante_anses).length;
  const viandasPendientes = viandas.filter((v) => v.mes === mes && v.estado === "pendiente").length;
  const docsVencidos = documentos
    .filter((d) => d.vencimiento)
    .filter((d) => {
      const dias = diasHasta(d.vencimiento);
      return dias !== null && dias < 0;
    }).length;
  const facturasPendientes = facturas.filter((f) => f.estado !== "cobrado").length;

  const indicadores = [
    { label: "Planillas pendientes", value: planillasPendientes, icon: FileSpreadsheet },
    { label: "Hitos vencidos", value: hitosVencidos, icon: CalendarClock },
    { label: "Hitos esta semana", value: hitosProximos, icon: CalendarClock },
    { label: "Transporte sin ANSES", value: transporteSinAnses, icon: Send },
    { label: "Viandas impagas", value: viandasPendientes, icon: Receipt },
    { label: "Docs. vencidos", value: docsVencidos, icon: FolderOpen },
    { label: "Facturas pendientes", value: facturasPendientes, icon: Receipt },
  ];

  return (
    <AppShell title="Secretaría" description={`Resumen administrativo · ${nombreMes(mes)}`}>
      {/* ── Indicadores rápidos ── */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Resumen de {nombreMes(mes)}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {indicadores.map((i) => (
            <StatCard
              key={i.label}
              label={i.label}
              value={String(i.value)}
              icon={i.icon}
              tone={i.value > 0 ? "warning" : "success"}
            />
          ))}
        </div>
      </section>

      {/* ── Módulos de secretaría ── */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Módulos administrativos
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODULOS.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.to}
                to={m.to}
                className="group flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm transition-all hover:bg-accent hover:text-accent-foreground hover:shadow-md"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{m.label}</p>
                  <p className="text-xs text-muted-foreground group-hover:text-accent-foreground/80">
                    {m.desc}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Alerta si hay cosas urgentes ── */}
      {(hitosVencidos > 0 || docsVencidos > 0 || facturasPendientes > 0) && (
        <div className="mt-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Hay {hitosVencidos > 0 ? `${hitosVencidos} hito(s) vencido(s)` : ""}
            {hitosVencidos > 0 && docsVencidos > 0 ? " y " : ""}
            {docsVencidos > 0 ? `${docsVencidos} documento(s) vencido(s)` : ""}
            {(hitosVencidos > 0 || docsVencidos > 0) && facturasPendientes > 0 ? ". También " : ""}
            {facturasPendientes > 0 && hitosVencidos === 0 && docsVencidos === 0
              ? `${facturasPendientes} factura(s) pendiente(s) de cobro.`
              : facturasPendientes > 0
                ? `${facturasPendientes} factura(s) pendiente(s).`
                : "."}
          </span>
        </div>
      )}
    </AppShell>
  );
}
