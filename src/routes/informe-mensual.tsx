import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer, UserPlus, FolderOpen, ClipboardList, UtensilsCrossed } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, StatCard } from "@/components/ui-kit";
import { campo, botonSecundario } from "@/components/forms";
import { fetchConcurrentes } from "@/lib/api";
import {
  diasHasta,
  fetchAdmisiones,
  fetchDocumentosKalen,
  fetchPlanillas,
  fetchSedes,
} from "@/lib/kalen";

export const Route = createFileRoute("/informe-mensual")({
  head: () => ({
    meta: [
      { title: "Informe mensual de gestión — Kalen" },
      {
        name: "description",
        content:
          "Resumen mensual por sede de admisiones, documentación, planillas y viandas para la reunión de gestión.",
      },
      { property: "og:title", content: "Informe mensual de gestión — Kalen" },
      { property: "og:description", content: "Indicadores del mes: admisiones, documentos, planillas y viandas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InformeMensualPage,
});

const mesHoy = () => new Date().toISOString().slice(0, 7);

function Fila({ label, value }: { label: string; value: number | string }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5">
      <span className="truncate text-sm">{label}</span>
      <span className="shrink-0 text-sm font-semibold tabular-nums">{value}</span>
    </li>
  );
}

function InformeMensualPage() {
  const [mes, setMes] = useState(mesHoy());
  const [sedeId, setSedeId] = useState<string>("");

  const { data: sedes = [] } = useQuery({ queryKey: ["sedes"], queryFn: fetchSedes, staleTime: 300_000 });
  const { data: concurrentes = [] } = useQuery({ queryKey: ["concurrentes"], queryFn: fetchConcurrentes });
  const { data: admisiones = [] } = useQuery({ queryKey: ["admisiones"], queryFn: fetchAdmisiones });
  const { data: documentos = [] } = useQuery({ queryKey: ["documentos-kalen"], queryFn: fetchDocumentosKalen });
  const { data: planillas = [] } = useQuery({ queryKey: ["planillas"], queryFn: fetchPlanillas });

  const sedeDe = useMemo(() => {
    const map = new Map(
      (concurrentes as ({ id: string; sede_id?: number | null })[]).map((c) => [c.id, c.sede_id ?? null]),
    );
    return (id: string | null) => (id ? (map.get(id) ?? null) : null);
  }, [concurrentes]);

  const enSede = (sede: number | null) => !sedeId || String(sede ?? "") === sedeId;

  const adms = admisiones.filter(
    (a) => (a.fecha_solicitud ?? a.created_at).slice(0, 7) === mes && enSede(a.sede_id),
  );
  const docs = documentos.filter(
    (d) => (d.fecha_solicitud ?? d.created_at).slice(0, 7) === mes && enSede(sedeDe(d.concurrente_id)),
  );
  const plans = planillas.filter(
    (p) => (p.periodo ?? p.created_at).slice(0, 7) === mes && enSede(sedeDe(p.concurrente_id)),
  );

  const admision = {
    contactos: adms.length,
    entrevistas: adms.filter((a) => a.estado === "entrevista_realizada" || a.fecha_entrevista).length,
    ingresos: adms.filter((a) => a.estado === "admitido").length,
    noIngresos: adms.filter((a) => a.estado === "no_ingreso").length,
  };

  const documentacion = {
    completa: docs.filter((d) => d.estado === "completo").length,
    pendiente: docs.filter((d) => d.estado === "pendiente" || d.estado === "en_revision").length,
    vencida: docs.filter((d) => d.estado === "vencido" || (diasHasta(d.fecha_vencimiento) ?? 1) < 0).length,
  };

  const planillasRes = {
    total: plans.length,
    enTermino: plans.filter((p) => p.estado_recepcion === "recibida_termino" || p.estado_recepcion === "aprobada").length,
    fueraTermino: plans.filter((p) => p.estado_recepcion === "recibida_fuera_termino").length,
    firmasPendientes: plans.filter((p) => p.estado_firma === "pendiente_firma").length,
  };

  return (
    <AppShell
      title="Informe mensual de gestión"
      description="Resumen por mes y sede para la reunión de coordinación"
      actions={
        <button className={botonSecundario} onClick={() => window.print()} type="button">
          <Printer className="h-4 w-4" /> Descargar resumen
        </button>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:max-w-xl">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Mes</span>
            <input type="month" className={campo} value={mes} onChange={(e) => setMes(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Sede</span>
            <select className={campo} value={sedeId} onChange={(e) => setSedeId(e.target.value)}>
              <option value="">Todas las sedes</option>
              {sedes.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={UserPlus} label="Contactos de admisión" value={admision.contactos} tone="info" />
          <StatCard icon={FolderOpen} label="Documentos del mes" value={docs.length} tone="success" />
          <StatCard icon={ClipboardList} label="Planillas del período" value={planillasRes.total} tone="warning" />
          <StatCard
            icon={UtensilsCrossed}
            label="Viandas (referencial)"
            value="—"
            hint="Módulo en integración"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Admisiones">
            <ul className="divide-y divide-border">
              <Fila label="Total de contactos" value={admision.contactos} />
              <Fila label="Entrevistas realizadas" value={admision.entrevistas} />
              <Fila label="Ingresos confirmados" value={admision.ingresos} />
              <Fila label="No ingresos" value={admision.noIngresos} />
            </ul>
          </Panel>

          <Panel title="Documentación">
            <ul className="divide-y divide-border">
              <Fila label="Completada" value={documentacion.completa} />
              <Fila label="Pendiente / en revisión" value={documentacion.pendiente} />
              <Fila label="Vencida" value={documentacion.vencida} />
            </ul>
          </Panel>

          <Panel title="Planillas">
            <ul className="divide-y divide-border">
              <Fila label="Total del período" value={planillasRes.total} />
              <Fila label="Recibidas en término" value={planillasRes.enTermino} />
              <Fila label="Recibidas fuera de término" value={planillasRes.fueraTermino} />
              <Fila label="Firmas pendientes" value={planillasRes.firmasPendientes} />
            </ul>
          </Panel>

          <Panel title="Viandas (placeholder)">
            <ul className="divide-y divide-border">
              <Fila label="Viandas consumidas" value="—" />
              <Fila label="Comprobantes recibidos" value="—" />
              <Fila label="Pendientes de pago" value="—" />
            </ul>
            <p className="px-4 pb-3 text-xs text-muted-foreground">
              Datos referenciales: el módulo de viandas se integrará al informe en la próxima etapa.
            </p>
          </Panel>
        </div>

        <Panel title="Detalle de admisiones del mes">
          {adms.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Sin admisiones en el período.</p>
          ) : (
            <ul className="divide-y divide-border">
              {adms.map((a) => (
                <Fila key={a.id} label={a.nombre_contacto} value={a.estado.replace(/_/g, " ")} />
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
