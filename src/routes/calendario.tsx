import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, X, Trash2, CalendarDays, Check } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, Chip, EmptyState } from "@/components/ui-kit";
import { eventosApi, logHistorial, fetchConcurrentes, type Evento } from "@/lib/api";
import { MESES, DIAS_SEMANA, toISO, hoyISO, formatFecha, parseISO } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calendario")({
  head: () => ({
    meta: [
      { title: "Calendario — Centro de Día" },
      {
        name: "description",
        content: "Calendario profesional con vistas mensual, semanal y diaria de eventos, vencimientos y actividades.",
      },
      { property: "og:title", content: "Calendario — Centro de Día" },
      { property: "og:description", content: "Organizá eventos, vencimientos y actividades del Centro de Día." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CalendarioPage,
});

const COLORES: Record<string, string> = {
  azul: "bg-info/15 text-info",
  verde: "bg-success/15 text-success",
  amarillo: "bg-warning/20 text-warning",
  rojo: "bg-destructive/15 text-destructive",
  violeta: "bg-primary/15 text-primary",
};

const field = "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm";

function FormEvento({ fecha, onSave, onCancel }: { fecha: string; onSave: (v: Partial<Evento>) => void; onCancel: () => void }) {
  const { data: personas = [] } = useQuery({ queryKey: ["concurrentes"], queryFn: fetchConcurrentes });
  const [f, setF] = useState<Partial<Evento>>({
    titulo: "",
    fecha,
    hora: "",
    prioridad: "media",
    categoria: "general",
    color: "azul",
    descripcion: "",
    concurrente_id: null,
  });
  return (
    <div className="space-y-3 p-4">
      <input autoFocus placeholder="Título del evento" value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} className={field} />
      <div className="grid gap-3 sm:grid-cols-2">
        <input type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} className={field} />
        <input type="time" value={f.hora} onChange={(e) => setF({ ...f, hora: e.target.value })} className={field} />
        <select value={f.prioridad} onChange={(e) => setF({ ...f, prioridad: e.target.value })} className={field}>
          <option value="baja">Prioridad baja</option>
          <option value="media">Prioridad media</option>
          <option value="alta">Prioridad alta</option>
        </select>
        <select value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })} className={field}>
          <option value="general">General</option>
          <option value="documentacion">Documentación</option>
          <option value="facturacion">Facturación</option>
          <option value="reunion">Reunión</option>
          <option value="salida">Salida</option>
        </select>
        <select value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} className={field}>
          {Object.keys(COLORES).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={f.concurrente_id ?? ""}
          onChange={(e) => setF({ ...f, concurrente_id: e.target.value || null })}
          className={field}
        >
          <option value="">Sin concurrente</option>
          {personas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </div>
      <textarea
        rows={2}
        placeholder="Descripción"
        value={f.descripcion}
        onChange={(e) => setF({ ...f, descripcion: e.target.value })}
        className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
      />
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="h-10 rounded-lg border border-input px-4 text-sm font-medium hover:bg-accent">
          Cancelar
        </button>
        <button
          disabled={!f.titulo?.trim()}
          onClick={() => onSave(f)}
          className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Guardar evento
        </button>
      </div>
    </div>
  );
}

