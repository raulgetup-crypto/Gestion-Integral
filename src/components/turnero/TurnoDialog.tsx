import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, UserRound } from "lucide-react";
import { Modal, campo, areaTexto, Etiqueta, botonPrimario, botonSecundario } from "@/components/forms";
import { hoyISO } from "@/lib/format";
import { usePermisos } from "@/hooks/use-permisos";
import { buscarPersonas, type Persona } from "@/lib/personas";
import { fetchSedes } from "@/lib/kalen";
import { ESTADOS_TURNO, ESTADO_TURNO_LABEL, RESULTADOS_TURNO, fetchTiposTurno } from "@/lib/turnos";
import type { Turno } from "@/lib/api";
import { cn } from "@/lib/utils";

const vacio = (): Partial<Turno> => ({
  fecha: hoyISO(),
  hora: "09:00",
  tipo: "Entrevista de admisión",
  nombre: "",
  contacto: "",
  obra_social: "",
  notas: "",
  estado: "pendiente",
  persona_id: null,
  dni: "",
  sede_id: null,
  profesional: "",
  resultado: "",
});

const nombreCompleto = (p: Persona) => `${p.apellido ?? ""} ${p.nombre ?? ""}`.trim();

export function TurnoDialog({
  abierto,
  turno,
  existentes,
  personaFija,
  onClose,
  onGuardar,
  guardando,
}: {
  abierto: boolean;
  turno?: Turno | null;
  existentes: Turno[];
  /** Persona precargada (por ejemplo al agendar desde la pre-admisión). */
  personaFija?: Persona | null;
  onClose: () => void;
  onGuardar: (v: Partial<Turno>) => void;
  guardando?: boolean;
}) {
  const { puedeEditar } = usePermisos();
  const [f, setF] = useState<Partial<Turno>>(turno ?? vacio());
  const [tocado, setTocado] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const { data: sedes = [] } = useQuery({ queryKey: ["sedes"], queryFn: fetchSedes, staleTime: 300_000 });
  const { data: tipos = [] } = useQuery({ queryKey: ["tipos-turno"], queryFn: fetchTiposTurno, staleTime: 300_000 });
  const { data: coincidencias = [] } = useQuery({
    queryKey: ["buscar-personas", busqueda],
    queryFn: () => buscarPersonas(busqueda),
    enabled: abierto && busqueda.trim().length >= 2,
  });

  useEffect(() => {
    if (!abierto) return;
    setTocado(false);
    setBusqueda("");
    if (turno) {
      setF({ ...turno });
      return;
    }
    const base = { ...vacio(), sede_id: sedes[0]?.id ?? null };
    setF(
      personaFija
        ? {
            ...base,
            persona_id: personaFija.id,
            nombre: nombreCompleto(personaFija),
            dni: personaFija.documento_numero ?? "",
            contacto: personaFija.telefono ?? "",
            sede_id: personaFija.sede_id ?? base.sede_id,
          }
        : base,
    );
  }, [abierto, turno, personaFija, sedes]);

  const opcionesTipo = useMemo(() => {
    const actual = (f.tipo ?? "").trim();
    return actual && !tipos.includes(actual) ? [actual, ...tipos] : tipos;
  }, [tipos, f.tipo]);

  const nombre = (f.nombre ?? "").trim();
  const errorNombre = !nombre ? "Requerido" : nombre.length > 120 ? "Demasiado largo" : undefined;
  const errorFecha = !f.fecha ? "Requerido" : undefined;
  const errorSede = !f.sede_id ? "Elegí la sede" : undefined;
  // Evita duplicados exactos: misma persona, mismo día y misma hora.
  const duplicado = existentes.some(
    (t) =>
      t.id !== turno?.id &&
      (t.persona_id && f.persona_id ? t.persona_id === f.persona_id : t.nombre.trim().toLowerCase() === nombre.toLowerCase()) &&
      t.fecha === f.fecha &&
      t.hora === f.hora,
  );
  const valido = !errorNombre && !errorFecha && !errorSede && !duplicado;

  function elegirPersona(p: Persona) {
    setF((prev) => ({
      ...prev,
      persona_id: p.id,
      nombre: nombreCompleto(p),
      dni: p.documento_numero ?? "",
      contacto: p.telefono || prev.contacto || "",
      sede_id: prev.sede_id ?? p.sede_id ?? null,
    }));
    setBusqueda("");
  }

  function guardar() {
    setTocado(true);
    if (!valido) return;
    onGuardar({
      ...f,
      nombre,
      dni: (f.dni ?? "").trim(),
      profesional: (f.profesional ?? "").trim(),
      contacto: (f.contacto ?? "").trim(),
      obra_social: (f.obra_social ?? "").trim(),
      notas: (f.notas ?? "").trim(),
      resultado: f.resultado ?? "",
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
        {/* Persona: siempre se reutiliza la ficha existente, nunca se crea una nueva acá. */}
        <div className="rounded-lg border border-border p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Persona</p>
          {f.persona_id ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-accent/50 px-3 py-2">
              <span className="inline-flex items-center gap-2 text-sm font-medium">
                <UserRound className="h-4 w-4 text-primary" />
                {nombre} {f.dni ? <span className="text-xs text-muted-foreground">DNI {f.dni}</span> : null}
              </span>
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => setF((prev) => ({ ...prev, persona_id: null }))}
              >
                Cambiar
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por DNI, nombre o apellido…"
                  className={cn(campo, "pl-9")}
                />
              </div>
              {coincidencias.length > 0 && (
                <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
                  {coincidencias.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => elegirPersona(p)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                      >
                        <span>{nombreCompleto(p)}</span>
                        <span className="text-xs text-muted-foreground">
                          {p.documento_numero ? `DNI ${p.documento_numero}` : "sin DNI"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {busqueda.trim().length >= 2 && coincidencias.length === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Sin coincidencias. Registrá la persona desde Admisiones (pre-admisión) para vincularla.
                </p>
              )}
            </>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <Etiqueta hint={tocado ? errorNombre : undefined}>Nombre</Etiqueta>
            <input
              value={f.nombre ?? ""}
              onChange={(e) => setF({ ...f, nombre: e.target.value })}
              disabled={Boolean(f.persona_id)}
              className={cn(campo, f.persona_id && "opacity-60")}
            />
          </label>
          <label className="block">
            <Etiqueta>DNI</Etiqueta>
            <input
              value={f.dni ?? ""}
              onChange={(e) => setF({ ...f, dni: e.target.value })}
              disabled={Boolean(f.persona_id)}
              className={cn(campo, f.persona_id && "opacity-60")}
            />
          </label>
          <label className="block">
            <Etiqueta hint={tocado ? errorFecha : undefined}>Fecha</Etiqueta>
            <input type="date" value={f.fecha ?? ""} onChange={(e) => setF({ ...f, fecha: e.target.value })} className={campo} />
          </label>
          <label className="block">
            <Etiqueta>Hora</Etiqueta>
            <input type="time" value={f.hora ?? ""} onChange={(e) => setF({ ...f, hora: e.target.value })} className={campo} />
          </label>
          <label className="block">
            <Etiqueta>Tipo de turno</Etiqueta>
            <select value={f.tipo ?? ""} onChange={(e) => setF({ ...f, tipo: e.target.value })} className={campo}>
              {opcionesTipo.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <Etiqueta hint={tocado ? errorSede : undefined}>Sede</Etiqueta>
            <select
              value={f.sede_id ?? ""}
              onChange={(e) => setF({ ...f, sede_id: e.target.value ? Number(e.target.value) : null })}
              className={campo}
            >
              <option value="">— Elegí la sede —</option>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <Etiqueta>Profesional / responsable</Etiqueta>
            <input
              value={f.profesional ?? ""}
              onChange={(e) => setF({ ...f, profesional: e.target.value })}
              className={campo}
            />
          </label>
          <label className="block">
            <Etiqueta>Estado</Etiqueta>
            <select value={f.estado} onChange={(e) => setF({ ...f, estado: e.target.value })} className={campo}>
              {ESTADOS_TURNO.map((e) => (
                <option key={e} value={e}>
                  {ESTADO_TURNO_LABEL[e]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block">
          <Etiqueta>Resultado del turno</Etiqueta>
          <select
            value={f.resultado ?? ""}
            onChange={(e) => setF({ ...f, resultado: e.target.value })}
            className={campo}
          >
            {RESULTADOS_TURNO.map((r) => (
              <option key={r || "sin"} value={r}>
                {r || "— Sin resultado todavía —"}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Registrar el resultado no cambia el estado de la admisión: la decisión se toma en la pre-admisión.
          </p>
        </label>
        <label className="block">
          <Etiqueta>Obra social</Etiqueta>
          <input value={f.obra_social ?? ""} onChange={(e) => setF({ ...f, obra_social: e.target.value })} className={campo} />
        </label>
        <label className="block">
          <Etiqueta>Contacto</Etiqueta>
          <input value={f.contacto ?? ""} onChange={(e) => setF({ ...f, contacto: e.target.value })} className={campo} />
        </label>
        <label className="block">
          <Etiqueta>Observaciones</Etiqueta>
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
