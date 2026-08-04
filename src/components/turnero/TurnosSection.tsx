import { useMemo, useState, useCallback } from "react";
import { Plus, Trash2, ClipboardList, Check, Pencil, Search } from "lucide-react";
import { Panel, Chip, EmptyState } from "@/components/ui-kit";
import { Exportar } from "@/components/Exportar";
import { campo, Segmentado } from "@/components/forms";
import { TurnoDialog } from "@/components/turnero/TurnoDialog";
import { useEntidad } from "@/hooks/use-entidad";
import { turnosApi, type Turno } from "@/lib/api";
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
  e === "atendido" ? "success" : e === "ausente" ? "danger" : e === "confirmado" ? "info" : "muted";

export function TurnosSection() {
  const { datos: turnos, crear, actualizar, eliminar } = useEntidad<Turno>("turnos", turnosApi, {
    etiqueta: "turno",
  });
  const [busqueda, setBusqueda] = useState("");
  const [rango, setRango] = useState<Rango>("proximos");
  const [estado, setEstado] = useState("todos");
  const [tipo, setTipo] = useState("todos");
  const [dialogo, setDialogo] = useState<{ abierto: boolean; turno?: Turno | null }>({ abierto: false });

  const hoy = hoyISO();

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return turnos
      .filter((t) => {
        if (rango === "hoy" && t.fecha !== hoy) return false;
        if (rango === "proximos" && t.fecha < hoy) return false;
        if (rango === "pasados" && t.fecha >= hoy) return false;
        if (estado !== "todos" && t.estado !== estado) return false;
        if (tipo !== "todos" && t.tipo !== tipo) return false;
        if (!q) return true;
        return [t.nombre, t.contacto, t.obra_social, t.notas, t.tipo]
          .join(" ")
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`));
  }, [turnos, busqueda, rango, estado, tipo, hoy]);

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
            placeholder="Buscar por nombre, contacto, obra social o notas…"
            className={cn(campo, "pl-9")}
          />
        </div>
        <button
          onClick={() => setDialogo({ abierto: true, turno: null })}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Nuevo turno
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Segmentado valor={rango} opciones={RANGOS} onChange={setRango} />
        <select value={estado} onChange={(e) => setEstado(e.target.value)} className={cn(campo, "h-9 w-auto text-xs")}>
          <option value="todos">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="confirmado">Confirmado</option>
          <option value="atendido">Atendido</option>
          <option value="ausente">Ausente</option>
        </select>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={cn(campo, "h-9 w-auto text-xs")}>
          <option value="todos">Todos los tipos</option>
          <option value="admision">Admisión</option>
          <option value="entrevista">Entrevista</option>
          <option value="seguimiento">Seguimiento</option>
          <option value="reunion">Reunión familiar</option>
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
                Contacto: t.contacto,
                "Obra social": t.obra_social,
                Estado: t.estado,
                Notas: t.notas,
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
            {agrupados.map(([fecha, items]) => (
              <div key={fecha}>
                <p className="sticky top-0 z-10 bg-muted/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
                  {formatFecha(fecha)} · {items.length}
                </p>
                <ul className="divide-y divide-border">
                  {items.map((t) => (
                    <li key={t.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
                      <span className="w-12 shrink-0 text-sm font-semibold tabular-nums">{t.hora}</span>
                      <div className="min-w-0">
                        <p className={cn("truncate text-sm font-medium", t.estado === "atendido" && "line-through opacity-60")}>
                          {t.nombre}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[t.tipo, t.obra_social, t.contacto].filter(Boolean).join(" · ")}
                        </p>
                        {t.notas && <p className="truncate text-xs italic text-muted-foreground">{t.notas}</p>}
                      </div>
                      <div className="col-span-2 flex flex-wrap items-center gap-1 sm:col-span-1 sm:shrink-0">
                        <select
                          value={t.estado}
                          onChange={(e) => cambiar(t.id, { estado: e.target.value })}
                          className="h-7 rounded-md border border-input bg-card px-1.5 text-[11px]"
                          aria-label="Cambiar estado"
                        >
                          <option value="pendiente">Pendiente</option>
                          <option value="confirmado">Confirmado</option>
                          <option value="atendido">Atendido</option>
                          <option value="ausente">Ausente</option>
                        </select>
                        <Chip tone={tonoEstado(t.estado)}>{t.estado}</Chip>
                        <button
                          onClick={() => cambiar(t.id, { estado: t.estado === "atendido" ? "pendiente" : "atendido" })}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-success"
                          aria-label="Marcar atendido"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDialogo({ abierto: true, turno: t })}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-primary"
                          aria-label="Editar turno"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => eliminar.mutate({ id: t.id, etiqueta: `el turno de ${t.nombre}` })}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-destructive"
                          aria-label="Eliminar turno"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
