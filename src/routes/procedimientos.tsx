import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, BookOpen, History, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, Chip, EmptyState } from "@/components/ui-kit";
import { Modal, campo, areaTexto, botonPrimario, botonSecundario, Etiqueta } from "@/components/forms";
import {
  fetchProcedimientos,
  crearProcedimiento,
  editarProcedimiento,
  bajaProcedimiento,
  fetchHistorialDe,
  type Procedimiento,
} from "@/lib/conocimiento";
import { formatoFechaHora } from "@/lib/kalen";
import { usePermisos } from "@/hooks/use-permisos";

export const Route = createFileRoute("/procedimientos")({
  head: () => ({
    meta: [
      { title: "Procedimientos — Kalen" },
      { name: "description", content: "Base de conocimiento institucional: cómo se hace cada trámite, quién firma, dónde está el modelo." },
    ],
  }),
  component: ProcedimientosPage,
});

const vacio = (): Partial<Procedimiento> => ({
  categoria: "",
  titulo: "",
  contenido: "",
  fuente_informacion: "",
  personas_a_consultar: "",
  forma_correcta_firmar: "",
  errores_frecuentes: "",
});

function ProcedimientosPage() {
  const qc = useQueryClient();
  const { puedeEditar, esAdmin, usuario } = usePermisos();
  const nombreUsuario = usuario?.nombre || usuario?.email || "—";

  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Procedimiento | null>(null);
  const [form, setForm] = useState<Partial<Procedimiento>>(vacio());
  const [comentario, setComentario] = useState("");
  const [verHistorialDe, setVerHistorialDe] = useState<Procedimiento | null>(null);

  const { data: procedimientos = [] } = useQuery({ queryKey: ["procedimientos"], queryFn: fetchProcedimientos });
  const { data: historial = [] } = useQuery({
    queryKey: ["historial-conocimiento", verHistorialDe?.id],
    queryFn: () => fetchHistorialDe("procedimiento", verHistorialDe!.id),
    enabled: Boolean(verHistorialDe),
  });

  const refrescar = () => qc.invalidateQueries({ queryKey: ["procedimientos"] });

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return procedimientos;
    return procedimientos.filter((p) => `${p.titulo} ${p.categoria}`.toLowerCase().includes(q));
  }, [procedimientos, busqueda]);

  function nuevo() {
    setEditando(null);
    setForm(vacio());
    setComentario("");
    setAbierto(true);
  }
  function editar(p: Procedimiento) {
    setEditando(p);
    setForm({ ...p });
    setComentario("");
    setAbierto(true);
  }

  const guardar = useMutation({
    mutationFn: async () => {
      if (editando) {
        if (!comentario.trim()) throw new Error("Contame qué cambió, es obligatorio al editar.");
        return editarProcedimiento(editando.id, form, nombreUsuario, comentario.trim());
      }
      return crearProcedimiento(form as Partial<Procedimiento> & { titulo: string }, nombreUsuario);
    },
    onSuccess: () => {
      refrescar();
      toast.success(editando ? "Procedimiento actualizado" : "Procedimiento creado");
      setAbierto(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const borrar = useMutation({
    mutationFn: (p: Procedimiento) => {
      const motivo = window.prompt(`¿Por qué eliminás "${p.titulo}"?`) ?? "";
      if (!motivo.trim()) throw new Error("Cancelado");
      return bajaProcedimiento(p.id, nombreUsuario, motivo.trim());
    },
    onSuccess: () => {
      refrescar();
      toast.success("Procedimiento eliminado");
    },
    onError: (e: Error) => {
      if (e.message !== "Cancelado") toast.error(e.message);
    },
  });

  return (
    <AppShell
      title="Procedimientos"
      description="Cómo se hace cada trámite: paso a paso, quién firma, errores frecuentes"
      actions={
        puedeEditar && (
          <button className={botonPrimario} onClick={nuevo}>
            <Plus className="h-4 w-4" /> Nuevo procedimiento
          </button>
        )
      }
    >
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por título o categoría…"
          className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm"
        />
      </div>

      {lista.length === 0 ? (
        <EmptyState icon={BookOpen} title="Sin procedimientos" hint="Agregá el primero con «Nuevo procedimiento»." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map((p) => (
            <Panel key={p.id} title={p.titulo}>
              <div className="space-y-2 p-4">
                <div className="flex flex-wrap gap-1.5">
                  {p.categoria && <Chip tone="info">{p.categoria}</Chip>}
                  <Chip tone="muted">v{p.version}</Chip>
                </div>
                {p.contenido && <p className="line-clamp-3 text-sm text-muted-foreground">{p.contenido}</p>}
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setVerHistorialDe(p)}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <History className="h-3.5 w-3.5" /> Historial
                  </button>
                  <div className="flex items-center gap-2">
                    {puedeEditar && (
                      <button onClick={() => editar(p)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent" aria-label="Editar">
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    {esAdmin && (
                      <button onClick={() => borrar.mutate(p)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Eliminar">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}

      {abierto && (
        <Modal
          abierto={abierto}
          onClose={() => setAbierto(false)}
          titulo={editando ? `Editar: ${editando.titulo}` : "Nuevo procedimiento"}
          footer={
            <>
              <button className={botonSecundario} onClick={() => setAbierto(false)}>
                Cancelar
              </button>
              <button className={botonPrimario} onClick={() => guardar.mutate()} disabled={!form.titulo?.trim() || guardar.isPending}>
                {guardar.isPending ? "Guardando…" : "Guardar"}
              </button>
            </>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <Etiqueta>Título</Etiqueta>
              <input className={campo} value={form.titulo ?? ""} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} />
            </label>
            <label>
              <Etiqueta>Categoría</Etiqueta>
              <input className={campo} placeholder="ej: APROSS, Admisión, Transporte" value={form.categoria ?? ""} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))} />
            </label>
            <label>
              <Etiqueta>Personas a consultar</Etiqueta>
              <input className={campo} value={form.personas_a_consultar ?? ""} onChange={(e) => setForm((f) => ({ ...f, personas_a_consultar: e.target.value }))} />
            </label>
            <label className="sm:col-span-2">
              <Etiqueta>Paso a paso</Etiqueta>
              <textarea className={areaTexto} rows={5} value={form.contenido ?? ""} onChange={(e) => setForm((f) => ({ ...f, contenido: e.target.value }))} />
            </label>
            <label>
              <Etiqueta>De dónde sale la información</Etiqueta>
              <input className={campo} value={form.fuente_informacion ?? ""} onChange={(e) => setForm((f) => ({ ...f, fuente_informacion: e.target.value }))} />
            </label>
            <label>
              <Etiqueta>Cómo se firma</Etiqueta>
              <input className={campo} value={form.forma_correcta_firmar ?? ""} onChange={(e) => setForm((f) => ({ ...f, forma_correcta_firmar: e.target.value }))} />
            </label>
            <label className="sm:col-span-2">
              <Etiqueta>Errores frecuentes</Etiqueta>
              <textarea className={areaTexto} rows={2} value={form.errores_frecuentes ?? ""} onChange={(e) => setForm((f) => ({ ...f, errores_frecuentes: e.target.value }))} />
            </label>
            {editando && (
              <label className="sm:col-span-2">
                <Etiqueta hint="Obligatorio al editar">Qué cambió y por qué</Etiqueta>
                <input className={campo} value={comentario} onChange={(e) => setComentario(e.target.value)} />
              </label>
            )}
          </div>
        </Modal>
      )}

      {verHistorialDe && (
        <Modal abierto={Boolean(verHistorialDe)} onClose={() => setVerHistorialDe(null)} titulo={`Historial: ${verHistorialDe.titulo}`}>
          {historial.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Sin cambios registrados.</p>
          ) : (
            <ul className="divide-y divide-border">
              {historial.map((h) => (
                <li key={h.id} className="px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {h.accion === "crear" ? "Creación" : h.accion === "editar" ? `Edición${h.version ? ` · v${h.version}` : ""}` : "Eliminación"}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatoFechaHora(h.created_at)}</span>
                  </div>
                  <p className="text-muted-foreground">{h.usuario}</p>
                  {h.comentario && <p className="mt-1">{h.comentario}</p>}
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </AppShell>
  );
}

