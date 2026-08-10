import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, CalendarPlus } from "lucide-react";
import { Modal, botonPrimario, botonSecundario } from "@/components/forms";
import { Texto, Fecha, Selector, Area, ResumenErrores, useUsuarioActual } from "@/components/kalen/campos";
import { TurnoDialog } from "@/components/turnero/TurnoDialog";
import { turnosApi, type Turno } from "@/lib/api";
import { ESTADO_TURNO_LABEL, fetchTurnosPersona } from "@/lib/turnos";
import { formatFecha } from "@/lib/format";
import { buscarPersonaPorDocumento, obtenerPersona, type Persona } from "@/lib/personas";
import {
  ESTADOS_ADMISION,
  ESTADO_ADMISION_LABEL,
  MOTIVOS_NO_INGRESO,
  fetchAdmisionesPersona,
  fetchHistorialAdmision,
  fetchSedes,
  formatoFechaHora,
  guardarAdmision,
  separarContacto,
  type Admision,
} from "@/lib/kalen";

type Borrador = Partial<Admision> & { estado: Admision["estado"] };

const VACIA: Borrador = {
  sede_id: null,
  fecha_solicitud: new Date().toISOString().slice(0, 10),
  telefono: "",
  medio: "",
  motivo_consulta: "",
  estado: "consulta_recibida",
  motivo_no_ingreso_codigo: "",
  motivo_no_ingreso_detalle: "",
  fecha_entrevista: null,
  observaciones: "",
};

type PersonaForm = {
  id: string | null;
  nombre: string;
  apellido: string;
  documento_numero: string;
  fecha_nacimiento: string | null;
  email: string;
};

const PERSONA_VACIA: PersonaForm = {
  id: null,
  nombre: "",
  apellido: "",
  documento_numero: "",
  fecha_nacimiento: null,
  email: "",
};

