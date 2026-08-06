import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Modal, campo, areaTexto, botonPrimario, botonSecundario, Etiqueta } from "@/components/forms";
import { usePermisos } from "@/hooks/use-permisos";
import {
  PROFESIONES,
  fetchSedes,
  guardarProfesional,
  type Profesional,
} from "@/lib/kalen";

type Props = {
  abierto: boolean;
  onClose: () => void;
  profesional?: Profesional | null;
};

const vacio = (): Partial<Profesional> => ({
  nombre: "",
  apellido: "",
  dni: "",
  profesion: "",
  matricula: "",
  email: "",
  telefono: "",
  sede_id: null,
  fecha_ingreso: null,
  activo: true,
  observaciones: "",
});

/** Alta y edición de profesionales del equipo, con auditoría automática. */
export function ProfesionalForm({ abierto, onClose, profesional }: Props) {
  const qc = useQueryClient();
  const { usuarioId, puedeEditar } = usePermisos();
  const [datos, setDatos] = useState<Partial<Profesional>>(vacio());

  const { data: sedes = [] } = useQuery({ queryKey: ["sedes"], queryFn: fetchSedes });

  useEffect(() => {
    if (abierto) setDatos(profesional ? { ...profesional } : vacio());
  }, [abierto, profesional]);

  const guardar = useMutation({
    mutationFn: () => guardarProfesional(datos, usuarioId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profesionales"] });
      toast.success(datos.id ? "Profesional actualizado" : "Profesional registrado");
      onClose();
    },
    onError: (e: Error) =>
      toast.error(
        e.message.includes("profesionales_dni_uniq")
          ? "Ya existe un profesional con ese documento."
          : `No se pudo guardar: ${e.message}`,
      ),
  });

  function validar(): string | null {
    if (!datos.nombre?.trim()) return "El nombre es obligatorio.";
    if (!datos.apellido?.trim()) return "El apellido es obligatorio.";
    if (!datos.profesion) return "Elegí la profesión o función.";
    if (datos.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email)) return "El correo no es válido.";
    if (datos.dni && !/^\d{6,10}$/.test(datos.dni.replace(/\D/g, "")))
      return "El documento debe tener entre 6 y 10 dígitos.";
    return null;
  }

  function enviar() {
    const error = validar();
    if (error) {
      toast.error(error);
      return;
    }
    guardar.mutate();
  }

  return (
    <Modal
      abierto={abierto}
      onClose={onClose}
      titulo={datos.id ? "Editar profesional" : "Nuevo profesional"}
      footer={
        <>
          <button className={botonSecundario} onClick={onClose}>
            Cancelar
          </button>
          <button className={botonPrimario} onClick={enviar} disabled={!puedeEditar || guardar.isPending}>
            {guardar.isPending ? "Guardando…" : "Guardar"}
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <Etiqueta>Apellido</Etiqueta>
          <input
            className={campo}
            value={datos.apellido ?? ""}
            onChange={(e) => setDatos({ ...datos, apellido: e.target.value })}
          />
        </label>
        <label>
          <Etiqueta>Nombre</Etiqueta>
          <input
            className={campo}
            value={datos.nombre ?? ""}
            onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
          />
        </label>
        <label>
          <Etiqueta>Documento</Etiqueta>
          <input
            className={campo}
            value={datos.dni ?? ""}
            onChange={(e) => setDatos({ ...datos, dni: e.target.value })}
          />
        </label>
        <label>
          <Etiqueta>Profesión / función</Etiqueta>
          <select
            className={campo}
            value={datos.profesion ?? ""}
            onChange={(e) => setDatos({ ...datos, profesion: e.target.value })}
          >
            <option value="">Seleccionar…</option>
            {PROFESIONES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label>
          <Etiqueta>Matrícula</Etiqueta>
          <input
            className={campo}
            value={datos.matricula ?? ""}
            onChange={(e) => setDatos({ ...datos, matricula: e.target.value })}
          />
        </label>
        <label>
          <Etiqueta>Sede</Etiqueta>
          <select
            className={campo}
            value={datos.sede_id ?? ""}
            onChange={(e) => setDatos({ ...datos, sede_id: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">Sin sede</option>
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          <Etiqueta>Correo</Etiqueta>
          <input
            className={campo}
            value={datos.email ?? ""}
            onChange={(e) => setDatos({ ...datos, email: e.target.value })}
          />
        </label>
        <label>
          <Etiqueta>Teléfono</Etiqueta>
          <input
            className={campo}
            value={datos.telefono ?? ""}
            onChange={(e) => setDatos({ ...datos, telefono: e.target.value })}
          />
        </label>
        <label>
          <Etiqueta>Fecha de ingreso</Etiqueta>
          <input
            type="date"
            className={campo}
            value={datos.fecha_ingreso ?? ""}
            onChange={(e) => setDatos({ ...datos, fecha_ingreso: e.target.value || null })}
          />
        </label>
        <label>
          <Etiqueta>Estado</Etiqueta>
          <select
            className={campo}
            value={datos.activo === false ? "no" : "si"}
            onChange={(e) => setDatos({ ...datos, activo: e.target.value === "si" })}
          >
            <option value="si">Activo</option>
            <option value="no">Inactivo</option>
          </select>
        </label>
        <label className="sm:col-span-2">
          <Etiqueta>Observaciones</Etiqueta>
          <textarea
            rows={3}
            className={areaTexto}
            value={datos.observaciones ?? ""}
            onChange={(e) => setDatos({ ...datos, observaciones: e.target.value })}
          />
        </label>
      </div>
    </Modal>
  );
}
