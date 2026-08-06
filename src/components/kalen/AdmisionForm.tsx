import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Modal, botonPrimario, botonSecundario } from "@/components/forms";
import { Texto, Fecha, Selector, Area, ResumenErrores, useUsuarioActual } from "@/components/kalen/campos";
import { fetchConcurrentes } from "@/lib/api";
import {
  ESTADOS_ADMISION,
  ESTADO_ADMISION_LABEL,
  MOTIVOS_NO_INGRESO,
  fetchHistorialAdmision,
  fetchSedes,
  formatoFechaHora,
  guardarAdmision,
  type Admision,
} from "@/lib/kalen";

type Borrador = Partial<Admision> & { estado: Admision["estado"] };

const VACIA: Borrador = {
  sede_id: null,
  concurrente_id: null,
  fecha_solicitud: new Date().toISOString().slice(0, 10),
  nombre_contacto: "",
  telefono: "",
  medio: "",
  motivo_consulta: "",
  estado: "consulta_recibida",
  motivo_no_ingreso: "",
  fecha_entrevista: null,
  observaciones: "",
};

export function AdmisionForm({
  abierto,
  onClose,
  inicial,
}: {
  abierto: boolean;
  onClose: () => void;
  inicial?: Admision | null;
}) {
  const qc = useQueryClient();
  const { usuarioId } = useUsuarioActual();
  const { data: sedes = [] } = useQuery({ queryKey: ["sedes"], queryFn: fetchSedes, staleTime: 300_000 });
  const { data: concurrentes = [] } = useQuery({ queryKey: ["concurrentes"], queryFn: fetchConcurrentes });

  const [f, setF] = useState<Borrador>(VACIA);
  const [errores, setErrores] = useState<Record<string, string>>({});
  // "Otro" habilita texto libre; el resto usa la lista predefinida.
  const [motivoLista, setMotivoLista] = useState<string>("");

  const { data: historial = [] } = useQuery({
    queryKey: ["historial-admision", inicial?.id ?? 0],
    queryFn: () => fetchHistorialAdmision(inicial!.id),
    enabled: abierto && Boolean(inicial?.id),
  });

  useEffect(() => {
    if (!abierto) return;
    setErrores({});
    setF(inicial ? { ...inicial } : { ...VACIA, sede_id: sedes[0]?.id ?? null });
    const motivo = inicial?.motivo_no_ingreso?.trim() ?? "";
    setMotivoLista(
      !motivo ? "" : (MOTIVOS_NO_INGRESO as readonly string[]).includes(motivo) ? motivo : "Otro",
    );
  }, [abierto, inicial, sedes]);

  const set = <K extends keyof Borrador>(k: K, v: Borrador[K]) => setF((p) => ({ ...p, [k]: v }));

  const guardar = useMutation({
    mutationFn: async () => {
      const e: Record<string, string> = {};
      if (!f.nombre_contacto?.trim()) e.nombre_contacto = "El nombre del contacto es obligatorio.";
      if (!f.sede_id) e.sede_id = "La sede es obligatoria (permite filtrar aunque no ingrese).";
      if (f.estado === "no_ingreso") {
        if (!motivoLista) e.motivo_no_ingreso = "Si no ingresó, elegí un motivo.";
        else if (motivoLista === "Otro" && !f.motivo_no_ingreso?.trim())
          e.motivo_no_ingreso = "Detallá el motivo de no ingreso.";
      }
      if (f.estado === "entrevista_programada" && !f.fecha_entrevista)
        e.fecha_entrevista = "Para programar la entrevista indicá la fecha.";
      setErrores(e);
      if (Object.keys(e).length) throw new Error("VALIDACION");
      return guardarAdmision(f, usuarioId);
    },
    onSuccess: (adm) => {
      qc.invalidateQueries({ queryKey: ["admisiones"] });
      qc.invalidateQueries({ queryKey: ["concurrentes"] });
      toast.success(
        adm.estado === "admitido" && adm.concurrente_id
          ? "Admisión guardada y ficha de concurrente creada automáticamente"
          : "Admisión guardada",
      );
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
      titulo={f.id ? "Editar admisión" : "Nueva admisión"}
      ancho="sm:max-w-2xl"
      footer={
        <>
          <button className={botonSecundario} type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className={botonPrimario} type="button" disabled={guardar.isPending} onClick={() => guardar.mutate()}>
            {guardar.isPending ? "Guardando…" : "Guardar admisión"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <ResumenErrores errores={errores} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Selector
            label="Sede"
            requerido
            value={f.sede_id ?? null}
            error={errores.sede_id}
            opciones={sedes.map((s) => ({ value: s.id, label: s.nombre }))}
            onChange={(v) => set("sede_id", v ? Number(v) : null)}
          />
          <Fecha
            label="Fecha de solicitud"
            value={f.fecha_solicitud ?? null}
            onChange={(v) => set("fecha_solicitud", v || null)}
          />
          <Texto
            label="Nombre de contacto"
            requerido
            value={f.nombre_contacto ?? ""}
            error={errores.nombre_contacto}
            onChange={(v) => set("nombre_contacto", v)}
          />
          <Texto label="Teléfono" value={f.telefono ?? ""} onChange={(v) => set("telefono", v)} />
          <Texto label="Medio de contacto" value={f.medio ?? ""} placeholder="Teléfono, WhatsApp, presencial…" onChange={(v) => set("medio", v)} />
          <Selector
            label="Estado"
            vacio={null}
            value={f.estado}
            opciones={ESTADOS_ADMISION.map((e) => ({ value: e, label: ESTADO_ADMISION_LABEL[e] }))}
            onChange={(v) => set("estado", v as Admision["estado"])}
          />
          <Fecha
            label="Fecha de entrevista"
            value={f.fecha_entrevista ?? null}
            onChange={(v) => set("fecha_entrevista", v || null)}
          />
          <Selector
            label="Concurrente vinculado (opcional)"
            value={f.concurrente_id ?? null}
            opciones={concurrentes.map((c) => ({
              value: c.id,
              label: `${c.apellido || ""} ${c.nombre}`.trim(),
            }))}
            vacio="— Sin vincular —"
            onChange={(v) => set("concurrente_id", v || null)}
          />
        </div>

        <Area label="Motivo de consulta" value={f.motivo_consulta ?? ""} onChange={(v) => set("motivo_consulta", v)} />

        {f.estado === "no_ingreso" && (
          <div className="space-y-3">
            <Selector
              label="Motivo de no ingreso"
              requerido
              vacio="— Elegí un motivo —"
              error={errores.motivo_no_ingreso}
              value={motivoLista || null}
              opciones={MOTIVOS_NO_INGRESO.map((m) => ({ value: m, label: m }))}
              onChange={(v) => {
                const elegido = (v as string) || "";
                setMotivoLista(elegido);
                set("motivo_no_ingreso", elegido === "Otro" ? "" : elegido);
              }}
            />
            {motivoLista === "Otro" && (
              <Area
                label="Detalle del motivo"
                requerido
                error={errores.motivo_no_ingreso}
                value={f.motivo_no_ingreso ?? ""}
                onChange={(v) => set("motivo_no_ingreso", v)}
              />
            )}
          </div>
        )}

        {f.estado === "admitido" && !f.concurrente_id && (
          <p className="rounded-lg bg-info/15 px-3 py-2 text-xs text-info">
            Al guardar se creará automáticamente la ficha del concurrente con la misma sede y los datos de contacto.
          </p>
        )}

        <Area label="Observaciones" value={f.observaciones ?? ""} onChange={(v) => set("observaciones", v)} />

        {historial.length > 0 && (
          <div className="rounded-lg border border-border p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Historial de estados
            </p>
            <ul className="space-y-1.5 text-xs">
              {historial.map((h) => (
                <li key={h.id} className="flex flex-wrap gap-x-2 text-muted-foreground">
                  <span className="tabular-nums">{formatoFechaHora(h.fecha_hora)}</span>
                  <span className="font-medium text-foreground">
                    {h.estado_anterior ? `${h.estado_anterior.replace(/_/g, " ")} → ` : "Alta · "}
                    {h.estado_nuevo.replace(/_/g, " ")}
                  </span>
                  {h.motivo_no_ingreso && <span>· {h.motivo_no_ingreso}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
