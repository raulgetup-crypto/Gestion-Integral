import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  ArrowRight,
  ArrowLeft,
  Archive,
  Trash2,
  Edit3,
  CalendarClock,
  AlertCircle,
  CheckCircle2,
  Circle,
  Clock,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, EmptyState, Chip } from "@/components/ui-kit";
import { tareasApi, type Tarea } from "@/lib/api";
import { formatFecha, diasHasta } from "@/lib/format";

export const Route = createFileRoute("/kanban")({
  head: () => ({
    meta: [
      { title: "Kanban — Centro de Día" },
      {
        name: "description",
        content: "Tablero de tareas administrativas por estado.",
      },
      { property: "og:title", content: "Kanban" },
      { property: "og:description", content: "Gestión visual de tareas pendientes, en progreso y completadas." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: KanbanPage,
});

const COLUMNAS = [
  { key: "pendiente", label: "Pendiente", icon: Circle, tone: "muted" as const },
  { key: "en_progreso", label: "En progreso", icon: Clock, tone: "info" as const },
  { key: "hecho", label: "Hecho", icon: CheckCircle2, tone: "success" as const },
  { key: "archivado", label: "Archivado", icon: Archive, tone: "muted" as const },
] as const;

type EstadoKanban = (typeof COLUMNAS)[number]["key"];

const PRIORIDAD_CHIP = {
  alta: { tone: "danger" as const, label: "Alta" },
  media: { tone: "warning" as const, label: "Media" },
  baja: { tone: "success" as const, label: "Baja" },
};

function KanbanPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Tarea | null>(null);
  const [mostrarArchivadas, setMostrarArchivadas] = useState(false);

  const { data: tareas = [] } = useQuery({
    queryKey: ["tareas"],
    queryFn: tareasApi.list,
  });

  const createMut = useMutation({
    mutationFn: tareasApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tareas"] });
      setModalOpen(false);
      setEditando(null);
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<Tarea> }) => tareasApi.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tareas"] }),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => tareasApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tareas"] }),
  });

  const mover = (t: Tarea, nuevoEstado: EstadoKanban) => {
    updateMut.mutate({ id: t.id, input: { estado: nuevoEstado } });
  };

  const visibleColumns = mostrarArchivadas
    ? COLUMNAS
    : COLUMNAS.filter((c) => c.key !== "archivado");

  const tareasPorColumna = (estado: EstadoKanban) =>
    tareas
      .filter((t) => t.estado === estado)
      .sort((a, b) => {
        // Orden: prioridad alta primero, luego por fecha de vencimiento
        const pa = PRIORIDAD_CHIP[a.prioridad as keyof typeof PRIORIDAD_CHIP]?.tone ?? "";
        const pb = PRIORIDAD_CHIP[b.prioridad as keyof typeof PRIORIDAD_CHIP]?.tone ?? "";
        if (pa === "danger" && pb !== "danger") return -1;
        if (pb === "danger" && pa !== "danger") return -1;
        if (a.vence && b.vence) return a.vence.localeCompare(b.vence);
        return 0;
      });

  return (
    <AppShell title="Kanban" description="Gestión visual de tareas">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditando(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Nueva tarea
          </button>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={mostrarArchivadas}
              onChange={(e) => setMostrarArchivadas(e.target.checked)}
              className="rounded border-border"
            />
            Mostrar archivadas
          </label>
        </div>
        <span className="text-sm text-muted-foreground">
          {tareas.filter((t) => t.estado !== "archivado").length} tareas activas
        </span>
      </div>

      {/* Kanban columns */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(280px, 1fr))` }}>
        {visibleColumns.map((col) => {
          const items = tareasPorColumna(col.key);
          const Icon = col.icon;
          return (
            <div key={col.key} className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Icon className="h-4 w-4" />
                {col.label}
                <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-bold">
                  {items.length}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {items.length === 0 ? (
                  <EmptyState
                    icon={Icon}
                    title={`Sin tareas ${col.label.toLowerCase()}`}
                    hint="Arrastrá o creá una nueva tarea."
                  />
                ) : (
                  items.map((t) => (
                    <TarjetaTarea
                      key={t.id}
                      tarea={t}
                      onMove={(nuevo) => mover(t, nuevo)}
                      onEdit={() => {
                        setEditando(t);
                        setModalOpen(true);
                      }}
                      onDelete={() => removeMut.mutate(t.id)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {modalOpen && (
        <ModalTarea
          tarea={editando}
          onClose={() => {
            setModalOpen(false);
            setEditando(null);
          }}
          onSave={(data) => {
            if (editando) {
              updateMut.mutate({ id: editando.id, input: data });
              setModalOpen(false);
              setEditando(null);
            } else {
              createMut.mutate({
                ...data,
                estado: data.estado ?? "pendiente",
                created_at: new Date().toISOString(),
              } as Partial<Tarea>);
            }
          }}
        />
      )}
    </AppShell>
  );
}

/* ── Tarjeta de tarea ── */
function TarjetaTarea({
  tarea,
  onMove,
  onEdit,
  onDelete,
}: {
  tarea: Tarea;
  onMove: (estado: EstadoKanban) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const prioridad = PRIORIDAD_CHIP[tarea.prioridad as keyof typeof PRIORIDAD_CHIP] ?? {
    tone: "muted" as const,
    label: tarea.prioridad,
  };

  const dias = tarea.vence ? diasHasta(tarea.vence) : null;
  const vencida = dias !== null && dias < 0;
  const proxima = dias !== null && dias >= 0 && dias <= 3;

  const idx = COLUMNAS.findIndex((c) => c.key === tarea.estado);
  const puedeAvanzar = idx < COLUMNAS.length - 1;
  const puedeRetroceder = idx > 0;

  return (
    <div className="group relative rounded-xl border bg-card p-3 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium leading-snug">{tarea.titulo}</h3>
        <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={onEdit}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            title="Editar"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="rounded p-1 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
            title="Eliminar"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {tarea.notas && (
        <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{tarea.notas}</p>
      )}

      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <Chip tone={prioridad.tone} className="text-[11px]">{prioridad.label}</Chip>
        {tarea.vence && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
              vencida
                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                : proxima
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            <CalendarClock className="h-3 w-3" />
            {vencida ? `Venció hace ${Math.abs(dias)}d` : proxima ? `Vence en ${dias}d` : formatFecha(tarea.vence)}
          </span>
        )}
      </div>

      {/* Botones de mover */}
      <div className="flex items-center gap-1 border-t border-border/50 pt-2">
        {puedeRetroceder && (
          <button
            onClick={() => onMove(COLUMNAS[idx - 1].key)}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> {COLUMNAS[idx - 1].label}
          </button>
        )}
        {puedeAvanzar && (
          <button
            onClick={() => onMove(COLUMNAS[idx + 1].key)}
            className="ml-auto inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            {COLUMNAS[idx + 1].label} <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Modal de crear/editar tarea ── */
function ModalTarea({
  tarea,
  onClose,
  onSave,
}: {
  tarea: Tarea | null;
  onClose: () => void;
  onSave: (data: Partial<Tarea>) => void;
}) {
  const [form, setForm] = useState<Partial<Tarea>>({
    titulo: tarea?.titulo ?? "",
    notas: tarea?.notas ?? "",
    prioridad: tarea?.prioridad ?? "media",
    estado: tarea?.estado ?? "pendiente",
    vence: tarea?.vence ?? "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo?.trim()) return;
    onSave({
      ...form,
      vence: form.vence || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{tarea ? "Editar tarea" : "Nueva tarea"}</h2>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Título</label>
            <input
              type="text"
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="Ej: Revisar planillas de marzo"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Prioridad</label>
              <select
                value={form.prioridad}
                onChange={(e) => setForm((f) => ({ ...f, prioridad: e.target.value }))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Estado</label>
              <select
                value={form.estado}
                onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {COLUMNAS.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Vencimiento</label>
            <input
              type="date"
              value={form.vence ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, vence: e.target.value || null }))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Notas</label>
            <textarea
              value={form.notas}
              onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              rows={3}
              placeholder="Detalles adicionales..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {tarea ? "Guardar cambios" : "Crear tarea"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

