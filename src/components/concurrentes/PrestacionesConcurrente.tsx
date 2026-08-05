import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Clock, ClipboardList, Star, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Chip, EmptyState } from "@/components/ui-kit";
import { Modal, campo, areaTexto, botonPrimario, botonSecundario, Etiqueta } from "@/components/forms";
import {
  prestacionesApi,
  horariosApi,
  registroHorasApi,
  fetchPrestacionesDe,
  fetchHorariosDe,
  fetchRegistroHorasDe,
  fetchCatalogos,
  type Concurrente,
  type ConcurrentePrestacion,
} from "@/lib/api";
import {
  DIAS_SEMANA,
  TIPOS_REGISTRO,
  TIPO_LABEL,
  MINIMO_APROSS,
  horasEntre,
  horasSemanales,
  resumenAprossy,
  controlaHoras,
} from "@/lib/aprossy-horas";
import { formatFecha, hoyISO, mesActual, nombreMes } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ============ Prestaciones + cronograma semanal ============ */

export function PrestacionesConcurrente({ persona }: { persona: Concurrente }) {
  const qc = useQueryClient();
  const [nueva, setNueva] = useState(false);
  const [horarioDe, setHorarioDe] = useState<ConcurrentePrestacion | null>(null);

  const { data: catalogos = {} } = useQuery({ queryKey: ["catalogos"], queryFn: fetchCatalogos });
  const { data: prestaciones = [] } = useQuery({
    queryKey: ["prestaciones", persona.id],
    queryFn: () => fetchPrestacionesDe(persona.id),
  });
  const ids = prestaciones.map((p) => p.id);
  const { data: horarios = [] } = useQuery({
    queryKey: ["prestacion-horarios", ids.join(",")],
    queryFn: () => fetchHorariosDe(ids),
    enabled: ids.length > 0,
  });

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ["prestaciones", persona.id] });
    qc.invalidateQueries({ queryKey: ["prestacion-horarios"] });
    qc.invalidateQueries({ queryKey: ["concurrentes"] });
  };

  const crear = useMutation({
    mutationFn: (v: Partial<ConcurrentePrestacion>) => prestacionesApi.create({ ...v, concurrente_id: persona.id }),
    onSuccess: () => {
      refrescar();
      setNueva(false);
      toast.success("Prestación agregada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const editar = useMutation({
    mutationFn: ({ id, v }: { id: string; v: Partial<ConcurrentePrestacion> }) => prestacionesApi.update(id, v),
    onSuccess: refrescar,
    onError: (e: Error) => toast.error(e.message),
  });

  const borrar = useMutation({
    mutationFn: (p: ConcurrentePrestacion) => prestacionesApi.remove(p.id, `la prestación "${p.prestacion}"`),
    onSuccess: () => {
      refrescar();
      toast.success("Prestación eliminada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prestaciones asignadas</p>
        <button onClick={() => setNueva(true)} className={botonSecundario + " h-9"}>
          <Plus className="h-4 w-4" /> Agregar
        </button>
      </div>

      {prestaciones.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Sin prestaciones cargadas" hint="Agregá Centro de Día, DAI, MIE, Apoyo, Transporte…" />
      ) : (
        <ul className="space-y-3">
          {prestaciones.map((p) => {
            const propios = horarios.filter((h) => h.prestacion_id === p.id);
            return (
              <li key={p.id} className="rounded-xl border border-border">
                <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
                  <span className="text-sm font-semibold">{p.prestacion}</span>
                  {p.principal && <Chip tone="info">Principal</Chip>}
                  <Chip tone={p.activa ? "success" : "muted"}>{p.activa ? "Activa" : "Inactiva"}</Chip>
                  <Chip tone="muted">{horasSemanales(propios)} h/semana</Chip>
                  <div className="ml-auto flex gap-1.5">
                    {!p.principal && p.activa && (
                      <button
                        title="Marcar como principal"
                        onClick={() => editar.mutate({ id: p.id, v: { principal: true } })}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
                      >
                        <Star className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => editar.mutate({ id: p.id, v: { activa: !p.activa } })}
                      className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
                    >
                      {p.activa ? "Desactivar" : "Activar"}
                    </button>
                    <button
                      title="Eliminar"
                      onClick={() => window.confirm(`¿Eliminar la prestación "${p.prestacion}"?`) && borrar.mutate(p)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="grid gap-1 px-4 py-2.5 text-xs text-muted-foreground sm:grid-cols-2">
                  <span>Inicio: {formatFecha(p.fecha_inicio) || "—"}</span>
                  <span>Fin: {formatFecha(p.fecha_fin) || "—"}</span>
                  {p.observaciones && <span className="sm:col-span-2">Obs.: {p.observaciones}</span>}
                </div>
                <div className="border-t border-border px-4 py-2.5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cronograma semanal</span>
                    <button onClick={() => setHorarioDe(p)} className="text-xs font-medium text-primary hover:underline">
                      + Horario
                    </button>
                  </div>
                  {propios.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sin horarios cargados.</p>
                  ) : (
                    <ul className="flex flex-wrap gap-1.5">
                      {propios.map((h) => (
                        <li
                          key={h.id}
                          className="inline-flex items-center gap-2 rounded-lg border border-border px-2.5 py-1 text-xs"
                        >
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">
                            {DIAS_SEMANA.find((d) => d.valor === h.dia_semana)?.corto ?? "—"}
                          </span>
                          <span className="tabular-nums text-muted-foreground">
                            {h.hora_inicio}–{h.hora_fin} ({h.horas} h)
                          </span>
                          <button
                            aria-label="Quitar horario"
                            onClick={async () => {
                              await horariosApi.remove(h.id, "un horario del cronograma");
                              qc.invalidateQueries({ queryKey: ["prestacion-horarios"] });
                            }}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {nueva && (
        <FormPrestacion
          catalogos={catalogos.prestaciones || []}
          sinPrincipal={!prestaciones.some((p) => p.principal && p.activa)}
          onClose={() => setNueva(false)}
          onSave={(v) => crear.mutate(v)}
          guardando={crear.isPending}
        />
      )}

      {horarioDe && (
        <FormHorario
          prestacion={horarioDe}
          onClose={() => setHorarioDe(null)}
          onSaved={() => {
            setHorarioDe(null);
            qc.invalidateQueries({ queryKey: ["prestacion-horarios"] });
          }}
        />
      )}
    </div>
  );
}

function FormPrestacion({
  catalogos,
  sinPrincipal,
  onClose,
  onSave,
  guardando,
}: {
  catalogos: string[];
  sinPrincipal: boolean;
  onClose: () => void;
  onSave: (v: Partial<ConcurrentePrestacion>) => void;
  guardando: boolean;
}) {
  const [form, setForm] = useState<Partial<ConcurrentePrestacion>>({
    prestacion: "",
    fecha_inicio: hoyISO(),
    fecha_fin: null,
    activa: true,
    principal: sinPrincipal,
    observaciones: "",
  });
  const invalido = !form.prestacion?.trim() || (!!form.fecha_fin && !!form.fecha_inicio && form.fecha_fin < form.fecha_inicio);

  return (
    <Modal
      abierto
      onClose={onClose}
      titulo="Nueva prestación"
      footer={
        <>
          <button onClick={onClose} className={botonSecundario}>
            Cancelar
          </button>
          <button disabled={invalido || guardando} onClick={() => onSave(form)} className={botonPrimario}>
            Guardar
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <Etiqueta>Prestación</Etiqueta>
          <input
            autoFocus
            list="cat-prestaciones-2a"
            value={form.prestacion || ""}
            onChange={(e) => setForm((f) => ({ ...f, prestacion: e.target.value }))}
            className={campo}
          />
          <datalist id="cat-prestaciones-2a">
            {catalogos.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </label>
        <label className="block">
          <Etiqueta>Fecha de inicio</Etiqueta>
          <input
            type="date"
            value={form.fecha_inicio || ""}
            onChange={(e) => setForm((f) => ({ ...f, fecha_inicio: e.target.value || null }))}
            className={campo}
          />
        </label>
        <label className="block">
          <Etiqueta hint={invalido && form.fecha_fin ? "Debe ser posterior al inicio" : undefined}>Fecha de fin</Etiqueta>
          <input
            type="date"
            value={form.fecha_fin || ""}
            onChange={(e) => setForm((f) => ({ ...f, fecha_fin: e.target.value || null }))}
            className={campo}
          />
        </label>
        <label className="block">
          <Etiqueta>Estado</Etiqueta>
          <select
            value={form.activa ? "si" : "no"}
            onChange={(e) => setForm((f) => ({ ...f, activa: e.target.value === "si" }))}
            className={campo}
          >
            <option value="si">Activa</option>
            <option value="no">Inactiva</option>
          </select>
        </label>
        <label className="block">
          <Etiqueta>Principal</Etiqueta>
          <select
            value={form.principal ? "si" : "no"}
            onChange={(e) => setForm((f) => ({ ...f, principal: e.target.value === "si" }))}
            className={campo}
          >
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>
        </label>
        <label className="block sm:col-span-2">
          <Etiqueta>Observaciones</Etiqueta>
          <textarea
            rows={2}
            value={form.observaciones || ""}
            onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
            className={areaTexto}
          />
        </label>
      </div>
    </Modal>
  );
}

function FormHorario({
  prestacion,
  onClose,
  onSaved,
}: {
  prestacion: ConcurrentePrestacion;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [dia, setDia] = useState(1);
  const [inicio, setInicio] = useState("09:00");
  const [fin, setFin] = useState("12:00");
  const [guardando, setGuardando] = useState(false);
  const horas = horasEntre(inicio, fin);

  const guardar = async () => {
    setGuardando(true);
    try {
      await horariosApi.create({ prestacion_id: prestacion.id, dia_semana: dia, hora_inicio: inicio, hora_fin: fin });
      toast.success("Horario agregado");
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      abierto
      onClose={onClose}
      titulo={`Horario · ${prestacion.prestacion}`}
      footer={
        <>
          <button onClick={onClose} className={botonSecundario}>
            Cancelar
          </button>
          <button disabled={horas <= 0 || guardando} onClick={guardar} className={botonPrimario}>
            Agregar
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <Etiqueta>Día</Etiqueta>
          <select value={dia} onChange={(e) => setDia(Number(e.target.value))} className={campo}>
            {DIAS_SEMANA.map((d) => (
              <option key={d.valor} value={d.valor}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <Etiqueta>Desde</Etiqueta>
          <input type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} className={campo} />
        </label>
        <label className="block">
          <Etiqueta hint={horas <= 0 ? "Rango inválido" : undefined}>Hasta</Etiqueta>
          <input type="time" value={fin} onChange={(e) => setFin(e.target.value)} className={campo} />
        </label>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Duración calculada: <span className="font-semibold text-foreground">{horas} h</span>
      </p>
    </Modal>
  );
}

/* ============ Control APROSS ============ */

export function ControlAprossy({ persona }: { persona: Concurrente }) {
  const qc = useQueryClient();
  const [mes, setMes] = useState(mesActual());
  const [nuevo, setNuevo] = useState(false);

  const { data: registros = [] } = useQuery({
    queryKey: ["registro-horas", persona.id],
    queryFn: () => fetchRegistroHorasDe(persona.id),
  });
  const { data: prestaciones = [] } = useQuery({
    queryKey: ["prestaciones", persona.id],
    queryFn: () => fetchPrestacionesDe(persona.id),
  });

  const controla = useMemo(
    () => (prestaciones.length ? controlaHoras(prestaciones) : controlaHoras([persona.prestacion || ""])),
    [prestaciones, persona.prestacion],
  );
  const resumen = useMemo(() => resumenAprossy(registros, mes, controla), [registros, mes, controla]);
  const delMes = registros.filter((r) => r.mes === mes);

  const refrescar = () => qc.invalidateQueries({ queryKey: ["registro-horas", persona.id] });

  const tarjetas: [string, number, boolean?][] = [
    ["Programadas", resumen.programadas],
    ["Asistidas", resumen.asistidas],
    ["Recuperadas", resumen.recuperadas],
    ["Facturables", resumen.facturables, true],
    ["Extras", resumen.extras],
    ["Faltantes", resumen.faltantes],
  ];

  return (
    <div className="rounded-xl border border-border">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
        <p className="text-sm font-semibold">Control APROSS</p>
        <input
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value || mesActual())}
          className="h-8 rounded-lg border border-input bg-card px-2 text-xs"
          aria-label="Mes de control"
        />
        <Chip tone={!controla ? "muted" : resumen.cumpleMinimo ? "success" : "danger"}>
          {!controla ? "Sin control de horas" : resumen.cumpleMinimo ? "Cumple mínimo" : `Faltan ${resumen.faltantes} h`}
        </Chip>
        <button onClick={() => setNuevo(true)} className="ml-auto text-xs font-medium text-primary hover:underline">
          + Registrar horas
        </button>
      </div>

      {controla && !resumen.cumpleMinimo && (
        <p className="flex items-center gap-2 border-b border-border bg-destructive/5 px-4 py-2 text-xs text-destructive">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {nombreMes(mes)}: {resumen.facturables} h facturables sobre el mínimo de {MINIMO_APROSS} h mensuales.
        </p>
      )}

      <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3">
        {tarjetas.map(([label, valor, destacar]) => (
          <div key={label} className="bg-card px-4 py-3">
            <p className="text-[11px] text-muted-foreground">{label}</p>
            <p className={cn("text-base font-bold tabular-nums", destacar && "text-primary")}>{valor} h</p>
          </div>
        ))}
      </div>

      {delMes.length === 0 ? (
        <p className="px-4 py-3 text-xs text-muted-foreground">Sin registros cargados para {nombreMes(mes)}.</p>
      ) : (
        <ul className="max-h-64 divide-y divide-border overflow-y-auto border-t border-border">
          {delMes.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2 px-4 py-2 text-sm">
              <span className="text-muted-foreground">{formatFecha(r.fecha)}</span>
              <Chip tone={r.tipo === "no_asistio" ? "danger" : r.tipo === "programada" ? "muted" : "success"}>
                {TIPO_LABEL[r.tipo] ?? r.tipo}
              </Chip>
              {r.observaciones && <span className="truncate text-xs text-muted-foreground">{r.observaciones}</span>}
              <span className="ml-auto font-semibold tabular-nums">{r.horas} h</span>
              <button
                aria-label="Eliminar registro"
                onClick={async () => {
                  await registroHorasApi.remove(r.id, `el registro de horas del ${r.fecha}`);
                  refrescar();
                }}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {nuevo && (
        <FormRegistroHoras
          persona={persona}
          prestaciones={prestaciones}
          mesSugerido={mes}
          onClose={() => setNuevo(false)}
          onSaved={() => {
            setNuevo(false);
            refrescar();
          }}
        />
      )}
    </div>
  );
}

function FormRegistroHoras({
  persona,
  prestaciones,
  mesSugerido,
  onClose,
  onSaved,
}: {
  persona: Concurrente;
  prestaciones: ConcurrentePrestacion[];
  mesSugerido: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const principal = prestaciones.find((p) => p.principal && p.activa) ?? prestaciones[0];
  const [form, setForm] = useState({
    fecha: mesSugerido === mesActual() ? hoyISO() : `${mesSugerido}-01`,
    horas: "4",
    tipo: "asistida",
    prestacion_id: principal?.id ?? "",
    observaciones: "",
  });
  const [guardando, setGuardando] = useState(false);
  const horas = Number(form.horas);
  const invalido = !form.fecha || !Number.isFinite(horas) || horas < 0;

  const guardar = async () => {
    setGuardando(true);
    try {
      await registroHorasApi.create({
        concurrente_id: persona.id,
        prestacion_id: form.prestacion_id || null,
        fecha: form.fecha,
        horas,
        tipo: form.tipo,
        observaciones: form.observaciones,
      });
      toast.success("Horas registradas");
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      abierto
      onClose={onClose}
      titulo="Registrar horas"
      footer={
        <>
          <button onClick={onClose} className={botonSecundario}>
            Cancelar
          </button>
          <button disabled={invalido || guardando} onClick={guardar} className={botonPrimario}>
            Guardar
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <Etiqueta>Fecha</Etiqueta>
          <input
            type="date"
            value={form.fecha}
            onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
            className={campo}
          />
        </label>
        <label className="block">
          <Etiqueta hint={invalido && form.horas !== "" ? "Horas inválidas" : undefined}>Horas</Etiqueta>
          <input
            type="number"
            min={0}
            step="0.25"
            value={form.horas}
            onChange={(e) => setForm((f) => ({ ...f, horas: e.target.value }))}
            className={campo}
          />
        </label>
        <label className="block">
          <Etiqueta>Tipo</Etiqueta>
          <select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))} className={campo}>
            {TIPOS_REGISTRO.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <Etiqueta>Prestación</Etiqueta>
          <select
            value={form.prestacion_id}
            onChange={(e) => setForm((f) => ({ ...f, prestacion_id: e.target.value }))}
            className={campo}
          >
            <option value="">Sin especificar</option>
            {prestaciones.map((p) => (
              <option key={p.id} value={p.id}>
                {p.prestacion}
              </option>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-2">
          <Etiqueta>Observaciones</Etiqueta>
          <textarea
            rows={2}
            value={form.observaciones}
            onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
            className={areaTexto}
          />
        </label>
      </div>
    </Modal>
  );
}
