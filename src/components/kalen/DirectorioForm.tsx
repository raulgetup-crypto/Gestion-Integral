import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Modal, campo, areaTexto, botonPrimario, botonSecundario, Etiqueta } from "@/components/forms";
import { usePermisos } from "@/hooks/use-permisos";
import { fetchSedes } from "@/lib/kalen";
import { crearContacto, actualizarContacto, type Directorio } from "@/lib/directorio";

type Props = {
  abierto: boolean;
  onClose: () => void;
  contacto?: Directorio | null;
};

const vacio = (): Partial<Directorio> => ({
  nombre: "",
  cargo: "",
  institucion: "",
  area: "",
  telefono: "",
  telefono_alternativo: "",
  email: "",
  sede_id: null,
  observaciones: "",
});

/** Alta y edición de contactos del directorio institucional, con auditoría automática. */
export function DirectorioForm({ abierto, onClose, contacto }: Props) {
  const qc = useQueryClient();
  const { usuarioId, puedeEditar } = usePermisos();
  const [datos, setDatos] = useState<Partial<Directorio>>(vacio());

  const { data: sedes = [] } = useQuery({ queryKey: ["sedes"], queryFn: fetchSedes });

  useEffect(() => {
    if (abierto) setDatos(contacto ? { ...contacto } : vacio());
  }, [abierto, contacto]);

  const guardar = useMutation({
    mutationFn: async () => {
      if (datos.id) await actualizarContacto(datos.id, datos, usuarioId);
      else await crearContacto(datos as Partial<Directorio> & { nombre: string }, usuarioId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["directorio"] });
      toast.success(datos.id ? "Contacto actualizado" : "Contacto agregado");
      onClose();
    },
    onError: (e: Error) => toast.error(`No se pudo guardar: ${e.message}`),
  });

  function validar(): string | null {
    if (!datos.nombre?.trim()) return "El nombre es obligatorio.";
    if (datos.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email)) return "El correo no es válido.";
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
      titulo={datos.id ? "Editar contacto" : "Nuevo contacto"}
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
        <label className="sm:col-span-2">
          <Etiqueta>Nombre</Etiqueta>
          <input
            className={campo}
            value={datos.nombre ?? ""}
            onChange={(e) => setDatos((d) => ({ ...d, nombre: e.target.value }))}
          />
        </label>
        <label>
          <Etiqueta>Cargo</Etiqueta>
          <input
            className={campo}
            value={datos.cargo ?? ""}
            onChange={(e) => setDatos((d) => ({ ...d, cargo: e.target.value }))}
          />
        </label>
        <label>
          <Etiqueta>Área</Etiqueta>
          <input
            className={campo}
            value={datos.area ?? ""}
            onChange={(e) => setDatos((d) => ({ ...d, area: e.target.value }))}
          />
        </label>
        <label>
          <Etiqueta>Institución</Etiqueta>
          <input
            className={campo}
            value={datos.institucion ?? ""}
            onChange={(e) => setDatos((d) => ({ ...d, institucion: e.target.value }))}
          />
        </label>
        <label>
          <Etiqueta>Sede</Etiqueta>
          <select
            className={campo}
            value={datos.sede_id ?? ""}
            onChange={(e) => setDatos((d) => ({ ...d, sede_id: e.target.value ? Number(e.target.value) : null }))}
          >
            <option value="">Ambas / no aplica</option>
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          <Etiqueta>Teléfono</Etiqueta>
          <input
            className={campo}
            value={datos.telefono ?? ""}
            onChange={(e) => setDatos((d) => ({ ...d, telefono: e.target.value }))}
          />
        </label>
        <label>
          <Etiqueta>Teléfono alternativo</Etiqueta>
          <input
            className={campo}
            value={datos.telefono_alternativo ?? ""}
            onChange={(e) => setDatos((d) => ({ ...d, telefono_alternativo: e.target.value }))}
          />
        </label>
        <label className="sm:col-span-2">
          <Etiqueta>Correo</Etiqueta>
          <input
            className={campo}
            value={datos.email ?? ""}
            onChange={(e) => setDatos((d) => ({ ...d, email: e.target.value }))}
          />
        </label>
        <label className="sm:col-span-2">
          <Etiqueta>Observaciones</Etiqueta>
          <textarea
            className={areaTexto}
            rows={3}
            value={datos.observaciones ?? ""}
            onChange={(e) => setDatos((d) => ({ ...d, observaciones: e.target.value }))}
          />
        </label>
      </div>
    </Modal>
  );
}
