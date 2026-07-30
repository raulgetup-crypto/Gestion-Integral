import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, ClipboardList, Check, MessageSquare, ListTodo } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, Chip, EmptyState } from "@/components/ui-kit";
import { turnosApi, tareasApi, mensajesApi, logHistorial, type Turno, type Tarea, type Mensaje } from "@/lib/api";
import { hoyISO, formatFecha } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/turnero")({
  head: () => ({
    meta: [
      { title: "Turnero — Centro de Día" },
      {
        name: "description",
        content: "Turnero con guardado automático: admisiones, entrevistas, tareas del día y consultas recibidas.",
      },
      { property: "og:title", content: "Turnero — Centro de Día" },
      { property: "og:description", content: "Agenda de turnos, tareas pendientes y consultas del Centro de Día." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TurneroPage,
});

const field = "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm";

function TurnosSection() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<Turno>>({ fecha: hoyISO(), hora: "09:00", tipo: "admision", nombre: "", contacto: "", obra_social: "", notas: "" });
  const { data: turnos = [] } = useQuery({ queryKey: ["turnos"], queryFn: turnosApi.list });

  const crear = useMutation({
    mutationFn: () => turnosApi.create(form),
    onSuccess: (t) => {
      logHistorial({ entidad: "turno", accion: "alta", detalle: `Turno para ${t.nombre} el ${t.fecha} ${t.hora}`, entidad_id: t.id });
      qc.invalidateQueries({ queryKey: ["turnos"] });
      qc.invalidateQueries({ queryKey: ["historial"] });
      setForm({ fecha: hoyISO(), hora: "09:00", tipo: "admision", nombre: "", contacto: "", obra_social: "", notas: "" });
      toast.success("Turno guardado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cambiarEstado = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: string }) => turnosApi.update(id, { estado }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["turnos"] }),
  });

  const borrar = useMutation({
    mutationFn: (id: string) => turnosApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["turnos"] }),
  });

  const agrupados = useMemo(() => {
    const map: Record<string, Turno[]> = {};
    for (const t of [...turnos].sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`))) {
      (map[t.fecha] ||= []).push(t);
    }
    return map;
  }, [turnos]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Panel title={`${turnos.length} turnos agendados`} action={<Chip tone="muted">Guardado automático</Chip>}>
        {turnos.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Sin turnos" hint="Cargá el primer turno desde el formulario." />
        ) : (
          <div className="divide-y divide-border">
            {Object.entries(agrupados).map(([fecha, items]) => (
              <div key={fecha}>
                <p className="bg-muted/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {formatFecha(fecha)}
                </p>
                <ul className="divide-y divide-border">
                  {items.map((t) => (
                    <li key={t.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
                      <span className="w-12 shrink-0 text-sm font-semibold tabular-nums">{t.hora}</span>
                      <div className="min-w-0">
                        <p className={cn("truncate text-sm font-medium", t.estado === "atendido" && "line-through opacity-60")}>
                          {t.nombre}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[t.tipo, t.obra_social, t.contacto].filter(Boolean).join(" · ")}
                        </p>
                        {t.notas && <p className="truncate text-xs italic text-muted-foreground">{t.notas}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Chip tone={t.estado === "atendido" ? "success" : t.estado === "ausente" ? "danger" : "muted"}>{t.estado}</Chip>
                        <button
                          onClick={() => cambiarEstado.mutate({ id: t.id, estado: t.estado === "atendido" ? "pendiente" : "atendido" })}
                          className="rounded-md p-1.5 text-muted-foreground hover:text-success"
                          aria-label="Marcar atendido"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button onClick={() => borrar.mutate(t.id)} className="rounded-md p-1.5 text-muted-foreground hover:text-destructive" aria-label="Eliminar">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Nuevo turno">
        <div className="space-y-3 p-4">
          <input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={field} />
          <div className="grid grid-cols-2 gap-3">
            <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className={field} />
            <input type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} className={field} />
          </div>
          <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className={field}>
            <option value="admision">Admisión</option>
            <option value="entrevista">Entrevista</option>
            <option value="seguimiento">Seguimiento</option>
            <option value="reunion">Reunión familiar</option>
          </select>
          <input placeholder="Obra social" value={form.obra_social} onChange={(e) => setForm({ ...form, obra_social: e.target.value })} className={field} />
          <input placeholder="Contacto" value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} className={field} />
          <textarea rows={2} placeholder="Notas" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm" />
          <button
            disabled={!form.nombre?.trim()}
            onClick={() => crear.mutate()}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Guardar turno
          </button>
        </div>
      </Panel>
    </div>
  );
}

function TareasSection() {
  const qc = useQueryClient();
  const [titulo, setTitulo] = useState("");
  const [prioridad, setPrioridad] = useState("media");
  const [vence, setVence] = useState("");
  const { data: tareas = [] } = useQuery({ queryKey: ["tareas"], queryFn: tareasApi.list });

  const crear = useMutation({
    mutationFn: () => tareasApi.create({ titulo, prioridad, vence: vence || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tareas"] });
      setTitulo("");
      setVence("");
    },
  });
  const toggle = useMutation({
    mutationFn: (t: Tarea) => tareasApi.update(t.id, { estado: t.estado === "hecha" ? "pendiente" : "hecha" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tareas"] }),
  });
  const borrar = useMutation({
    mutationFn: (id: string) => tareasApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tareas"] }),
  });

  return (
    <Panel title={`Tareas · ${tareas.filter((t) => t.estado !== "hecha").length} pendientes`}>
      <div className="grid gap-2 border-b border-border p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
        <input placeholder="Nueva tarea…" value={titulo} onChange={(e) => setTitulo(e.target.value)} className={field} />
        <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className={cn(field, "sm:w-32")}>
          <option value="baja">Baja</option>
          <option value="media">Media</option>
          <option value="alta">Alta</option>
        </select>
        <input type="date" value={vence} onChange={(e) => setVence(e.target.value)} className={cn(field, "sm:w-40")} />
        <button
          disabled={!titulo.trim()}
          onClick={() => crear.mutate()}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Agregar
        </button>
      </div>
      {tareas.length === 0 ? (
        <EmptyState icon={ListTodo} title="Sin tareas" hint="Agregá tareas del día." />
      ) : (
        <ul className="divide-y divide-border">
          {tareas.map((t) => (
            <li key={t.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
              <button
                onClick={() => toggle.mutate(t)}
                className={cn(
                  "grid h-5 w-5 shrink-0 place-items-center rounded-md border",
                  t.estado === "hecha" ? "border-success bg-success text-success-foreground" : "border-border",
                )}
              >
                {t.estado === "hecha" && <Check className="h-3.5 w-3.5" />}
              </button>
              <div className="min-w-0">
                <p className={cn("truncate text-sm", t.estado === "hecha" && "line-through opacity-60")}>{t.titulo}</p>
                {t.vence && <p className="text-xs text-muted-foreground">Vence {formatFecha(t.vence)}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Chip tone={t.prioridad === "alta" ? "danger" : t.prioridad === "baja" ? "muted" : "warning"}>{t.prioridad}</Chip>
                <button onClick={() => borrar.mutate(t.id)} className="rounded-md p-1.5 text-muted-foreground hover:text-destructive" aria-label="Eliminar">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function MensajesSection() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<Mensaje>>({ nombre: "", motivo: "", fecha: hoyISO(), notas: "" });
  const { data: mensajes = [] } = useQuery({ queryKey: ["mensajes"], queryFn: mensajesApi.list });

  const crear = useMutation({
    mutationFn: () => mensajesApi.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mensajes"] });
      setForm({ nombre: "", motivo: "", fecha: hoyISO(), notas: "" });
      toast.success("Consulta registrada");
    },
  });
  const borrar = useMutation({
    mutationFn: (id: string) => mensajesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mensajes"] }),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Panel title={`Consultas recibidas · ${mensajes.length}`}>
        {mensajes.length === 0 ? (
          <EmptyState icon={MessageSquare} title="Sin consultas" hint="Registrá las consultas que llegan al centro." />
        ) : (
          <ul className="divide-y divide-border">
            {mensajes.map((m) => (
              <li key={m.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{m.nombre}</p>
                  {m.motivo && <p className="truncate text-xs text-muted-foreground">{m.motivo}</p>}
                  <p className="text-xs text-muted-foreground">{formatFecha(m.fecha)}</p>
                  {m.notas && <p className="mt-1 text-xs italic text-muted-foreground">{m.notas}</p>}
                </div>
                <button onClick={() => borrar.mutate(m.id)} className="rounded-md p-1.5 text-muted-foreground hover:text-destructive" aria-label="Eliminar">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title="Nueva consulta">
        <div className="space-y-3 p-4">
          <input placeholder="¿Quién consulta?" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={field} />
          <input placeholder="Motivo" value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} className={field} />
          <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className={field} />
          <textarea rows={2} placeholder="Notas" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm" />
          <button
            disabled={!form.nombre?.trim()}
            onClick={() => crear.mutate()}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Guardar consulta
          </button>
        </div>
      </Panel>
    </div>
  );
}

function TurneroPage() {
  const [tab, setTab] = useState<"turnos" | "tareas" | "consultas">("turnos");
  return (
    <AppShell title="Turnero" description="Turnos, tareas del día y consultas">
      <div className="mb-4 flex gap-1 rounded-lg border border-input p-1 sm:w-fit">
        {(["turnos", "tareas", "consultas"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors sm:flex-none",
              tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
            )}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "turnos" && <TurnosSection />}
      {tab === "tareas" && <TareasSection />}
      {tab === "consultas" && <MensajesSection />}
    </AppShell>
  );
}
