import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { UserRound, History, ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, EmptyState, Chip } from "@/components/ui-kit";
import { botonPrimario } from "@/components/forms";
import { useUsuarioActual } from "@/components/kalen/campos";
import { fetchConcurrentes } from "@/lib/api";
import {
  fetchAdmisiones,
  fetchSedes,
  fetchTimeline,
  formatoFechaHora,
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
          "Línea de tiempo unificada del concurrente: admisiones, documentos, planillas y comunicaciones en una sola consulta.",
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
  documentos: { punto: "bg-success", texto: "text-success", etiqueta: "Documento" },
  planillas: { punto: "bg-warning", texto: "text-warning", etiqueta: "Planilla" },
  comunicaciones: { punto: "bg-muted-foreground", texto: "text-muted-foreground", etiqueta: "Comunicación" },
};

function Evento({ e }: { e: EventoTimeline }) {
  const est = ESTILO_EVENTO[e.origen_tabla] ?? ESTILO_EVENTO.comunicaciones!;
  return (
    <li className="relative pl-7">
      <span className={`absolute left-[7px] top-2 h-2.5 w-2.5 rounded-full ring-4 ring-card ${est.punto}`} />
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

function Vista360Page() {
  const { id } = Route.useSearch();
  const { usuario } = useUsuarioActual();
  const puedeEditar = usuario?.rol !== "solo_lectura";

  const { data: concurrentes = [] } = useQuery({ queryKey: ["concurrentes"], queryFn: fetchConcurrentes });
  const { data: sedes = [] } = useQuery({ queryKey: ["sedes"], queryFn: fetchSedes, staleTime: 300_000 });
  const { data: admisiones = [] } = useQuery({ queryKey: ["admisiones"], queryFn: fetchAdmisiones });
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
                  <Dato label="Obra social" value={persona.obra_social} />
                  <Dato label="Prestación" value={persona.prestacion} />
                </div>
              </div>
              {puedeEditar && (
                <Link to="/ficha-maestra" className={botonPrimario}>
                  Editar ficha
                </Link>
              )}
            </div>
          </Panel>

          <Panel title={`Línea de tiempo · ${eventos.length} evento(s)`}>
            {isLoading ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Cargando…</p>
            ) : eventos.length === 0 ? (
              <EmptyState
                icon={History}
                title="Sin eventos registrados"
                hint="Cuando cargues admisiones, documentos, planillas o comunicaciones aparecerán acá."
              />
            ) : (
              <ol className="relative px-4 py-4">
                <span className="absolute left-[11px] top-6 bottom-6 w-px bg-border" />
                {eventos.map((e, i) => (
                  <Evento key={`${e.origen_tabla}-${e.link_id}-${i}`} e={e} />
                ))}
              </ol>
            )}
          </Panel>
        </div>
      )}
    </AppShell>
  );
}
