import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Gauge, History, Printer, Truck, UtensilsCrossed } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, StatCard, EmptyState, Chip } from "@/components/ui-kit";
import { Exportar } from "@/components/Exportar";
import { campo } from "@/components/forms";
import { NotasRapidas } from "@/components/kalen/NotasRapidas";
import {
  fetchConcurrentes,
  fetchPlanilla,
  fetchPlanillaEventos,
  fetchRegistroHorasMes,
  reglasPlanillaApi,
  prestacionesApi,
  cronogramaApi,
  transporteApi,
  viandasApi,
  CICLO_LABEL,
  type CicloPlanilla,
} from "@/lib/api";
import { planillasDe } from "@/lib/planillas-reglas";
import { resumenAprossy, controlaHoras } from "@/lib/aprossy-horas";
import { mesActual, nombreMes, formatFechaHora, formatFecha, moneda } from "@/lib/format";

export const Route = createFileRoute("/centro-control")({
  head: () => ({
    meta: [
      { title: "Centro de control de secretaría — Centro de Día" },
      {
        name: "description",
        content:
          "Tablero con los indicadores clave del mes: planillas por etapa, cumplimiento APROSS, transporte, viandas y cronograma administrativo.",
      },
      { property: "og:title", content: "Centro de control de secretaría" },
      { property: "og:description", content: "Once indicadores administrativos del mes en una sola pantalla." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CentroControlPage,
});

function CentroControlPage() {
  const [mes, setMes] = useState(mesActual());

  const { data: concurrentes = [] } = useQuery({ queryKey: ["concurrentes"], queryFn: fetchConcurrentes });
  const { data: planilla = [] } = useQuery({ queryKey: ["planilla", mes], queryFn: () => fetchPlanilla(mes) });
  const { data: eventos = [] } = useQuery({
    queryKey: ["planilla-eventos", mes],
    queryFn: () => fetchPlanillaEventos({ mes }),
  });
  const { data: reglas = [] } = useQuery({ queryKey: ["reglas-planilla"], queryFn: reglasPlanillaApi.list });
  const { data: prestaciones = [] } = useQuery({ queryKey: ["prestaciones"], queryFn: prestacionesApi.list });
  const { data: horas = [] } = useQuery({ queryKey: ["registro-horas", mes], queryFn: () => fetchRegistroHorasMes(mes) });
  const { data: hitos = [] } = useQuery({ queryKey: ["cronograma"], queryFn: cronogramaApi.list });
  const { data: transportes = [] } = useQuery({ queryKey: ["transporte-servicios"], queryFn: transporteApi.list });
  const { data: viandas = [] } = useQuery({ queryKey: ["viandas"], queryFn: viandasApi.list });

  const activos = useMemo(() => concurrentes.filter((c) => c.activo), [concurrentes]);

  /** Planillas esperadas del mes según el motor de reglas. */
  const esperadas = useMemo(() => {
    return activos.flatMap((c) => {
      const suyas = prestaciones.filter((p) => p.concurrente_id === c.id);
      return planillasDe(c, suyas, reglas).map((p) => ({ concurrente: c, ...p }));
    });
  }, [activos, prestaciones, reglas]);

  const porEtapa = useMemo(() => {
    const cuenta: Record<string, number> = {};
    for (const e of esperadas) {
      const est = planilla.find((p) => p.concurrente_id === e.concurrente.id && (p.tipo ?? "general") === e.tipo);
      const etapa = (est?.ciclo ?? "pendiente") as CicloPlanilla;
      cuenta[etapa] = (cuenta[etapa] ?? 0) + 1;
    }
    return cuenta;
  }, [esperadas, planilla]);

  const aprossy = useMemo(() => {
    const conControl = activos.filter((c) =>
      controlaHoras(prestaciones.filter((p) => p.concurrente_id === c.id)),
    );
    let cumplen = 0;
    for (const c of conControl) {
      const r = resumenAprossy(horas.filter((h) => h.concurrente_id === c.id), mes, true);
      if (r.cumpleMinimo) cumplen += 1;
    }
    return { total: conControl.length, cumplen };
  }, [activos, prestaciones, horas, mes]);

  const transporteMes = transportes.filter((t) => t.mes === mes);
  const viandasMes = viandas.filter((v) => v.mes === mes);
  const hitosMes = hitos.filter((h) => h.mes === mes);
  const hitosVencidos = hitosMes.filter((h) => h.estado !== "cumplido" && h.fecha < new Date().toISOString().slice(0, 10));

  const indicadores = [
    { label: "Planillas esperadas", value: esperadas.length, icon: Printer },
    { label: "Pendientes", value: porEtapa["pendiente"] ?? 0, icon: Printer },
    { label: "Impresas", value: porEtapa["impresa"] ?? 0, icon: Printer },
    { label: "Entregadas", value: porEtapa["entregada"] ?? 0, icon: Printer },
    { label: "Firmadas", value: porEtapa["firmada"] ?? 0, icon: Printer },
    { label: "Escaneadas", value: porEtapa["escaneada"] ?? 0, icon: Printer },
    { label: "Archivadas", value: porEtapa["archivada"] ?? 0, icon: Printer },
    {
      label: "Cumplimiento APROSS",
      value: `${aprossy.cumplen}/${aprossy.total}`,
      icon: Gauge,
      hint: "Concurrentes con 24 h o más",
    },
    {
      label: "Transporte sin ANSES",
      value: transporteMes.filter((t) => !t.comprobante_anses).length,
      icon: Truck,
    },
    {
      label: "Viandas impagas",
      value: viandasMes.filter((v) => v.estado === "pendiente").length,
      icon: UtensilsCrossed,
    },
    { label: "Hitos vencidos", value: hitosVencidos.length, icon: History },
  ];

  const filasExport = esperadas.map((e) => {
    const est = planilla.find((p) => p.concurrente_id === e.concurrente.id && (p.tipo ?? "general") === e.tipo);
    return {
      Concurrente: `${e.concurrente.apellido} ${e.concurrente.nombre}`.trim(),
      Prestación: e.prestacion,
      Planilla: e.tipo,
      Facturación: e.modo,
      Etapa: CICLO_LABEL[(est?.ciclo ?? "pendiente") as CicloPlanilla],
      Regla: e.regla,
    };
  });

  return (
    <AppShell title="Centro de control" description="Indicadores administrativos del mes">
      <div className="mb-4">
        <NotasRapidas />
      </div>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className={campo} />
          <span className="text-sm text-muted-foreground">{nombreMes(mes)}</span>
          <Exportar
            className="ml-auto"
            filas={filasExport}
            nombre={`control-secretaria-${mes}`}
            titulo={`Control de secretaría — ${nombreMes(mes)}`}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {indicadores.map((i) => (
            <StatCard key={i.label} label={i.label} value={String(i.value)} icon={i.icon} hint={i.hint} />
          ))}
        </div>

        <Panel title="Planillas esperadas del mes">
          {esperadas.length === 0 ? (
            <EmptyState icon={Printer} title="Sin planillas" hint="Cargá prestaciones activas para generar planillas." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2">Concurrente</th>
                    <th>Prestación</th>
                    <th>Planilla</th>
                    <th>Facturación</th>
                    <th>Etapa</th>
                  </tr>
                </thead>
                <tbody>
                  {esperadas.slice(0, 200).map((e) => {
                    const est = planilla.find(
                      (p) => p.concurrente_id === e.concurrente.id && (p.tipo ?? "general") === e.tipo,
                    );
                    const etapa = (est?.ciclo ?? "pendiente") as CicloPlanilla;
                    return (
                      <tr key={`${e.concurrente.id}-${e.tipo}`} className="border-t border-border/60">
                        <td className="py-2">{`${e.concurrente.apellido} ${e.concurrente.nombre}`.trim()}</td>
                        <td>{e.prestacion}</td>
                        <td>
                          <Chip tone="info">{e.tipo}</Chip>
                        </td>
                        <td className="text-muted-foreground">{e.modo === "horas" ? "Por horas" : "Por módulo"}</td>
                        <td>
                          <Chip tone={etapa === "archivada" ? "success" : etapa === "pendiente" ? "muted" : "info"}>
                            {CICLO_LABEL[etapa]}
                          </Chip>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Cronograma del mes">
            {hitosMes.length === 0 ? (
              <EmptyState icon={History} title="Sin hitos cargados" hint="Definilos en la sección Cronograma." />
            ) : (
              <ul className="space-y-2 text-sm">
                {hitosMes.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-3">
                    <span>
                      <span className="font-medium">{h.titulo}</span>{" "}
                      <span className="text-muted-foreground">· {formatFecha(h.fecha)}</span>
                    </span>
                    <Chip tone={h.estado === "cumplido" ? "success" : h.estado === "vencido" ? "warning" : "muted"}>
                      {h.estado}
                    </Chip>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Últimos movimientos de planillas">
            {eventos.length === 0 ? (
              <EmptyState icon={History} title="Sin movimientos" hint="Los cambios de etapa se registran aquí." />
            ) : (
              <ul className="space-y-2 text-sm">
                {eventos.slice(0, 12).map((ev) => (
                  <li key={ev.id} className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">
                      {ev.estado_anterior || "—"} → <span className="font-medium text-foreground">{ev.estado_nuevo}</span>{" "}
                      · {ev.tipo}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatFechaHora(ev.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <Panel title="Transporte y viandas del mes">
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-muted-foreground">Servicios de transporte</p>
              <p className="text-lg font-semibold">{transporteMes.length}</p>
              <p className="text-muted-foreground">
                Facturado: {moneda(transporteMes.reduce((a, t) => a + Number(t.monto || 0), 0))}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Viandas</p>
              <p className="text-lg font-semibold">{viandasMes.length}</p>
              <p className="text-muted-foreground">
                Deuda: {moneda(
                  viandasMes
                    .filter((v) => v.estado === "pendiente")
                    .reduce((a, v) => a + Number(v.cantidad || 0) * Number(v.precio_unitario || 0), 0),
                )}
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
