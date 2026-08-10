import { useMemo, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, Trash2, ClipboardList, Check, Pencil, Search, UserRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Panel, Chip, EmptyState } from "@/components/ui-kit";
import { Exportar } from "@/components/Exportar";
import { campo, Segmentado } from "@/components/forms";
import { TurnoDialog } from "@/components/turnero/TurnoDialog";
import { useEntidad } from "@/hooks/use-entidad";
import { usePermisos } from "@/hooks/use-permisos";
import { turnosApi, type Turno } from "@/lib/api";
import { fetchSedes } from "@/lib/kalen";
import { ESTADOS_TURNO, ESTADO_TURNO_LABEL, fetchTiposTurno } from "@/lib/turnos";
import { hoyISO, formatFecha } from "@/lib/format";
import { cn } from "@/lib/utils";

type Rango = "todos" | "hoy" | "proximos" | "pasados";

const RANGOS = [
  { value: "proximos" as const, label: "Próximos" },
  { value: "hoy" as const, label: "Hoy" },
  { value: "pasados" as const, label: "Pasados" },
  { value: "todos" as const, label: "Todos" },
];

const tonoEstado = (e: string): "success" | "danger" | "info" | "muted" =>
  e === "realizado" || e === "atendido"
    ? "success"
    : e === "ausente" || e === "cancelado"
      ? "danger"
      : e === "confirmado"
        ? "info"
        : "muted";

