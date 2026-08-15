import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, FileOutput, Search } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, EmptyState } from "@/components/ui-kit";
import { botonPrimario, botonSecundario, campo, Etiqueta } from "@/components/forms";
import { usePermisos } from "@/hooks/use-permisos";
import { supabase } from "@/integrations/supabase/client";
import { formatFecha } from "@/lib/format";
import { papeletasSalidaApi } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/papeletas-salida")({
  component: PapeletasSalidaPage,
});

interface Papeleta {
  id: string;
  persona_id: string | null;
  fecha_salida: string;
  hora_salida: string | null;
  motivo: string;
  autoriza: string;
  observaciones: string;
  activo: boolean;
  created_at: string;
}

const api = {
  list: async (): Promise<Papeleta[]> => {
    const { data, error } = await supabase
      .from("papeletas_salida")
      .select("*")
      .eq("activo", true)
      .order("fecha_salida", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  create: async (input: Partial<Papeleta>): Promise<Papeleta> => {
    const { data, error } = await supabase.from("papeletas_salida").insert(input as any).select().single();
    if (error) throw error;
    return data;
  },
  update: async (id: string, input: Partial<Papeleta>): Promise<Papeleta> => {
    const { data, error } = await supabase.from("papeletas_salida").update(input).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  remove: async (id: string): Promise<void> => {
    const { error } = await supabase.from("papeletas_salida").update({ activo: false }).eq("id", id);
    if (error) throw error;
  },
};

function PapeletasSalidaPage() {
  const { puedeEditar, esAdmin } = usePermisos();
  const queryClient = useQueryClient();
  const [busqueda, setBusqueda] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Papeleta | null>(null);

  const { data: papeletas = [] } = useQuery({ queryKey: ["papeletas-salida"], queryFn: api.list });

  const createMut = useMutation({
    mutationFn: api.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["papeletas-salida"] }); setModalOpen(false); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<Papeleta> }) => api.update(id, input),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["papeletas-salida"] }); setModalOpen(false); },
  });
  const removeMut = useMutation({
    mutationFn: api.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["papeletas-salida"] }),
  });

  const filtradas = useMemo(() => {
    const b = busqueda.toLowerCase();
    return papeletas.filter((p) =>
      p.motivo.toLowerCase().includes(b) ||
      p.autoriza.toLowerCase().includes(b) ||
      p.fecha_salida.includes(b)
    );
  }, [papeletas, busqueda]);

  return (
    <AppShell title="Papeletas de salida" description="Registro de salidas de concurrentes">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por motivo, autoriza o fecha..."
              className={cn(campo, "pl-9")}
            />
          </div>
          {puedeEditar && (
            <button onClick={() => { setEditando(null); setModalOpen(true); }} className={botonPrimario}>
              <Plus className="h-4 w-4" /> Nueva papeleta
            </button>
          )}
        </div>

        <Panel>
          {filtradas.length === 0 ? (
            <EmptyState icon={FileOutput} title="Sin papeletas" hint="Registrá la primera salida." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Hora</th>
                    <th className="px-4 py-3">Motivo</th>
                    <th className="px-4 py-3">Autoriza</th>
                    <th className="px-4 py-3">Observaciones</th>
                    {puedeEditar && <th className="px-4 py-3 text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtradas.map((p) => (
                    <tr key={p.id} className="hover:bg-accent/40">
                      <td className="px-4 py-3 whitespace-nowrap">{formatFecha(p.fecha_salida)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{p.hora_salida ?? "—"}</td>
                      <td className="px-4 py-3">{p.motivo}</td>
                      <td className="px-4 py-3">{p.autoriza}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.observaciones || "—"}</td>
                      {puedeEditar && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => { setEditando(p); setModalOpen(true); }} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-primary">
                              <Pencil className="h-4 w-4" />
                            </button>
                            {esAdmin && (
                              <button onClick={() => removeMut.mutate(p.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-destructive">
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
        <ModalPapeleta
          papeleta={editando}
          onClose={() => setModalOpen(false)}
          onSave={(data) => { editando ? updateMut.mutate({ id: editando.id, input: data }) : createMut.mutate(data); }}
          guardando={createMut.isPending || updateMut.isPending}
        />
      )}
    </AppShell>
  );
}

function ModalPapeleta({ papeleta, onClose, onSave, guardando }: {
  papeleta: Papeleta | null; onClose: () => void; onSave: (data: Partial<Papeleta>) => void; guardando?: boolean;
}) {
  const [form, setForm] = useState({
    fecha_salida: papeleta?.fecha_salida ?? new Date().toISOString().slice(0, 10),
    hora_salida: papeleta?.hora_salida ?? "",
    motivo: papeleta?.motivo ?? "",
    solicitado_por: (papeleta as any)?.solicitado_por ?? "",
    autoriza: papeleta?.autoriza ?? "",
    observaciones: papeleta?.observaciones ?? "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.motivo.trim() || !form.solicitado_por.trim()) return;
    onSave({
      fecha_salida: form.fecha_salida,
      hora_salida: form.hora_salida || null,
      motivo: form.motivo,
      solicitado_por: form.solicitado_por,
      autoriza: form.autoriza || undefined,
      observaciones: form.observaciones || undefined,
    } as any);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-lg">
        <h3 className="text-lg font-semibold">{papeleta ? "Editar papeleta" : "Nueva papeleta"}</h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><Etiqueta>Fecha de salida</Etiqueta>
              <input type="date" value={form.fecha_salida} onChange={(e) => setForm({ ...form, fecha_salida: e.target.value })} className={campo} required />
            </label>
            <label className="block"><Etiqueta>Hora</Etiqueta>
              <input type="time" value={form.hora_salida} onChange={(e) => setForm({ ...form, hora_salida: e.target.value })} className={campo} />
            </label>
          </div>
          <label className="block"><Etiqueta>Solicitado por</Etiqueta>
            <input value={form.solicitado_por} onChange={(e) => setForm({ ...form, solicitado_por: e.target.value })} className={campo} placeholder="Nombre de quien solicita" required />
          </label>
          <label className="block"><Etiqueta>Motivo</Etiqueta>
            <input value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} className={campo} placeholder="Ej. Consulta médica" required />
          </label>
          <label className="block"><Etiqueta>Autoriza</Etiqueta>
            <input value={form.autoriza} onChange={(e) => setForm({ ...form, autoriza: e.target.value })} className={campo} placeholder="Nombre de quien autoriza" />
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
