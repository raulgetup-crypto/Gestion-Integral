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
import { listarPersonas, ETAPAS_PERSONA_LABEL, type EtapaPersona } from "@/lib/personas";
import { formatFechaHora, nombreMes } from "@/lib/format";

type EventoLinea = {
  id: string;
  fecha: string; // ISO completo, con hora
  mes: string; // YYYY-MM
  persona: string;
  tipo: "admision" | "etapa";
  descripcion: string;
};

/** Intervalo continuo que una persona pasó en una etapa determinada. */
type IntervaloEtapa = {
  personaId: string;
  etapa: string;
  desde: string; // ISO
  hasta: string | null; // null = sigue activo hoy
};

const ETAPAS_EN_TRAMITE = new Set<string>(["contacto_inicial", "en_admision"]);
const DIAS_SIN_AVANCE_PERSONA = 7;
const DIA_MS = 86_400_000;

/** Último instante (23:59:59.999) del mes 'YYYY-MM'. */
function finDeMes(mes: string): Date {
  const [y, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
}

/** Seguimiento histórico mes a mes: cambios de estado de admisión + cambios de etapa de Persona + personas sin avance. */
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

  /** Reconstruye, por persona, los intervalos continuos de cada etapa a partir del historial. */
  const intervalos: IntervaloEtapa[] = useMemo(() => {
    const porPersona = new Map<string, typeof historialEtapas>();
    for (const h of historialEtapas) {
      const arr = porPersona.get(h.persona_id) ?? [];
      arr.push(h);
      porPersona.set(h.persona_id, arr);
    }

    const resultado: IntervaloEtapa[] = [];
    for (const persona of personas) {
      const eventosPersona = (porPersona.get(persona.id) ?? [])
        .slice()
        .sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora));

      if (eventosPersona.length === 0) {
        resultado.push({ personaId: persona.id, etapa: persona.etapa, desde: persona.created_at, hasta: null });
        continue;
      }

      // Si el primer evento registrado ya venía de una etapa anterior, esa etapa cubrió desde el alta hasta ese evento.
      if (eventosPersona[0].etapa_anterior) {
        resultado.push({
          personaId: persona.id,
          etapa: eventosPersona[0].etapa_anterior,
          desde: persona.created_at,
          hasta: eventosPersona[0].fecha_hora,
        });
      }

      for (let i = 0; i < eventosPersona.length; i++) {
        resultado.push({
          personaId: persona.id,
          etapa: eventosPersona[i].etapa_nueva,
          desde: eventosPersona[i].fecha_hora,
          hasta: eventosPersona[i + 1]?.fecha_hora ?? null,
        });
      }
    }
    return resultado;
  }, [historialEtapas, personas]);

  /** Personas sin avance (+7 días en contacto_inicial/en_admision) al cierre del mes dado. */
  const personasSinAvanceDelMes = useMemo(() => {
    return (mes: string) => {
      const esMesActual = mes === new Date().toISOString().slice(0, 7);
      const corte = esMesActual ? new Date() : finDeMes(mes);
      const corteMs = corte.getTime();

      return intervalos
        .filter((iv) => ETAPAS_EN_TRAMITE.has(iv.etapa))
        .filter((iv) => new Date(iv.desde).getTime() <= corteMs)
        .filter((iv) => !iv.hasta || new Date(iv.hasta).getTime() > corteMs)
        .map((iv) => ({
          personaId: iv.personaId,
          etapa: iv.etapa as EtapaPersona,
          dias: Math.floor((corteMs - new Date(iv.desde).getTime()) / DIA_MS),
        }))
        .filter((r) => r.dias >= DIAS_SIN_AVANCE_PERSONA)
        .sort((a, b) => b.dias - a.dias);
    };
  }, [intervalos]);

  const meses = useMemo(() => {
    const set = new Set(eventos.map((e) => e.mes));
    set.add(new Date().toISOString().slice(0, 7)); // el mes actual siempre disponible
    return Array.from(set).sort().reverse();
  }, [eventos]);

  const [mesSeleccionado, setMesSeleccionado] = useState<string>("");
  const mesActivo = mesSeleccionado || meses[0] || "";

  const eventosDelMes = useMemo(
    () => eventos.filter((e) => e.mes === mesActivo),
    [eventos, mesActivo],
  );

  const sinAvanceDelMes = useMemo(
    () => personasSinAvanceDelMes(mesActivo),
    [personasSinAvanceDelMes, mesActivo],
  );

  if (eventos.length === 0 && sinAvanceDelMes.length === 0) {
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
      <div className="mb-3 grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={History}
          label={`Movimientos en ${nombreMes(mesActivo)}`}
          value={eventosDelMes.length}
          tone="info"
        />
        <StatCard
          icon={History}
          label={`Sin avance al cierre de ${nombreMes(mesActivo)}`}
          value={sinAvanceDelMes.length}
          tone={sinAvanceDelMes.length ? "danger" : "default"}
        />
        <StatCard
          icon={History}
          label="Total histórico registrado"
          value={eventos.length}
          tone="default"
        />
      </div>

      {sinAvanceDelMes.length > 0 && (
        <div className="mb-4">
          <h4 className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Personas sin avance al cierre de {nombreMes(mesActivo)}
          </h4>
          <ul className="divide-y divide-border/60">
            {sinAvanceDelMes.map((r) => (
              <li key={r.personaId} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium">{nombrePersona(r.personaId)}</span>
                <Chip tone={r.dias > 15 ? "danger" : "warning"}>
                  {ETAPAS_PERSONA_LABEL[r.etapa]} · {r.dias} d sin avance
                </Chip>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h4 className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Movimientos de {nombreMes(mesActivo)}
      </h4>
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
