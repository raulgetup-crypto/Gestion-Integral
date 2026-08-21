import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Modal, botonPrimario, botonSecundario } from "@/components/forms";
import { Texto, Fecha, Selector, Area, ResumenErrores, useUsuarioActual } from "@/components/kalen/campos";
import { fetchConcurrentes } from "@/lib/api";
import {
  ESTADOS_FIRMA,
  ESTADO_FIRMA_LABEL,
  ESTADO_RECEPCION_LABEL,
  UBICACIONES_PLANILLA,
  esDuplicado,
  estadoRecepcionSegunFechas,
  fetchTiposVencimiento,
  guardarPlanilla,
  primerDiaDelMes,
  sumarDias,
  type Planilla,
} from "@/lib/kalen";

type Borrador = Partial<Planilla>;

const VACIA: Borrador = {
  concurrente_id: "",
  tipo_vencimiento_id: null,
  periodo: primerDiaDelMes(new Date().toISOString().slice(0, 10)),
  fecha_limite: null,
  fecha_recepcion: null,
  ubicacion_actual: "Secretaría",
  estado_firma: "pendiente_firma",
  estado_recepcion: "pendiente",
  motivo_demora: "",
  responsable: "",
  validacion_aprossy_enviada: false,
  fecha_validacion_aprossy: null,
  confirmacion_aprossy_recibida: false,
  fecha_confirmacion_aprossy: null,
  observacion_confirmacion_aprossy: "",
};

