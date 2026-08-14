import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, FileText, Search, ExternalLink } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, EmptyState } from "@/components/ui-kit";
import { botonPrimario, botonSecundario, campo, Etiqueta } from "@/components/forms";
import { usePermisos } from "@/hooks/use-permisos";
import { supabase } from "@/integrations/supabase/client";
import { formatFecha } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/documentos-institucionales")({
  component: DocumentosInstitucionalesPage,
});

interface Documento {
  id: string;
  nombre: string;
  categoria: string;
  area: string;
  sede_id: number | null;
  storage_path: string;
  fecha: string | null;
  responsable: string;
  observaciones: string;
  activo: boolean;
  created_at: string;
}

const api = {
  list: async (): Promise<Documento[]> => {
    const { data, error } = await supabase
      .from("documentos_institucionales")
      .select("*")
      .eq("activo", true)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(d => ({ ...d, activo: !!d.activo })) as Documento[];
  },
  create: async (input: Partial<Documento>): Promise<Documento> => {
    const { data, error } = await supabase.from("documentos_institucionales").insert(input as any).select().single();
    if (error) throw error;
    return { ...data, activo: !!data.activo } as Documento;
  },
  update: async (id: string, input: Partial<Documento>): Promise<Documento> => {
    const { data, error } = await supabase.from("documentos_institucionales").update(input as any).eq("id", id).select().single();
    if (error) throw error;
    return { ...data, activo: !!data.activo } as Documento;
  },
  remove: async (id: string): Promise<void> => {
    const { error } = await supabase.from("documentos_institucionales").update({ activo: false }).eq("id", id);
    if (error) throw error;
  },
};

async function subirArchivo(bucket: string, path: string, file: File): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

function DocumentosInstitucionalesPage() {
  const { puedeEditar, esAdmin } = usePermisos();
  const queryClient = useQueryClient();
  const [busqueda, setBusqueda] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Documento | null>(null);

  const { data: documentos = [] } = useQuery({ queryKey: ["documentos-institucionales"], queryFn: api.list });

  const createMut = useMutation({
    mutationFn: api.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["documentos-institucionales"] }); setModalOpen(false); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<Documento> }) => api.update(id, input),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["documentos-institucionales"] }); setModalOpen(false); },
  });
  const removeMut = useMutation({
    mutationFn: api.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documentos-institucionales"] }),
  });

  const filtradas = useMemo(() => {
    const b = busqueda.toLowerCase();
    return documentos.filter((d) =>
      d.nombre.toLowerCase().includes(b) ||
      d.categoria.toLowerCase().includes(b) ||
      d.responsable.toLowerCase().includes(b)
    );
  }, [documentos, busqueda]);

  const getPublicUrl = (path: string) => {
    if (!path) return null;
    const { data } = supabase.storage.from("documentos").getPublicUrl(path);
    return data?.publicUrl ?? null;
  };

  return (
    <AppShell title="Documentos institucionales" description="Archivos y documentos del centro">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, categoría o responsable..."
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
          {filtradas.length === 0 ? (
            <EmptyState icon={FileText} title="Sin documentos" hint="Subí el primer archivo institucional." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3">Área</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Responsable</th>
                    <th className="px-4 py-3">Archivo</th>
                    {puedeEditar && <th className="px-4 py-3 text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtradas.map((d) => (
                    <tr key={d.id} className="hover:bg-accent/40">
                      <td className="px-4 py-3 font-medium">{d.nombre}</td>
                      <td className="px-4 py-3">{d.categoria || "—"}</td>
                      <td className="px-4 py-3">{d.area || "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{d.fecha ? formatFecha(d.fecha) : "—"}</td>
                      <td className="px-4 py-3">{d.responsable || "—"}</td>
                      <td className="px-4 py-3">
                        {d.storage_path ? (
                          <a href={getPublicUrl(d.storage_path) ?? "#"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                            <ExternalLink className="h-3 w-3" /> Ver
                          </a>
                        ) : "—"}
                      </td>
                      {puedeEditar && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => { setEditando(d); setModalOpen(true); }} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-primary">
                              <Pencil className="h-4 w-4" />
                            </button>
                            {esAdmin && (
                              <button onClick={() => removeMut.mutate(d.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-destructive">
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
        <ModalDocumento
          documento={editando}
          onClose={() => setModalOpen(false)}
          onSave={(data) => { editando ? updateMut.mutate({ id: editando.id, input: data }) : createMut.mutate(data); }}
          guardando={createMut.isPending || updateMut.isPending}
        />
      )}
    </AppShell>
  );
}

function ModalDocumento({ documento, onClose, onSave, guardando }: {
  documento: Documento | null; onClose: () => void; onSave: (data: Partial<Documento>) => void; guardando?: boolean;
}) {
  const [form, setForm] = useState({
    nombre: documento?.nombre ?? "",
    categoria: documento?.categoria ?? "",
    area: documento?.area ?? "",
    fecha: documento?.fecha ?? "",
    responsable: documento?.responsable ?? "",
    storage_path: documento?.storage_path ?? "",
    observaciones: documento?.observaciones ?? "",
  });
  const [archivo, setArchivo] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    let path = form.storage_path || undefined;
    if (archivo) {
      setSubiendo(true);
      const filePath = `institucionales/${Date.now()}_${archivo.name}`;
      path = await subirArchivo("documentos", filePath, archivo);
      setSubiendo(false);
    }
    onSave({
      nombre: form.nombre,
      categoria: form.categoria || undefined,
      area: form.area || undefined,
      fecha: form.fecha || null,
      responsable: form.responsable || undefined,
      storage_path: path,
      observaciones: form.observaciones || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-lg">
        <h3 className="text-lg font-semibold">{documento ? "Editar documento" : "Nuevo documento"}</h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <label className="block"><Etiqueta>Nombre</Etiqueta>
            <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={campo} required />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><Etiqueta>Categoría</Etiqueta>
              <input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className={campo} placeholder="Ej. Protocolo" />
            </label>
            <label className="block"><Etiqueta>Área</Etiqueta>
              <input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className={campo} placeholder="Ej. Dirección" />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><Etiqueta>Fecha</Etiqueta>
              <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className={campo} />
            </label>
            <label className="block"><Etiqueta>Responsable</Etiqueta>
              <input value={form.responsable} onChange={(e) => setForm({ ...form, responsable: e.target.value })} className={campo} />
            </label>
          </div>
          <label className="block"><Etiqueta>Archivo {documento?.storage_path && "(ya subido)"}</Etiqueta>
            <input type="file" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} className={campo} />
          </label>
          <label className="block"><Etiqueta>Observaciones</Etiqueta>
            <textarea value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} className={cn(campo, "min-h-[80px]")} placeholder="Opcional" />
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