export function TurnosSection() {
  const { datos: turnos, crear, actualizar, eliminar } = useEntidad<Turno>("turnos", turnosApi, {
    etiqueta: "turno",
  });
  const { puedeEditar, esAdmin } = usePermisos();
  const { data: sedes = [] } = useQuery({ queryKey: ["sedes"], queryFn: fetchSedes, staleTime: 300_000 });
  const { data: tipos = [] } = useQuery({ queryKey: ["tipos-turno"], queryFn: fetchTiposTurno, staleTime: 300_000 });

  const [busqueda, setBusqueda] = useState("");
  const [rango, setRango] = useState<Rango>("proximos");
  const [fecha, setFecha] = useState("");
  const [estado, setEstado] = useState("todos");
  const [tipo, setTipo] = useState("todos");
  const [sede, setSede] = useState("todas");
  const [profesional, setProfesional] = useState("todos");
  const [dialogo, setDialogo] = useState<{ abierto: boolean; turno?: Turno | null }>({ abierto: false });

  const hoy = hoyISO();
  const nombreSede = useCallback(
    (id: number | null) => sedes.find((s) => s.id === id)?.nombre ?? "Sin sede",
    [sedes],
  );

  const profesionales = useMemo(
    () => Array.from(new Set(turnos.map((t) => (t.profesional ?? "").trim()).filter(Boolean))).sort(),
    [turnos],
  );

  const opcionesTipo = useMemo(
    () => Array.from(new Set([...tipos, ...turnos.map((t) => t.tipo).filter(Boolean)])).sort(),
    [tipos, turnos],
  );

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return turnos
      .filter((t) => {
        if (fecha) {
          if (t.fecha !== fecha) return false;
        } else {
          if (rango === "hoy" && t.fecha !== hoy) return false;
          if (rango === "proximos" && t.fecha < hoy) return false;
          if (rango === "pasados" && t.fecha >= hoy) return false;
        }
        if (estado !== "todos" && t.estado !== estado) return false;
        if (tipo !== "todos" && t.tipo !== tipo) return false;
        if (sede !== "todas" && String(t.sede_id ?? "") !== sede) return false;
        if (profesional !== "todos" && (t.profesional ?? "").trim() !== profesional) return false;
        if (!q) return true;
        return [t.nombre, t.dni, t.contacto, t.obra_social, t.notas, t.tipo, t.profesional]
          .join(" ")
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`));
  }, [turnos, busqueda, rango, fecha, estado, tipo, sede, profesional, hoy]);

  const agrupados = useMemo(() => {
    const map: Record<string, Turno[]> = {};
    for (const t of filtrados) (map[t.fecha] ||= []).push(t);
    return Object.entries(map);
  }, [filtrados]);

  const cambiar = useCallback(
    (id: string, cambios: Partial<Turno>) => actualizar.mutate({ id, cambios }),
    [actualizar],
  );

  function guardar(v: Partial<Turno>) {
    if (dialogo.turno) {
      actualizar.mutate({ id: dialogo.turno.id, cambios: v }, { onSuccess: () => setDialogo({ abierto: false }) });
    } else {
      crear.mutate(v, { onSuccess: () => setDialogo({ abierto: false }) });
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, DNI, profesional o notas…"
            className={cn(campo, "pl-9")}
          />
        </div>
        {puedeEditar && (
          <button
            onClick={() => setDialogo({ abierto: true, turno: null })}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> Nuevo turno
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Segmentado valor={rango} opciones={RANGOS} onChange={setRango} />
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className={cn(campo, "h-9 w-auto text-xs")}
          aria-label="Filtrar por fecha exacta"
        />
        {fecha && (
          <button onClick={() => setFecha("")} className="text-xs font-medium text-primary hover:underline">
            Quitar fecha
          </button>
        )}
        <select value={sede} onChange={(e) => setSede(e.target.value)} className={cn(campo, "h-9 w-auto text-xs")}>
          <option value="todas">Todas las sedes</option>
          {sedes.map((s) => (
            <option key={s.id} value={String(s.id)}>
              {s.nombre}
            </option>
          ))}
        </select>
        <select value={estado} onChange={(e) => setEstado(e.target.value)} className={cn(campo, "h-9 w-auto text-xs")}>
          <option value="todos">Todos los estados</option>
          {ESTADOS_TURNO.map((e) => (
            <option key={e} value={e}>
              {ESTADO_TURNO_LABEL[e]}
            </option>
          ))}
        </select>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={cn(campo, "h-9 w-auto text-xs")}>
          <option value="todos">Todos los tipos</option>
          {opcionesTipo.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={profesional}
          onChange={(e) => setProfesional(e.target.value)}
          className={cn(campo, "h-9 w-auto text-xs")}
        >
          <option value="todos">Todos los profesionales</option>
          {profesionales.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <Panel
        title={`${filtrados.length} de ${turnos.length} turnos`}
        action={
          <div className="flex items-center gap-2">
            <Chip tone="muted">Guardado automático</Chip>
            <Exportar
              filas={filtrados.map((t) => ({
                Fecha: t.fecha,
                Hora: t.hora,
                Tipo: t.tipo,
                Nombre: t.nombre,
                DNI: t.dni,
                Sede: nombreSede(t.sede_id),
                Profesional: t.profesional,
                Contacto: t.contacto,
                "Obra social": t.obra_social,
                Estado: ESTADO_TURNO_LABEL[t.estado] ?? t.estado,
                Observaciones: t.notas,
              }))}
              nombre="turnos"
              titulo="Turnos"
            />
          </div>
        }
      >
        {agrupados.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Sin turnos" hint="Ajustá los filtros o creá un turno nuevo." />
        ) : (
          <div className="divide-y divide-border">
            {agrupados.map(([fechaGrupo, items]) => (
              <div key={fechaGrupo}>
                <p className="sticky top-0 z-10 bg-muted/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
                  {formatFecha(fechaGrupo)} · {items.length}
                </p>
                <ul className="divide-y divide-border">
                  {items.map((t) => (
                    <li key={t.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
                      <span className="w-12 shrink-0 text-sm font-semibold tabular-nums">{t.hora}</span>
                      <div className="min-w-0">
                        <p className={cn("truncate text-sm font-medium", t.estado === "realizado" && "line-through opacity-60")}>
                          {t.nombre}
                          {t.dni ? <span className="ml-2 text-xs font-normal text-muted-foreground">DNI {t.dni}</span> : null}
                        </p>
                        <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                          <Chip tone="info">{nombreSede(t.sede_id)}</Chip>
                          <span>{[t.tipo, t.profesional, t.contacto].filter(Boolean).join(" · ")}</span>
                        </p>
                        {t.notas && <p className="truncate text-xs italic text-muted-foreground">{t.notas}</p>}
                        {t.persona_id && (
                          <Link
                            to="/admisiones"
                            search={{ persona: t.persona_id }}
                            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            <UserRound className="h-3.5 w-3.5" /> Ver ficha de la persona
                          </Link>
                        )}
                      </div>
                      <div className="col-span-2 flex flex-wrap items-center gap-1 sm:col-span-1 sm:shrink-0">
                        <select
                          value={t.estado === "atendido" ? "realizado" : t.estado}
                          onChange={(e) => cambiar(t.id, { estado: e.target.value })}
                          disabled={!puedeEditar}
                          className="h-7 rounded-md border border-input bg-card px-1.5 text-[11px]"
                          aria-label="Cambiar estado"
                        >
                          {ESTADOS_TURNO.map((e) => (
                            <option key={e} value={e}>
                              {ESTADO_TURNO_LABEL[e]}
                            </option>
                          ))}
                        </select>
                        <Chip tone={tonoEstado(t.estado)}>{ESTADO_TURNO_LABEL[t.estado] ?? t.estado}</Chip>
                        {puedeEditar && (
                          <button
                            onClick={() => cambiar(t.id, { estado: t.estado === "realizado" ? "pendiente" : "realizado" })}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-success"
                            aria-label="Marcar realizado"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        {puedeEditar && (
                          <button
                            onClick={() => setDialogo({ abierto: true, turno: t })}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-primary"
                            aria-label="Editar turno"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {esAdmin && (
                          <button
                            onClick={() => eliminar.mutate({ id: t.id, etiqueta: `el turno de ${t.nombre}` })}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-destructive"
                            aria-label="Eliminar turno"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <TurnoDialog
        abierto={dialogo.abierto}
        turno={dialogo.turno}
        existentes={turnos}
        onClose={() => setDialogo({ abierto: false })}
        onGuardar={guardar}
        guardando={crear.isPending || actualizar.isPending}
      />
    </div>
  );
}
