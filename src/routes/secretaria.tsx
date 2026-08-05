import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Boxes, ClipboardCheck, PackageCheck, Printer, Truck } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, Chip, EmptyState, StatCard } from "@/components/ui-kit";
import { Modal, campo, areaTexto, Etiqueta, botonPrimario, botonSecundario } from "@/components/forms";
import { Exportar } from "@/components/Exportar";
import {
  fetchConcurrentes,
  fetchPlanilla,
  fetchLoteItems,
  lotesApi,
  setLoteItems,
  setCicloPlanillas,
  setCicloLote,
  siguienteNumeroLote,
  CICLO_LABEL,
  type CicloPlanilla,
  type Lote,
} from "@/lib/api";
import { formatFecha, hoyISO, mesActual, nombreMes } from "@/lib/format";
import { imprimirHTML, escapar } from "@/lib/export";

export const Route = createFileRoute("/secretaria")({
  head: () => ({
    meta: [
      { title: "Secretaría — Control de planillas y entregas" },
      {
        name: "description",
        content:
          "Ciclo completo de las planillas mensuales: impresión, armado de lotes, entrega, recepción y archivo con carátula imprimible.",
      },
      { property: "og:title", content: "Secretaría — Control de planillas y entregas" },
      { property: "og:description", content: "Trazabilidad administrativa de cada planilla mensual del Centro de Día." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SecretariaPage,
});

const tonoCiclo: Record<CicloPlanilla, "muted" | "info" | "success" | "warning"> = {
  pendiente: "muted",
  impresa: "warning",
  en_lote: "info",
  entregada: "info",
  recibida: "success",
  firmada: "success",
  escaneada: "success",
  archivada: "success",

};

function SecretariaPage() {
  const qc = useQueryClient();
  const [mes, setMes] = useState(mesActual());
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<"todas" | CicloPlanilla>("todas");
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [modalLote, setModalLote] = useState(false);
  const [entrega, setEntrega] = useState<Lote | null>(null);
  const [formLote, setFormLote] = useState({ numero: "", prestacion: "", mutual: "", entregado_por: "", notas: "" });
  const [formEntrega, setFormEntrega] = useState({
    fecha_entrega: hoyISO(),
    lugar_entrega: "",
    recibido_por: "",
    notas: "",
  });

  const { data: personas = [] } = useQuery({ queryKey: ["concurrentes"], queryFn: fetchConcurrentes });
  const { data: planilla = [] } = useQuery({ queryKey: ["planilla", mes], queryFn: () => fetchPlanilla(mes) });
  const { data: lotes = [] } = useQuery({ queryKey: ["lotes"], queryFn: lotesApi.list });
  const { data: items = [] } = useQuery({ queryKey: ["lote_items"], queryFn: () => fetchLoteItems() });

  const porId = useMemo(() => {
    const m = new Map<string, (typeof planilla)[number]>();
    for (const p of planilla) m.set(p.concurrente_id, p);
    return m;
  }, [planilla]);

  const activos = useMemo(() => personas.filter((p) => p.activo), [personas]);

  const filas = useMemo(() => {
    const texto = q.trim().toLowerCase();
    return activos
      .map((p) => ({
        persona: p,
        ciclo: (porId.get(p.id)?.ciclo ?? "pendiente") as CicloPlanilla,
        estado: porId.get(p.id),
      }))
      .filter((f) => (filtro === "todas" ? true : f.ciclo === filtro))
      .filter((f) =>
        texto ? `${f.persona.nombre} ${f.persona.obra_social} ${f.persona.prestacion}`.toLowerCase().includes(texto) : true,
      );
  }, [activos, porId, filtro, q]);

  const conteo = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of activos) {
      const ciclo = porId.get(p.id)?.ciclo ?? "pendiente";
      c[ciclo] = (c[ciclo] ?? 0) + 1;
    }
    return c;
  }, [activos, porId]);

  const lotesMes = useMemo(() => lotes.filter((l) => l.mes === mes), [mes, lotes]);
  const itemsDe = (loteId: string) => items.filter((i) => i.lote_id === loteId);

  function refrescar() {
    qc.invalidateQueries({ queryKey: ["planilla", mes] });
    qc.invalidateQueries({ queryKey: ["lotes"] });
    qc.invalidateQueries({ queryKey: ["lote_items"] });
    qc.invalidateQueries({ queryKey: ["historial"] });
  }

  async function aplicarCiclo(ciclo: CicloPlanilla) {
    if (seleccion.length === 0) {
      toast.error("Seleccioná al menos una planilla");
      return;
    }
    try {
      await setCicloPlanillas(seleccion, mes, ciclo, {
        detalle: `${seleccion.length} planillas de ${nombreMes(mes)} pasaron a "${CICLO_LABEL[ciclo]}"`,
      });
      toast.success(`${seleccion.length} planillas → ${CICLO_LABEL[ciclo]}`);
      setSeleccion([]);
      refrescar();
    } catch (e) {
      toast.error(`No se pudo actualizar: ${(e as Error).message}`);
    }
  }

  function abrirLote() {
    if (seleccion.length === 0) {
      toast.error("Seleccioná las planillas impresas que van al lote");
      return;
    }
    const primera = activos.find((p) => p.id === seleccion[0]);
    setFormLote({
      numero: siguienteNumeroLote(lotes),
      prestacion: primera?.prestacion ?? "",
      mutual: primera?.obra_social ?? "",
      entregado_por: "",
      notas: "",
    });
    setModalLote(true);
  }

  async function crearLote() {
    if (!formLote.numero.trim()) {
      toast.error("El lote necesita un número");
      return;
    }
    if (lotes.some((l) => l.numero === formLote.numero.trim())) {
      toast.error("Ya existe un lote con ese número");
      return;
    }
    try {
      const lote = await lotesApi.create({
        ...formLote,
        numero: formLote.numero.trim(),
        mes,
        fecha_armado: hoyISO(),
        estado: "armado",
      });
      const elegidos = seleccion
        .map((id) => activos.find((p) => p.id === id))
        .filter(Boolean)
        .map((p) => ({ concurrente_id: p!.id, nombre: p!.nombre }));
      await setLoteItems(lote.id, elegidos);
      await setCicloPlanillas(seleccion, mes, "en_lote", {
        loteId: lote.id,
        detalle: `${elegidos.length} planillas asignadas al lote ${lote.numero}`,
      });
      toast.success(`Lote ${lote.numero} creado con ${elegidos.length} planillas`);
      setModalLote(false);
      setSeleccion([]);
      refrescar();
    } catch (e) {
      toast.error(`No se pudo crear el lote: ${(e as Error).message}`);
    }
  }

  function abrirEntrega(l: Lote) {
    setFormEntrega({
      fecha_entrega: l.fecha_entrega ?? hoyISO(),
      lugar_entrega: l.lugar_entrega ?? "",
      recibido_por: l.recibido_por ?? "",
      notas: l.notas ?? "",
    });
    setEntrega(l);
  }

  async function confirmarEntrega() {
    if (!entrega) return;
    if (!formEntrega.lugar_entrega.trim() || !formEntrega.recibido_por.trim()) {
      toast.error("Indicá lugar de entrega y quién recibe");
      return;
    }
    try {
      await lotesApi.update(entrega.id, { ...formEntrega, estado: "entregado" });
      await setCicloLote(entrega.id, "entregada", entrega.numero);
      toast.success(`Lote ${entrega.numero} entregado`);
      setEntrega(null);
      refrescar();
    } catch (e) {
      toast.error(`No se pudo registrar la entrega: ${(e as Error).message}`);
    }
  }

  async function marcarLote(l: Lote, estadoLote: string, ciclo: CicloPlanilla, extra: Partial<Lote> = {}) {
    try {
      await lotesApi.update(l.id, { estado: estadoLote, ...extra });
      await setCicloLote(l.id, ciclo, l.numero);
      toast.success(`Lote ${l.numero} → ${CICLO_LABEL[ciclo]}`);
      refrescar();
    } catch (e) {
      toast.error(`No se pudo actualizar: ${(e as Error).message}`);
    }
  }

  function caratula(l: Lote) {
    const filasLote = itemsDe(l.id);
    const cuerpo = `
      <h1>Carátula de entrega — Lote ${escapar(l.numero)}</h1>
      <div class="meta">
        Prestación: <strong>${escapar(l.prestacion || "—")}</strong> · Mutual: <strong>${escapar(l.mutual || "—")}</strong> ·
        Período: <strong>${escapar(l.mes ? nombreMes(l.mes) : "—")}</strong><br/>
        Armado: ${escapar(formatFecha(l.fecha_armado))} · Entrega: ${escapar(formatFecha(l.fecha_entrega))} ·
        Recepción: ${escapar(formatFecha(l.fecha_recepcion))}<br/>
        Lugar de entrega: <strong>${escapar(l.lugar_entrega || "—")}</strong> ·
        Cantidad de planillas: <strong>${filasLote.length}</strong>
      </div>
      <table><thead><tr><th style="width:40px">#</th><th>Concurrente</th><th style="width:150px">Observaciones</th></tr></thead>
      <tbody>${filasLote
        .map((f, i) => `<tr><td>${i + 1}</td><td>${escapar(f.nombre)}</td><td></td></tr>`)
        .join("")}</tbody></table>
      ${l.notas ? `<p class="meta">Observaciones: ${escapar(l.notas)}</p>` : ""}
      <div class="firmas">
        <div class="firma">Entregado por: ${escapar(l.entregado_por || "")}</div>
        <div class="firma">Recibido por: ${escapar(l.recibido_por || "")}</div>
        <div class="firma">Fecha y sello</div>
      </div>`;
    imprimirHTML(`Lote ${l.numero}`, cuerpo);
  }

  const filasExport = filas.map((f) => ({
    Concurrente: f.persona.nombre,
    Prestación: f.persona.prestacion,
    Mutual: f.persona.obra_social,
    Período: mes,
    Etapa: CICLO_LABEL[f.ciclo],
    Impresa: f.estado?.fecha_impresion ? formatFecha(f.estado.fecha_impresion.slice(0, 10)) : "",
    "Impresa por": f.estado?.impresa_por ?? "",
    Lote: lotes.find((l) => l.id === f.estado?.lote_id)?.numero ?? "",
    Entrega: f.estado?.fecha_entrega ? formatFecha(f.estado.fecha_entrega) : "",
    Recepción: f.estado?.fecha_recepcion ? formatFecha(f.estado.fecha_recepcion) : "",
  }));

  const todasMarcadas = filas.length > 0 && filas.every((f) => seleccion.includes(f.persona.id));

  return (
    <AppShell
      title="Secretaría"
      description="Control de planillas: impresión, lotes, entrega y recepción"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <input type="month" className={`${campo} w-auto`} value={mes} onChange={(e) => setMes(e.target.value)} />
          <Exportar filas={filasExport} nombre={`planillas-${mes}`} titulo={`Control de planillas ${nombreMes(mes)}`} />
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pendientes" value={conteo.pendiente ?? 0} icon={ClipboardCheck} />
        <StatCard label="Impresas" value={conteo.impresa ?? 0} icon={Printer} />
        <StatCard label="En lote / entregadas" value={(conteo.en_lote ?? 0) + (conteo.entregada ?? 0)} icon={Truck} />
        <StatCard label="Recibidas / archivadas" value={(conteo.recibida ?? 0) + (conteo.archivada ?? 0)} icon={Archive} />
      </div>

      <Panel
        title={`Planillas de ${nombreMes(mes)}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <input
              className={`${campo} w-auto`}
              placeholder="Buscar…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select className={`${campo} w-auto`} value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)}>
              <option value="todas">Todas las etapas</option>
              {(Object.keys(CICLO_LABEL) as CicloPlanilla[]).map((c) => (
                <option key={c} value={c}>
                  {CICLO_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">{seleccion.length} seleccionadas</span>
          <button className={botonSecundario} onClick={() => aplicarCiclo("impresa")}>
            <Printer className="h-4 w-4" /> Marcar impresas
          </button>
          <button className={botonPrimario} onClick={abrirLote}>
            <Boxes className="h-4 w-4" /> Crear lote
          </button>
          <button className={botonSecundario} onClick={() => aplicarCiclo("archivada")}>
            <Archive className="h-4 w-4" /> Archivar
          </button>
          <button className={botonSecundario} onClick={() => aplicarCiclo("pendiente")}>
            Reiniciar ciclo
          </button>
        </div>

        {filas.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title="Sin planillas" hint="No hay concurrentes activos para el filtro elegido." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input"
                      checked={todasMarcadas}
                      onChange={(e) => setSeleccion(e.target.checked ? filas.map((f) => f.persona.id) : [])}
                      aria-label="Seleccionar todas"
                    />
                  </th>
                  <th className="px-3 py-2.5 font-medium">Concurrente</th>
                  <th className="px-3 py-2.5 font-medium">Prestación / Mutual</th>
                  <th className="px-3 py-2.5 font-medium">Etapa</th>
                  <th className="px-3 py-2.5 font-medium">Impresa</th>
                  <th className="px-3 py-2.5 font-medium">Lote</th>
                  <th className="px-3 py-2.5 font-medium">Entrega</th>
                  <th className="px-3 py-2.5 font-medium">Recepción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filas.map((f) => (
                  <tr key={f.persona.id} className="hover:bg-accent/40">
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input"
                        checked={seleccion.includes(f.persona.id)}
                        onChange={(e) =>
                          setSeleccion((s) =>
                            e.target.checked ? [...s, f.persona.id] : s.filter((x) => x !== f.persona.id),
                          )
                        }
                        aria-label={`Seleccionar ${f.persona.nombre}`}
                      />
                    </td>
                    <td className="px-3 py-2.5 font-medium">{f.persona.nombre}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {f.persona.prestacion || "—"} · {f.persona.obra_social || "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <Chip tone={tonoCiclo[f.ciclo]}>{CICLO_LABEL[f.ciclo]}</Chip>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {f.estado?.fecha_impresion ? formatFecha(f.estado.fecha_impresion.slice(0, 10)) : "—"}
                      {f.estado?.impresa_por ? ` · ${f.estado.impresa_por}` : ""}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {lotes.find((l) => l.id === f.estado?.lote_id)?.numero ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {f.estado?.fecha_entrega ? formatFecha(f.estado.fecha_entrega) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {f.estado?.fecha_recepcion ? formatFecha(f.estado.fecha_recepcion) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title={`Lotes de ${nombreMes(mes)}`}>
        {lotesMes.length === 0 ? (
          <EmptyState icon={Boxes} title="Sin lotes en el período" hint="Seleccioná planillas impresas y creá un lote." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2.5 font-medium">Lote</th>
                  <th className="px-3 py-2.5 font-medium">Planillas</th>
                  <th className="px-3 py-2.5 font-medium">Armado</th>
                  <th className="px-3 py-2.5 font-medium">Entrega / lugar</th>
                  <th className="px-3 py-2.5 font-medium">Recepción</th>
                  <th className="px-3 py-2.5 font-medium">Estado</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lotesMes.map((l) => (
                  <tr key={l.id} className="hover:bg-accent/40">
                    <td className="px-3 py-2.5 font-medium">{l.numero}</td>
                    <td className="px-3 py-2.5">{itemsDe(l.id).length}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{formatFecha(l.fecha_armado)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {formatFecha(l.fecha_entrega)} {l.lugar_entrega ? `· ${l.lugar_entrega}` : ""}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {formatFecha(l.fecha_recepcion)} {l.recibido_por ? `· ${l.recibido_por}` : ""}
                    </td>
                    <td className="px-3 py-2.5">
                      <Chip tone={l.estado === "recibido" || l.estado === "cerrado" ? "success" : l.estado === "entregado" ? "info" : "muted"}>
                        {l.estado}
                      </Chip>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {l.estado === "armado" && (
                          <button className={botonSecundario} onClick={() => abrirEntrega(l)}>
                            <Truck className="h-4 w-4" /> Entregar
                          </button>
                        )}
                        {l.estado === "entregado" && (
                          <button
                            className={botonSecundario}
                            onClick={() => marcarLote(l, "recibido", "recibida", { fecha_recepcion: hoyISO() })}
                          >
                            <PackageCheck className="h-4 w-4" /> Recibir
                          </button>
                        )}
                        {l.estado === "recibido" && (
                          <button className={botonSecundario} onClick={() => marcarLote(l, "cerrado", "archivada")}>
                            <Archive className="h-4 w-4" /> Archivar
                          </button>
                        )}
                        <button
                          className="rounded-md p-1.5 text-muted-foreground hover:text-primary"
                          onClick={() => caratula(l)}
                          aria-label="Carátula de entrega"
                          title="Carátula de entrega"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Modal
        abierto={modalLote}
        onClose={() => setModalLote(false)}
        titulo={`Nuevo lote · ${seleccion.length} planillas`}
        footer={
          <>
            <button className={botonSecundario} onClick={() => setModalLote(false)}>
              Cancelar
            </button>
            <button className={botonPrimario} onClick={crearLote}>
              Crear lote
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <Etiqueta>Número de lote</Etiqueta>
            <input className={campo} value={formLote.numero} onChange={(e) => setFormLote({ ...formLote, numero: e.target.value })} />
          </label>
          <label className="block">
            <Etiqueta>Período</Etiqueta>
            <input className={campo} value={nombreMes(mes)} readOnly />
          </label>
          <label className="block">
            <Etiqueta>Prestación</Etiqueta>
            <input className={campo} value={formLote.prestacion} onChange={(e) => setFormLote({ ...formLote, prestacion: e.target.value })} />
          </label>
          <label className="block">
            <Etiqueta>Mutual</Etiqueta>
            <input className={campo} value={formLote.mutual} onChange={(e) => setFormLote({ ...formLote, mutual: e.target.value })} />
          </label>
          <label className="block sm:col-span-2">
            <Etiqueta>Entregado por</Etiqueta>
            <input className={campo} value={formLote.entregado_por} onChange={(e) => setFormLote({ ...formLote, entregado_por: e.target.value })} />
          </label>
          <label className="block sm:col-span-2">
            <Etiqueta>Observaciones</Etiqueta>
            <textarea rows={2} className={areaTexto} value={formLote.notas} onChange={(e) => setFormLote({ ...formLote, notas: e.target.value })} />
          </label>
        </div>
      </Modal>

      <Modal
        abierto={!!entrega}
        onClose={() => setEntrega(null)}
        titulo={entrega ? `Entregar lote ${entrega.numero}` : "Entregar lote"}
        footer={
          <>
            <button className={botonSecundario} onClick={() => setEntrega(null)}>
              Cancelar
            </button>
            <button className={botonPrimario} onClick={confirmarEntrega}>
              Registrar entrega
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <Etiqueta>Fecha de entrega</Etiqueta>
            <input
              type="date"
              className={campo}
              value={formEntrega.fecha_entrega}
              onChange={(e) => setFormEntrega({ ...formEntrega, fecha_entrega: e.target.value })}
            />
          </label>
          <label className="block">
            <Etiqueta>Lugar de entrega</Etiqueta>
            <input
              className={campo}
              value={formEntrega.lugar_entrega}
              onChange={(e) => setFormEntrega({ ...formEntrega, lugar_entrega: e.target.value })}
            />
          </label>
          <label className="block sm:col-span-2">
            <Etiqueta>Quién recibe</Etiqueta>
            <input
              className={campo}
              value={formEntrega.recibido_por}
              onChange={(e) => setFormEntrega({ ...formEntrega, recibido_por: e.target.value })}
            />
          </label>
          <label className="block sm:col-span-2">
            <Etiqueta>Observaciones</Etiqueta>
            <textarea
              rows={2}
              className={areaTexto}
              value={formEntrega.notas}
              onChange={(e) => setFormEntrega({ ...formEntrega, notas: e.target.value })}
            />
          </label>
        </div>
      </Modal>
    </AppShell>
  );
}
