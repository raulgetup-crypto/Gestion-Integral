import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CalendarClock, BellRing, ListChecks } from "lucide-react";
import { Panel, Chip, EmptyState } from "@/components/ui-kit";
import { turnosApi, tareasApi } from "@/lib/api";
import { hoyISO } from "@/lib/format";
import { useAlertas } from "@/hooks/use-alertas";
import { usePermisos } from "@/hooks/use-permisos";

function saludo(): string {
  const hora = new Date().getHours();
  if (hora < 12) return "Buen día";
  if (hora < 20) return "Buenas tardes";
  return "Buenas noches";
}

/** Vista consolidada de "qué tengo hoy y qué quedó pendiente" — no duplica datos, solo consulta lo que ya existe. */
export function ResumenDelDia() {
  const { usuario } = usePermisos();
  const hoy = hoyISO();

  const { data: turnos = [] } = useQuery({ queryKey: ["turnos"], queryFn: turnosApi.list });
  const { data: tareas = [] } = useQuery({ queryKey: ["tareas"], queryFn: tareasApi.list });
  const { todas: alertas, total: totalAlertas, rojas } = useAlertas();

  const turnosHoy = useMemo(() => turnos.filter((t) => t.fecha === hoy), [turnos, hoy]);
  const tareasHoy = useMemo(
    () => tareas.filter((t) => t.estado !== "completada" && t.vence === hoy),
    [tareas, hoy],
  );
  const tareasVencidas = useMemo(
    () => tareas.filter((t) => t.estado !== "completada" && t.vence && t.vence < hoy),
    [tareas, hoy],
  );

  return (
    <Panel title={`${saludo()}${usuario?.nombre ? `, ${usuario.nombre}` : ""}`}>
      <div className="grid gap-4 p-4 sm:grid-cols-3">
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" /> Turnos de hoy
          </div>
          {turnosHoy.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin turnos agendados.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {turnosHoy.slice(0, 5).map((t) => (
                <li key={t.id}>
                  {t.hora} · {t.nombre}
                </li>
              ))}
            </ul>
          )}
          <Link to="/turnero" className="mt-1 inline-block text-xs text-primary hover:underline">
            Ir al Turnero
          </Link>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <BellRing className="h-3.5 w-3.5" /> Alertas
          </div>
          {totalAlertas === 0 ? (
            <p className="text-sm text-muted-foreground">Sin alertas activas.</p>
          ) : (
            <p className="text-sm">
              <Chip tone={rojas > 0 ? "danger" : "warning"}>{totalAlertas} activas</Chip>
              {rojas > 0 && <span className="ml-2 text-muted-foreground">{rojas} críticas</span>}
            </p>
          )}
          <Link to="/alertas" className="mt-1 inline-block text-xs text-primary hover:underline">
            Ir a Alertas
          </Link>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <ListChecks className="h-3.5 w-3.5" /> Tareas
          </div>
          {tareasHoy.length === 0 && tareasVencidas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin tareas pendientes.</p>
          ) : (
            <p className="space-x-2 text-sm">
              {tareasHoy.length > 0 && <Chip tone="info">{tareasHoy.length} de hoy</Chip>}
              {tareasVencidas.length > 0 && <Chip tone="danger">{tareasVencidas.length} vencidas</Chip>}
            </p>
          )}
        </div>
      </div>
    </Panel>
  );
}

