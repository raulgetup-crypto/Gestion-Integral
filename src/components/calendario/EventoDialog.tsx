import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Modal, campo, areaTexto, Etiqueta, botonPrimario, botonSecundario } from "@/components/forms";
import { fetchConcurrentes, type Evento } from "@/lib/api";
import { usePermisos } from "@/hooks/use-permisos";

export const COLORES_EVENTO: Record<string, string> = {
  azul: "bg-info/15 text-info",
  verde: "bg-success/15 text-success",
  amarillo: "bg-warning/20 text-warning",
  rojo: "bg-destructive/15 text-destructive",
  violeta: "bg-primary/15 text-primary",
};

const vacio = (fecha: string): Partial<Evento> => ({
  titulo: "",
  fecha,
  hora: "",
  prioridad: "media",
  categoria: "general",
  color: "azul",
  estado: "pendiente",
  descripcion: "",
  concurrente_id: null,
});

export function EventoDialog({
  abierto,
  fechaBase,
  evento,
  onClose,
  onGuardar,
  guardando,
}: {
  abierto: boolean;
  fechaBase: string;
  evento?: Evento | null;
  onClose: () => void;
  onGuardar: (v: Partial<Evento>) => void;
  guardando?: boolean;
}) {
  const { puedeEditar } = usePermisos();
  const [f, setF] = useState<Partial<Evento>>(evento ?? vacio(fechaBase));
  const [tocado, setTocado] = useState(false);
  const { data: personas = [] } = useQuery({ queryKey: ["concurrentes"], queryFn: fetchConcurrentes });

  useEffect(() => {
    if (abierto) {
      setF(evento ?? vacio(fechaBase));
      setTocado(false);
    }
  }, [abierto, evento, fechaBase]);

  const errorTitulo = !f.titulo?.trim() ? "Requerido" : undefined;
  const errorFecha = !f.fecha ? "Requerido" : undefined;
  const valido = !errorTitulo && !errorFecha;

  function guardar() {
    setTocado(true);
    if (!valido) return;
    onGuardar({ ...f, titulo: f.titulo!.trim(), descripcion: (f.descripcion ?? "").trim() });
  }

  return (
    <Modal
      abierto={abierto}
      onClose={onClose}
      titulo={evento ? "Editar evento" : "Nuevo evento"}
      footer={
        <>
          <button className={botonSecundario} onClick={onClose}>
            Cancelar
          </button>
          {puedeEditar && (
            <button className={botonPrimario} onClick={guardar} disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar"}
            </button>
          )}
        </>
      }
    >
      <div className="space-y-3">
        <label className="block">
          <Etiqueta hint={tocado ? errorTitulo : undefined}>Título</Etiqueta>
          <input
            autoFocus
            value={f.titulo ?? ""}
            onChange={(e) => setF({ ...f, titulo: e.target.value })}
            className={campo}
            placeholder="Ej. Reunión de equipo"
          />
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
            <Etiqueta>Prioridad</Etiqueta>
            <select value={f.prioridad} onChange={(e) => setF({ ...f, prioridad: e.target.value })} className={campo}>
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
            </select>
          </label>
          <label className="block">
            <Etiqueta>Estado</Etiqueta>
            <select value={f.estado} onChange={(e) => setF({ ...f, estado: e.target.value })} className={campo}>
              <option value="pendiente">Pendiente</option>
              <option value="en_curso">En curso</option>
              <option value="hecho">Hecho</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </label>
          <label className="block">
            <Etiqueta>Categoría</Etiqueta>
            <select value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })} className={campo}>
              <option value="general">General</option>
              <option value="documentacion">Documentación</option>
              <option value="facturacion">Facturación</option>
              <option value="reunion">Reunión</option>
              <option value="salida">Salida</option>
            </select>
          </label>
          <label className="block">
            <Etiqueta>Color</Etiqueta>
            <select value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} className={campo}>
              {Object.keys(COLORES_EVENTO).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <Etiqueta>Concurrente vinculado</Etiqueta>
          <select
            value={f.concurrente_id ?? ""}
            onChange={(e) => setF({ ...f, concurrente_id: e.target.value || null })}
            className={campo}
          >
            <option value="">Sin concurrente</option>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <Etiqueta>Descripción</Etiqueta>
          <textarea
            rows={3}
            value={f.descripcion ?? ""}
            onChange={(e) => setF({ ...f, descripcion: e.target.value })}
            className={areaTexto}
          />
        </label>
      </div>
    </Modal>
  );
}
