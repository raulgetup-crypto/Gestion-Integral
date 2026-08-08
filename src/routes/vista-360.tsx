import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  UserRound,
  History,
  ArrowLeft,
  MessageSquare,
  ClipboardList,
  UtensilsCrossed,
  Bus,
  FilePlus2,
  CheckCircle2,
  AlertTriangle,
  CircleDashed,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, EmptyState, Chip } from "@/components/ui-kit";
import { botonPrimario, botonSecundario } from "@/components/forms";
import { usePermisos } from "@/hooks/use-permisos";
import { fetchConcurrentes, documentosApi, fetchRequisitos } from "@/lib/api";
import { resumenDocumental } from "@/lib/requisitos";
import {
  fetchAdmisiones,
  fetchSedes,
  fetchTimeline,
  formatoFechaHora,
  etiquetaModalidad,
  type EventoTimeline,
} from "@/lib/kalen";

export const Route = createFileRoute("/vista-360")({
  validateSearch: (s: Record<string, unknown>) => ({ id: typeof s.id === "string" ? s.id : "" }),
  head: () => ({
    meta: [
      { title: "Vista 360° del concurrente — Kalen" },
      {
        name: "description",
        content:
          "Línea de tiempo unificada del concurrente: admisiones, documentos, planillas, transporte, viandas, equipo y comunicaciones.",
      },
      { property: "og:title", content: "Vista 360° del concurrente — Kalen" },
      { property: "og:description", content: "Historia completa del concurrente en orden cronológico inverso." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Vista360Page,
});

const ESTILO_EVENTO: Record<string, { punto: string; texto: string; etiqueta: string }> = {
  admisiones: { punto: "bg-info", texto: "text-info", etiqueta: "Admisión" },
  historial_estados_admisiones: { punto: "bg-info/70", texto: "text-info", etiqueta: "Estado de admisión" },
  documentos: { punto: "bg-success", texto: "text-success", etiqueta: "Documento" },
  planillas: { punto: "bg-warning", texto: "text-warning", etiqueta: "Planilla" },
  transporte_solicitudes: { punto: "bg-info", texto: "text-info", etiqueta: "Transporte" },
  viandas: { punto: "bg-success/70", texto: "text-success", etiqueta: "Vianda" },
  concurrente_profesionales: { punto: "bg-warning/70", texto: "text-warning", etiqueta: "Equipo" },
  comunicaciones: { punto: "bg-muted-foreground", texto: "text-muted-foreground", etiqueta: "Comunicación" },
};

/** Filtros del timeline: cada uno agrupa una o más tablas de origen. */
const FILTROS: { clave: string; label: string; tablas: string[] }[] = [
  { clave: "todos", label: "Todos", tablas: [] },
  { clave: "admision", label: "Admisiones", tablas: ["admisiones", "historial_estados_admisiones"] },
  { clave: "documentos", label: "Documentos", tablas: ["documentos"] },
  { clave: "planillas", label: "Planillas", tablas: ["planillas"] },
  { clave: "transporte", label: "Transporte", tablas: ["transporte_solicitudes"] },
  { clave: "viandas", label: "Viandas", tablas: ["viandas"] },
  { clave: "equipo", label: "Equipo", tablas: ["concurrente_profesionales"] },
  { clave: "comunicaciones", label: "Comunicaciones", tablas: ["comunicaciones"] },
];

function Evento({ e }: { e: EventoTimeline }) {
  const est = ESTILO_EVENTO[e.origen_tabla] ?? ESTILO_EVENTO.comunicaciones!;
  const esSubLinea = e.origen_tabla === "historial_estados_admisiones";
  return (
    <li className={esSubLinea ? "relative pl-12" : "relative pl-7"}>
      <span
        className={`absolute top-2 rounded-full ring-4 ring-card ${est.punto} ${
          esSubLinea ? "left-[24px] h-2 w-2" : "left-[7px] h-2.5 w-2.5"
        }`}
      />
      <div className="pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs font-semibold uppercase tracking-wide ${est.texto}`}>{est.etiqueta}</span>
          <span className="text-xs text-muted-foreground">{formatoFechaHora(e.fecha)}</span>
          {e.estado && <Chip tone="muted">{e.estado.replace(/_/g, " ")}</Chip>}
        </div>
        <p className="mt-1 text-sm">{e.descripcion || "Sin descripción"}</p>
      </div>
    </li>
  );
}


function Dato({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium">{value || "—"}</p>
    </div>
  );
}

const ACCIONES = [
  { to: "/comunicaciones", label: "Agregar comunicación", icon: MessageSquare },
  { to: "/planillas", label: "Cargar planilla", icon: ClipboardList },
  { to: "/viandas", label: "Registrar vianda", icon: UtensilsCrossed },
  { to: "/transporte", label: "Registrar transporte", icon: Bus },
  { to: "/documentacion", label: "Agregar documento", icon: FilePlus2 },
] as const;

function Vista360Page() {
  const { id } = Route.useSearch();
  const { puedeEditar } = usePermisos();
  const [filtro, setFiltro] = useState("todos");

  const { data: concurrentes = [] } = useQuery({ queryKey: ["concurrentes"], queryFn: fetchConcurrentes });
  const { data: sedes = [] } = useQuery({ queryKey: ["sedes"], queryFn: fetchSedes, staleTime: 300_000 });
  const { data: admisiones = [] } = useQuery({ queryKey: ["admisiones"], queryFn: fetchAdmisiones });
  const { data: documentos = [] } = useQuery({ queryKey: ["documentos"], queryFn: documentosApi.list });
  const { data: requisitos = [] } = useQuery({ queryKey: ["requisitos"], queryFn: fetchRequisitos });
  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ["timeline", id],
    queryFn: () => fetchTimeline(id),
    enabled: Boolean(id),
  });

  const persona = useMemo(
    () => (concurrentes as (typeof concurrentes)[number][]).find((c) => c.id === id) ?? null,
    [concurrentes, id],
  );
  const admision = admisiones.find((a) => a.concurrente_id === id) ?? null;

  const checklist = useMemo(
    () => (persona ? resumenDocumental(persona, documentos, requisitos) : null),
    [persona, documentos, requisitos],
  );

  const eventosFiltrados = useMemo(() => {
    const f = FILTROS.find((x) => x.clave === filtro);
    if (!f || f.tablas.length === 0) return eventos;
    return eventos.filter((e) => f.tablas.includes(e.origen_tabla));
  }, [eventos, filtro]);

  const estado = !persona
    ? "—"
    : !persona.activo
      ? "Baja"
      : admision && !["admitido"].includes(admision.estado)
        ? "En admisión"
        : "Activo";
  const tonoEstado = estado === "Activo" ? "success" : estado === "Baja" ? "danger" : "info";

  const sede =
    sedes.find((s) => s.id === (persona as { sede_id?: number | null } | null)?.sede_id)?.nombre ?? "—";
  const nombre = persona ? `${persona.apellido || ""} ${persona.nombre}`.trim() : "Concurrente";

  return (
    <AppShell
      title="Vista 360°"
      description="Historia unificada del concurrente en una sola consulta"
      actions={
        <Link to="/ficha-maestra" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Volver a ficha maestra
        </Link>
      }
    >
      {!id || !persona ? (
        <Panel>
          <EmptyState
            icon={UserRound}
            title="Elegí un concurrente"
            hint="Usá la búsqueda global (Ctrl/⌘ K) por DNI, nombre o apellido para abrir su vista 360°."
          />
        </Panel>
      ) : (
        <div className="space-y-4">
          <Panel>
            <div className="flex flex-wrap items-center gap-4 p-4">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-accent text-accent-foreground">
                <UserRound className="h-7 w-7" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-bold tracking-tight">{nombre}</h2>
                  <Chip tone={tonoEstado}>{estado}</Chip>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  <Dato label="DNI" value={persona.dni} />
                  <Dato label="Sede" value={sede} />
                  <Dato label="Cobertura" value={etiquetaModalidad(persona)} />
                  <Dato label="Prestación" value={persona.prestacion} />
                </div>
              </div>
              {puedeEditar && (
                <Link to="/ficha-maestra" className={botonPrimario}>
                  Editar ficha
                </Link>
              )}
            </div>

            {puedeEditar && (
              <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
                {ACCIONES.map(({ to, label, icon: Icon }) => (
                  <Link key={to} to={to} className={botonSecundario}>
                    <Icon className="h-4 w-4" /> {label}
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Panel title={`Línea de tiempo · ${eventosFiltrados.length} evento(s)`}>
              <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-3">
                {FILTROS.map((f) => (
                  <button
                    key={f.clave}
                    type="button"
                    onClick={() => setFiltro(f.clave)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      filtro === f.clave
                        ? "bg-primary text-primary-foreground"
                        : "border border-input text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {isLoading ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">Cargando…</p>
              ) : eventosFiltrados.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="Sin eventos registrados"
                  hint="Cuando cargues admisiones, documentos, planillas, transporte, viandas o comunicaciones aparecerán acá."
                />
              ) : (
                <ol className="relative px-4 py-4">
                  <span className="absolute left-[11px] top-6 bottom-6 w-px bg-border" />
                  {eventosFiltrados.map((e, i) => (
                    <Evento key={`${e.origen_tabla}-${e.link_id}-${i}`} e={e} />
                  ))}
                </ol>
              )}
            </Panel>

            <Panel title="Checklist de documentación">
              {!checklist || checklist.requisitos.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No hay requisitos definidos para sus prestaciones.
                </p>
              ) : (
                <>
                  <ul className="divide-y divide-border">
                    {checklist.requisitos.map((r) => {
                      const Icono = !r.cargado ? CircleDashed : r.vencido || r.porVencer ? AlertTriangle : CheckCircle2;
                      const color = !r.cargado
                        ? "text-muted-foreground"
                        : r.vencido
                          ? "text-destructive"
                          : r.porVencer
                            ? "text-warning"
                            : "text-success";
                      return (
                        <li key={r.documento} className="flex items-start gap-2.5 px-4 py-2.5">
                          <Icono className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm">
                              {r.documento}
                              {r.obligatorio && <span className="ml-1 text-xs text-destructive">*</span>}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {!r.cargado
                                ? "Falta cargar"
                                : r.vencido
                                  ? `Vencido el ${r.vencimiento}`
                                  : r.porVencer
                                    ? `Vence el ${r.vencimiento}`
                                    : r.vencimiento
                                      ? `Vigente hasta ${r.vencimiento}`
                                      : "Cargado"}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
                    {checklist.completo
                      ? "Documentación obligatoria completa."
                      : `${checklist.faltantes.length} obligatorio(s) faltante(s) · ${checklist.vencidos.length} vencido(s)`}
                  </div>
                </>
              )}
            </Panel>
          </div>
        </div>
      )}
    </AppShell>
  );
}