export function PlanillaForm({
  abierto,
  onClose,
  inicial,
}: {
  abierto: boolean;
  onClose: () => void;
  inicial?: Planilla | null;
}) {
  const qc = useQueryClient();
  const { usuarioId } = useUsuarioActual();
  const { data: concurrentes = [] } = useQuery({ queryKey: ["concurrentes"], queryFn: fetchConcurrentes });
  const { data: tipos = [] } = useQuery({
    queryKey: ["tipos-vencimiento"],
    queryFn: fetchTiposVencimiento,
    staleTime: 300_000,
  });

  const [f, setF] = useState<Borrador>(VACIA);
  const [errores, setErrores] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!abierto) return;
    setErrores({});
    setF(inicial ? { ...inicial } : { ...VACIA });
  }, [abierto, inicial]);

  const set = <K extends keyof Borrador>(k: K, v: Borrador[K]) => setF((p) => ({ ...p, [k]: v }));

  // Fecha límite automática: periodo + días de plazo del tipo elegido.
  const fechaLimite = useMemo(() => {
    const tipo = tipos.find((t) => t.id === f.tipo_vencimiento_id);
    if (!tipo || !f.periodo) return f.fecha_limite ?? null;
    return sumarDias(primerDiaDelMes(f.periodo), tipo.dias_plazo);
  }, [tipos, f.tipo_vencimiento_id, f.periodo, f.fecha_limite]);

  const estadoRecepcion = estadoRecepcionSegunFechas(f.fecha_recepcion ?? null, fechaLimite);
  const fueraDeTermino = estadoRecepcion === "recibida_fuera_termino";

  const guardar = useMutation({
    mutationFn: async () => {
      const e: Record<string, string> = {};
      if (!f.concurrente_id) e.concurrente_id = "Elegí el concurrente.";
      if (!f.tipo_vencimiento_id) e.tipo_vencimiento_id = "Elegí el tipo de vencimiento.";
      if (!f.periodo) e.periodo = "El período es obligatorio.";
      if (fueraDeTermino && !f.motivo_demora?.trim())
        e.motivo_demora = "Recepción fuera de término: el motivo de demora es obligatorio.";
      setErrores(e);
      if (Object.keys(e).length) throw new Error("VALIDACION");

      return guardarPlanilla(
        {
          ...f,
          concurrente_id: f.concurrente_id!,
          periodo: primerDiaDelMes(f.periodo!),
          fecha_limite: fechaLimite,
          estado_recepcion: estadoRecepcion,
        },
        usuarioId,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planillas"] });
      toast.success(f.id ? "Planilla actualizada" : "Planilla creada");
      onClose();
    },
    onError: (err: Error) => {
      if (err.message === "VALIDACION") return;
      if (esDuplicado(err)) {
        setErrores({ periodo: "Ya existe una planilla de ese tipo y período para el concurrente." });
        return;
      }
      toast.error(`No se pudo guardar: ${err.message}`);
    },
  });

  return (
    <Modal
      abierto={abierto}
      onClose={onClose}
      titulo={f.id ? "Editar planilla" : "Nueva planilla"}
      ancho="sm:max-w-2xl"
      footer={
        <>
          <button className={botonSecundario} type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className={botonPrimario} type="button" disabled={guardar.isPending} onClick={() => guardar.mutate()}>
            {guardar.isPending ? "Guardando…" : "Guardar planilla"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <ResumenErrores errores={errores} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Selector
            label="Concurrente"
            requerido
            value={f.concurrente_id ?? null}
            error={errores.concurrente_id}
            opciones={concurrentes.map((c) => ({
              value: c.id,
              label: `${c.apellido || ""} ${c.nombre}`.trim() + (c.dni ? ` · ${c.dni}` : ""),
            }))}
            onChange={(v) => set("concurrente_id", v)}
          />
          <Selector
            label="Tipo de vencimiento"
            requerido
            value={f.tipo_vencimiento_id ?? null}
            error={errores.tipo_vencimiento_id}
            opciones={tipos.map((t) => ({ value: t.id, label: `${t.nombre} (${t.dias_plazo} días)` }))}
            onChange={(v) => set("tipo_vencimiento_id", v ? Number(v) : null)}
          />
          <Fecha
            label="Período (primer día del mes)"
            requerido
            error={errores.periodo}
            value={f.periodo ?? null}
            onChange={(v) => set("periodo", v ? primerDiaDelMes(v) : null)}
          />
          <Fecha label="Fecha límite (automática)" value={fechaLimite} onChange={() => {}} disabled />
          <Fecha
            label="Fecha de recepción"
            value={f.fecha_recepcion ?? null}
            onChange={(v) => set("fecha_recepcion", v || null)}
          />
          <Selector
            label="Ubicación actual"
            vacio={null}
            value={f.ubicacion_actual ?? "Secretaría"}
            opciones={UBICACIONES_PLANILLA.map((u) => ({ value: u, label: u }))}
            onChange={(v) => set("ubicacion_actual", v as Planilla["ubicacion_actual"])}
          />
          <Selector
            label="Estado de firma"
            vacio={null}
            value={f.estado_firma ?? "pendiente_firma"}
            opciones={ESTADOS_FIRMA.map((e) => ({ value: e, label: ESTADO_FIRMA_LABEL[e] }))}
            onChange={(v) => set("estado_firma", v as Planilla["estado_firma"])}
          />
          <Texto label="Responsable" value={f.responsable ?? ""} onChange={(v) => set("responsable", v)} />
        </div>

        {esApross && (
          <div className="rounded-lg border border-border p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={!!f.validacion_aprossy_enviada}
                onChange={(e) => {
                  const on = e.target.checked;
                  setF((p) => ({
                    ...p,
                    validacion_aprossy_enviada: on,
                    fecha_validacion_aprossy: on ? (p.fecha_validacion_aprossy ?? null) : null,
                  }));
                }}
              />
              Validación enviada (APROSS)
            </label>
            {f.validacion_aprossy_enviada && (
              <div className="mt-3 sm:max-w-xs">
                <Fecha
                  label="Fecha de envío"
                  value={f.fecha_validacion_aprossy ?? null}
                  onChange={(v) => set("fecha_validacion_aprossy", v || null)}
                />
              </div>
            )}
          </div>
        )}

        {esApross && f.validacion_aprossy_enviada && (
          <div className="rounded-lg border border-border p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={!!f.confirmacion_aprossy_recibida}
                onChange={(e) => {
                  const on = e.target.checked;
                  setF((p) => ({
                    ...p,
                    confirmacion_aprossy_recibida: on,
                    fecha_confirmacion_aprossy: on ? (p.fecha_confirmacion_aprossy ?? null) : null,
                  }));
                }}
              />
              Confirmación de APROSS recibida
            </label>
            {f.confirmacion_aprossy_recibida && (
              <div className="mt-3 sm:max-w-xs">
                <Fecha
                  label="Fecha de confirmación"
                  value={f.fecha_confirmacion_aprossy ?? null}
                  onChange={(v) => set("fecha_confirmacion_aprossy", v || null)}
                />
              </div>
            )}
            <div className="mt-3">
              <Area
                label="Observación (ej. motivo de rechazo)"
                value={f.observacion_confirmacion_aprossy ?? ""}
                onChange={(v) => set("observacion_confirmacion_aprossy", v)}
              />
            </div>
          </div>
        )}


        <p
          className={
            fueraDeTermino
              ? "rounded-lg bg-destructive/15 px-3 py-2 text-xs font-medium text-destructive"
              : "rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground"
          }
        >
          Estado de recepción calculado: <strong>{ESTADO_RECEPCION_LABEL[estadoRecepcion]}</strong>
        </p>

        {fueraDeTermino && (
          <Area
            label="Motivo de demora"
            requerido
            error={errores.motivo_demora}
            value={f.motivo_demora ?? ""}
            onChange={(v) => set("motivo_demora", v)}
          />
        )}
      </div>
    </Modal>
  );
}