function CalendarioPage() {
  const qc = useQueryClient();
  const [vista, setVista] = useState<"mes" | "semana" | "dia">("mes");
  const [cursor, setCursor] = useState(new Date());
  const [seleccion, setSeleccion] = useState(hoyISO());
  const [creando, setCreando] = useState(false);

  const { data: eventos = [] } = useQuery({ queryKey: ["eventos"], queryFn: eventosApi.list });

  const crear = useMutation({
    mutationFn: (v: Partial<Evento>) => eventosApi.create(v),
    onSuccess: (ev) => {
      logHistorial({ entidad: "evento", accion: "alta", detalle: `Nuevo evento: ${ev.titulo}`, entidad_id: ev.id });
      qc.invalidateQueries({ queryKey: ["eventos"] });
      qc.invalidateQueries({ queryKey: ["historial"] });
      setCreando(false);
      toast.success("Evento creado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const actualizar = useMutation({
    mutationFn: ({ id, v }: { id: string; v: Partial<Evento> }) => eventosApi.update(id, v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["eventos"] }),
  });

  const borrar = useMutation({
    mutationFn: (id: string) => eventosApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["eventos"] });
      toast.success("Evento eliminado");
    },
  });

  const porFecha = useMemo(() => {
    const map: Record<string, Evento[]> = {};
    for (const e of eventos) (map[e.fecha] ||= []).push(e);
    return map;
  }, [eventos]);

  const dias = useMemo(() => {
    if (vista === "dia") return [parseISO(seleccion)];
    if (vista === "semana") {
      const base = parseISO(seleccion);
      const offset = (base.getDay() + 6) % 7;
      const inicio = new Date(base);
      inicio.setDate(base.getDate() - offset);
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(inicio);
        d.setDate(inicio.getDate() + i);
        return d;
      });
    }
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const primero = new Date(y, m, 1);
    const offset = (primero.getDay() + 6) % 7;
    const inicio = new Date(y, m, 1 - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      return d;
    });
  }, [vista, cursor, seleccion]);

  function mover(delta: number) {
    if (vista === "mes") setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
    else {
      const d = parseISO(seleccion);
      d.setDate(d.getDate() + delta * (vista === "semana" ? 7 : 1));
      setSeleccion(toISO(d));
      setCursor(d);
    }
  }

  const titulo =
    vista === "mes"
      ? `${MESES[cursor.getMonth()]} ${cursor.getFullYear()}`
      : vista === "semana"
        ? `Semana del ${formatFecha(toISO(dias[0]))}`
        : formatFecha(seleccion);

  const eventosSeleccion = (porFecha[seleccion] || []).sort((a, b) => (a.hora || "").localeCompare(b.hora || ""));

  return (
    <AppShell title="Calendario" description="Eventos, vencimientos y actividades">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
          <div className="flex items-center gap-1">
            <button onClick={() => mover(-1)} className="rounded-lg border border-input p-2 hover:bg-accent">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setCursor(new Date());
                setSeleccion(hoyISO());
              }}
              className="h-9 rounded-lg border border-input px-3 text-sm font-medium hover:bg-accent"
            >
              Hoy
            </button>
            <button onClick={() => mover(1)} className="rounded-lg border border-input p-2 hover:bg-accent">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <p className="truncate text-sm font-semibold capitalize sm:text-center">{titulo}</p>
          <div className="flex gap-1 rounded-lg border border-input p-1">
            {(["mes", "semana", "dia"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVista(v)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                  vista === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Panel>
            {vista !== "dia" && (
              <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center text-xs font-medium uppercase text-muted-foreground">
                {DIAS_SEMANA.map((d) => (
                  <div key={d} className="py-2">
                    {d}
                  </div>
                ))}
              </div>
            )}
            <div className={cn("grid", vista === "dia" ? "grid-cols-1" : "grid-cols-7")}>
              {dias.map((d) => {
                const iso = toISO(d);
                const delMes = vista !== "mes" || d.getMonth() === cursor.getMonth();
                const evs = porFecha[iso] || [];
                return (
                  <button
                    key={iso}
                    onClick={() => setSeleccion(iso)}
                    className={cn(
                      "min-h-[92px] border-b border-r border-border p-2 text-left align-top transition-colors hover:bg-accent/40",
                      !delMes && "bg-muted/30 text-muted-foreground",
                      seleccion === iso && "bg-accent/60 ring-1 ring-inset ring-primary",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-grid h-6 w-6 place-items-center rounded-full text-xs font-semibold",
                        iso === hoyISO() && "bg-primary text-primary-foreground",
                      )}
                    >
                      {d.getDate()}
                    </span>
                    <div className="mt-1 space-y-1">
                      {evs.slice(0, vista === "dia" ? 20 : 3).map((e) => (
                        <span key={e.id} className={cn("block truncate rounded px-1.5 py-0.5 text-[11px] font-medium", COLORES[e.color] || COLORES.azul)}>
                          {e.hora && `${e.hora} `}
                          {e.titulo}
                        </span>
                      ))}
                      {evs.length > 3 && vista !== "dia" && (
                        <span className="block text-[11px] text-muted-foreground">+{evs.length - 3} más</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </Panel>

          <div className="space-y-4">
            <Panel
              title={formatFecha(seleccion)}
              action={
                <button onClick={() => setCreando(true)} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  <Plus className="h-3.5 w-3.5" /> Agregar
                </button>
              }
            >
              {creando ? (
                <FormEvento fecha={seleccion} onCancel={() => setCreando(false)} onSave={(v) => crear.mutate(v)} />
              ) : eventosSeleccion.length === 0 ? (
                <EmptyState icon={CalendarDays} title="Sin eventos" hint="Agregá un evento para este día." />
              ) : (
                <ul className="divide-y divide-border">
                  {eventosSeleccion.map((e) => (
                    <li key={e.id} className="px-4 py-3">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                        <div className="min-w-0">
                          <p className={cn("truncate text-sm font-medium", e.estado === "hecho" && "line-through opacity-60")}>
                            {e.titulo}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {[e.hora, e.categoria].filter(Boolean).join(" · ")}
                          </p>
                          {e.descripcion && <p className="mt-1 text-xs text-muted-foreground">{e.descripcion}</p>}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            onClick={() => actualizar.mutate({ id: e.id, v: { estado: e.estado === "hecho" ? "pendiente" : "hecho" } })}
                            className="rounded-md p-1.5 text-muted-foreground hover:text-success"
                            aria-label="Marcar como hecho"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={() => borrar.mutate(e.id)} className="rounded-md p-1.5 text-muted-foreground hover:text-destructive" aria-label="Eliminar">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Chip tone={e.prioridad === "alta" ? "danger" : e.prioridad === "baja" ? "muted" : "warning"}>
                          {e.prioridad}
                        </Chip>
                        {e.estado === "hecho" && <Chip tone="success">Hecho</Chip>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Próximos 30 días">
              {(() => {
                const hoy = hoyISO();
                const prox = eventos
                  .filter((e) => e.fecha >= hoy)
                  .sort((a, b) => a.fecha.localeCompare(b.fecha))
                  .slice(0, 8);
                if (prox.length === 0) return <EmptyState icon={CalendarDays} title="Nada agendado" />;
                return (
                  <ul className="divide-y divide-border">
                    {prox.map((e) => (
                      <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="w-16 shrink-0 text-xs text-muted-foreground">{e.fecha.slice(5)}</span>
                        <span className="min-w-0 flex-1 truncate text-sm">{e.titulo}</span>
                        {e.hora && <span className="shrink-0 text-xs text-muted-foreground">{e.hora}</span>}
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </Panel>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
