import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, ChevronDown } from "lucide-react";
import { Panel, EmptyState, Chip, StatCard } from "@/components/ui-kit";
import {
  fetchAdmisiones,
  fetchHistorialAdmisiones,
  fetchHistorialEtapasPersonas,
  ESTADO_ADMISION_LABEL,
} from "@/lib/kalen";
import { listarPersonas, ETAPAS_PERSONA_LABEL } from "@/lib/personas";
import { formatFechaHora, nombreMes } from "@/lib/format";

type EventoLinea = {
  id: string;
  fecha: string; // ISO completo, con hora
  mes: string; // YYYY-MM
  persona: string;
  tipo: "admision" | "etapa";
  descripcion: string;
};

/** Seguimiento histórico mes a mes: cambios de estado de admisión + cambios de etapa de Persona. */
export function SeguimientoMensual() {
  const { data: admisiones = [] } = useQuery({ queryKey: ["admisiones"], queryFn: fetchAdmisiones });
  const { data: historialAdm = [] } = useQuery({
    queryKey: ["historial-estados-admisiones"],
    queryFn: fetchHistorialAdmisiones,
  });
  const { data: historialEtapas = [] } = useQuery({
    queryKey: ["historial-etapas-personas"],
    queryFn: fetchHistorialEtapasPersonas,
  });
  const { data: personas = [] } = useQuery({ queryKey: ["personas"], queryFn: listarPersonas });

  const nombreAdmision = useMemo(() => {
    const map = new Map(admisiones.map((a) => [a.id, a.nombre_contacto || "Sin nombre"]));
    return (id: number) => map.get(id) ?? "Sin nombre";
  }, [admisiones]);

  const nombrePersona = useMemo(() => {
    const map = new Map(personas.map((p) => [p.id, `${p.nombre} ${p.apellido || ""}`.trim()]));
    return (id: string) => map.get(id) ?? "Sin nombre";
  }, [personas]);

  const eventos: EventoLinea[] = useMemo(() => {
    const deAdmisiones: EventoLinea[] = historialAdm.map((h) => ({
      id: `adm-${h.id}`,
      fecha: h.fecha_hora,
      mes: h.fecha_hora.slice(0, 7),
      persona: nombreAdmision(h.admision_id),
      tipo: "admision",
      descripcion: h.estado_anterior
        ? `${ESTADO_ADMISION_LABEL[h.estado_anterior as keyof typeof ESTADO_ADMISION_LABEL] ?? h.estado_anterior} → ${ESTADO_ADMISION_LABEL[h.estado_nuevo as keyof typeof ESTADO_ADMISION_LABEL] ?? h.estado_nuevo}`
        : `Alta de admisión · ${ESTADO_ADMISION_LABEL[h.estado_nuevo as keyof typeof ESTADO_ADMISION_LABEL] ?? h.estado_nuevo}`,
    }));

    const deEtapas: EventoLinea[] = historialEtapas.map((h) => ({
      id: `et-${h.id}`,
      fecha: h.fecha_hora,
      mes: h.fecha_hora.slice(0, 7),
      persona: nombrePersona(h.persona_id),
      tipo: "etapa",
      descripcion: h.etapa_anterior
        ? `${ETAPAS_PERSONA_LABEL[h.etapa_anterior as keyof typeof ETAPAS_PERSONA_LABEL] ?? h.etapa_anterior} → ${ETAPAS_PERSONA_LABEL[h.etapa_nueva as keyof typeof ETAPAS_PERSONA_LABEL] ?? h.etapa_nueva}`
        : `Alta de persona · ${ETAPAS_PERSONA_LABEL[h.etapa_nueva as keyof typeof ETAPAS_PERSONA_LABEL] ?? h.etapa_nueva}`,
    }));

    return [...deAdmisiones, ...deEtapas].sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [historialAdm, historialEtapas, nombreAdmision, nombrePersona]);

  const meses = useMemo(() => {
    const set = new Set(eventos.map((e) => e.mes));
    return Array.from(set).sort().reverse();
  }, [eventos]);

  const [mesSeleccionado, setMesSeleccionado] = useState<string>("");
  const mesActivo = mesSeleccionado || meses[0] || "";

  const eventosDelMes = useMemo(
    () => eventos.filter((e) => e.mes === mesActivo),
    [eventos, mesActivo],
  );

  if (eventos.length === 0) {
    return (
      <Panel title="Seguimiento mensual">
        <EmptyState
          icon={History}
          title="Todavía no hay movimientos registrados"
          hint="Los cambios de estado de admisión y de etapa de persona van a aparecer acá con fecha y hora."
        />
      </Panel>
    );
  }

  return (
    <Panel
      title="Seguimiento mensual"
      action={
        <div className="relative">
          <select
            value={mesActivo}
            onChange={(e) => setMesSeleccionado(e.target.value)}
            className="h-9 appearance-none rounded-lg border border-input bg-background pl-3 pr-8 text-sm"
          >
            {meses.map((m) => (
              <option key={m} value={m}>
                {nombreMes(m)}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      }
    >
      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <StatCard
          icon={History}
          label={`Movimientos en ${nombreMes(mesActivo)}`}
          value={eventosDelMes.length}
          tone="info"
        />
        <StatCard
          icon={History}
          label="Total histórico registrado"
          value={eventos.length}
          tone="default"
        />
      </div>

      {eventosDelMes.length === 0 ? (
        <EmptyState icon={History} title="Sin movimientos este mes" />
      ) : (
        <ul className="divide-y divide-border/60">
          {eventosDelMes.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
              <span className="w-40 shrink-0 text-xs text-muted-foreground">{formatFechaHora(e.fecha)}</span>
              <span className="min-w-0 flex-1 truncate font-medium">{e.persona}</span>
              <Chip tone={e.tipo === "admision" ? "info" : "success"}>{e.descripcion}</Chip>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
