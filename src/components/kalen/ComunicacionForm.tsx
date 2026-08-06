import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Modal, botonPrimario, botonSecundario } from "@/components/forms";
import { Texto, Selector, Area, Campo, ResumenErrores, useUsuarioActual } from "@/components/kalen/campos";
import { campo } from "@/components/forms";
import { fetchConcurrentes } from "@/lib/api";
import {
  fetchDocumentosKalen,
  fetchPlanillas,
  guardarComunicacion,
  type Comunicacion,
} from "@/lib/kalen";

type Borrador = Partial<Comunicacion>;

const ahoraLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

export function ComunicacionForm({
  abierto,
  onClose,
  inicial,
}: {
  abierto: boolean;
  onClose: () => void;
  inicial?: Comunicacion | null;
}) {
  const qc = useQueryClient();
  const { usuarioId } = useUsuarioActual();
  const { data: concurrentes = [] } = useQuery({ queryKey: ["concurrentes"], queryFn: fetchConcurrentes });
  const { data: planillas = [] } = useQuery({ queryKey: ["planillas"], queryFn: fetchPlanillas });
  const { data: documentos = [] } = useQuery({ queryKey: ["documentos-kalen"], queryFn: fetchDocumentosKalen });

  const [f, setF] = useState<Borrador>({});
  const [fechaLocal, setFechaLocal] = useState(ahoraLocal());
  const [errores, setErrores] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!abierto) return;
    setErrores({});
    if (inicial) {
      setF({ ...inicial });
      setFechaLocal(new Date(inicial.fecha).toISOString().slice(0, 16));
    } else {
      setF({ concurrente_id: null, planilla_id: null, documento_id: null, destinatario: "", medio: "" });
      setFechaLocal(ahoraLocal());
    }
  }, [abierto, inicial]);

  const set = <K extends keyof Borrador>(k: K, v: Borrador[K]) => setF((p) => ({ ...p, [k]: v }));

  const guardar = useMutation({
    mutationFn: async () => {
      const e: Record<string, string> = {};
      if (!f.concurrente_id && !f.planilla_id && !f.documento_id)
        e.vinculo = "Vinculá la comunicación al menos a un concurrente, una planilla o un documento.";
      if (!f.mensaje_enviado?.trim()) e.mensaje_enviado = "El mensaje enviado es obligatorio.";
      setErrores(e);
      if (Object.keys(e).length) throw new Error("VALIDACION");
      return guardarComunicacion({ ...f, fecha: new Date(fechaLocal).toISOString() }, usuarioId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comunicaciones"] });
      toast.success(f.id ? "Comunicación actualizada" : "Comunicación registrada");
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
      titulo={f.id ? "Editar comunicación" : "Nueva comunicación"}
      ancho="sm:max-w-2xl"
      footer={
        <>
          <button className={botonSecundario} type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className={botonPrimario} type="button" disabled={guardar.isPending} onClick={() => guardar.mutate()}>
            {guardar.isPending ? "Guardando…" : "Guardar comunicación"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <ResumenErrores errores={errores} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Fecha y hora" requerido>
            <input
              type="datetime-local"
              className={campo}
              value={fechaLocal}
              onChange={(e) => setFechaLocal(e.target.value)}
            />
          </Campo>
          <Texto label="Destinatario" value={f.destinatario ?? ""} onChange={(v) => set("destinatario", v)} />
          <Texto label="Medio" value={f.medio ?? ""} placeholder="WhatsApp, llamado, mail…" onChange={(v) => set("medio", v)} />
          <Selector
            label="Concurrente"
            value={f.concurrente_id ?? null}
            error={errores.vinculo}
            opciones={concurrentes.map((c) => ({ value: c.id, label: `${c.apellido || ""} ${c.nombre}`.trim() }))}
            onChange={(v) => set("concurrente_id", v || null)}
          />
          <Selector
            label="Planilla"
            value={f.planilla_id ?? null}
            opciones={planillas.map((p) => ({
              value: p.id,
              label: `#${p.id} · ${p.periodo?.slice(0, 7) ?? "sin período"}`,
            }))}
            onChange={(v) => set("planilla_id", v ? Number(v) : null)}
          />
          <Selector
            label="Documento"
            value={f.documento_id ?? null}
            opciones={documentos.map((d) => ({ value: d.id, label: d.tipo_documento || d.nombre }))}
            onChange={(v) => set("documento_id", v || null)}
          />
        </div>

        <Area
          label="Mensaje enviado"
          requerido
          error={errores.mensaje_enviado}
          value={f.mensaje_enviado ?? ""}
          onChange={(v) => set("mensaje_enviado", v)}
        />
        <Area label="Respuesta" value={f.respuesta ?? ""} onChange={(v) => set("respuesta", v)} />
        <Texto label="Compromiso asumido" value={f.compromiso ?? ""} onChange={(v) => set("compromiso", v)} />
      </div>
    </Modal>
  );
}
