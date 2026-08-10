import { useMemo, useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Plus, Trash2, CalendarDays, Check, Pencil, Flag } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, Chip, EmptyState } from "@/components/ui-kit";
import { Segmentado, botonSecundario } from "@/components/forms";
import { EventoDialog, COLORES_EVENTO } from "@/components/calendario/EventoDialog";
import { useEntidad } from "@/hooks/use-entidad";
import { usePermisos } from "@/hooks/use-permisos";
import { eventosApi, type Evento } from "@/lib/api";
import { MESES, DIAS_SEMANA, toISO, hoyISO, formatFecha, parseISO } from "@/lib/format";
import { esFeriado, resumenAnual } from "@/lib/feriados";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calendario")({
  head: () => ({
    meta: [
      { title: "Calendario — Centro de Día" },
      {
        name: "description",
        content: "Calendario profesional con vistas mensual, semanal y diaria: creá, editá y seguí eventos y vencimientos.",
      },
      { property: "og:title", content: "Calendario — Centro de Día" },
      { property: "og:description", content: "Organizá eventos, vencimientos y actividades del Centro de Día." },
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

const tonoPrioridad = (p: string): "danger" | "muted" | "warning" =>
  p === "alta" ? "danger" : p === "baja" ? "muted" : "warning";
const tonoEstado = (e: string): "success" | "muted" | "info" | "warning" =>
  e === "hecho" ? "success" : e === "cancelado" ? "muted" : e === "en_curso" ? "info" : "warning";


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
  return (
    <li className="px-4 py-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div className="min-w-0">
          <p className={cn("truncate text-sm font-medium", hecho && "line-through opacity-60")}>{e.titulo}</p>
          <p className="truncate text-xs text-muted-foreground">
            {[e.hora, formatFecha(e.fecha), e.categoria].filter(Boolean).join(" · ")}
          </p>
          {e.descripcion && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{e.descripcion}</p>}
        </div>
        <div className="flex shrink-0 gap-0.5">
          {puedeEditar && (
            <button
              onClick={() => onCambiar(e.id, { estado: hecho ? "pendiente" : "hecho" })}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-success"
              aria-label="Alternar hecho"
            >
              <Check className="h-4 w-4" />
            </button>
          )}
          {puedeEditar && (
            <button
              onClick={() => onEditar(e)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-primary"
              aria-label="Editar evento"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {esAdmin && (
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

      {/* Controles rápidos: cambiar fecha, estado y prioridad sin abrir el editor. */}
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
    </li>
  );
}

function CalendarioPage() {
  const { puedeEditar, esAdmin } = usePermisos();
  const [vista, setVista] = useState<Vista>("mes");
  const [cursor, setCursor] = useState(() => parseISO(hoyISO()));
  const [seleccion, setSeleccion] = useState(hoyISO());
  const [dialogo, setDialogo] = useState<{ abierto: boolean; evento?: Evento | null }>({ abierto: false });

  const { datos: eventos, crear, actualizar, eliminar } = useEntidad<Evento>("eventos", eventosApi, {
    etiqueta: "evento",
  });

  const porFecha = useMemo(() => {
    const map: Record<string, Evento[]> = {};
    for (const e of eventos) (map[e.fecha] ||= []).push(e);
    for (const k of Object.keys(map)) map[k].sort((a, b) => (a.hora || "99").localeCompare(b.hora || "99"));
    return map;
  }, [eventos]);

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

  const eventosSeleccion = porFecha[seleccion] ?? [];
  const hoy = hoyISO();
  const proximos = useMemo(
    () =>
      eventos
        .filter((e) => e.fecha >= hoy && e.estado !== "cancelado")
        .sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`))
        .slice(0, 12),
    [eventos, hoy],
  );

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
    <AppShell title="Calendario" description="Eventos, vencimientos y actividades">
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
                          <p className="truncate text-sm font-medium">{e.titulo}</p>
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
                    <div key={d} className="py-2">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {dias.map((d) => {
                    const iso = toISO(d);
                    const delMes = vista === "semana" || d.getMonth() === cursor.getMonth();
                    const evs = porFecha[iso] ?? [];
                    const maximo = vista === "semana" ? 8 : 3;
                    const feriado = esFeriado(iso);
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
                          feriado && delMes && "bg-destructive/5",
                          seleccion === iso && "bg-accent/60 ring-1 ring-inset ring-primary",
                        )}
                      >
                        <span
                          className={cn(
                            "inline-grid h-6 w-6 place-items-center rounded-full text-xs font-semibold",
                            feriado && "text-destructive",
                            iso === hoy && "bg-primary text-primary-foreground",
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
                                COLORES_EVENTO[e.color] || COLORES_EVENTO.azul,
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
