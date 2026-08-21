import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send, Plus, Trash2, Check } from "lucide-react";
import { Panel, EmptyState, Chip } from "@/components/ui-kit";
import { Modal, campo, areaTexto, botonPrimario, botonSecundario, Etiqueta } from "@/components/forms";
import {
  fetchEnviosDe,
  enviosApi,
  TIPOS_ENVIO,
  TIPO_ENVIO_LABEL,
  type EnvioMensual,
} from "@/lib/api";
import { mesActual, nombreMes, hoyISO } from "@/lib/format";
import { usePermisos } from "@/hooks/use-permisos";

const vacio = (concurrenteId: string): Partial<EnvioMensual> => ({
  concurrente_id: concurrenteId,
  mes: mesActual(),
  tipo: "apross_ie",
  mutual_detalle: "",
  dai_nombre: "",
  dai_mail: "",
  dai_whatsapp: "",
  horario_detalle: "",
  enviado: false,
  fecha_envio: null,
  entregado: false,
  fecha_entrega: null,
  observaciones: "",
});

/** Control mensual de envíos (IE por mail, transporte UGP, otras mutuales) de un concurrente. */
export function EnviosMensualesConcurrente({ concurrenteId }: { concurrenteId: string }) {
  const qc = useQueryClient();
  const { puedeEditar, esAdmin } = usePermisos();
  const { data: envios = [] } = useQuery({
    queryKey: ["envios-concurrente", concurrenteId],
    queryFn: () => fetchEnviosDe(concurrenteId),
  });

  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState<Partial<EnvioMensual>>(vacio(concurrenteId));

  const refrescar = () => qc.invalidateQueries({ queryKey: ["envios-concurrente", concurrenteId] });

  function nuevo() {
    setForm(vacio(concurrenteId));
    setAbierto(true);
  }

  async function guardar() {
    try {
      await enviosApi.create(form);
      toast.success("Envío registrado");
      refrescar();
      setAbierto(false);
    } catch (e) {
      toast.error(`No se pudo guardar: ${(e as Error).message}`);
    }
  }

  async function marcar(e: EnvioMensual, campo: "enviado" | "entregado") {
    try {
      const fechaCampo = campo === "enviado" ? "fecha_envio" : "fecha_entrega";
      await enviosApi.update(e.id, { [campo]: !e[campo], [fechaCampo]: !e[campo] ? hoyISO() : null } as Partial<EnvioMensual>);
      refrescar();
    } catch (err) {
      toast.error(`No se pudo actualizar: ${(err as Error).message}`);
    }
  }

  async function eliminar(e: EnvioMensual) {
    if (!window.confirm(`¿Eliminar el envío de ${nombreMes(e.mes)}?`)) return;
    try {
      await enviosApi.remove(e.id, `el envío de ${nombreMes(e.mes)}`);
      toast.success("Envío eliminado");
      refrescar();
    } catch (err) {
      toast.error(`No se pudo eliminar: ${(err as Error).message}`);
    }
  }

  return (
    <Panel
      title="Envíos mensuales"
      action={
        puedeEditar && (
          <button onClick={nuevo} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground">
            <Plus className="h-3.5 w-3.5" /> Nuevo envío
          </button>
        )
      }
    >
      {envios.length === 0 ? (
        <EmptyState icon={Send} title="Sin envíos registrados" hint="Agregá el primero con «Nuevo envío»." />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {envios.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="w-24 shrink-0 text-sm font-medium">{nombreMes(e.mes)}</span>
              <Chip tone="info">
                {TIPO_ENVIO_LABEL[e.tipo] ?? e.tipo}
                {e.tipo === "otra_mutual" && e.mutual_detalle ? ` · ${e.mutual_detalle}` : ""}
              </Chip>
              {e.dai_nombre && <span className="text-xs text-muted-foreground">DAI: {e.dai_nombre}</span>}
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => marcar(e, "enviado")}
                  disabled={!puedeEditar}
                  className="inline-flex items-center gap-1 disabled:opacity-50"
                >
                  <Chip tone={e.enviado ? "success" : "muted"}>
                    {e.enviado && <Check className="mr-1 inline h-3 w-3" />}
                    Enviado
                  </Chip>
                </button>
                <button
                  onClick={() => marcar(e, "entregado")}
                  disabled={!puedeEditar}
                  className="inline-flex items-center gap-1 disabled:opacity-50"
                >
                  <Chip tone={e.entregado ? "success" : "muted"}>
                    {e.entregado && <Check className="mr-1 inline h-3 w-3" />}
                    Entregado
                  </Chip>
                </button>
                {esAdmin && (
                  <button onClick={() => eliminar(e)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Eliminar">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {abierto && (
        <Modal
          abierto={abierto}
          onClose={() => setAbierto(false)}
          titulo="Nuevo envío mensual"
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
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <Etiqueta>Mes</Etiqueta>
              <input type="month" className={campo} value={form.mes ?? ""} onChange={(e) => setForm((f) => ({ ...f, mes: e.target.value }))} />
            </label>
            <label>
              <Etiqueta>Tipo</Etiqueta>
              <select className={campo} value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as EnvioMensual["tipo"] }))}>
                {TIPOS_ENVIO.map((t) => (
                  <option key={t} value={t}>
                    {TIPO_ENVIO_LABEL[t]}
                  </option>
                ))}
              </select>
            </label>
            {form.tipo === "otra_mutual" && (
              <label>
                <Etiqueta>¿Cuál mutual?</Etiqueta>
                <input
                  className={campo}
                  placeholder="ej: OSDE, PAMI…"
                  value={form.mutual_detalle ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, mutual_detalle: e.target.value }))}
                />
              </label>
            )}
            {form.tipo === "apross_ie" && (
              <>
                <label>
                  <Etiqueta>DAI - Nombre</Etiqueta>
                  <input className={campo} value={form.dai_nombre ?? ""} onChange={(e) => setForm((f) => ({ ...f, dai_nombre: e.target.value }))} />
                </label>
                <label>
                  <Etiqueta>DAI - Mail</Etiqueta>
                  <input className={campo} value={form.dai_mail ?? ""} onChange={(e) => setForm((f) => ({ ...f, dai_mail: e.target.value }))} />
                </label>
                <label>
                  <Etiqueta>DAI - WhatsApp</Etiqueta>
                  <input className={campo} value={form.dai_whatsapp ?? ""} onChange={(e) => setForm((f) => ({ ...f, dai_whatsapp: e.target.value }))} />
                </label>
                <label>
                  <Etiqueta>Horario de acompañamiento</Etiqueta>
                  <input
                    className={campo}
                    placeholder="ej: Mar 9:30-11:30 / Mié 10-11:30"
                    value={form.horario_detalle ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, horario_detalle: e.target.value }))}
                  />
                </label>
              </>
            )}
            <label className="sm:col-span-2">
              <Etiqueta>Observaciones</Etiqueta>
              <textarea className={areaTexto} rows={2} value={form.observaciones ?? ""} onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))} />
            </label>
          </div>
        </Modal>
      )}
    </Panel>
  );
}

