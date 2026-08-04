import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, StickyNote, Search, Archive, Flame } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, StatCard, EmptyState, Chip } from "@/components/ui-kit";
import { Modal, campo, areaTexto, botonPrimario, botonSecundario, Etiqueta, Segmentado } from "@/components/forms";
import { Exportar } from "@/components/Exportar";
import { useEntidad } from "@/hooks/use-entidad";
import {
  notasApi,
  CATEGORIAS_NOTA,
  PRIORIDADES_NOTA,
  ESTADOS_NOTA,
  type NotaRapida,
} from "@/lib/api";
import { formatFecha, hoyISO } from "@/lib/format";

export const Route = createFileRoute("/notas")({
  head: () => ({
    meta: [
      { title: "Notas rápidas — Centro de Día" },
      {
        name: "description",
        content: "Notas rápidas administrativas con categoría, prioridad y estado, para no perder ningún pendiente.",
      },
      { property: "og:title", content: "Notas rápidas — Centro de Día" },
      { property: "og:description", content: "Pendientes anotados en segundos y ordenados por prioridad." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NotasPage,
});

const ORDEN_PRIORIDAD: Record<string, number> = { alta: 0, media: 1, baja: 2 };

const vacia = (): Partial<NotaRapida> => ({
  titulo: "",
  texto: "",
  categoria: "Pendientes",
  prioridad: "media",
  fecha: hoyISO(),
  estado: "pendiente",
});

function NotasPage() {
  const { datos: notas, crear, actualizar } = useEntidad<NotaRapida>("notas", notasApi, {
    etiqueta: "nota",
  });

  const [abierto, setAbierto] = useState(false);
  const [borrador, setBorrador] = useState<Partial<NotaRapida>>(vacia());
  const [busqueda, setBusqueda] = useState("");
  const [fCategoria, setFCategoria] = useState("");
  const [fPrioridad, setFPrioridad] = useState("");
  const [fEstado, setFEstado] = useState("activas");
  const [vista, setVista] = useState<"lista" | "tarjetas">("lista");

  const filtradas = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return notas
      .filter((n) => {
        if (fEstado === "activas" ? n.estado === "archivado" : fEstado && n.estado !== fEstado) return false;
        if (fCategoria && n.categoria !== fCategoria) return false;
        if (fPrioridad && n.prioridad !== fPrioridad) return false;
        if (q && !`${n.titulo} ${n.texto} ${n.categoria}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort(
        (a, b) =>
          (ORDEN_PRIORIDAD[a.prioridad] ?? 9) - (ORDEN_PRIORIDAD[b.prioridad] ?? 9) ||
          b.fecha.localeCompare(a.fecha),
      );
  }, [notas, busqueda, fCategoria, fPrioridad, fEstado]);

  const altasSinResolver = notas.filter(
    (n) => n.prioridad === "alta" && n.estado !== "resuelto" && n.estado !== "archivado",
  ).length;

  const filasExport = filtradas.map((n) => ({
    Fecha: formatFecha(n.fecha),
    Título: n.titulo,
    Categoría: n.categoria,
    Prioridad: n.prioridad,
    Estado: n.estado,
    Texto: n.texto,
  }));

  function guardar() {
    if (!borrador.titulo?.trim()) return;
    const datos = { ...borrador, titulo: borrador.titulo.trim() };
    if (borrador.id) actualizar.mutate({ id: borrador.id, cambios: datos });
    else crear.mutate(datos);
    setAbierto(false);
  }

  const selectFiltro = "h-9 rounded-lg border border-input bg-card px-2 text-xs";

  return (
    <AppShell
      title="Notas rápidas"
      description="Pendientes administrativos del día a día"
      actions={
        <>
          <button
            className={botonPrimario}
            onClick={() => {
              setBorrador(vacia());
              setAbierto(true);
            }}
          >
            <Plus className="h-4 w-4" /> Nueva nota
          </button>
          <Exportar filas={filasExport} nombre="notas" titulo="Notas rápidas" />
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={StickyNote} label="Notas activas" value={notas.filter((n) => n.estado !== "archivado").length} tone="info" />
        <StatCard icon={Flame} label="Prioridad alta sin resolver" value={altasSinResolver} tone="danger" />
        <StatCard icon={Search} label="En proceso" value={notas.filter((n) => n.estado === "en proceso").length} tone="warning" />
        <StatCard icon={Archive} label="Archivadas" value={notas.filter((n) => n.estado === "archivado").length} tone="default" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          className="h-9 min-w-[200px] flex-1 rounded-lg border border-input bg-card px-3 text-xs"
          placeholder="Buscar en notas…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select className={selectFiltro} value={fCategoria} onChange={(e) => setFCategoria(e.target.value)}>
          <option value="">Todas las categorías</option>
          {CATEGORIAS_NOTA.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select className={selectFiltro} value={fPrioridad} onChange={(e) => setFPrioridad(e.target.value)}>
          <option value="">Todas las prioridades</option>
          {PRIORIDADES_NOTA.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select className={selectFiltro} value={fEstado} onChange={(e) => setFEstado(e.target.value)}>
          <option value="activas">Sin archivar</option>
          <option value="">Todos los estados</option>
          {ESTADOS_NOTA.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <Panel
          title={`Notas · ${filtradas.length}`}
          action={
            <Segmentado
              valor={vista}
              opciones={[
                { value: "lista" as const, label: "Lista" },
                { value: "tarjetas" as const, label: "Tarjetas" },
              ]}
              onChange={setVista}
            />
          }
        >
          {filtradas.length === 0 ? (
            <EmptyState icon={StickyNote} title="Sin notas" hint="Creá una nota para no olvidarte de un pendiente." />
          ) : vista === "tarjetas" ? (
            <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtradas.map((n) => (
                <article
                  key={n.id}
                  className={`rounded-xl border-l-4 border border-border p-3 ${
                    n.prioridad === "alta"
                      ? "border-l-destructive bg-destructive/5"
                      : n.prioridad === "media"
                        ? "border-l-warning bg-warning/5"
                        : "border-l-border bg-muted/30"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold">{n.titulo}</p>
                    <Chip tone={n.estado === "resuelto" ? "success" : "muted"}>{n.estado}</Chip>
                  </div>
                  {n.texto && (
                    <p className="mt-1 line-clamp-6 whitespace-pre-wrap text-xs text-muted-foreground">{n.texto}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Chip tone="info">{n.categoria}</Chip>
                    <span className="text-[11px] text-muted-foreground">{formatFecha(n.fecha)}</span>
                    <button
                      className="ml-auto text-xs font-medium text-primary hover:underline"
                      onClick={() => {
                        setBorrador(n);
                        setAbierto(true);
                      }}
                    >
                      Editar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (

            <ul className="divide-y divide-border">
              {filtradas.map((n) => (
                <li key={n.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">{n.titulo}</p>
                      <Chip
                        tone={n.prioridad === "alta" ? "danger" : n.prioridad === "media" ? "warning" : "muted"}
                      >
                        {n.prioridad}
                      </Chip>
                      <Chip tone="info">{n.categoria}</Chip>
                      <Chip tone={n.estado === "resuelto" ? "success" : "muted"}>{n.estado}</Chip>
                    </div>
                    {n.texto && <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{n.texto}</p>}
                    <p className="mt-1 text-[11px] text-muted-foreground">{formatFecha(n.fecha)}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <select
                      className="h-8 rounded-lg border border-input bg-card px-2 text-xs"
                      value={n.estado}
                      onChange={(e) => actualizar.mutate({ id: n.id, cambios: { estado: e.target.value } })}
                    >
                      {ESTADOS_NOTA.map((e) => (
                        <option key={e} value={e}>
                          {e}
                        </option>
                      ))}
                    </select>
                    <button
                      className="h-8 rounded-lg border border-input px-2.5 text-xs font-medium hover:bg-accent"
                      onClick={() => {
                        setBorrador(n);
                        setAbierto(true);
                      }}
                    >
                      Editar
                    </button>
                    {n.estado !== "archivado" && (
                      <button
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-input px-2.5 text-xs font-medium hover:bg-accent"
                        onClick={() => actualizar.mutate({ id: n.id, cambios: { estado: "archivado" } })}
                      >
                        <Archive className="h-3.5 w-3.5" /> Archivar
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Las notas nunca se eliminan: se archivan para conservar la trazabilidad.
        </p>
      </div>

      <Modal
        abierto={abierto}
        onClose={() => setAbierto(false)}
        titulo={borrador.id ? "Editar nota" : "Nueva nota"}
        footer={
          <>
            <button className={botonSecundario} onClick={() => setAbierto(false)}>
              Cancelar
            </button>
            <button className={botonPrimario} onClick={guardar}>
              Guardar
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <Etiqueta hint={borrador.titulo?.trim() ? undefined : "Requerido"}>Título</Etiqueta>
            <input
              className={campo}
              maxLength={140}
              value={borrador.titulo ?? ""}
              onChange={(e) => setBorrador({ ...borrador, titulo: e.target.value })}
            />
          </label>
          <label>
            <Etiqueta>Categoría</Etiqueta>
            <select
              className={campo}
              value={borrador.categoria ?? "Otros"}
              onChange={(e) => setBorrador({ ...borrador, categoria: e.target.value })}
            >
              {CATEGORIAS_NOTA.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            <Etiqueta>Prioridad</Etiqueta>
            <select
              className={campo}
              value={borrador.prioridad ?? "media"}
              onChange={(e) => setBorrador({ ...borrador, prioridad: e.target.value })}
            >
              {PRIORIDADES_NOTA.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label>
            <Etiqueta>Fecha</Etiqueta>
            <input
              type="date"
              className={campo}
              value={borrador.fecha ?? hoyISO()}
              onChange={(e) => setBorrador({ ...borrador, fecha: e.target.value })}
            />
          </label>
          <label>
            <Etiqueta>Estado</Etiqueta>
            <select
              className={campo}
              value={borrador.estado ?? "pendiente"}
              onChange={(e) => setBorrador({ ...borrador, estado: e.target.value })}
            >
              {ESTADOS_NOTA.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </label>
          <label className="sm:col-span-2">
            <Etiqueta>Texto</Etiqueta>
            <textarea
              rows={5}
              className={areaTexto}
              maxLength={4000}
              value={borrador.texto ?? ""}
              onChange={(e) => setBorrador({ ...borrador, texto: e.target.value })}
            />
          </label>
        </div>
      </Modal>
    </AppShell>
  );
}
