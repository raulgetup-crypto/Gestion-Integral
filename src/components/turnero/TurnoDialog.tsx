import { useEffect, useState } from "react";
import { Modal, campo, areaTexto, Etiqueta, botonPrimario, botonSecundario } from "@/components/forms";
import { hoyISO } from "@/lib/format";
import { usePermisos } from "@/hooks/use-permisos";
import type { Turno } from "@/lib/api";

const vacio = (): Partial<Turno> => ({
  fecha: hoyISO(),
  hora: "09:00",
  tipo: "admision",
  nombre: "",
  contacto: "",
  obra_social: "",
  notas: "",
  estado: "pendiente",
});

export function TurnoDialog({
  abierto,
  turno,
  existentes,
  onClose,
  onGuardar,
  guardando,
}: {
  abierto: boolean;
  turno?: Turno | null;
  existentes: Turno[];
  onClose: () => void;
  onGuardar: (v: Partial<Turno>) => void;
  guardando?: boolean;
}) {
  const { puedeEditar } = usePermisos();
  const [f, setF] = useState<Partial<Turno>>(turno ?? vacio());
  const [tocado, setTocado] = useState(false);

  useEffect(() => {
    if (abierto) {
      setF(turno ?? vacio());
      setTocado(false);
    }
  }, [abierto, turno]);

  const nombre = (f.nombre ?? "").trim();
  const errorNombre = !nombre ? "Requerido" : nombre.length > 120 ? "Demasiado largo" : undefined;
  const errorFecha = !f.fecha ? "Requerido" : undefined;
  // Evita duplicados exactos: misma persona, mismo día y misma hora.
  const duplicado = existentes.some(
    (t) =>
      t.id !== turno?.id &&
      t.nombre.trim().toLowerCase() === nombre.toLowerCase() &&
      t.fecha === f.fecha &&
      t.hora === f.hora,
  );
  const valido = !errorNombre && !errorFecha && !duplicado;

  function guardar() {
    setTocado(true);
    if (!valido) return;
    onGuardar({
      ...f,
      nombre,
      contacto: (f.contacto ?? "").trim(),
      obra_social: (f.obra_social ?? "").trim(),
      notas: (f.notas ?? "").trim(),
    });
  }

  return (
    <Modal
      abierto={abierto}
      onClose={onClose}
      titulo={turno ? "Editar turno" : "Nuevo turno"}
      footer={
        <>
          <button className={botonSecundario} onClick={onClose}>
            Cancelar
          </button>
          <button className={botonPrimario} onClick={guardar} disabled={guardando || !puedeEditar}>
            {guardando ? "Guardando…" : "Guardar turno"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <label className="block">
          <Etiqueta hint={tocado ? errorNombre : undefined}>Nombre</Etiqueta>
          <input autoFocus value={f.nombre ?? ""} onChange={(e) => setF({ ...f, nombre: e.target.value })} className={campo} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <Etiqueta hint={tocado ? errorFecha : undefined}>Fecha</Etiqueta>
            <input type="date" value={f.fecha ?? ""} onChange={(e) => setF({ ...f, fecha: e.target.value })} className={campo} />
          </label>
          <label className="block">
            <Etiqueta>Hora</Etiqueta>
            <input type="time" value={f.hora ?? ""} onChange={(e) => setF({ ...f, hora: e.target.value })} className={campo} />
          </label>
          <label className="block">
            <Etiqueta>Tipo</Etiqueta>
            <select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })} className={campo}>
              <option value="admision">Admisión</option>
              <option value="entrevista">Entrevista</option>
              <option value="seguimiento">Seguimiento</option>
              <option value="reunion">Reunión familiar</option>
            </select>
          </label>
          <label className="block">
            <Etiqueta>Estado</Etiqueta>
            <select value={f.estado} onChange={(e) => setF({ ...f, estado: e.target.value })} className={campo}>
              <option value="pendiente">Pendiente</option>
              <option value="confirmado">Confirmado</option>
              <option value="atendido">Atendido</option>
              <option value="ausente">Ausente</option>
            </select>
          </label>
        </div>
        <label className="block">
          <Etiqueta>Obra social</Etiqueta>
          <input value={f.obra_social ?? ""} onChange={(e) => setF({ ...f, obra_social: e.target.value })} className={campo} />
        </label>
        <label className="block">
          <Etiqueta>Contacto</Etiqueta>
          <input value={f.contacto ?? ""} onChange={(e) => setF({ ...f, contacto: e.target.value })} className={campo} />
        </label>
        <label className="block">
          <Etiqueta>Notas</Etiqueta>
          <textarea rows={3} value={f.notas ?? ""} onChange={(e) => setF({ ...f, notas: e.target.value })} className={areaTexto} />
        </label>
        {tocado && duplicado && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            Ya existe un turno para esa persona en la misma fecha y hora.
          </p>
        )}
      </div>
    </Modal>
  );
}
