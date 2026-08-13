import { useMemo, useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, Trash2, CalendarDays, Check, Pencil, Flag, Cake, Filter } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, Chip, EmptyState } from "@/components/ui-kit";
import { Segmentado, botonSecundario } from "@/components/forms";
import { EventoDialog, COLORES_EVENTO } from "@/components/calendario/EventoDialog";
import { useEntidad } from "@/hooks/use-entidad";
import { usePermisos } from "@/hooks/use-permisos";
import { eventosApi, fetchConcurrentes, type Evento, type Concurrente } from "@/lib/api";
import { MESES, DIAS_SEMANA, toISO, hoyISO, formatFecha, parseISO } from "@/lib/format";
import { esFeriado, resumenAnual } from "@/lib/feriados";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calendario")({
  head: () => ({
    meta: [
      { title: "Calendario — Centro de Día" },
      {
        name: "description",
        content: "Calendario institucional con feriados, cumpleaños, vencimientos y eventos.",
      },
      { property: "og:title", content: "Calendario — Centro de Día" },
      { property: "og:description", content: "Organizá eventos, vencimientos, cumpleaños y feriados del Centro de Día." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CalendarioPage,
});

type Vista = "mes" | "semana" | "dia";

const VISTAS = [
  { value: "mes" as const, label: "Mes" },
  { value: "semana" as const, label: "Semana" },
  { value: "dia" as const, label: "Día" },
];

type FiltroEvento = "todos" | "vencimiento" | "reunion" | "cumpleanos" | "feriado";

const FILTROS: { value: FiltroEvento; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "vencimiento", label: "Vencimientos" },
  { value: "reunion", label: "Reuniones" },
  { value: "cumpleanos", label: "Cumpleaños" },
  { value: "feriado", label: "Feriados" },
];

const tonoPrioridad = (p: string): "danger" | "muted" | "warning" =>
  p === "alta" ? "danger" : p === "baja" ? "muted" : "warning";
const tonoEstado = (e: string): "success" | "muted" | "info" | "warning" =>
  e === "hecho" ? "success" : e === "cancelado" ? "muted" : e === "en_curso" ? "info" : "warning";

/** Calcula cumpleaños del mes como eventos virtuales */
function cumpleanosDelMes(personas: Concurrente[], mes: number, anio: number): Evento[] {
  const evs: Evento[] = [];
  for (const p of personas) {
    if (!p.fecha_nacimiento) continue;
    const [y, m, d] = p.fecha_nacimiento.split("-").map(Number);
    if (m === mes + 1) {
      const fecha = `${anio}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      evs.push({
        id: `cumple-${p.id}`,
        titulo: `🎂 ${p.nombre} ${p.apellido}`,
        fecha,
        hora: "",
        prioridad: "baja",
        categoria: "cumpleanos",
        color: "violeta",
        estado: "pendiente",
        descripcion: `Cumpleaños de ${p.nombre} ${p.apellido}`,
        concurrente_id: p.id,
        created_at: "",
      });
    }
  }
  return evs;
}

function FilaEvento({
  e,
  onEditar,
  onEliminar,
  onCambiar,
  puedeEditar,
  esAdmin,
}: {
  e: Evento;
  onEditar: (e: Evento) => void;
  onEliminar: (e: Evento) => void;
  onCambiar: (id: string, cambios: Partial<Evento>) => void;
  puedeEditar: boolean;
  esAdmin: boolean;
}) {
  const hecho = e.estado === "hecho";
  const esCumple = e.categoria === "cumpleanos";
  return (
    <li className="px-4 py-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div className="min-w-0">
          <p className={cn("truncate text-sm font-medium", hecho && "line-through opacity-60")}>
            {esCumple && <Cake className="inline h-3.5 w-3.5 mr-1 text-violet-500" />}
            {e.titulo}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {[e.hora, formatFecha(e.fecha), e.categoria].filter(Boolean).join(" · ")}
          </p>
          {e.descripcion && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{e.descripcion}</p>}
        </div>
        <div className="flex shrink-0 gap-0.5">
          {!esCumple && puedeEditar && (
            <button
              onClick={() => onCambiar(e.id, { estado: hecho ? "pendiente" : "hecho" })}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-success"
              aria-label="Alternar hecho"
            >
              <Check className="h-4 w-4" />
            </button>
          )}
          {!esCumple && puedeEditar && (
            <button
              onClick={() => onEditar(e)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-primary"
              aria-label="Editar evento"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {!esCumple && esAdmin && (
            <button
              onClick={() => onEliminar(e)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-destructive"
              aria-label="Eliminar evento"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {!esCumple && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Chip tone={tonoPrioridad(e.prioridad)}>
            <Flag className="h-3 w-3" /> {e.prioridad}
          </Chip>
          <Chip tone={tonoEstado(e.estado)}>{e.estado.replace("_", " ")}</Chip>
          <input
            type="date"
            value={e.fecha}
            onChange={(ev) => ev.target.value && onCambiar(e.id, { fecha: ev.target.value })}
            className="h-7 rounded-md border border-input bg-card px-2 text-[11px]"
            aria-label="Cambiar fecha"
            disabled={!puedeEditar}
          />
          <select
            value={e.prioridad}
            onChange={(ev) => onCambiar(e.id, { prioridad: ev.target.value })}
            className="h-7 rounded-md border border-input bg-card px-1.5 text-[11px]"
            aria-label="Cambiar prioridad"
            disabled={!puedeEditar}
          >
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
          </select>
          <select
            value={e.estado}
            onChange={(ev) => onCambiar(e.id, { estado: ev.target.value })}
            className="h-7 rounded-md border border-input bg-card px-1.5 text-[11px]"
            aria-label="Cambiar estado"
            disabled={!puedeEditar}
          >
            <option value="pendiente">Pendiente</option>
            <option value="en_curso">En curso</option>
            <option value="hecho">Hecho</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
      )}
    </li>
  );
}

function CalendarioPage() {
  const { puedeEditar, esAdmin } = usePermisos();
  const [vista, setVista] = useState<Vista>("mes");
  const [cursor, setCursor] = useState(() => parseISO(hoyISO()));
  const [seleccion, setSeleccion] = useState(hoyISO());
  const [dialogo, setDialogo] = useState<{ abierto: boolean; evento?: Evento | null }>({ abierto: false });
  const [filtro, setFiltro] = useState<FiltroEvento>("todos");

  const { datos: eventos, crear, actualizar, eliminar } = useEntidad<Evento>("eventos", eventosApi, {
    etiqueta: "evento",
  });

  const { data: personas = [] } = useQuery({ queryKey: ["concurrentes"], queryFn: fetchConcurrentes });

  // Combinar eventos reales + cumpleaños virtuales
  const eventosCompletos = useMemo(() => {
    const cumples = cumpleanosDelMes(personas, cursor.getMonth(), cursor.getFullYear());
    return [...eventos, ...cumples];
  }, [eventos, personas, cursor]);

  const porFecha = useMemo(() => {
    const map: Record<string, Evento[]> = {};
    for (const e of eventosCompletos) (map[e.fecha] ||= []).push(e);
    for (const k of Object.keys(map)) map[k].sort((a, b) => (a.hora || "99").localeCompare(b.hora || "99"));
    return map;
  }, [eventosCompletos]);

  const dias = useMemo(() => {
    if (vista === "dia") return [parseISO(seleccion)];
    if (vista === "semana") {
      const base = parseISO(seleccion);
      const inicio = new Date(base);
      inicio.setDate(base.getDate() - ((base.getDay() + 6) % 7));
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(inicio);
        d.setDate(inicio.getDate() + i);
        return d;
      });
    }
    const primero = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const inicio = new Date(cursor.getFullYear(), cursor.getMonth(), 1 - ((primero.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      return d;
    });
  }, [vista, cursor, seleccion]);

  const mover = useCallback(
    (delta: number) => {
      if (vista === "mes") {
        setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
        return;
      }
      const d = parseISO(seleccion);
      d.setDate(d.getDate() + delta * (vista === "semana" ? 7 : 1));
      setSeleccion(toISO(d));
      setCursor(d);
    },
    [vista, seleccion],
  );

  const cambiar = useCallback(
    (id: string, cambios: Partial<Evento>) => actualizar.mutate({ id, cambios }),
    [actualizar],
  );
  const editar = useCallback((e: Evento) => setDialogo({ abierto: true, evento: e }), []);
  const borrar = useCallback(
    (e: Evento) => eliminar.mutate({ id: e.id, etiqueta: `el evento "${e.titulo}"` }),
    [eliminar],
  );

  const titulo =
    vista === "mes"
      ? `${MESES[cursor.getMonth()]} ${cursor.getFullYear()}`
      : vista === "semana"
        ? `Semana del ${formatFecha(toISO(dias[0]))}`
        : formatFecha(seleccion);

  const eventosSeleccion = useMemo(() => {
    const evs = porFecha[seleccion] ?? [];
    if (filtro === "todos") return evs;
    if (filtro === "cumpleanos") return evs.filter((e) => e.categoria === "cumpleanos");
    if (filtro === "feriado") return evs.filter((e) => esFeriado(e.fecha));
    return evs.filter((e) => e.categoria === filtro);
  }, [porFecha, seleccion, filtro]);

  const anio = cursor.getFullYear();
  const anual = useMemo(() => resumenAnual(anio), [anio]);
  const totalHabiles = useMemo(() => anual.reduce((a, m) => a + m.habiles, 0), [anual]);
  const totalFeriados = useMemo(() => anual.reduce((a, m) => a + m.feriados, 0), [anual]);
  const hoy = hoyISO();

  const proximos = useMemo(
    () =>
      eventosCompletos
        .filter((e) => e.fecha >= hoy && e.estado !== "cancelado" && e.categoria !== "cumpleanos")
        .sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`))
        .slice(0, 12),
    [eventosCompletos, hoy],
  );

  const vencimientosProximos = useMemo(
    () =>
      eventos
        .filter((e) => e.fecha >= hoy && (e.categoria === "documentacion" || e.categoria === "facturacion") && e.estado !== "hecho" && e.estado !== "cancelado")
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .slice(0, 6),
    [eventos, hoy],
  );

  const cumpleanosProximos = useMemo(() => {
    const mesActual = cursor.getMonth() + 1;
    return personas
      .filter((p) => {
        if (!p.fecha_nacimiento) return false;
        const m = Number(p.fecha_nacimiento.split("-")[1]);
        return m === mesActual;
      })
      .sort((a, b) => a.fecha_nacimiento!.localeCompare(b.fecha_nacimiento!));
  }, [personas, cursor]);

  function guardar(v: Partial<Evento>) {
    if (dialogo.evento) {
      actualizar.mutate(
        { id: dialogo.evento.id, cambios: v },
        { onSuccess: () => setDialogo({ abierto: false }) },
      );
    } else {
      crear.mutate(v, { onSuccess: () => setDialogo({ abierto: false }) });
    }
  }

  return (
    <AppShell title="Calendario" description="Eventos, vencimientos, cumpleaños y feriados">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
          <div className="flex items-center gap-1">
            <button onClick={() => mover(-1)} className="rounded-lg border border-input p-2 hover:bg-accent" aria-label="Anterior">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setCursor(parseISO(hoyISO()));
                setSeleccion(hoyISO());
              }}
              className="h-9 rounded-lg border border-input px-3 text-sm font-medium hover:bg-accent"
            >
              Hoy
            </button>
            <button onClick={() => mover(1)} className="rounded-lg border border-input p-2 hover:bg-accent" aria-label="Siguiente">
              <ChevronRight className="h-4 w-4" />
            </button>
            {puedeEditar && (
              <button
                onClick={() => setDialogo({ abierto: true, evento: null })}
                className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
              >
                <Plus className="h-4 w-4" /> Evento
              </button>
            )}
          </div>
          <p className="truncate text-sm font-semibold capitalize sm:text-center">{titulo}</p>
          <Segmentado valor={vista} opciones={VISTAS} onChange={setVista} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Panel>
            {vista === "dia" ? (
              <div className="p-4">
                <p className="mb-3 text-sm font-semibold capitalize">{formatFecha(seleccion)}</p>
                {eventosSeleccion.length === 0 ? (
                  <EmptyState icon={CalendarDays} title="Sin eventos" hint="Agregá un evento para este día." />
                ) : (
                  <ul className="space-y-2">
                    {eventosSeleccion.map((e) => (
                      <li
                        key={e.id}
                        className={cn(
                          "grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-lg border border-border p-3",
                          e.estado === "hecho" && "opacity-60",
                        )}
                      >
                        <span className="w-12 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                          {e.hora || "—"}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {e.categoria === "cumpleanos" && <Cake className="inline h-3.5 w-3.5 mr-1 text-violet-500" />}
                            {e.titulo}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{e.categoria}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center text-xs font-medium uppercase text-muted-foreground">
                  {DIAS_SEMANA.map((d) => (
                    <div key={d} className="py-2">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {dias.map((d) => {
                    const iso = toISO(d);
                    const delMes = vista === "semana" || d.getMonth() === cursor.getMonth();
                    const evs = porFecha[iso] ?? [];
                    const maximo = vista === "semana" ? 8 : 3;
                    const feriado = esFeriado(iso);
                    const finDeSemana = d.getDay() === 0 || d.getDay() === 6;
                    const esHoy = iso === hoy;

                    return (
                      <button
                        key={iso}
                        onClick={() => setSeleccion(iso)}
                        onDoubleClick={() => {
                          setSeleccion(iso);
                          if (puedeEditar) setDialogo({ abierto: true, evento: null });
                        }}
                        title={feriado?.nombre}
                        className={cn(
                          "border-b border-r border-border p-1.5 text-left align-top transition-colors hover:bg-accent/40 sm:p-2",
                          vista === "semana" ? "min-h-[180px]" : "min-h-[80px] sm:min-h-[96px]",
                          !delMes && "bg-muted/30 text-muted-foreground",
                          finDeSemana && delMes && !feriado && "bg-slate-100 dark:bg-slate-900/40",
                          feriado && delMes && "bg-destructive/5",
                          esHoy && "ring-1 ring-inset ring-primary/50",
                        )}
                      >
                        <span
                          className={cn(
                            "inline-grid h-6 w-6 place-items-center rounded-full text-xs font-semibold",
                            feriado && "text-destructive",
                            esHoy && "bg-primary text-primary-foreground",
                          )}
                        >
                          {d.getDate()}
                        </span>
                        {feriado && (
                          <span className="mt-0.5 block truncate text-[10px] font-medium text-destructive">
                            {feriado.nombre}
                          </span>
                        )}
                        <div className="mt-1 space-y-1">
                          {evs.slice(0, maximo).map((e) => (
                            <span
                              key={e.id}
                              className={cn(
                                "block truncate rounded px-1 py-0.5 text-[10px] font-medium sm:px-1.5 sm:text-[11px]",
                                e.categoria === "cumpleanos"
                                  ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                                  : COLORES_EVENTO[e.color] || COLORES_EVENTO.azul,
                                e.estado === "hecho" && "line-through opacity-60",
                              )}
                            >
                              {e.hora && `${e.hora} `}
                              {e.titulo}
                            </span>
                          ))}
                          {evs.length > maximo && (
                            <span className="block text-[10px] text-muted-foreground">+{evs.length - maximo} más</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </Panel>

          <div className="space-y-4">
            {/* Filtros */}
            <div className="flex flex-wrap gap-1.5">
              {FILTROS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFiltro(f.value)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                    filtro === f.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent",
                  )}
                >
                  {f.value === "todos" && <Filter className="h-3 w-3" />}
                  {f.label}
                </button>
              ))}
            </div>

            <Panel
              title={formatFecha(seleccion)}
              action={
                puedeEditar ? (
                  <button
                    onClick={() => setDialogo({ abierto: true, evento: null })}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" /> Agregar
                  </button>
                ) : undefined
              }
            >
              {eventosSeleccion.length === 0 ? (
                <EmptyState icon={CalendarDays} title="Sin eventos" hint="Agregá un evento para este día." />
              ) : (
                <ul className="divide-y divide-border">
                  {eventosSeleccion.map((e) => (
                    <FilaEvento
                      key={e.id}
                      e={e}
                      onEditar={editar}
                      onEliminar={borrar}
                      onCambiar={cambiar}
                      puedeEditar={puedeEditar}
                      esAdmin={esAdmin}
                    />
                  ))}
                </ul>
              )}
            </Panel>

            {/* Vencimientos próximos */}
            {vencimientosProximos.length > 0 && (
              <Panel title="⚠️ Vencimientos próximos">
                <ul className="divide-y divide-border">
                  {vencimientosProximos.map((e) => (
                    <li key={e.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5">
                      <span className="w-14 shrink-0 text-xs text-destructive font-medium tabular-nums">
                        {formatFecha(e.fecha).slice(0, 6)}
                      </span>
                      <button
                        onClick={() => {
                          setSeleccion(e.fecha);
                          setCursor(parseISO(e.fecha));
                        }}
                        className="min-w-0 truncate text-left text-sm hover:underline"
                      >
                        {e.titulo}
                      </button>
                      <Chip tone="danger">{e.categoria}</Chip>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            {/* Cumpleaños del mes */}
            {cumpleanosProximos.length > 0 && (
              <Panel title={`🎂 Cumpleaños de ${MESES[cursor.getMonth()]}`}>
                <ul className="divide-y divide-border">
                  {cumpleanosProximos.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 px-4 py-2">
                      <span className="text-sm">{p.nombre} {p.apellido}</span>
                      <span className="text-xs font-medium text-violet-600 dark:text-violet-400">
                        {p.fecha_nacimiento?.slice(8)}/{p.fecha_nacimiento?.slice(5, 7)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            <Panel title="Próximos eventos">
              {proximos.length === 0 ? (
                <EmptyState icon={CalendarDays} title="Nada agendado" />
              ) : (
                <ul className="divide-y divide-border">
                  {proximos.map((e) => (
                    <li key={e.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5">
                      <span className="w-14 shrink-0 text-xs text-muted-foreground">{formatFecha(e.fecha).slice(0, 6)}</span>
                      <button
                        onClick={() => {
                          setSeleccion(e.fecha);
                          setCursor(parseISO(e.fecha));
                        }}
                        className="min-w-0 truncate text-left text-sm hover:underline"
                      >
                        {e.titulo}
                      </button>
                      <Chip tone={tonoPrioridad(e.prioridad)}>{e.hora || e.prioridad}</Chip>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title={`Feriados y días hábiles ${anio}`}>
              <ul className="divide-y divide-border">
                {anual.map((m) => {
                  const idx = Number(m.mes.slice(5)) - 1;
                  const actual = idx === cursor.getMonth();
                  return (
                    <li key={m.mes} className={cn("px-4 py-2.5", actual && "bg-accent/40")}>
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => setCursor(new Date(anio, idx, 1))}
                          className="text-sm font-medium hover:underline"
                        >
                          {MESES[idx]}
                        </button>
                        <div className="flex shrink-0 gap-1">
                          <Chip tone="info">{m.habiles} hábiles</Chip>
                          <Chip tone={m.feriados ? "danger" : "muted"}>{m.feriados} fer.</Chip>
                        </div>
                      </div>
                      {m.listaFeriados.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {m.listaFeriados.map((f) => (
                            <li key={`${f.fecha}-${f.nombre}`} className="text-xs text-muted-foreground">
                              <button
                                onClick={() => {
                                  setSeleccion(f.fecha);
                                  setCursor(parseISO(f.fecha));
                                }}
                                className="text-left hover:underline"
                              >
                                <span className="tabular-nums font-medium text-destructive">
                                  {f.fecha.slice(8)}/{f.fecha.slice(5, 7)}
                                </span>{" "}
                                {f.nombre}
                                {f.tipo === "trasladable" && " (trasladable)"}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
                Total {anio}: {totalHabiles} días hábiles · {totalFeriados} feriados nacionales
              </p>
            </Panel>

            {puedeEditar && (
              <button className={cn(botonSecundario, "w-full")} onClick={() => setDialogo({ abierto: true, evento: null })}>
                <Plus className="h-4 w-4" /> Nuevo evento
              </button>
            )}
          </div>
        </div>
      </div>

      <EventoDialog
        abierto={dialogo.abierto}
        evento={dialogo.evento}
        fechaBase={seleccion}
        onClose={() => setDialogo({ abierto: false })}
        onGuardar={guardar}
        guardando={crear.isPending || actualizar.isPending}
      />
    </AppShell>
  );
}
