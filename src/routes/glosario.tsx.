import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Book, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, EmptyState } from "@/components/ui-kit";
import { Modal, campo, areaTexto, botonPrimario, botonSecundario, Etiqueta } from "@/components/forms";
import { fetchGlosario, crearTermino, eliminarTermino, type Glosario } from "@/lib/conocimiento";
import { usePermisos } from "@/hooks/use-permisos";

export const Route = createFileRoute("/glosario")({
  head: () => ({
    meta: [
      { title: "Glosario — Kalen" },
      { name: "description", content: "Términos y siglas institucionales de Kalen, explicados en un solo lugar." },
    ],
  }),
  component: GlosarioPage,
});

function GlosarioPage() {
  const qc = useQueryClient();
  const { puedeEditar, esAdmin, usuario } = usePermisos();
  const nombreUsuario = usuario?.nombre || usuario?.email || "—";

  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState<Partial<Glosario>>({ termino: "", definicion: "", categoria: "" });

  const { data: terminos = [] } = useQuery({ queryKey: ["glosario"], queryFn: fetchGlosario });
  const refrescar = () => qc.invalidateQueries({ queryKey: ["glosario"] });

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return terminos;
    return terminos.filter((t) => `${t.termino} ${t.definicion}`.toLowerCase().includes(q));
  }, [terminos, busqueda]);

  const guardar = useMutation({
    mutationFn: () => crearTermino(form as Partial<Glosario> & { termino: string }, nombreUsuario),
    onSuccess: () => {
      refrescar();
      toast.success("Término agregado");
      setAbierto(false);
      setForm({ termino: "", definicion: "", categoria: "" });
    },
    onError: (e: Error) => toast.error(`No se pudo guardar: ${e.message}`),
  });

  const borrar = useMutation({
    mutationFn: (t: Glosario) => eliminarTermino(t.id, nombreUsuario),
    onSuccess: () => {
      refrescar();
      toast.success("Término eliminado");
    },
  });

  return (
    <AppShell
      title="Glosario"
      description="Términos y siglas institucionales de Kalen"
      actions={
        puedeEditar && (
          <button className={botonPrimario} onClick={() => setAbierto(true)}>
            <Plus className="h-4 w-4" /> Nuevo término
          </button>
        )
      }
    >
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar término…"
          className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm"
        />
      </div>

      <Panel title={`${lista.length} términos`}>
        {lista.length === 0 ? (
          <EmptyState icon={Book} title="Sin términos" hint="Agregá el primero con «Nuevo término»." />
        ) : (
          <ul className="divide-y divide-border">
            {lista.map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium">{t.termino}</p>
                  <p className="text-sm text-muted-foreground">{t.definicion}</p>
                </div>
                {esAdmin && (
                  <button onClick={() => borrar.mutate(t)} className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Eliminar">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {abierto && (
        <Modal
          abierto={abierto}
          onClose={() => setAbierto(false)}
          titulo="Nuevo término"
          footer={
            <>
              <button className={botonSecundario} onClick={() => setAbierto(false)}>
                Cancelar
              </button>
              <button className={botonPrimario} onClick={() => guardar.mutate()} disabled={!form.termino?.trim()}>
                Guardar
              </button>
            </>
          }
        >
          <div className="space-y-3">
            <label>
              <Etiqueta>Término</Etiqueta>
              <input className={campo} value={form.termino ?? ""} onChange={(e) => setForm((f) => ({ ...f, termino: e.target.value }))} />
            </label>
            <label>
              <Etiqueta>Definición</Etiqueta>
              <textarea className={areaTexto} rows={3} value={form.definicion ?? ""} onChange={(e) => setForm((f) => ({ ...f, definicion: e.target.value }))} />
            </label>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}

