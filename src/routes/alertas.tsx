import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  FileWarning,
  IdCard,
  Printer,
  PackageCheck,
  Receipt,
  CalendarClock,
  FileX2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, StatCard, EmptyState, Chip } from "@/components/ui-kit";
import { Segmentado } from "@/components/forms";
import { Exportar } from "@/components/Exportar";
import {
  documentosApi,
  eventosApi,
  facturacionApi,
  fetchConcurrentes,
  fetchPlanilla,
  fetchRequisitos,
  lotesApi,
  viandasApi,
  notasApi,
  ESTADOS_PLANILLA,
} from "@/lib/api";
import { resumenDocumental, REQUISITO_CUD, REQUISITO_ANSES } from "@/lib/requisitos";
import { diasHasta, formatFecha, hoyISO, mesActual, nombreMes } from "@/lib/format";

export const Route = createFileRoute("/alertas")({
  head: () => ({
    meta: [
      { title: "Alertas — Centro de Día" },
      {
        name: "description",
        content: "Panel operativo de alertas: CUD por vencer, documentación pendiente y vencida, planillas y facturación.",
      },
      { property: "og:title", content: "Alertas — Centro de Día" },
      { property: "og:description", content: "Indicadores administrativos accionables, actualizados automáticamente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AlertasPage,
});

type Item = { id: string; concurrente: string; detalle: string; referencia: string };

const VISTAS = [
  { value: "cud" as const, label: "CUD por vencer" },
  { value: "pendiente" as const, label: "Doc. pendiente" },
  { value: "vencida" as const, label: "Doc. vencida" },
  { value: "anses" as const, label: "ANSES" },
  { value: "imprimir" as const, label: "A imprimir" },
  { value: "entrega" as const, label: "Impresas sin entregar" },
  { value: "recepcion" as const, label: "Sin recepción" },
  { value: "viandas" as const, label: "Viandas" },
  { value: "notas" as const, label: "Notas urgentes" },
  { value: "facturacion" as const, label: "Facturación" },
  { value: "hoy" as const, label: "Hoy" },
];

function AlertasPage() {
  const [vista, setVista] = useState<(typeof VISTAS)[number]["value"]>("cud");
  const mes = mesActual();

  const { data: personas = [] } = useQuery({ queryKey: ["concurrentes"], queryFn: fetchConcurrentes });
  const { data: docs = [] } = useQuery({ queryKey: ["documentos"], queryFn: documentosApi.list });
  const { data: requisitos = [] } = useQuery({ queryKey: ["requisitos"], queryFn: fetchRequisitos });
  const { data: planilla = [] } = useQuery({ queryKey: ["planilla", mes], queryFn: () => fetchPlanilla(mes) });
  const { data: facturas = [] } = useQuery({ queryKey: ["facturacion"], queryFn: facturacionApi.list });
  const { data: eventos = [] } = useQuery({ queryKey: ["eventos"], queryFn: eventosApi.list });
  const { data: lotes = [] } = useQuery({ queryKey: ["lotes"], queryFn: lotesApi.list });
  const { data: viandas = [] } = useQuery({ queryKey: ["viandas"], queryFn: viandasApi.list });
  const { data: notas = [] } = useQuery({ queryKey: ["notas"], queryFn: notasApi.list });

  const activos = useMemo(() => personas.filter((p) => p.activo), [personas]);

  const grupos = useMemo(() => {
    const cud: Item[] = [];
    const pendiente: Item[] = [];
    const vencida: Item[] = [];
    const anses: Item[] = [];

    for (const p of activos) {
      const r = resumenDocumental(p, docs, requisitos);
      for (const req of r.requisitos) {
        if (req.documento === REQUISITO_CUD && (req.porVencer || req.vencido)) {
          cud.push({
            id: `${p.id}-cud`,
            concurrente: p.nombre,
            detalle: req.vencido ? "CUD vencido" : `CUD vence en ${diasHasta(req.vencimiento)} días`,
            referencia: formatFecha(req.vencimiento),
          });
        }
        if (req.documento === REQUISITO_ANSES && !req.cargado) {
          anses.push({ id: `${p.id}-anses`, concurrente: p.nombre, detalle: "Falta comprobante de ANSES", referencia: p.obra_social });
        }
      }
      if (r.faltantes.length) {
        pendiente.push({
          id: `${p.id}-falta`,
          concurrente: p.nombre,
          detalle: `Faltan: ${r.faltantes.join(", ")}`,
          referencia: p.prestacion || "—",
        });
      }
      if (r.vencidos.length) {
        vencida.push({
          id: `${p.id}-venc`,
          concurrente: p.nombre,
          detalle: `Vencidos: ${r.vencidos.join(", ")}`,
          referencia: p.prestacion || "—",
        });
      }
    }

    const estadoDe = (id: string) => planilla.find((x) => x.concurrente_id === id)?.estados ?? {};
    const imprimir: Item[] = activos
      .filter((p) => !estadoDe(p.id)["impresa"])
      .map((p) => ({ id: `${p.id}-imp`, concurrente: p.nombre, detalle: `Planilla ${nombreMes(mes)} sin imprimir`, referencia: p.prestacion || "—" }));

    const recepcion: Item[] = activos
      .filter((p) => estadoDe(p.id)["entregado"] && !estadoDe(p.id)["recibida"])
      .map((p) => ({ id: `${p.id}-rec`, concurrente: p.nombre, detalle: "Entregada, sin recepción confirmada", referencia: p.obra_social }));

    const lotesPendientes: Item[] = lotes
      .filter((l) => l.fecha_entrega && !l.fecha_recepcion)
      .map((l) => ({ id: l.id, concurrente: `Lote ${l.numero}`, detalle: `Entregado el ${formatFecha(l.fecha_entrega)} sin recepción`, referencia: l.mutual || l.prestacion }));

    const nombrePersona = (id: string | null) => personas.find((p) => p.id === id)?.nombre ?? "General";
    const facturacion: Item[] = facturas
      .filter((f) => f.estado !== "cobrada")
      .map((f) => ({ id: f.id, concurrente: nombrePersona(f.concurrente_id), detalle: `${f.estado} · ${nombreMes(f.mes || mes)}`, referencia: String(f.monto) }));

    const hoy = hoyISO();
    const delDia: Item[] = eventos
      .filter((e) => e.fecha === hoy)
      .map((e) => ({ id: e.id, concurrente: e.titulo, detalle: e.descripcion || e.categoria, referencia: e.hora || "Todo el día" }));

    return {
      cud,
      pendiente,
      vencida,
      anses,
      imprimir,
      recepcion: [...recepcion, ...lotesPendientes],
      facturacion,
      hoy: delDia,
    };
  }, [activos, docs, requisitos, planilla, facturas, eventos, lotes, personas, mes]);

  const lista = grupos[vista];
  const etiqueta = VISTAS.find((v) => v.value === vista)?.label ?? "";

  return (
    <AppShell title="Alertas" description="Pendientes administrativos en tiempo real">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={IdCard} label="CUD por vencer" value={grupos.cud.length} tone="warning" />
        <StatCard icon={FileWarning} label="Documentación pendiente" value={grupos.pendiente.length} tone="warning" />
        <StatCard icon={FileX2} label="Documentación vencida" value={grupos.vencida.length} tone="danger" />
        <StatCard icon={AlertTriangle} label="Recibos ANSES faltantes" value={grupos.anses.length} tone="danger" />
        <StatCard icon={Printer} label="Planillas a imprimir" value={grupos.imprimir.length} tone="info" />
        <StatCard icon={PackageCheck} label="Sin recepción" value={grupos.recepcion.length} tone="warning" />
        <StatCard icon={Receipt} label="Facturación pendiente" value={grupos.facturacion.length} tone="info" />
        <StatCard icon={CalendarClock} label="Eventos de hoy" value={grupos.hoy.length} tone="success" />
      </div>

      <div className="mt-4 space-y-3">
        <Segmentado
          valor={vista}
          opciones={VISTAS}
          onChange={setVista}
          className="flex-wrap"
        />
        <Panel
          title={`${etiqueta} · ${lista.length}`}
          action={
            <Exportar
              filas={lista.map((i) => ({ Registro: i.concurrente, Detalle: i.detalle, Referencia: i.referencia }))}
              nombre={`alertas-${vista}`}
              titulo={etiqueta}
            />
          }
        >
          {lista.length === 0 ? (
            <EmptyState icon={PackageCheck} title="Sin pendientes" hint="No hay registros para esta alerta." />
          ) : (
            <ul className="divide-y divide-border">
              {lista.map((i) => (
                <li key={i.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{i.concurrente}</p>
                    <p className="truncate text-xs text-muted-foreground">{i.detalle}</p>
                  </div>
                  <Chip tone="muted">{i.referencia || "—"}</Chip>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <p className="text-[11px] text-muted-foreground">
          Estados de planilla considerados: {ESTADOS_PLANILLA.map((e) => e.full).join(", ")}.
        </p>
      </div>
    </AppShell>
  );
}
