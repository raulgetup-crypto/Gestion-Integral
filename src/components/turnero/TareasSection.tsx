import { useMemo, useState } from "react";
import { Plus, Trash2, Check, ListTodo, Search } from "lucide-react";
import { Panel, Chip, EmptyState } from "@/components/ui-kit";
import { campo, Segmentado } from "@/components/forms";
import { useEntidad } from "@/hooks/use-entidad";
import { tareasApi, type Tarea } from "@/lib/api";
import { formatFecha } from "@/lib/format";
import { cn } from "@/lib/utils";

const FILTROS = [
  { value: "pendientes" as const, label: "Pendientes" },
  { value: "hechas" as const, label: "Hechas" },
  { value: "todas" as const, label: "Todas" },
];

export function TareasSection() {
  const { datos: tareas, crear, actualizar, eliminar } = useEntidad<Tarea>("tareas", tareasApi, {
    etiqueta: "tarea",
  });
  const [titulo, setTitulo] = useState("");
  const [prioridad, setPrioridad] = useState("media");
  const [vence, setVence] = useState("");
  const [filtro, setFiltro] = useState<"pendientes" | "hechas" | "todas">("pendientes");
  const [busqueda, setBusqueda] = useState("");

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return tareas.filter((t) => {
      if (filtro === "pendientes" && t.estado === "hecha") return false;
      if (filtro === "hechas" && t.estado !== "hecha") return false;
      return !q || t.titulo.toLowerCase().includes(q);
    });
  }, [tareas, filtro, busqueda]);

  const duplicada = tareas.some(
    (t) => t.estado !== "hecha" && t.titulo.trim().toLowerCase() === titulo.trim().toLowerCase(),
  );

  function agregar() {
    const limpio = titulo.trim();
    if (!limpio || duplicada) return;
    crear.mutate(
      { titulo: limpio, prioridad, vence: vence || null },
      {
        onSuccess: () => {
          setTitulo("");
          setVence("");
        },
      },
    );
  }

  return (
    <Panel title={`Tareas · ${tareas.filter((t) => t.estado !== "hecha").length} pendientes`}>
      <div className="space-y-2 border-b border-border p-4">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
          <input
            placeholder="Nueva tarea…"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && agregar()}
            className={campo}
          />
          <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className={cn(campo, "sm:w-32")}>
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
          </select>
          <input type="date" value={vence} onChange={(e) => setVence(e.target.value)} className={cn(campo, "sm:w-40")} />
          <button
            disabled={!titulo.trim() || duplicada || crear.isPending}
            onClick={agregar}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Agregar
          </button>
        </div>
        {titulo.trim() && duplicada && (
          <p className="text-xs text-destructive">Ya existe una tarea pendiente con ese título.</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Segmentado valor={filtro} opciones={FILTROS} onChange={setFiltro} />
          <div className="relative min-w-[160px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar tarea…"
              className={cn(campo, "h-9 pl-8 text-xs")}
            />
          </div>
        </div>
      </div>

      {lista.length === 0 ? (
        <EmptyState icon={ListTodo} title="Sin tareas" hint="Agregá tareas del día." />
      ) : (
        <ul className="divide-y divide-border">
          {lista.map((t) => (
            <li key={t.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
              <button
                onClick={() => actualizar.mutate({ id: t.id, cambios: { estado: t.estado === "hecha" ? "pendiente" : "hecha" } })}
                aria-label="Alternar tarea"
                className={cn(
                  "grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors",
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
                <select
                  value={t.prioridad}
                  onChange={(e) => actualizar.mutate({ id: t.id, cambios: { prioridad: e.target.value } })}
                  className="h-7 rounded-md border border-input bg-card px-1.5 text-[11px]"
                  aria-label="Prioridad"
                >
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                </select>
                <Chip tone={t.prioridad === "alta" ? "danger" : t.prioridad === "baja" ? "muted" : "warning"}>
                  {t.prioridad}
                </Chip>
                <button
                  onClick={() => eliminar.mutate({ id: t.id, etiqueta: `la tarea "${t.titulo}"` })}
                  className="rounded-md p-1.5 text-muted-foreground hover:text-destructive"
                  aria-label="Eliminar"
                >
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
