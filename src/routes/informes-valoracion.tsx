import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, FileCheck, Search, Check } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, Chip, EmptyState } from "@/components/ui-kit";
import { botonPrimario, botonSecundario, campo, Etiqueta } from "@/components/forms";
import { usePermisos } from "@/hooks/use-permisos";
import { supabase } from "@/integrations/supabase/client";
import { formatFecha } from "@/lib/format";
import { informesValoracionApi } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/informes-valoracion")({
  component: InformesValoracionPage,
});

interface Informe {
  id: string;
  persona_id: string | null;
  fecha_entrega: string | null;
  entregado: boolean;
  metodo_entrega: string;
  observaciones: string;
  activo: boolean;
  created_at: string;
}

const api = {
  list: informesValoracionApi.list,
  create: informesValoracionApi.create,
  update: informesValoracionApi.update,
  remove: informesValoracionApi.remove,
};

function InformesValoracionPage() {
  const { puedeEditar, esAdmin } = usePermisos();
  const queryClient = useQueryClient();
  const [busqueda, setBusqueda] = useState("");
  const [filtroEntregado, setFiltroEntregado] = useState<string>("todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Informe | null>(null);

  const { data: informes = [] } = useQuery({ queryKey: ["informes-valoracion"], queryFn: api.list });

  const createMut = useMutation({
    mutationFn: api.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["informes-valoracion"] }); setModalOpen(false); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<Informe> }) => api.update(id, input),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["informes-valoracion"] }); setModalOpen(false); },
  });
  const removeMut = useMutation({
    mutationFn: api.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["informes-valoracion"] }),
  });

  const toggleEntregado = (i: Informe) => {
    updateMut.mutate({ id: i.id, input: { entregado: !i.entregado } });
  };

  const filtradas = useMemo(() => {
    const b = busqueda.toLowerCase();
    return informes.filter((i) => {
      const matchBusqueda = i.metodo_entrega.toLowerCase().includes(b) || i.observaciones.toLowerCase().includes(b);
      const matchFiltro = filtroEntregado === "todos" || (filtroEntregado === "entregado" && i.entregado) || (filtroEntregado === "pendiente" && !i.entregado);
      return matchBusqueda && matchFiltro;
    });
  }, [informes, busqueda, filtroEntregado]);

  return (
    <AppShell title="Informes de valoración" description="Seguimiento de entrega de informes a familias">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por método u observaciones..." className={cn(campo, "pl-9")} />
          </div>
          <select value={filtroEntregado} onChange={(e) => setFiltroEntregado(e.target.value)} className={campo}>
            <option value="todos">Todos</option>
            <option value="entregado">Entregados</option>
            <option value="pendiente">Pendientes</option>
          </select>
          {puedeEditar && (
            <button onClick={() => { setEditando(null); setModalOpen(true); }} className={botonPrimario}>
              <Plus className="h-4 w-4" /> Nuevo informe
            </button>
          )}
        </div>

        <Panel>
          {filtradas.length === 0 ? (
            <EmptyState icon={FileCheck} title="Sin informes" hint="Registrá el primer informe de valoración." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Fecha entrega</th>
                    <th className="px-4 py-3">Método</th>
                    <th className="px-4 py-3">Observaciones</th>
                    {puedeEditar && <th className="px-4 py-3 text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtradas.map((i) => (
                    <tr key={i.id} className={cn("hover:bg-accent/40", i.entregado && "opacity-60")}>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleEntregado(i)} className="inline-flex items-center gap-1.5">
                          <span className={cn("grid h-5 w-5 place-items-center rounded-full border text-xs", i.entregado ? "border-success bg-success text-success-foreground" : "border-muted")}>
                            {i.entregado && <Check className="h-3 w-3" />}
                          </span>
                          <Chip tone={i.entregado ? "success" : "warning"}>{i.entregado ? "Entregado" : "Pendiente"}</Chip>
                        </button>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{i.fecha_entrega ? formatFecha(i.fecha_entrega) : "—"}</td>
                      <td className="px-4 py-3">{i.metodo_entrega || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{i.observaciones || "—"}</td>
                      {puedeEditar && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => { setEditando(i); setModalOpen(true); }} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-primary">
                              <Pencil className="h-4 w-4" />
                            </button>
                            {esAdmin && (
                              <button onClick={() => removeMut.mutate(i.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      {modalOpen && (
        <ModalInforme
          informe={editando}
          onClose={() => setModalOpen(false)}
          onSave={(data) => { editando ? updateMut.mutate({ id: editando.id, input: data }) : createMut.mutate(data); }}
          guardando={createMut.isPending || updateMut.isPending}
        />
      )}
    </AppShell>
  );
}

function ModalInforme({ informe, onClose, onSave, guardando }: {
  informe: Informe | null; onClose: () => void; onSave: (data: Partial<Informe>) => void; guardando?: boolean;
}) {
  const [form, setForm] = useState({
    fecha_entrega: informe?.fecha_entrega ?? "",
    entregado: informe?.entregado ?? false,
    metodo_entrega: informe?.metodo_entrega ?? "",
    observaciones: informe?.observaciones ?? "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      fecha_entrega: form.fecha_entrega || null,
      entregado: form.entregado,
      metodo_entrega: form.metodo_entrega || undefined,
      observaciones: form.observaciones || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-lg">
        <h3 className="text-lg font-semibold">{informe ? "Editar informe" : "Nuevo informe"}</h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><Etiqueta>Fecha de entrega</Etiqueta>
              <input type="date" value={form.fecha_entrega} onChange={(e) => setForm({ ...form, fecha_entrega: e.target.value })} className={campo} />
            </label>
            <label className="block flex items-center gap-2 pt-6">
              <input type="checkbox" checked={form.entregado} onChange={(e) => setForm({ ...form, entregado: e.target.checked })} className="h-4 w-4" />
              <span className="text-sm">Entregado</span>
            </label>
          </div>
          <label className="block"><Etiqueta>Método de entrega</Etiqueta>
            <input value={form.metodo_entrega} onChange={(e) => setForm({ ...form, metodo_entrega: e.target.value })} className={campo} placeholder="Ej. Entrega personal, correo..." />
          </label>
          <label className="block"><Etiqueta>Observaciones</Etiqueta>
            <textarea value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} className={cn(campo, "min-h-[80px]")} placeholder="Opcional" />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className={botonSecundario}>Cancelar</button>
            <button type="submit" className={botonPrimario} disabled={guardando}>{guardando ? "Guardando..." : "Guardar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
