import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  UserPlus,
  FolderOpen,
  ClipboardList,
  UtensilsCrossed,
  Bus,
  Stethoscope,
  MessageSquare,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, StatCard } from "@/components/ui-kit";
import { campo } from "@/components/forms";
import { Exportar } from "@/components/Exportar";
import { fetchConcurrentes, viandasApi } from "@/lib/api";
import {
  diasHasta,
  fetchAdmisiones,
  fetchAsignaciones,
  fetchComunicaciones,
  fetchDocumentosKalen,
  fetchPlanillas,
  fetchProfesionales,
  fetchSedes,
  fetchSolicitudesTransporte,
} from "@/lib/kalen";

export const Route = createFileRoute("/informe-mensual")({
  head: () => ({
    meta: [
      { title: "Informe mensual de gestión — Kalen" },
      {
        name: "description",
        content:
          "Resumen mensual por sede: admisiones, documentación, planillas, viandas, transporte, equipo y comunicaciones.",
      },
      { property: "og:title", content: "Informe mensual de gestión — Kalen" },
      {
        property: "og:description",
        content: "Indicadores del mes: admisiones, documentos, planillas, viandas, transporte y equipo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InformeMensualPage,
});

const mesHoy = () => new Date().toISOString().slice(0, 7);
const pesos = (n: number) =>
  n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

function Fila({ label, value }: { label: string; value: number | string }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5">
      <span className="truncate text-sm">{label}</span>
      <span className="shrink-0 text-sm font-semibold tabular-nums">{value}</span>
    </li>
  );
}

function InformeMensualPage() {
  const [mes, setMes] = useState(mesHoy());
  const [sedeId, setSedeId] = useState<string>("");

  const { data: sedes = [] } = useQuery({ queryKey: ["sedes"], queryFn: fetchSedes, staleTime: 300_000 });
  const { data: concurrentes = [] } = useQuery({ queryKey: ["concurrentes"], queryFn: fetchConcurrentes });
  const { data: admisiones = [] } = useQuery({ queryKey: ["admisiones"], queryFn: fetchAdmisiones });
  const { data: documentos = [] } = useQuery({ queryKey: ["documentos-kalen"], queryFn: fetchDocumentosKalen });
  const { data: planillas = [] } = useQuery({ queryKey: ["planillas"], queryFn: fetchPlanillas });
  const { data: viandas = [] } = useQuery({ queryKey: ["viandas"], queryFn: viandasApi.list });
  const { data: traslados = [] } = useQuery({ queryKey: ["transporte-solicitudes"], queryFn: fetchSolicitudesTransporte });
  const { data: profesionales = [] } = useQuery({ queryKey: ["profesionales"], queryFn: fetchProfesionales });
  const { data: asignaciones = [] } = useQuery({ queryKey: ["asignaciones"], queryFn: fetchAsignaciones });
  const { data: comunicaciones = [] } = useQuery({ queryKey: ["comunicaciones"], queryFn: fetchComunicaciones });

  const sedeDe = useMemo(() => {
    const map = new Map(
      (concurrentes as { id: string; sede_id?: number | null }[]).map((c) => [c.id, c.sede_id ?? null]),
    );
    return (id: string | null) => (id ? (map.get(id) ?? null) : null);
  }, [concurrentes]);

  const enSede = (sede: number | null) => !sedeId || String(sede ?? "") === sedeId;

  // Concurrentes activos y modalidad de ingreso (becados) del recorte de sede elegido.
  const poblacion = useMemo(() => {
    const lista = (
      concurrentes as {
        id: string;
        activo?: boolean;
        sede_id?: number | null;
        modalidad_ingreso?: string | null;
      }[]
    ).filter((c) => c.activo !== false && (!sedeId || String(c.sede_id ?? "") === sedeId));
    const becados = lista.filter((c) => (c.modalidad_ingreso ?? "obra_social") === "becado");
    const porSede = new Map<string, number>();
    for (const b of becados) {
      const nombre = sedes.find((s) => s.id === b.sede_id)?.nombre ?? "Sin sede";
      porSede.set(nombre, (porSede.get(nombre) ?? 0) + 1);
    }
    return {
      activos: lista.length,
      becados: becados.length,
      particulares: lista.filter((c) => c.modalidad_ingreso === "particular").length,
      obraSocial: lista.filter((c) => (c.modalidad_ingreso ?? "obra_social") === "obra_social").length,
      becadosPorSede: [...porSede.entries()].sort((x, y) => y[1] - x[1]),
    };
  }, [concurrentes, sedes, sedeId]);

  const adms = admisiones.filter(
    (a) => (a.fecha_solicitud ?? a.created_at).slice(0, 7) === mes && enSede(a.sede_id),
  );
  const docs = documentos.filter(
    (d) => (d.fecha_solicitud ?? d.created_at).slice(0, 7) === mes && enSede(sedeDe(d.concurrente_id)),
  );
  const plans = planillas.filter(
    (p) => (p.periodo ?? p.created_at).slice(0, 7) === mes && enSede(sedeDe(p.concurrente_id)),
  );
  const vds = viandas.filter(
    (v) => (v.mes || (v.fecha ?? "").slice(0, 7)) === mes && enSede(sedeDe(v.concurrente_id ?? null)),
  );
  const trs = traslados.filter((t) => {
    const inicio = (t.fecha_inicio ?? t.fecha_solicitud ?? t.created_at).slice(0, 7);
    const activoEnMes = inicio <= mes && (!t.fecha_fin || t.fecha_fin.slice(0, 7) >= mes);
    return activoEnMes && enSede(t.sede_id ?? sedeDe(t.concurrente_id));
  });
  const coms = comunicaciones.filter(
    (c) => c.fecha.slice(0, 7) === mes && enSede(sedeDe(c.concurrente_id)),
  );

  const admision = {
    contactos: adms.length,
    entrevistasProgramadas: adms.filter((a) => a.estado === "entrevista_programada" || a.fecha_entrevista).length,
    entrevistas: adms.filter((a) => a.estado === "entrevista_realizada" || a.fecha_entrevista).length,
    enEvaluacion: adms.filter((a) => a.estado === "en_evaluacion" || a.estado === "documentacion_solicitada").length,
    enEspera: adms.filter((a) => a.estado === "en_espera").length,
    ingresos: adms.filter((a) => a.estado === "admitido").length,
    noIngresos: adms.filter((a) => a.estado === "no_ingreso").length,
  };

  // Desglose de no ingresos por motivo (los motivos libres se agrupan tal cual se cargaron).
  const motivosNoIngreso = useMemo(() => {
    const conteo = new Map<string, number>();
    for (const a of adms) {
      if (a.estado !== "no_ingreso") continue;
      const motivo = a.motivo_no_ingreso?.trim() || "Sin especificar";
      conteo.set(motivo, (conteo.get(motivo) ?? 0) + 1);
    }
    return [...conteo.entries()].sort((x, y) => y[1] - x[1]);
  }, [adms]);

  const documentacion = {
    completa: docs.filter((d) => d.estado === "completo").length,
    pendiente: docs.filter((d) => d.estado === "pendiente" || d.estado === "en_revision").length,
    vencida: docs.filter((d) => d.estado === "vencido" || (diasHasta(d.fecha_vencimiento) ?? 1) < 0).length,
  };

  const planillasRes = {
    total: plans.length,
    enTermino: plans.filter((p) => p.estado_recepcion === "recibida_termino" || p.estado_recepcion === "aprobada").length,
    fueraTermino: plans.filter((p) => p.estado_recepcion === "recibida_fuera_termino").length,
    firmasPendientes: plans.filter((p) => p.estado_firma === "pendiente_firma").length,
  };

  const viandasRes = useMemo(() => {
    const cantidad = vds.reduce((s, v) => s + (v.cantidad ?? 0), 0);
    const monto = vds.reduce((s, v) => s + (v.cantidad ?? 0) * (v.precio_unitario ?? 0), 0);
    const pagadas = vds.filter((v) => v.estado === "pagado");
    const cobrado = pagadas.reduce((s, v) => s + (v.cantidad ?? 0) * (v.precio_unitario ?? 0), 0);
    return {
      registros: vds.length,
      cantidad,
      monto,
      cobrado,
      deuda: monto - cobrado,
      comprobantes: vds.filter((v) => v.comprobante_recibido).length,
      sinComprobante: vds.filter((v) => !v.comprobante_recibido).length,
    };
  }, [vds]);

  const transporteRes = useMemo(
    () => ({
      total: trs.length,
      activos: trs.filter((t) => t.estado === "activo" || t.estado === "autorizado").length,
      enGestion: trs.filter((t) => t.estado === "solicitado" || t.estado === "en_gestion").length,
      rechazados: trs.filter((t) => t.estado === "rechazado").length,
      costo: trs
        .filter((t) => t.estado === "activo" || t.estado === "autorizado")
        .reduce((s, t) => s + (t.monto_mensual ?? 0), 0),
    }),
    [trs],
  );

  const equipoRes = useMemo(() => {
    const activas = asignaciones.filter((a) => a.activa && enSede(sedeDe(a.concurrente_id)));
    const conEquipo = new Set(activas.map((a) => a.concurrente_id));
    const conReferente = new Set(activas.filter((a) => a.referente).map((a) => a.concurrente_id));
    return {
      profesionales: profesionales.filter((p) => p.activo && enSede(p.sede_id ?? null)).length,
      asignaciones: activas.length,
      conEquipo: conEquipo.size,
      sinReferente: conEquipo.size - conReferente.size,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asignaciones, profesionales, sedeId, sedeDe]);

  const comunicacionesRes = useMemo(() => {
    const porMedio = new Map<string, number>();
    for (const c of coms) porMedio.set(c.medio || "otro", (porMedio.get(c.medio || "otro") ?? 0) + 1);
    return {
      total: coms.length,
      conRespuesta: coms.filter((c) => c.respuesta?.trim()).length,
      compromisos: coms.filter((c) => c.compromiso?.trim()).length,
      porMedio: [...porMedio.entries()].sort((x, y) => y[1] - x[1]),
    };
  }, [coms]);

  const nombreSede = sedeId ? (sedes.find((s) => String(s.id) === sedeId)?.nombre ?? "Sede") : "Todas las sedes";

  // Una fila por indicador: sirve igual para Excel, CSV y PDF.
  const filasExport = useMemo(
    () =>
      [
        ["Concurrentes", "Activos", poblacion.activos],
        ["Concurrentes", "Concurrentes becados", poblacion.becados],
        ...poblacion.becadosPorSede.map(([s, n]) => ["Concurrentes", `Becados en ${s}`, n] as const),
        ["Concurrentes", "Particulares", poblacion.particulares],
        ["Concurrentes", "Con obra social", poblacion.obraSocial],
        ["Admisiones", "Contactos", admision.contactos],
        ["Admisiones", "Entrevistas programadas", admision.entrevistasProgramadas],
        ["Admisiones", "Entrevistas realizadas", admision.entrevistas],
        ["Admisiones", "En evaluación / documentación", admision.enEvaluacion],
        ["Admisiones", "En espera", admision.enEspera],
        ["Admisiones", "Ingresos confirmados", admision.ingresos],
        ["Admisiones", "No ingresos", admision.noIngresos],
        ...motivosNoIngreso.map(([m, n]) => ["Admisiones", `No ingreso: ${m}`, n] as const),
        ["Documentación", "Completada", documentacion.completa],
        ["Documentación", "Pendiente / en revisión", documentacion.pendiente],
        ["Documentación", "Vencida", documentacion.vencida],
        ["Planillas", "Total del período", planillasRes.total],
        ["Planillas", "Recibidas en término", planillasRes.enTermino],
        ["Planillas", "Recibidas fuera de término", planillasRes.fueraTermino],
        ["Planillas", "Firmas pendientes", planillasRes.firmasPendientes],
        ["Viandas", "Registros", viandasRes.registros],
        ["Viandas", "Viandas entregadas", viandasRes.cantidad],
        ["Viandas", "Monto facturado", pesos(viandasRes.monto)],
        ["Viandas", "Cobrado", pesos(viandasRes.cobrado)],
        ["Viandas", "Deuda", pesos(viandasRes.deuda)],
        ["Viandas", "Sin comprobante", viandasRes.sinComprobante],
        ["Transporte", "Solicitudes vigentes", transporteRes.total],
        ["Transporte", "Activos / autorizados", transporteRes.activos],
        ["Transporte", "En gestión", transporteRes.enGestion],
        ["Transporte", "Rechazados", transporteRes.rechazados],
        ["Transporte", "Costo mensual estimado", pesos(transporteRes.costo)],
        ["Equipo", "Profesionales activos", equipoRes.profesionales],
        ["Equipo", "Asignaciones vigentes", equipoRes.asignaciones],
        ["Equipo", "Concurrentes con equipo", equipoRes.conEquipo],
        ["Equipo", "Concurrentes sin referente", equipoRes.sinReferente],
        ["Comunicaciones", "Registradas", comunicacionesRes.total],
        ["Comunicaciones", "Con respuesta", comunicacionesRes.conRespuesta],
        ["Comunicaciones", "Con compromiso asumido", comunicacionesRes.compromisos],
        ...comunicacionesRes.porMedio.map(([m, n]) => ["Comunicaciones", `Medio: ${m}`, n] as const),
      ].map(([bloque, indicador, valor]) => ({
        Mes: mes,
        Sede: nombreSede,
        Bloque: bloque as string,
        Indicador: indicador as string,
        Valor: valor as string | number,
      })),
    [
      mes,
      nombreSede,
      poblacion,
      admision,
      motivosNoIngreso,
      documentacion,
      planillasRes,
      viandasRes,
      transporteRes,
      equipoRes,
      comunicacionesRes,
    ],
  );

  return (
    <AppShell
      title="Informe mensual de gestión"
      description="Resumen consolidado por mes y sede para la reunión de coordinación"
      actions={
        <Exportar
          filas={filasExport}
          nombre={`informe-${mes}${sedeId ? `-sede-${sedeId}` : ""}`}
          titulo={`Informe mensual ${mes} — ${nombreSede}`}
        />
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:max-w-xl">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Mes</span>
            <input type="month" className={campo} value={mes} onChange={(e) => setMes(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Sede</span>
            <select className={campo} value={sedeId} onChange={(e) => setSedeId(e.target.value)}>
              <option value="">Todas las sedes</option>
              {sedes.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={UserPlus} label="Contactos de admisión" value={admision.contactos} tone="info" />
          <StatCard icon={FolderOpen} label="Documentos del mes" value={docs.length} tone="success" />
          <StatCard icon={ClipboardList} label="Planillas del período" value={planillasRes.total} tone="warning" />
          <StatCard
            icon={UtensilsCrossed}
            label="Viandas entregadas"
            value={viandasRes.cantidad}
            hint={`Deuda: ${pesos(viandasRes.deuda)}`}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Admisiones">
            <ul className="divide-y divide-border">
              <Fila label="Total de contactos" value={admision.contactos} />
              <Fila label="Entrevistas programadas" value={admision.entrevistasProgramadas} />
              <Fila label="Entrevistas realizadas" value={admision.entrevistas} />
              <Fila label="En evaluación / documentación" value={admision.enEvaluacion} />
              <Fila label="En espera" value={admision.enEspera} />
              <Fila label="Ingresos confirmados" value={admision.ingresos} />
              <Fila label="No ingresos" value={admision.noIngresos} />
            </ul>
            {motivosNoIngreso.length > 0 && (
              <div className="border-t border-border px-4 py-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  No ingresos por motivo
                </p>
                <ul className="space-y-1">
                  {motivosNoIngreso.map(([motivo, cant]) => (
                    <li key={motivo} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate text-muted-foreground">{motivo}</span>
                      <span className="shrink-0 font-semibold tabular-nums">{cant}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>

          <Panel title="Documentación">
            <ul className="divide-y divide-border">
              <Fila label="Completada" value={documentacion.completa} />
              <Fila label="Pendiente / en revisión" value={documentacion.pendiente} />
              <Fila label="Vencida" value={documentacion.vencida} />
            </ul>
          </Panel>

          <Panel title="Planillas">
            <ul className="divide-y divide-border">
              <Fila label="Total del período" value={planillasRes.total} />
              <Fila label="Recibidas en término" value={planillasRes.enTermino} />
              <Fila label="Recibidas fuera de término" value={planillasRes.fueraTermino} />
              <Fila label="Firmas pendientes" value={planillasRes.firmasPendientes} />
            </ul>
          </Panel>

          <Panel title="Viandas">
            <ul className="divide-y divide-border">
              <Fila label="Registros del mes" value={viandasRes.registros} />
              <Fila label="Viandas entregadas" value={viandasRes.cantidad} />
              <Fila label="Monto facturado" value={pesos(viandasRes.monto)} />
              <Fila label="Cobrado" value={pesos(viandasRes.cobrado)} />
              <Fila label="Deuda pendiente" value={pesos(viandasRes.deuda)} />
              <Fila label="Comprobantes recibidos" value={viandasRes.comprobantes} />
              <Fila label="Sin comprobante" value={viandasRes.sinComprobante} />
            </ul>
          </Panel>

          <Panel title="Transporte">
            <ul className="divide-y divide-border">
              <Fila label="Solicitudes vigentes" value={transporteRes.total} />
              <Fila label="Activos / autorizados" value={transporteRes.activos} />
              <Fila label="En gestión" value={transporteRes.enGestion} />
              <Fila label="Rechazados" value={transporteRes.rechazados} />
              <Fila label="Costo mensual estimado" value={pesos(transporteRes.costo)} />
            </ul>
          </Panel>

          <Panel title="Equipo interdisciplinario">
            <ul className="divide-y divide-border">
              <Fila label="Profesionales activos" value={equipoRes.profesionales} />
              <Fila label="Asignaciones vigentes" value={equipoRes.asignaciones} />
              <Fila label="Concurrentes con equipo" value={equipoRes.conEquipo} />
              <Fila label="Concurrentes sin referente" value={equipoRes.sinReferente} />
            </ul>
          </Panel>

          <Panel title="Comunicaciones">
            <ul className="divide-y divide-border">
              <Fila label="Registradas en el mes" value={comunicacionesRes.total} />
              <Fila label="Con respuesta" value={comunicacionesRes.conRespuesta} />
              <Fila label="Con compromiso asumido" value={comunicacionesRes.compromisos} />
              {comunicacionesRes.porMedio.map(([medio, cant]) => (
                <Fila key={medio} label={`Medio: ${medio}`} value={cant} />
              ))}
            </ul>
          </Panel>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={Bus} label="Traslados activos" value={transporteRes.activos} tone="info" />
          <StatCard icon={Stethoscope} label="Asignaciones de equipo" value={equipoRes.asignaciones} tone="success" />
          <StatCard icon={MessageSquare} label="Comunicaciones del mes" value={comunicacionesRes.total} />
        </div>

        <Panel title="Detalle de admisiones del mes">
          {adms.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Sin admisiones en el período.</p>
          ) : (
            <ul className="divide-y divide-border">
              {adms.map((a) => (
                <Fila key={a.id} label={a.nombre_contacto} value={a.estado.replace(/_/g, " ")} />
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
