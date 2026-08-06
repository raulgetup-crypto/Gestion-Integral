import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Modal, botonPrimario, botonSecundario } from "@/components/forms";
import { Texto, Fecha, Selector, Area, ResumenErrores, useUsuarioActual } from "@/components/kalen/campos";
import { fetchConcurrentes } from "@/lib/api";
import {
  ESTADOS_TRASLADO,
  ESTADO_TRASLADO_LABEL,
  FINANCIADORES_TRASLADO,
  TIPOS_TRASLADO,
  TIPO_TRASLADO_LABEL,
  ESTADO_ADMISION_LABEL,
  fetchAdmisiones,
  fetchSedes,
  guardarSolicitudTransporte,
  type SolicitudTransporte,
} from "@/lib/kalen";

type Borrador = Partial<SolicitudTransporte>;

const VACIO: Borrador = {
  concurrente_id: "",
  admision_id: null,
  sede_id: null,
  fecha_solicitud: new Date().toISOString().slice(0, 10),
  tipo_traslado: "ida_vuelta",
  estado: "solicitado",
  empresa: "",
  chofer: "",
  telefono_transportista: "",
  domicilio_origen: "",
  domicilio_destino: "",
  dias: "",
  hora_ida: "",
  hora_vuelta: "",
  requiere_acompanante: false,
  financiador: "",
  monto_mensual: 0,
  fecha_inicio: null,
  fecha_fin: null,
  motivo_rechazo: "",
  observaciones: "",
};

