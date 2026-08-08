import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Boxes, FileText, Plus, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, Chip, EmptyState } from "@/components/ui-kit";
import { Modal, campo, areaTexto, Etiqueta, botonPrimario, botonSecundario } from "@/components/forms";
import { Exportar } from "@/components/Exportar";
import { useEntidad } from "@/hooks/use-entidad";
import { usePermisos } from "@/hooks/use-permisos";
import {
  fetchConcurrentes,
  fetchLoteItems,
  lotesApi,
  setLoteItems,
  siguienteNumeroLote,
  ESTADOS_LOTE,
  type Lote,
} from "@/lib/api";
import { formatFecha, hoyISO, mesActual, nombreMes } from "@/lib/format";
import { imprimirHTML, escapar } from "@/lib/export";

export const Route = createFileRoute("/lotes")({
  head: () => ({
    meta: [
      { title: "Lotes — Centro de Día" },
      {
        name: "description",
        content: "Gestión de lotes de planillas entregadas: armado, entrega, recepción y carátula imprimible con firmas.",
      },
      { property: "og:title", content: "Lotes — Centro de Día" },
      { property: "og:description", content: "Trazabilidad completa de las planillas entregadas a cada mutual." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LotesPage,
});

const vacio = (numero: string): Partial<Lote> => ({
  numero,
  prestacion: "",
  mutual: "",
  mes: mesActual(),
  fecha_armado: hoyISO(),
  fecha_entrega: null,
  fecha_recepcion: null,
  entregado_por: "",
  recibido_por: "",
  estado: "armado",
  notas: "",
});

function LotesPage() {
  const { puedeEditar, esAdmin } = usePermisos();
  const { datos: lotes, crear, actualizar, eliminar } = useEntidad<Lote>("lotes", lotesApi, { etiqueta: "lote" });
  const { data: personas = [] } = useQuery({ queryKey: ["concurrentes"], queryFn: fetchConcurrentes });
  const { data: items = [], refetch: refetchItems } = useQuery({
    queryKey: ["lote_items"],
    queryFn: () => fetchLoteItems(),
  });

  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Lote | null>(null);
  const [form, setForm] = useState<Partial<Lote>>(vacio(""));
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [busca, setBusca] = useState("");

  const activos = useMemo(() => personas.filter((p) => p.activo), [personas]);
  const candidatos = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return activos.filter((p) => {
      if (form.prestacion && p.prestacion !== form.prestacion) return false;
      if (form.mutual && p.obra_social !== form.mutual) return false;
      return q ? p.nombre.toLowerCase().includes(q) : true;
    });
  }, [activos, form.prestacion, form.mutual, busca]);

  const itemsDe = (loteId: string) => items.filter((i) => i.lote_id === loteId);

  function abrirNuevo() {
    setEditando(null);
    setForm(vacio(siguienteNumeroLote(lotes)));
    setSeleccion([]);
    setBusca("");
    setAbierto(true);
  }

  function abrirEditar(l: Lote) {
    setEditando(l);
    setForm(l);
    setSeleccion(itemsDe(l.id).map((i) => i.concurrente_id ?? "").filter(Boolean));
    setBusca("");
    setAbierto(true);
  }

  async function guardar() {
    if (!String(form.numero ?? "").trim()) {
      toast.error("El lote necesita un número");
      return;
    }
    if (!editando && lotes.some((l) => l.numero === form.numero)) {
      toast.error("Ya existe un lote con ese número");
      return;
    }
    const elegidos = seleccion
      .map((id) => activos.find((p) => p.id === id))
      .filter(Boolean)
      .map((p) => ({ concurrente_id: p!.id, nombre: p!.nombre }));

    try {
      const lote = editando
        ? await lotesApi.update(editando.id, form)
        : await lotesApi.create(form);
      await setLoteItems(lote.id, elegidos);
      await refetchItems();
      if (editando) actualizar.mutate({ id: lote.id, cambios: {} });
      else crear.reset();
      toast.success(editando ? "Lote actualizado" : "Lote creado");
      setAbierto(false);
    } catch (e) {
      toast.error(`No se pudo guardar: ${(e as Error).message}`);
    }
  }

  function caratula(l: Lote) {
    const filas = itemsDe(l.id);
    const cuerpo = `
      <h1>Carátula de lote ${escapar(l.numero)}</h1>
      <div class="meta">
        Prestación: <strong>${escapar(l.prestacion || "—")}</strong> · Mutual: <strong>${escapar(l.mutual || "—")}</strong> ·
        Período: <strong>${escapar(l.mes ? nombreMes(l.mes) : "—")}</strong><br/>
        Fecha de armado: ${escapar(formatFecha(l.fecha_armado))} · Fecha de entrega: ${escapar(formatFecha(l.fecha_entrega))} ·
        Lugar: <strong>${escapar(l.lugar_entrega || "—")}</strong> ·
        Cantidad de planillas: <strong>${filas.length}</strong>

      </div>
      <table><thead><tr><th style="width:40px">#</th><th>Concurrente</th><th style="width:120px">Observaciones</th></tr></thead>
      <tbody>${filas
        .map((f, i) => `<tr><td>${i + 1}</td><td>${escapar(f.nombre)}</td><td></td></tr>`)
        .join("")}</tbody></table>
      <div class="firmas">
        <div class="firma">Entregado por: ${escapar(l.entregado_por || "")}</div>
        <div class="firma">Recibido por: ${escapar(l.recibido_por || "")}</div>
        <div class="firma">Fecha y sello</div>
      </div>`;
    imprimirHTML(`Lote ${l.numero}`, cuerpo);
  }

  const filasExport = lotes.map((l) => ({
    Lote: l.numero,
    Prestación: l.prestacion,
    Mutual: l.mutual,
    Período: l.mes,
    Planillas: itemsDe(l.id).length,
    Armado: l.fecha_armado,
    Entrega: l.fecha_entrega ?? "",
    Recepción: l.fecha_recepcion ?? "",
    "Entregado por": l.entregado_por,
    "Recibido por": l.recibido_por,
    Estado: l.estado,
  }));

  return (
    <AppShell
      title="Lotes"
      description="Agrupación y trazabilidad de planillas entregadas"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {puedeEditar && (
            <button className={botonPrimario} onClick={abrirNuevo}>
              <Plus className="h-4 w-4" /> Nuevo lote
            </button>
          )}
          <Exportar filas={filasExport} nombre="lotes" titulo="Lotes de planillas" />
        </div>
      }
    >
      <Panel title={`${lotes.length} lotes`}>
        {lotes.length === 0 ? (
          <EmptyState icon={Boxes} title="Sin lotes" hint="Creá el primer lote para agrupar planillas entregadas." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Lote</th>
                  <th className="px-3 py-2.5 font-medium">Prestación / Mutual</th>
                  <th className="px-3 py-2.5 font-medium">Planillas</th>
                  <th className="px-3 py-2.5 font-medium">Armado</th>
                  <th className="px-3 py-2.5 font-medium">Entrega</th>
                  <th className="px-3 py-2.5 font-medium">Recepción</th>
                  <th className="px-3 py-2.5 font-medium">Estado</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lotes.map((l) => (
                  <tr key={l.id} className="hover:bg-accent/40">
                    <td className="px-4 py-2.5">
                      {puedeEditar ? (
                        <button className="font-medium hover:underline" onClick={() => abrirEditar(l)}>
                          {l.numero}
                        </button>
                      ) : (
                        <span className="font-medium">{l.numero}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {l.prestacion || "—"} · {l.mutual || "—"}
                    </td>
                    <td className="px-3 py-2.5">{itemsDe(l.id).length}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{formatFecha(l.fecha_armado)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{formatFecha(l.fecha_entrega)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{formatFecha(l.fecha_recepcion)}</td>
                    <td className="px-3 py-2.5">
                      <Chip tone={l.estado === "recibido" || l.estado === "cerrado" ? "success" : l.estado === "entregado" ? "info" : "muted"}>
                        {l.estado}
                      </Chip>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => caratula(l)}
                          className="rounded-md p-1.5 text-muted-foreground hover:text-primary"
                          aria-label="Carátula PDF"
                          title="Carátula PDF"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        {esAdmin && (
                          <button
                            onClick={() => eliminar.mutate({ id: l.id, etiqueta: `el lote ${l.numero}` })}
                            className="rounded-md p-1.5 text-muted-foreground hover:text-destructive"
                            aria-label="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Modal
        abierto={abierto}
        onClose={() => setAbierto(false)}
        titulo={editando ? `Lote ${editando.numero}` : "Nuevo lote"}
        footer={
          <>
            <button className={botonSecundario} onClick={() => setAbierto(false)}>
              Cancelar
            </button>
            <button className={botonPrimario} onClick={guardar}>
              Guardar
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <Etiqueta>Número de lote</Etiqueta>
              <input className={campo} value={form.numero ?? ""} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
            </label>
            <label className="block">
              <Etiqueta>Período</Etiqueta>
              <input type="month" className={campo} value={form.mes ?? ""} onChange={(e) => setForm({ ...form, mes: e.target.value })} />
            </label>
            <label className="block">
              <Etiqueta>Prestación</Etiqueta>
              <input className={campo} value={form.prestacion ?? ""} onChange={(e) => setForm({ ...form, prestacion: e.target.value })} />
            </label>
            <label className="block">
              <Etiqueta>Mutual</Etiqueta>
              <input className={campo} value={form.mutual ?? ""} onChange={(e) => setForm({ ...form, mutual: e.target.value })} />
            </label>
            <label className="block">
              <Etiqueta>Fecha de armado</Etiqueta>
              <input type="date" className={campo} value={form.fecha_armado ?? ""} onChange={(e) => setForm({ ...form, fecha_armado: e.target.value })} />
            </label>
            <label className="block">
              <Etiqueta>Estado</Etiqueta>
              <select className={campo} value={form.estado ?? "armado"} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                {ESTADOS_LOTE.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <Etiqueta>Fecha de entrega</Etiqueta>
              <input type="date" className={campo} value={form.fecha_entrega ?? ""} onChange={(e) => setForm({ ...form, fecha_entrega: e.target.value || null })} />
            </label>
            <label className="block">
              <Etiqueta>Fecha de recepción</Etiqueta>
              <input type="date" className={campo} value={form.fecha_recepcion ?? ""} onChange={(e) => setForm({ ...form, fecha_recepcion: e.target.value || null })} />
            </label>
            <label className="block">
              <Etiqueta>Entregado por</Etiqueta>
              <input className={campo} value={form.entregado_por ?? ""} onChange={(e) => setForm({ ...form, entregado_por: e.target.value })} />
            </label>
            <label className="block">
              <Etiqueta>Recibido por</Etiqueta>
              <input className={campo} value={form.recibido_por ?? ""} onChange={(e) => setForm({ ...form, recibido_por: e.target.value })} />
            </label>
            <label className="block">
              <Etiqueta>Lugar de entrega</Etiqueta>
              <input className={campo} value={form.lugar_entrega ?? ""} onChange={(e) => setForm({ ...form, lugar_entrega: e.target.value })} />
            </label>

          </div>

          <label className="block">
            <Etiqueta>Observaciones</Etiqueta>
            <textarea rows={2} className={areaTexto} value={form.notas ?? ""} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
          </label>

          <div>
            <Etiqueta>Planillas incluidas ({seleccion.length})</Etiqueta>
            <input
              className={campo}
              placeholder="Buscar concurrente…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <div className="mt-2 max-h-56 overflow-auto rounded-lg border border-border">
              {candidatos.length === 0 ? (
                <p className="p-3 text-xs text-muted-foreground">Sin concurrentes para los filtros elegidos.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {candidatos.map((p) => (
                    <li key={p.id}>
                      <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-accent/40">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-input"
                          checked={seleccion.includes(p.id)}
                          onChange={(e) =>
                            setSeleccion((s) => (e.target.checked ? [...s, p.id] : s.filter((x) => x !== p.id)))
                          }
                        />
                        <span className="min-w-0 truncate">{p.nombre}</span>
                        <span className="ml-auto shrink-0 text-xs text-muted-foreground">{p.obra_social}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <FileText className="h-3.5 w-3.5" /> La carátula PDF se genera desde el listado, con espacio para firmas.
            </p>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
