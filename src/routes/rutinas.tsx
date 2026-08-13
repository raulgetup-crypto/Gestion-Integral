import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Circle,
  Plus,
  X,
  CalendarDays,
  Repeat,
  Trash2,
  Edit3,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, EmptyState, Chip } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { hoyISO, nombreMes } from "@/lib/format";

export const Route = createFileRoute("/rutinas")({
  head: () => ({
    meta: [
      { title: "Rutinas administrativas — Centro de Día" },
      {
        name: "description",
        content: "Checklist de tareas recurrentes diarias, semanales y mensuales.",
      },
    ],
  }),
  component: RutinasPage,
});

/* ── Tipos ── */
interface Rutina {
  id: string;
  titulo: string;
  descripcion: string | null;
  frecuencia: "diaria" | "semanal" | "mensual";
  orden: number;
  activo: boolean;
  ultima_completada: string | null;
  created_at: string;
}

/* ── API inline (hasta que se migre a api.ts) ── */
const rutinasApi = {
  list: async (): Promise<Rutina[]> => {
    const { data, error } = await supabase
      .from("rutinas")
      .select("*")
      .eq("activo", true)
      .order("orden", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
  create: async (input: Partial<Rutina>): Promise<Rutina> => {
    const { data, error } = await supabase.from("rutinas").insert(input).select().single();
    if (error) throw error;
    return data;
  },
  update: async (id: string, input: Partial<Rutina>): Promise<Rutina> => {
    const { data, error } = await supabase.from("rutinas").update(input).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  remove: async (id: string): Promise<void> => {
    const { error } = await supabase.from("rutinas").update({ activo: false }).eq("id", id);
    if (error) throw error;
  },
};

/* ── Helpers ── */
const hoy = () => new Date();
const inicioSemana = () => {
  const d = hoy();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};
const inicioMes = () => {
  const d = hoy();
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

function estaHecha(r: Rutina): boolean {
  if (!r.ultima_completada) return false;
  const ultima = new Date(r.ultima_completada);
  const hoyDate = hoy();
  if (r.frecuencia === "diaria") {
    return ultima.toDateString() === hoyDate.toDateString();
  }
  if (r.frecuencia === "semanal") {
    return ultima >= inicioSemana();
  }
  if (r.frecuencia === "mensual") {
    return ultima >= inicioMes();
  }
  return false;
}

const TABS = [
  { key: "diaria", label: "Diarias", icon: CalendarDays },
  { key: "semanal", label: "Semanales", icon: Repeat },
  { key: "mensual", label: "Mensuales", icon: CalendarDays },
] as const;

function RutinasPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"diaria" | "semanal" | "mensual">("diaria");
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Rutina | null>(null);

  const { data: rutinas = [] } = useQuery({
    queryKey: ["rutinas"],
    queryFn: rutinasApi.list,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<Rutina> }) => rutinasApi.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rutinas"] }),
  });

  const createMut = useMutation({
    mutationFn: rutinasApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rutinas"] });
      setModalOpen(false);
      setEditando(null);
    },
  });

  const removeMut = useMutation({
    mutationFn: rutinasApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rutinas"] }),
  });

  const filtradas = useMemo(() => rutinas.filter((r) => r.frecuencia === tab), [rutinas, tab]);
  const hechas = filtradas.filter((r) => estaHecha(r)).length;
  const total = filtradas.length;
  const pct = total > 0 ? Math.round((hechas / total) * 100) : 0;

  const toggle = (r: Rutina) => {
    const nuevaFecha = estaHecha(r) ? null : hoyISO();
    updateMut.mutate({ id: r.id, input: { ultima_completada: nuevaFecha } });
  };

  return (
    <AppShell title="Rutinas administrativas" description="Tareas recurrentes de secretaría">
      {/* ── Progreso ── */}
      <div className="mb-6 rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Progreso de {TABS.find((t) => t.key === tab)?.label.toLowerCase()}</span>
          </div>
          <span className="text-sm font-bold">{hechas}/{total} ({pct}%)</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        {pct === 100 && total > 0 && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> ¡Todas las tareas completadas!
          </p>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="mb-6 flex gap-1 rounded-lg border bg-card p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          const count = rutinas.filter((r) => r.frecuencia === t.key && !estaHecha(r)).length;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              {count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-primary-foreground text-primary" : "bg-muted text-foreground"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Acciones ── */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {TABS.find((t) => t.key === tab)?.label}
        </h2>
        <button
          onClick={() => {
            setEditando(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Nueva rutina
        </button>
      </div>

      {/* ── Lista ── */}
      <div className="space-y-2">
        {filtradas.length === 0 ? (
          <EmptyState
            icon={AlertCircle}
            title={`Sin rutinas ${tab}s`}
            hint="Creá tu primera tarea recurrente con el botón de arriba."
          />
        ) : (
          filtradas.map((r) => {
            const done = estaHecha(r);
            return (
              <div
                key={r.id}
                className={`group flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm transition-all ${
                  done ? "opacity-60" : ""
                }`}
              >
                <button
                  onClick={() => toggle(r)}
                  className="mt-0.5 shrink-0 text-primary transition-transform active:scale-90"
                  title={done ? "Desmarcar" : "Marcar como hecho"}
                >
                  {done ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <Circle className="h-6 w-6 text-muted-foreground hover:text-primary" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${done ? "line-through" : ""}`}>{r.titulo}</p>
                  {r.descripcion && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{r.descripcion}</p>
                  )}
                  <div className="mt-1.5 flex items-center gap-2">
                    <Chip tone={r.frecuencia === "diaria" ? "info" : r.frecuencia === "semanal" ? "warning" : "success"} className="text-[10px]">
                      {r.frecuencia}
                    </Chip>
                    {done && r.ultima_completada && (
                      <span className="text-[11px] text-muted-foreground">
                        Hecho hoy
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => {
                      setEditando(r);
                      setModalOpen(true);
                    }}
                    className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    title="Editar"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => removeMut.mutate(r.id)}
                    className="rounded p-1.5 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                    title="Eliminar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Modal ── */}
      {modalOpen && (
        <ModalRutina
          rutina={editando}
          frecuenciaDefault={tab}
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
                activo: true,
                orden: rutinas.length,
                created_at: new Date().toISOString(),
              } as Partial<Rutina>);
            }
          }}
        />
      )}
    </AppShell>
  );
}

/* ── Modal crear/editar ── */
function ModalRutina({
  rutina,
  frecuenciaDefault,
  onClose,
  onSave,
}: {
  rutina: Rutina | null;
  frecuenciaDefault: string;
  onClose: () => void;
  onSave: (data: Partial<Rutina>) => void;
}) {
  const [form, setForm] = useState<Partial<Rutina>>({
    titulo: rutina?.titulo ?? "",
    descripcion: rutina?.descripcion ?? "",
    frecuencia: rutina?.frecuencia ?? (frecuenciaDefault as Rutina["frecuencia"]),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo?.trim()) return;
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{rutina ? "Editar rutina" : "Nueva rutina"}</h2>
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
              placeholder="Ej: Revisar vencimientos de documentación"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Frecuencia</label>
            <select
              value={form.frecuencia}
              onChange={(e) => setForm((f) => ({ ...f, frecuencia: e.target.value as Rutina["frecuencia"] }))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="diaria">Diaria</option>
              <option value="semanal">Semanal</option>
              <option value="mensual">Mensual</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Descripción (opcional)</label>
            <textarea
              value={form.descripcion ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              rows={3}
              placeholder="Detalles o pasos a seguir..."
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
              {rutina ? "Guardar cambios" : "Crear rutina"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

