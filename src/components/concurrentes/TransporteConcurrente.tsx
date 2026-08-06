import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bus, Plus, Trash2 } from "lucide-react";
import { Panel, EmptyState, Chip } from "@/components/ui-kit";
import { Modal, campo, areaTexto, botonPrimario, botonSecundario, Etiqueta } from "@/components/forms";
import {
  fetchTransporteDe,
  transporteApi,
  ESTADOS_TRANSPORTE,
  type TransporteServicio,
} from "@/lib/api";
import { mesActual, nombreMes, formatFecha, moneda, hoyISO } from "@/lib/format";

const vacio = (concurrenteId: string): Partial<TransporteServicio> => ({
  concurrente_id: concurrenteId,
  mes: mesActual(),
  empresa: "",
  recorrido: "",
  hora_ida: "",
  hora_vuelta: "",
  dias: "",
  monto: 0,
  comprobante_anses: false,
  fecha_comprobante: null,
  estado: "pendiente",
  observaciones: "",
});

/** El comprobante ANSES del mes recién puede cargarse pasado el día 15. */
function anseHabilitado(): boolean {
  return new Date().getDate() > 15;
}

const AVISO_ANSES = "El comprobante ANSES solo puede marcarse después del día 15 del mes.";

/** Control mensual del servicio de transporte de un concurrente. */
export function TransporteConcurrente({ concurrenteId }: { concurrenteId: string }) {
  const qc = useQueryClient();
  const { data: servicios = [] } = useQuery({
    queryKey: ["transporte-concurrente", concurrenteId],
    queryFn: () => fetchTransporteDe(concurrenteId),
  });
  const [abierto, setAbierto] = useState(false);
  const [borrador, setBorrador] = useState<Partial<TransporteServicio>>(vacio(concurrenteId));

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ["transporte-concurrente", concurrenteId] });
    qc.invalidateQueries({ queryKey: ["transporte-servicios"] });
  };

  const totales = useMemo(() => {
    const total = servicios.reduce((a, s) => a + Number(s.monto || 0), 0);
    const sinAnses = servicios.filter((s) => !s.comprobante_anses).length;
    return { total, sinAnses };
  }, [servicios]);

  async function guardar() {
    if (!borrador.mes) return toast.error("Indicá el mes");
    if (borrador.comprobante_anses && !anseHabilitado()) return toast.warning(AVISO_ANSES);
    try {
      await transporteApi.create({ ...borrador, concurrente_id: concurrenteId });
      toast.success("Servicio de transporte guardado");
      setAbierto(false);
      setBorrador(vacio(concurrenteId));
      refrescar();
    } catch (e) {
      toast.error(`No se pudo guardar: ${(e as Error).message}`);
    }
  }

  async function cambiar(id: string, cambios: Partial<TransporteServicio>) {
    try {
      await transporteApi.update(id, cambios);
      refrescar();
    } catch (e) {
      toast.error(`No se pudo actualizar: ${(e as Error).message}`);
    }
  }

  async function borrar(s: TransporteServicio) {
    try {
      await transporteApi.remove(s.id, `el transporte de ${s.mes}`);
      refrescar();
    } catch (e) {
      toast.error(`No se pudo eliminar: ${(e as Error).message}`);
    }
  }

  return (
    <Panel
      title="Transporte"
      action={
        <button className={botonPrimario} onClick={() => { setBorrador(vacio(concurrenteId)); setAbierto(true); }}>
          <Plus className="h-4 w-4" /> Agregar mes
        </button>
      }
    >
      {servicios.length === 0 ? (
        <EmptyState icon={Bus} title="Sin servicio de transporte" hint="Cargá empresa, recorrido y horarios por mes." />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Total registrado: <strong>{moneda(totales.total)}</strong> · Sin comprobante ANSES:{" "}
            <strong>{totales.sinAnses}</strong>
          </p>
          <ul className="divide-y divide-border/60">
            {servicios.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <span className="w-28 font-medium">{nombreMes(s.mes)}</span>
                <span className="min-w-0 flex-1">
                  <span>{s.empresa || "Sin empresa"}</span>
                  {s.recorrido && <span className="text-muted-foreground"> · {s.recorrido}</span>}
                  <p className="text-xs text-muted-foreground">
                    {s.hora_ida || "--"} / {s.hora_vuelta || "--"} {s.dias && `· ${s.dias}`}
                    {s.fecha_comprobante && ` · ANSES ${formatFecha(s.fecha_comprobante)}`}
                  </p>
                </span>
                <span>{moneda(Number(s.monto || 0))}</span>
                <label className="flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={s.comprobante_anses}
                    onChange={(e) => {
                      if (e.target.checked && !anseHabilitado()) {
                        toast.warning(AVISO_ANSES);
                        return;
                      }
                      cambiar(s.id, {
                        comprobante_anses: e.target.checked,
                        fecha_comprobante: e.target.checked ? hoyISO() : null,
                      });
                    }}
                  />
                  ANSES
                </label>
                <Chip tone={s.estado === "cobrado" ? "success" : s.estado === "pendiente" ? "muted" : "info"}>
                  {s.estado}
                </Chip>
                <select
                  className={campo + " h-9 w-36"}
                  value={s.estado}
                  onChange={(e) => cambiar(s.id, { estado: e.target.value })}
                >
                  {ESTADOS_TRANSPORTE.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
                <button className={botonSecundario} onClick={() => borrar(s)} aria-label="Eliminar">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal abierto={abierto} onClose={() => setAbierto(false)} titulo="Servicio de transporte">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Etiqueta>Mes</Etiqueta>
              <input
                type="month"
                className={campo}
                value={borrador.mes ?? ""}
                onChange={(e) => setBorrador({ ...borrador, mes: e.target.value })}
              />
            </div>
            <div>
              <Etiqueta>Empresa</Etiqueta>
              <input
                className={campo}
                value={borrador.empresa ?? ""}
                onChange={(e) => setBorrador({ ...borrador, empresa: e.target.value })}
              />
            </div>
            <div>
              <Etiqueta>Recorrido</Etiqueta>
              <input
                className={campo}
                value={borrador.recorrido ?? ""}
                onChange={(e) => setBorrador({ ...borrador, recorrido: e.target.value })}
              />
            </div>
            <div>
              <Etiqueta>Días</Etiqueta>
              <input
                className={campo}
                placeholder="Lun a Vie"
                value={borrador.dias ?? ""}
                onChange={(e) => setBorrador({ ...borrador, dias: e.target.value })}
              />
            </div>
            <div>
              <Etiqueta>Hora ida</Etiqueta>
              <input
                type="time"
                className={campo}
                value={borrador.hora_ida ?? ""}
                onChange={(e) => setBorrador({ ...borrador, hora_ida: e.target.value })}
              />
            </div>
            <div>
              <Etiqueta>Hora vuelta</Etiqueta>
              <input
                type="time"
                className={campo}
                value={borrador.hora_vuelta ?? ""}
                onChange={(e) => setBorrador({ ...borrador, hora_vuelta: e.target.value })}
              />
            </div>
            <div>
              <Etiqueta>Monto mensual</Etiqueta>
              <input
                type="number"
                min={0}
                className={campo}
                value={String(borrador.monto ?? 0)}
                onChange={(e) => setBorrador({ ...borrador, monto: Number(e.target.value) })}
              />
            </div>
            <div>
              <Etiqueta>Estado</Etiqueta>
              <select
                className={campo}
                value={borrador.estado ?? "pendiente"}
                onChange={(e) => setBorrador({ ...borrador, estado: e.target.value })}
              >
                {ESTADOS_TRANSPORTE.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(borrador.comprobante_anses)}
              onChange={(e) => {
                if (e.target.checked && !anseHabilitado()) {
                  toast.warning(AVISO_ANSES);
                  return;
                }
                setBorrador({
                  ...borrador,
                  comprobante_anses: e.target.checked,
                  fecha_comprobante: e.target.checked ? hoyISO() : null,
                });
              }}
            />
            Comprobante ANSES recibido
          </label>
          {!anseHabilitado() && (
            <p className="rounded-lg bg-warning/15 px-3 py-2 text-xs text-warning">{AVISO_ANSES}</p>
          )}
          <div>
            <Etiqueta>Observaciones</Etiqueta>
            <textarea
              className={areaTexto}
              value={borrador.observaciones ?? ""}
              onChange={(e) => setBorrador({ ...borrador, observaciones: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button className={botonSecundario} onClick={() => setAbierto(false)}>
              Cancelar
            </button>
            <button className={botonPrimario} onClick={guardar}>
              Guardar
            </button>
          </div>
        </div>
      </Modal>
    </Panel>
  );
}