export function AdmisionForm({
  abierto,
  onClose,
  inicial,
  personaInicialId,
}: {
  abierto: boolean;
  onClose: () => void;
  inicial?: Admision | null;
  /** Abre el formulario ya vinculado a una persona existente (por ejemplo desde el Turnero). */
  personaInicialId?: string | null;
}) {
  const qc = useQueryClient();
  const { usuarioId } = useUsuarioActual();
  const { data: sedes = [] } = useQuery({ queryKey: ["sedes"], queryFn: fetchSedes, staleTime: 300_000 });

  const [f, setF] = useState<Borrador>(VACIA);
  const [p, setP] = useState<PersonaForm>(PERSONA_VACIA);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [aviso, setAviso] = useState("");

  const { data: historial = [] } = useQuery({
    queryKey: ["historial-admision", inicial?.id ?? 0],
    queryFn: () => fetchHistorialAdmision(inicial!.id),
    enabled: abierto && Boolean(inicial?.id),
  });

  const { data: admisionesPersona = [] } = useQuery({
    queryKey: ["admisiones-persona", p.id ?? ""],
    queryFn: () => fetchAdmisionesPersona(p.id!),
    enabled: abierto && Boolean(p.id),
  });

  useEffect(() => {
    if (!abierto) return;
    setErrores({});
    setAviso("");
    setF(inicial ? { ...inicial } : { ...VACIA, sede_id: sedes[0]?.id ?? null });

    if (!inicial) {
      setP(PERSONA_VACIA);
      if (personaInicialId) {
        obtenerPersona(personaInicialId)
          .then((per) => per && setP(desdePersona(per)))
          .catch(() => undefined);
      }
      return;
    }

    const { nombre, apellido } = separarContacto(inicial.nombre_contacto ?? "");
    setP({ ...PERSONA_VACIA, nombre, apellido });
    if (inicial.persona_id) {
      obtenerPersona(inicial.persona_id)
        .then((per) => per && setP(desdePersona(per)))
        .catch(() => undefined);
    }
  }, [abierto, inicial, sedes]);

  const set = <K extends keyof Borrador>(k: K, v: Borrador[K]) => setF((prev) => ({ ...prev, [k]: v }));
  const setPer = <K extends keyof PersonaForm>(k: K, v: PersonaForm[K]) =>
    setP((prev) => ({ ...prev, [k]: v, ...(k === "documento_numero" ? { id: null } : {}) }));

  // Buscar persona existente por documento: evita crear una segunda identidad.
  const buscar = useMutation({
    mutationFn: async () => {
      const doc = p.documento_numero.trim();
      if (!doc) throw new Error("Ingresá el DNI para buscar.");
      return buscarPersonaPorDocumento("DNI", doc);
    },
    onSuccess: (persona) => {
      if (!persona) {
        setP((prev) => ({ ...prev, id: null }));
        setAviso("No existe una persona con ese DNI: completá los datos y se creará al guardar.");
        return;
      }
      setP(desdePersona(persona));
      setAviso(`Persona existente encontrada: se reutilizará su ficha (${persona.apellido} ${persona.nombre}).`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const guardar = useMutation({
    mutationFn: async () => {
      const e: Record<string, string> = {};
      if (!p.nombre.trim()) e.nombre = "El nombre de la persona es obligatorio.";
      if (!f.sede_id) e.sede_id = "La sede es obligatoria (permite filtrar aunque no ingrese).";
      if (f.estado === "admitido" && !p.documento_numero.trim())
        e.documento_numero = "Para admitir se necesita el DNI de la persona.";
      if (f.estado === "no_ingreso") {
        if (!f.motivo_no_ingreso_codigo) e.motivo_no_ingreso = "Si no ingresó, elegí un motivo.";
        else if (f.motivo_no_ingreso_codigo === "Otro" && !f.motivo_no_ingreso_detalle?.trim())
          e.motivo_no_ingreso = "Detallá el motivo de no ingreso.";
      }
      if (f.estado === "entrevista_programada" && !f.fecha_entrevista)
        e.fecha_entrevista = "Para programar la entrevista indicá la fecha.";
      setErrores(e);
      if (Object.keys(e).length) throw new Error("VALIDACION");

      return guardarAdmision(f, usuarioId, {
        id: p.id,
        nombre: p.nombre.trim(),
        apellido: p.apellido.trim(),
        documento_tipo: "DNI",
        documento_numero: p.documento_numero.trim(),
        telefono: f.telefono ?? "",
        email: p.email.trim(),
        fecha_nacimiento: p.fecha_nacimiento,
      });
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admisiones"] });
      qc.invalidateQueries({ queryKey: ["concurrentes"] });
      qc.invalidateQueries({ queryKey: ["historial"] });
      toast.success(
        res.concurrente_creado
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

  const otrasAdmisiones = admisionesPersona.filter((a) => a.id !== inicial?.id);

  const [turnoAbierto, setTurnoAbierto] = useState(false);

  const { data: turnosPersona = [] } = useQuery<Turno[]>({
    queryKey: ["turnos-persona", p.id ?? ""],
    queryFn: () => fetchTurnosPersona(p.id!),
    enabled: abierto && Boolean(p.id),
  });

  // Persona ya guardada: el turno se vincula a su ficha, nunca crea una nueva.
  const personaSeleccionada: Persona | null = p.id
    ? ({
        id: p.id,
        nombre: p.nombre,
        apellido: p.apellido,
        documento_numero: p.documento_numero,
        telefono: f.telefono ?? "",
        sede_id: f.sede_id ?? null,
      } as Persona)
    : null;

  const crearTurno = useMutation({
    mutationFn: (v: Partial<Turno>) => turnosApi.create(v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["turnos"] });
      qc.invalidateQueries({ queryKey: ["turnos-persona", p.id ?? ""] });
      setTurnoAbierto(false);
      toast.success("Turno agendado y vinculado a la persona");
    },
    onError: (e: Error) => toast.error(`No se pudo agendar el turno: ${e.message}`),
  });

  return (
    <>
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

        <div className="rounded-lg border border-border p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Persona (identidad única)
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Texto
                  label="DNI"
                  value={p.documento_numero}
                  error={errores.documento_numero}
                  placeholder="Buscar o crear por DNI"
                  onChange={(v) => setPer("documento_numero", v)}
                />
              </div>
              <button
                type="button"
                className={botonSecundario}
                disabled={buscar.isPending}
                onClick={() => buscar.mutate()}
              >
                <Search className="h-4 w-4" /> Buscar
              </button>
            </div>
            <Texto label="Apellido" value={p.apellido} onChange={(v) => setPer("apellido", v)} />
            <Texto
              label="Nombre"
              requerido
              value={p.nombre}
              error={errores.nombre}
              onChange={(v) => setPer("nombre", v)}
            />
            <Fecha
              label="Fecha de nacimiento"
              value={p.fecha_nacimiento}
              onChange={(v) => setPer("fecha_nacimiento", v || null)}
            />
            <Texto label="Email" value={p.email} onChange={(v) => setPer("email", v)} />
          </div>
          {aviso && <p className="mt-2 rounded-lg bg-info/15 px-3 py-2 text-xs text-info">{aviso}</p>}
          {otrasAdmisiones.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Esta persona ya tiene {otrasAdmisiones.length} admisión(es) previa(s):{" "}
              {otrasAdmisiones.map((a) => ESTADO_ADMISION_LABEL[a.estado]).join(", ")}.
            </p>
          )}
        </div>

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
          <Texto label="Teléfono de contacto" value={f.telefono ?? ""} onChange={(v) => set("telefono", v)} />
          <Texto
            label="Medio de contacto"
            value={f.medio ?? ""}
            placeholder="Teléfono, WhatsApp, presencial…"
            onChange={(v) => set("medio", v)}
          />
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
        </div>

        <Area label="Motivo de consulta" value={f.motivo_consulta ?? ""} onChange={(v) => set("motivo_consulta", v)} />

        {f.estado === "no_ingreso" && (
          <div className="space-y-3">
            <Selector
              label="Motivo de no ingreso"
              requerido
              vacio="— Elegí un motivo —"
              error={errores.motivo_no_ingreso}
              value={f.motivo_no_ingreso_codigo || null}
              opciones={MOTIVOS_NO_INGRESO.map((m) => ({ value: m, label: m }))}
              onChange={(v) => set("motivo_no_ingreso_codigo", (v as string) || "")}
            />
            <Area
              label="Detalle / observación del motivo"
              requerido={f.motivo_no_ingreso_codigo === "Otro"}
              error={f.motivo_no_ingreso_codigo === "Otro" ? errores.motivo_no_ingreso : undefined}
              value={f.motivo_no_ingreso_detalle ?? ""}
              onChange={(v) => set("motivo_no_ingreso_detalle", v)}
            />
          </div>
        )}

        {f.estado === "admitido" && !f.concurrente_id && (
          <p className="rounded-lg bg-info/15 px-3 py-2 text-xs text-info">
            Al guardar se creará la ficha de concurrente vinculada a esta persona (misma operación, sin duplicar datos).
          </p>
        )}

        <Area label="Observaciones" value={f.observaciones ?? ""} onChange={(v) => set("observaciones", v)} />

        {/* Turnos de la persona: se coordinan actividades sin duplicar su ficha. */}
        <div className="rounded-lg border border-border p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Turnos de la persona</p>
            {p.id ? (
              <button type="button" className={botonSecundario} onClick={() => setTurnoAbierto(true)}>
                <CalendarPlus className="h-4 w-4" /> Agendar turno
              </button>
            ) : (
              <span className="text-xs text-muted-foreground">Guardá la pre-admisión para poder agendar turnos.</span>
            )}
          </div>
          {p.id && turnosPersona.length === 0 && (
            <p className="text-xs text-muted-foreground">Todavía no tiene turnos agendados.</p>
          )}
          {turnosPersona.length > 0 && (
            <ul className="space-y-1.5 text-xs">
              {turnosPersona.map((t) => (
                <li key={t.id} className="flex flex-wrap gap-x-2 text-muted-foreground">
                  <span className="tabular-nums font-medium text-foreground">
                    {formatFecha(t.fecha)} {t.hora}
                  </span>
                  <span>· {t.tipo}</span>
                  <span>· {sedes.find((s) => s.id === t.sede_id)?.nombre ?? "Sin sede"}</span>
                  {t.profesional && <span>· {t.profesional}</span>}
                  <span>· {ESTADO_TURNO_LABEL[t.estado] ?? t.estado}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

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

      <TurnoDialog
        abierto={turnoAbierto}
        existentes={turnosPersona}
        personaFija={personaSeleccionada}
        onClose={() => setTurnoAbierto(false)}
        onGuardar={(v) => crearTurno.mutate(v)}
        guardando={crearTurno.isPending}
      />
    </>
  );
}

function desdePersona(per: Persona): PersonaForm {
  return {
    id: per.id,
    nombre: per.nombre ?? "",
    apellido: per.apellido ?? "",
    documento_numero: per.documento_numero ?? "",
    fecha_nacimiento: per.fecha_nacimiento ?? null,
    email: per.email ?? "",
  };
}
