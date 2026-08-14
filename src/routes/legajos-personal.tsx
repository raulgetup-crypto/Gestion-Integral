import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Briefcase, Search, ExternalLink } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, EmptyState } from "@/components/ui-kit";
import { botonPrimario, botonSecundario, campo, Etiqueta } from "@/components/forms";
import { usePermisos } from "@/hooks/use-permisos";
import { supabase } from "@/integrations/supabase/client";
import { formatFecha } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/legajos-personal")({
  component: LegajosPersonalPage,
});

interface Legajo {
  id: string;
  usuario_id: number | null;
  nombre: string;
  categoria: string;
  storage_path: string;
  archivo_nombre: string | null;
  vencimiento: string | null;
  activo: boolean;
  created_at: string;
}

const api = {
  list: async (): Promise<Legajo[]> => {
    const { data, error } = await supabase
      .from("legajos_personal")
      .select("*")
      .eq("activo", true)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(d => ({ ...d, activo: !!d.activo })) as Legajo[];
  },
  create: async (input: Partial<Legajo>): Promise<Legajo> => {
    const { data, error } = await supabase.from("legajos_personal").insert(input).select().single();
    if (error) throw error;
    return { ...data, activo: !!data.activo };
  },
  update: async (id: string, input: Partial<Legajo>): Promise<Legajo> => {
    const { data, error } = await supabase.from("legajos_personal").update(input).eq("id", id).select().single();
    if (error) throw error;
    return { ...data, activo: !!data.activo };
  },
  remove: async (id: string): Promise<void> => {
    const { error } = await supabase.from("legajos_personal").update({ activo: false }).eq("id", id);
    if (error) throw error;
  },
};

async function subirArchivo(bucket: string, path: string, file: File): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

function LegajosPersonalPage() {
  const { puedeEditar, esAdmin } = usePermisos();
  const queryClient = useQueryClient();
  const [busqueda, setBusqueda] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Legajo | null>(null);

  const { data: legajos = [] } = useQuery({ queryKey: ["legajos-personal"], queryFn: api.list });

  const createMut = useMutation({
    mutationFn: api.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["legajos-personal"] }); setModalOpen(false); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<Legajo> }) => api.update(id, input),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["legajos-personal"] }); setModalOpen(false); },
  });
  const removeMut = useMutation({
    mutationFn: api.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["legajos-personal"] }),
  });

  const filtrados = useMemo(() => {
    const b = busqueda.toLowerCase();
    return legajos.filter((l) =>
      l.nombre.toLowerCase().includes(b) ||
      l.categoria.toLowerCase().includes(b)
    );
  }, [legajos, busqueda]);

  const getPublicUrl = (path: string) => {
    if (!path) return null;
    const { data } = supabase.storage.from("documentos").getPublicUrl(path);
    return data?.publicUrl ?? null;
  };

  return (
    <AppShell title="Legajos de personal" description="Documentación y archivos del equipo">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o categoría..."
              className={cn(campo, "pl-9")}
            />
          </div>
          {puedeEditar && (
            <button onClick={() => { setEditando(null); setModalOpen(true); }} className={botonPrimario}>
              <Plus className="h-4 w-4" /> Nuevo documento
            </button>
          )}
        </div>

        <Panel>
          {filtrados.length === 0 ? (
            <EmptyState icon={Briefcase} title="Sin documentos" hint="Subí el primer documento del personal." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3">Vencimiento</th>
                    <th className="px-4 py-3">Archivo</th>
                    {puedeEditar && <th className="px-4 py-3 text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtrados.map((l) => (
                    <tr key={l.id} className="hover:bg-accent/40">
                      <td className="px-4 py-3 font-medium">{l.nombre}</td>
                      <td className="px-4 py-3">{l.categoria || "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{l.vencimiento ? formatFecha(l.vencimiento) : "—"}</td>
                      <td className="px-4 py-3">
                        {l.storage_path ? (
                          <a href={getPublicUrl(l.storage_path) ?? "#"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                            <ExternalLink className="h-3 w-3" /> Ver
                          </a>
                        ) : "—"}
                      </td>
                      {puedeEditar && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => { setEditando(l); setModalOpen(true); }} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-primary">
                              <Pencil className="h-4 w-4" />
                            </button>
                            {esAdmin && (
                              <button onClick={() => removeMut.mutate(l.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-destructive">
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
        <ModalLegajo
          legajo={editando}
          onClose={() => setModalOpen(false)}
          onSave={(data) => { editando ? updateMut.mutate({ id: editando.id, input: data }) : createMut.mutate(data); }}
          guardando={createMut.isPending || updateMut.isPending}
        />
      )}
    </AppShell>
  );
}

function ModalLegajo({ legajo, onClose, onSave, guardando }: {
  legajo: Legajo | null; onClose: () => void; onSave: (data: Partial<Legajo>) => void; guardando?: boolean;
}) {
  const [form, setForm] = useState({
    nombre: legajo?.nombre ?? "",
    categoria: legajo?.categoria ?? "",
    vencimiento: legajo?.vencimiento ?? "",
    storage_path: legajo?.storage_path ?? "",
    usuario_id: legajo?.usuario_id ?? null,
  });
  const [archivo, setArchivo] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  const { data: usuarios = [] } = useQuery({
    queryKey: ["usuarios"],
    queryFn: async () => {
      const { data } = await supabase.from("usuarios").select("*").eq("activo", true);
      return data || [];
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    let path = form.storage_path || undefined;
    let archNombre = legajo?.archivo_nombre || null;

    if (archivo) {
      setSubiendo(true);
      const filePath = `personal/${Date.now()}_${archivo.name}`;
      path = await subirArchivo("documentos", filePath, archivo);
      archNombre = archivo.name;
      setSubiendo(false);
    }
    onSave({
      nombre: form.nombre,
      categoria: form.categoria || undefined,
      vencimiento: form.vencimiento || null,
      storage_path: path,
      archivo_nombre: archNombre,
      usuario_id: form.usuario_id,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-lg">
        <h3 className="text-lg font-semibold">{legajo ? "Editar legajo" : "Nuevo legajo"}</h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <label className="block"><Etiqueta>Nombre del documento</Etiqueta>
            <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={campo} required placeholder="Ej. Título profesional, DNI..." />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><Etiqueta>Categoría</Etiqueta>
              <input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className={campo} placeholder="Ej. Académico, Identidad..." />
            </label>
            <label className="block"><Etiqueta>Usuario vinculado</Etiqueta>
              <select value={form.usuario_id || ""} onChange={(e) => setForm({ ...form, usuario_id: e.target.value ? Number(e.target.value) : null })} className={campo}>
                <option value="">Seleccionar profesional...</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              </select>
            </label>
          </div>
          <label className="block"><Etiqueta>Fecha de vencimiento</Etiqueta>
            <input type="date" value={form.vencimiento} onChange={(e) => setForm({ ...form, vencimiento: e.target.value })} className={campo} />
          </label>
          <label className="block"><Etiqueta>Archivo {legajo?.storage_path && "(ya subido)"}</Etiqueta>
            <input type="file" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} className={campo} />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className={botonSecundario}>Cancelar</button>
            <button type="submit" className={botonPrimario} disabled={guardando || subiendo}>{subiendo ? "Subiendo..." : guardando ? "Guardando..." : "Guardar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}