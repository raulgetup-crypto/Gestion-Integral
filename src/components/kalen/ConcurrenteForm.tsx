import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Modal, botonPrimario, botonSecundario } from "@/components/forms";
import { Texto, Fecha, Selector, Area, ResumenErrores, useUsuarioActual } from "@/components/kalen/campos";
import {
  dniDuplicado,
  esDuplicado,
  fetchSedes,
  guardarFicha,
  MODALIDADES_INGRESO,
  MODALIDAD_LABEL,
  type FichaConcurrente,
} from "@/lib/kalen";

const VACIA: FichaConcurrente = {
  sede_id: null,
  dni: "",
  nombre: "",
  apellido: "",
  fecha_nacimiento: null,
  obra_social: "",
  colegio: "",
  numero_institucion: "",
  fecha_ingreso: null,
  activo: true,
  observaciones: "",
  modalidad_ingreso: "obra_social",
  servicio_beca: "",
  genera_planilla: true,
};

/** APROSS exige colegio y número de institución. */
export const exigeInstitucion = (obraSocial: string) => obraSocial.trim().toUpperCase() === "APROSS";

export function ConcurrenteForm({
  abierto,
  onClose,
  inicial,
}: {
  abierto: boolean;
  onClose: () => void;
  inicial?: Partial<FichaConcurrente> | null;
}) {
  const qc = useQueryClient();
  const { usuarioId } = useUsuarioActual();
  const { data: sedes = [] } = useQuery({ queryKey: ["sedes"], queryFn: fetchSedes, staleTime: 300_000 });

  const [f, setF] = useState<FichaConcurrente>(VACIA);
  const [errores, setErrores] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!abierto) return;
    setErrores({});
    setF({ ...VACIA, ...(inicial ?? {}) });
  }, [abierto, inicial]);

  const set = <K extends keyof FichaConcurrente>(k: K, v: FichaConcurrente[K]) =>
    setF((prev) => ({ ...prev, [k]: v }));

  const institucionObligatoria = useMemo(() => exigeInstitucion(f.obra_social), [f.obra_social]);

  async function validar(): Promise<Record<string, string>> {
    const e: Record<string, string> = {};
    if (!f.nombre.trim()) e.nombre = "El nombre es obligatorio.";
    if (!f.apellido.trim()) e.apellido = "El apellido es obligatorio.";
    if (!f.dni.trim()) e.dni = "El DNI es obligatorio.";
    else if (await dniDuplicado(f.dni, f.id)) e.dni = `Ya existe un concurrente con el DNI ${f.dni.trim()}.`;
    if (institucionObligatoria) {
      if (!f.colegio.trim()) e.colegio = "Con obra social APROSS el colegio es obligatorio.";
      if (!f.numero_institucion.trim())
        e.numero_institucion = "Con obra social APROSS el número de institución es obligatorio.";
    }
    if (f.modalidad_ingreso === "becado" && !f.servicio_beca.trim())
      e.servicio_beca = "Indicá el servicio de beca (obligatorio para modalidad Becado).";
    if (f.modalidad_ingreso === "otro" && !f.servicio_beca.trim())
      e.servicio_beca = "Especificá la modalidad de ingreso.";
    return e;
  }

  const guardar = useMutation({
    mutationFn: async () => {
      const e = await validar();
      setErrores(e);
      if (Object.keys(e).length) throw new Error("VALIDACION");
      return guardarFicha(f, usuarioId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["concurrentes"] });
      toast.success(f.id ? "Ficha actualizada" : "Ficha creada");
      onClose();
    },
    onError: (err: Error) => {
      if (err.message === "VALIDACION") return;
      if (esDuplicado(err)) {
        setErrores((p) => ({ ...p, dni: "Ya existe un concurrente con ese DNI." }));
        return;
      }
      toast.error(`No se pudo guardar: ${err.message}`);
    },
  });

  return (
    <Modal
      abierto={abierto}
      onClose={onClose}
      titulo={f.id ? "Editar ficha del concurrente" : "Nueva ficha de concurrente"}
      ancho="sm:max-w-2xl"
      footer={
        <>
          <button className={botonSecundario} onClick={onClose} type="button">
            Cancelar
          </button>
          <button className={botonPrimario} type="button" disabled={guardar.isPending} onClick={() => guardar.mutate()}>
            {guardar.isPending ? "Guardando…" : "Guardar ficha"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <ResumenErrores errores={errores} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Texto label="Nombre" requerido value={f.nombre} error={errores.nombre} onChange={(v) => set("nombre", v)} />
          <Texto
            label="Apellido"
            requerido
            value={f.apellido}
            error={errores.apellido}
            onChange={(v) => set("apellido", v)}
          />
          <Texto label="DNI" requerido value={f.dni} error={errores.dni} onChange={(v) => set("dni", v)} />
          <Fecha
            label="Fecha de nacimiento"
            value={f.fecha_nacimiento}
            onChange={(v) => set("fecha_nacimiento", v || null)}
          />
          <Selector
            label="Sede"
            value={f.sede_id}
            opciones={sedes.map((s) => ({ value: s.id, label: s.nombre }))}
            onChange={(v) => set("sede_id", v ? Number(v) : null)}
          />
          <Texto
            label="Obra social"
            value={f.obra_social}
            placeholder="APROSS, PAMI, particular…"
            onChange={(v) => set("obra_social", v)}
          />
          <Texto
            label="Colegio"
            requerido={institucionObligatoria}
            value={f.colegio}
            error={errores.colegio}
            onChange={(v) => set("colegio", v)}
          />
          <Texto
            label="Número de institución"
            requerido={institucionObligatoria}
            value={f.numero_institucion}
            error={errores.numero_institucion}
            onChange={(v) => set("numero_institucion", v)}
          />
          <Fecha label="Fecha de ingreso" value={f.fecha_ingreso} onChange={(v) => set("fecha_ingreso", v || null)} />
          <Selector
            label="Estado"
            vacio={null}
            value={f.activo ? "activo" : "inactivo"}
            opciones={[
              { value: "activo", label: "Activo" },
              { value: "inactivo", label: "Inactivo (baja lógica)" },
            ]}
            onChange={(v) => set("activo", v === "activo")}
          />
          <Selector
            label="Modalidad de ingreso"
            vacio={null}
            value={f.modalidad_ingreso}
            opciones={MODALIDADES_INGRESO.map((m) => ({ value: m, label: MODALIDAD_LABEL[m] }))}
            onChange={(v) => {
              const m = String(v || "obra_social") as FichaConcurrente["modalidad_ingreso"];
              setF((prev) => ({
                ...prev,
                modalidad_ingreso: m,
                servicio_beca: m === "becado" || m === "otro" ? prev.servicio_beca : "",
                genera_planilla: m === "becado" ? false : true,
              }));
            }}
          />
          {(f.modalidad_ingreso === "becado" || f.modalidad_ingreso === "otro") && (
            <Texto
              label={f.modalidad_ingreso === "becado" ? "Servicio de beca" : "Especificar modalidad"}
              requerido
              value={f.servicio_beca}
              error={errores.servicio_beca}
              onChange={(v) => set("servicio_beca", v)}
            />
          )}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={f.genera_planilla}
            onChange={(e) => set("genera_planilla", e.target.checked)}
          />
          Genera planilla mensual
        </label>
        {institucionObligatoria && (
          <p className="rounded-lg bg-warning/15 px-3 py-2 text-xs text-warning">
            Obra social APROSS: colegio y número de institución son obligatorios.
          </p>
        )}
        <Area label="Observaciones" value={f.observaciones} onChange={(v) => set("observaciones", v)} />
      </div>
    </Modal>
  );
}
