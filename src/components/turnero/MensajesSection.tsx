import { useMemo, useState } from "react";
import { Plus, Trash2, MessageSquare, Search, Check } from "lucide-react";
import { Panel, Chip, EmptyState } from "@/components/ui-kit";
import { campo, areaTexto, Etiqueta } from "@/components/forms";
import { useEntidad } from "@/hooks/use-entidad";
import { mensajesApi, type Mensaje } from "@/lib/api";
import { hoyISO, formatFecha } from "@/lib/format";
import { cn } from "@/lib/utils";

export function MensajesSection() {
  const { datos: mensajes, crear, actualizar, eliminar } = useEntidad<Mensaje>("mensajes", mensajesApi, {
    etiqueta: "consulta",
  });
  const [form, setForm] = useState<Partial<Mensaje>>({ nombre: "", motivo: "", fecha: hoyISO(), notas: "" });
  const [busqueda, setBusqueda] = useState("");

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return mensajes;
    return mensajes.filter((m) => [m.nombre, m.motivo, m.notas].join(" ").toLowerCase().includes(q));
  }, [mensajes, busqueda]);

  function guardar() {
    const nombre = (form.nombre ?? "").trim();
    if (!nombre) return;
    crear.mutate(
      { ...form, nombre, motivo: (form.motivo ?? "").trim(), notas: (form.notas ?? "").trim() },
      { onSuccess: () => setForm({ nombre: "", motivo: "", fecha: hoyISO(), notas: "" }) },
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Panel
        title={`Consultas recibidas · ${lista.length}`}
        action={
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar…"
              className="h-8 w-36 rounded-lg border border-input bg-card pl-7 pr-2 text-xs sm:w-48"
            />
          </div>
        }
      >
        {lista.length === 0 ? (
          <EmptyState icon={MessageSquare} title="Sin consultas" hint="Registrá las consultas que llegan al centro." />
        ) : (
          <ul className="divide-y divide-border">
            {lista.map((m) => (
              <li key={m.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className={cn("truncate text-sm font-medium", m.estado === "resuelto" && "line-through opacity-60")}>
                    {m.nombre}
                  </p>
                  {m.motivo && <p className="truncate text-xs text-muted-foreground">{m.motivo}</p>}
                  <p className="text-xs text-muted-foreground">{formatFecha(m.fecha)}</p>
                  {m.notas && <p className="mt-1 text-xs italic text-muted-foreground">{m.notas}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Chip tone={m.estado === "resuelto" ? "success" : "muted"}>{m.estado}</Chip>
                  <button
                    onClick={() =>
                      actualizar.mutate({
                        id: m.id,
                        cambios: { estado: m.estado === "resuelto" ? "pendiente" : "resuelto" },
                      })
                    }
                    className="rounded-md p-1.5 text-muted-foreground hover:text-success"
                    aria-label="Marcar resuelta"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => eliminar.mutate({ id: m.id, etiqueta: `la consulta de ${m.nombre}` })}
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

      <Panel title="Nueva consulta">
        <div className="space-y-3 p-4">
          <label className="block">
            <Etiqueta>¿Quién consulta?</Etiqueta>
            <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={campo} />
          </label>
          <label className="block">
            <Etiqueta>Motivo</Etiqueta>
            <input value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} className={campo} />
          </label>
          <label className="block">
            <Etiqueta>Fecha</Etiqueta>
            <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className={campo} />
          </label>
          <label className="block">
            <Etiqueta>Notas</Etiqueta>
            <textarea rows={2} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} className={areaTexto} />
          </label>
          <button
            disabled={!form.nombre?.trim() || crear.isPending}
            onClick={guardar}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Guardar consulta
          </button>
        </div>
      </Panel>
    </div>
  );
}