export function TransporteForm({
  abierto,
  onClose,
  inicial,
  concurrenteId,
}: {
  abierto: boolean;
  onClose: () => void;
  inicial?: SolicitudTransporte | null;
  concurrenteId?: string;
}) {
  const qc = useQueryClient();
  const { usuarioId } = useUsuarioActual();
  const { data: concurrentes = [] } = useQuery({ queryKey: ["concurrentes"], queryFn: fetchConcurrentes });
  const { data: admisiones = [] } = useQuery({ queryKey: ["admisiones"], queryFn: fetchAdmisiones });
  const { data: sedes = [] } = useQuery({ queryKey: ["sedes"], queryFn: fetchSedes });

  const [f, setF] = useState<Borrador>(VACIO);
  const [errores, setErrores] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!abierto) return;
    setErrores({});
    setF(inicial ? { ...inicial } : { ...VACIO, concurrente_id: concurrenteId ?? "" });
  }, [abierto, inicial, concurrenteId]);

  const set = <K extends keyof Borrador>(k: K, v: Borrador[K]) => setF((p) => ({ ...p, [k]: v }));

  // Solo se ofrecen las admisiones del concurrente elegido, para no cruzar legajos.
  const admisionesDelConcurrente = useMemo(
    () => admisiones.filter((a) => a.concurrente_id && a.concurrente_id === f.concurrente_id),
    [admisiones, f.concurrente_id],
  );

  const guardar = useMutation({
    mutationFn: async () => {
      const e: Record<string, string> = {};
      if (!f.concurrente_id || !concurrentes.some((c) => c.id === f.concurrente_id)) {
        e.concurrente_id = "Elegí el concurrente que necesita el traslado.";
      }
      if (!f.fecha_solicitud) e.fecha_solicitud = "Indicá la fecha de la solicitud.";
      if (!f.domicilio_origen?.trim()) e.domicilio_origen = "El domicilio de origen es obligatorio.";
      if (f.estado === "rechazado" && !f.motivo_rechazo?.trim()) {
        e.motivo_rechazo = "Si la solicitud fue rechazada, cargá el motivo.";
      }
      if (f.fecha_fin && f.fecha_inicio && f.fecha_fin < f.fecha_inicio) {
        e.fecha_fin = "La fecha de fin no puede ser anterior a la de inicio.";
      }
      if (Number(f.monto_mensual ?? 0) < 0) e.monto_mensual = "El monto no puede ser negativo.";
      setErrores(e);
      if (Object.keys(e).length) throw new Error("VALIDACION");

      return guardarSolicitudTransporte(f, usuarioId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transporte-solicitudes"] });
      toast.success(f.id ? "Solicitud de traslado actualizada" : "Solicitud de traslado registrada");
      onClose();
    },
    onError: (err: Error) => {
      if (err.message === "VALIDACION") return;
      toast.error(`No se pudo guardar: ${err.message}`);
    },
  });

  return (
    <Modal
      abierto={abierto}
      onClose={onClose}
      titulo={f.id ? "Editar solicitud de traslado" : "Nueva solicitud de traslado"}
      ancho="sm:max-w-3xl"
      footer={
        <>
          <button className={botonSecundario} type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className={botonPrimario} type="button" disabled={guardar.isPending} onClick={() => guardar.mutate()}>
            {guardar.isPending ? "Guardando…" : "Guardar solicitud"}
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
            label="Admisión vinculada"
            value={f.admision_id ?? null}
            vacio="— Sin admisión asociada —"
            opciones={admisionesDelConcurrente.map((a) => ({
              value: a.id,
              label: `#${a.id} · ${a.fecha_solicitud ?? "sin fecha"} · ${ESTADO_ADMISION_LABEL[a.estado] ?? a.estado}`,
            }))}
            onChange={(v) => set("admision_id", v ? Number(v) : null)}
          />
          <Selector
            label="Sede"
            value={f.sede_id ?? null}
            opciones={sedes.map((s) => ({ value: s.id, label: s.nombre }))}
            onChange={(v) => set("sede_id", v ? Number(v) : null)}
          />
          <Fecha
            label="Fecha de solicitud"
            requerido
            value={f.fecha_solicitud ?? null}
            error={errores.fecha_solicitud}
            onChange={(v) => set("fecha_solicitud", v || null)}
          />
          <Selector
            label="Tipo de traslado"
            vacio={null}
            value={f.tipo_traslado ?? "ida_vuelta"}
            opciones={TIPOS_TRASLADO.map((t) => ({ value: t, label: TIPO_TRASLADO_LABEL[t] }))}
            onChange={(v) => set("tipo_traslado", v as SolicitudTransporte["tipo_traslado"])}
          />
          <Selector
            label="Estado del trámite"
            vacio={null}
            value={f.estado ?? "solicitado"}
            opciones={ESTADOS_TRASLADO.map((e) => ({ value: e, label: ESTADO_TRASLADO_LABEL[e] }))}
            onChange={(v) => set("estado", v as SolicitudTransporte["estado"])}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Texto
            label="Domicilio de origen"
            requerido
            value={f.domicilio_origen ?? ""}
            error={errores.domicilio_origen}
            placeholder="Calle, número, barrio"
            onChange={(v) => set("domicilio_origen", v)}
          />
          <Texto
            label="Domicilio de destino"
            value={f.domicilio_destino ?? ""}
            placeholder="Centro de día / institución"
            onChange={(v) => set("domicilio_destino", v)}
          />
          <Texto
            label="Días"
            value={f.dias ?? ""}
            placeholder="Lun, Mar, Jue"
            onChange={(v) => set("dias", v)}
          />
          <Selector
            label="Requiere acompañante"
            vacio={null}
            value={f.requiere_acompanante ? "si" : "no"}
            opciones={[
              { value: "no", label: "No" },
              { value: "si", label: "Sí" },
            ]}
            onChange={(v) => set("requiere_acompanante", v === "si")}
          />
          <Texto label="Hora de ida" type="time" value={f.hora_ida ?? ""} onChange={(v) => set("hora_ida", v)} />
          <Texto label="Hora de vuelta" type="time" value={f.hora_vuelta ?? ""} onChange={(v) => set("hora_vuelta", v)} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Texto
            label="Empresa de transporte"
            value={f.empresa ?? ""}
            onChange={(v) => set("empresa", v)}
          />
          <Texto label="Chofer" value={f.chofer ?? ""} onChange={(v) => set("chofer", v)} />
          <Texto
            label="Teléfono del transportista"
            value={f.telefono_transportista ?? ""}
            onChange={(v) => set("telefono_transportista", v)}
          />
          <Texto
            label="Financiador"
            value={f.financiador ?? ""}
            placeholder="APROSS, obra social, familia…"
            sugerencias={FINANCIADORES_TRASLADO}
            onChange={(v) => set("financiador", v)}
          />
          <Texto
            label="Monto mensual"
            type="number"
            value={String(f.monto_mensual ?? 0)}
            error={errores.monto_mensual}
            onChange={(v) => set("monto_mensual", Number(v) || 0)}
          />
          <Fecha label="Inicio del servicio" value={f.fecha_inicio ?? null} onChange={(v) => set("fecha_inicio", v || null)} />
          <Fecha
            label="Fin del servicio"
            value={f.fecha_fin ?? null}
            error={errores.fecha_fin}
            onChange={(v) => set("fecha_fin", v || null)}
          />
        </div>

        {f.estado === "rechazado" && (
          <Area
            label="Motivo del rechazo"
            requerido
            value={f.motivo_rechazo ?? ""}
            error={errores.motivo_rechazo}
            onChange={(v) => set("motivo_rechazo", v)}
          />
        )}

        <Area label="Observaciones" value={f.observaciones ?? ""} onChange={(v) => set("observaciones", v)} />
      </div>
    </Modal>
  );
}
