import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, UtensilsCrossed, Wallet, ReceiptText, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, StatCard, EmptyState, Chip } from "@/components/ui-kit";
import { Modal, campo, areaTexto, botonPrimario, botonSecundario, Etiqueta } from "@/components/forms";
import { Exportar } from "@/components/Exportar";
import { useEntidad } from "@/hooks/use-entidad";
import { usePermisos } from "@/hooks/use-permisos";
import {
  fetchConcurrentes,
  fetchCatalogos,
  viandasApi,
  deudaViandas,
  ESTADOS_VIANDA,
  type Vianda,
} from "@/lib/api";
import { formatFecha, hoyISO, mesActual, moneda, nombreMes } from "@/lib/format";


export const Route = createFileRoute("/viandas")({
  head: () => ({
    meta: [
      { title: "Viandas — Centro de Día" },
      {
        name: "description",
        content: "Administración de viandas: registro por concurrente, comprobantes, pagos y resúmenes por semana y mes.",
      },
      { property: "og:title", content: "Viandas — Centro de Día" },
      { property: "og:description", content: "Control diario de viandas, comprobantes y estados de pago." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ViandasPage,
});

/** Semana del mes (1 a 5) según el día de la fecha. */
function semanaDe(iso: string) {
  const dia = Number(iso.slice(8, 10)) || 1;
  return Math.min(5, Math.ceil(dia / 7));
}

const vacia = (): Partial<Vianda> => ({
  concurrente_id: null,
  nombre_concurrente: "",
  profesional: "",
  administrativo: "",
  mes: mesActual(),
  semana: semanaDe(hoyISO()),
  fecha: hoyISO(),
  cantidad: 1,
  precio_unitario: 0,
  observaciones: "",
  forma_pago: "",
  comprobante_recibido: false,
  fecha_comprobante: null,
  fecha_pago: null,
  estado: "pendiente",
});

function ViandasPage() {
  const { datos: viandas, crear, actualizar, eliminar } = useEntidad<Vianda>("viandas", viandasApi, {
    etiqueta: "vianda",
  });
  const { data: personas = [] } = useQuery({ queryKey: ["concurrentes"], queryFn: fetchConcurrentes });
  const { data: catalogos } = useQuery({ queryKey: ["catalogos"], queryFn: fetchCatalogos });
  const formasPago = catalogos?.formas_pago ?? [];

  const [abierto, setAbierto] = useState(false);
  const [borrador, setBorrador] = useState<Partial<Vianda>>(vacia());

  const [fMes, setFMes] = useState("");
  const [fSemana, setFSemana] = useState("");
  const [fFecha, setFFecha] = useState("");
  const [fConcurrente, setFConcurrente] = useState("");
  const [fProfesional, setFProfesional] = useState("");
  const [fAdministrativo, setFAdministrativo] = useState("");
  const [fEstado, setFEstado] = useState("");

  const opciones = useMemo(
    () => ({
      meses: [...new Set(viandas.map((v) => v.mes).filter(Boolean))].sort().reverse(),
      profesionales: [...new Set(viandas.map((v) => v.profesional).filter(Boolean))].sort(),
      administrativos: [...new Set(viandas.map((v) => v.administrativo).filter(Boolean))].sort(),
    }),
    [viandas],
  );

  const filtradas = useMemo(
    () =>
      viandas.filter(
        (v) =>
          (!fMes || v.mes === fMes) &&
          (!fSemana || String(v.semana) === fSemana) &&
          (!fFecha || v.fecha === fFecha) &&
          (!fConcurrente || v.concurrente_id === fConcurrente) &&
          (!fProfesional || v.profesional === fProfesional) &&
          (!fAdministrativo || v.administrativo === fAdministrativo) &&
          (!fEstado || v.estado === fEstado),
      ),
    [viandas, fMes, fSemana, fFecha, fConcurrente, fProfesional, fAdministrativo, fEstado],
  );

  const total = filtradas.reduce((s, v) => s + (v.estado === "anulado" ? 0 : v.cantidad), 0);
  const importe = filtradas.reduce(
    (s, v) => s + (v.estado === "anulado" ? 0 : v.cantidad * Number(v.precio_unitario || 0)),
    0,
  );
  const pendientes = filtradas.filter((v) => v.estado === "pendiente").length;
  const sinComprobante = filtradas.filter((v) => !v.comprobante_recibido && v.estado !== "anulado").length;

  const agrupar = (clave: (v: Vianda) => string) => {
    const mapa = new Map<string, number>();
    for (const v of filtradas) {
      if (v.estado === "anulado") continue;
      const k = clave(v) || "—";
      mapa.set(k, (mapa.get(k) ?? 0) + v.cantidad);
    }
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  };

  const filasExport = filtradas.map((v) => ({
    Fecha: formatFecha(v.fecha),
    Mes: v.mes,
    Semana: v.semana,
    Concurrente: v.nombre_concurrente,
    Profesional: v.profesional,
    Administrativo: v.administrativo,
    Cantidad: v.cantidad,
    "Precio unitario": Number(v.precio_unitario || 0),
    Importe: v.cantidad * Number(v.precio_unitario || 0),
    "Forma de pago": v.forma_pago,
    Comprobante: v.comprobante_recibido ? "Sí" : "No",
    "Fecha comprobante": v.fecha_comprobante ? formatFecha(v.fecha_comprobante) : "",
    "Fecha de pago": v.fecha_pago ? formatFecha(v.fecha_pago) : "",
    Estado: v.estado,
    Observaciones: v.observaciones,
  }));

  function abrirNueva() {
    setBorrador(vacia());
    setAbierto(true);
  }

  function editar(v: Vianda) {
    setBorrador(v);
    setAbierto(true);
  }

  /** Validaciones de negocio: nada se guarda incompleto ni duplicado. */
  function validar(datos: Partial<Vianda>): string | null {
    if (!datos.concurrente_id) return "Elegí un concurrente.";
    if (!datos.fecha) return "Indicá la fecha de la vianda.";
    if (!datos.cantidad || datos.cantidad < 1) return "La cantidad debe ser mayor a cero.";
    if (Number(datos.precio_unitario) < 0) return "El precio unitario no puede ser negativo.";
    if (datos.comprobante_recibido && !datos.fecha_comprobante)
      return "Si el comprobante fue recibido, cargá su fecha.";
    if (datos.estado === "pagado" && !datos.fecha_pago) return "Una vianda pagada necesita fecha de pago.";
    if (datos.estado === "pagado" && !datos.forma_pago) return "Indicá la forma de pago.";
    if (datos.fecha_pago && datos.fecha && datos.fecha_pago < datos.fecha)
      return "La fecha de pago no puede ser anterior a la de la vianda.";
    const duplicada = viandas.some(
      (v) =>
        v.id !== borrador.id &&
        v.concurrente_id === datos.concurrente_id &&
        v.fecha === datos.fecha &&
        v.estado !== "anulado",
    );
    if (duplicada) return "Ya existe una vianda de ese concurrente en esa fecha.";
    return null;
  }

  function guardar() {
    const persona = personas.find((p) => p.id === borrador.concurrente_id);
    const datos: Partial<Vianda> = {
      ...borrador,
      nombre_concurrente: persona?.nombre ?? borrador.nombre_concurrente ?? "",
      mes: (borrador.fecha ?? hoyISO()).slice(0, 7),
      semana: semanaDe(borrador.fecha ?? hoyISO()),
      cantidad: Number(borrador.cantidad) || 1,
      precio_unitario: Number(borrador.precio_unitario) || 0,
    };
    const error = validar(datos);
    if (error) {
      toast.error(error);
      return;
    }
    if (borrador.id) actualizar.mutate({ id: borrador.id, cambios: datos });
    else crear.mutate(datos);
    setAbierto(false);
  }

  /** Acción rápida: deja la vianda pagada con la fecha de hoy. */
  function marcarPagada(v: Vianda) {
    if (!v.forma_pago) {
      toast.error("Cargá primero la forma de pago desde «Editar».");
      return;
    }
    actualizar.mutate({
      id: v.id,
      cambios: { estado: "pagado", fecha_pago: v.fecha_pago ?? hoyISO() } as Partial<Vianda>,
    });
  }

  const selectFiltro = "h-9 rounded-lg border border-input bg-card px-2 text-xs";

  return (
    <AppShell
      title="Viandas"
      description="Registro, comprobantes y pagos"
      actions={
        <>
          {puedeEditar && (
            <button className={botonPrimario} onClick={abrirNueva}>
              <Plus className="h-4 w-4" /> Nueva vianda
            </button>
          )}
          <Exportar filas={filasExport} nombre="viandas" titulo="Viandas" />
        </>
      }
    >

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={UtensilsCrossed} label="Viandas (filtradas)" value={total} tone="info" />
        <StatCard icon={Wallet} label="Importe total" value={moneda(importe)} tone="success" />
        <StatCard icon={ReceiptText} label="Sin comprobante" value={sinComprobante} tone="warning" />
        <StatCard icon={Users} label="Pendientes de pago" value={pendientes} tone="danger" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <select className={selectFiltro} value={fMes} onChange={(e) => setFMes(e.target.value)}>
          <option value="">Todos los meses</option>
          {opciones.meses.map((m) => (
            <option key={m} value={m}>
              {nombreMes(m)}
            </option>
          ))}
        </select>
        <select className={selectFiltro} value={fSemana} onChange={(e) => setFSemana(e.target.value)}>
          <option value="">Todas las semanas</option>
          {[1, 2, 3, 4, 5].map((s) => (
            <option key={s} value={s}>
              Semana {s}
            </option>
          ))}
        </select>
        <input
          type="date"
          className={selectFiltro}
          value={fFecha}
          onChange={(e) => setFFecha(e.target.value)}
        />
        <select className={selectFiltro} value={fConcurrente} onChange={(e) => setFConcurrente(e.target.value)}>
          <option value="">Todos los concurrentes</option>
          {personas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
        <select className={selectFiltro} value={fProfesional} onChange={(e) => setFProfesional(e.target.value)}>
          <option value="">Todos los profesionales</option>
          {opciones.profesionales.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          className={selectFiltro}
          value={fAdministrativo}
          onChange={(e) => setFAdministrativo(e.target.value)}
        >
          <option value="">Todos los administrativos</option>
          {opciones.administrativos.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select className={selectFiltro} value={fEstado} onChange={(e) => setFEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {ESTADOS_VIANDA.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title={`Registros · ${filtradas.length}`}>
          {filtradas.length === 0 ? (
            <EmptyState
              icon={UtensilsCrossed}
              title="Sin viandas"
              hint="Registrá la primera vianda con el botón «Nueva vianda»."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Fecha</th>
                    <th className="px-3 py-2 font-medium">Concurrente</th>
                    <th className="px-3 py-2 font-medium">Profesional</th>
                    <th className="px-3 py-2 font-medium">Adm.</th>
                    <th className="px-3 py-2 font-medium">Cant.</th>
                    <th className="px-3 py-2 font-medium">Importe</th>
                    <th className="px-3 py-2 font-medium">Compr.</th>
                    <th className="px-3 py-2 font-medium">Estado</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtradas.map((v) => (
                    <tr key={v.id} className="hover:bg-accent/40">
                      <td className="px-3 py-2 whitespace-nowrap">{formatFecha(v.fecha)}</td>
                      <td className="px-3 py-2">{v.nombre_concurrente || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{v.profesional || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{v.administrativo || "—"}</td>
                      <td className="px-3 py-2 tabular-nums">{v.cantidad}</td>
                      <td className="px-3 py-2 tabular-nums">
                        {moneda(v.cantidad * Number(v.precio_unitario || 0))}
                      </td>
                      <td className="px-3 py-2">
                        <Chip tone={v.comprobante_recibido ? "success" : "warning"}>
                          {v.comprobante_recibido ? "Sí" : "No"}
                        </Chip>
                      </td>
                      <td className="px-3 py-2">
                        <Chip
                          tone={
                            v.estado === "pagado" ? "success" : v.estado === "anulado" ? "muted" : "warning"
                          }
                        >
                          {v.estado}
                        </Chip>
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <button
                          className="text-xs font-medium text-primary hover:underline"
                          onClick={() => editar(v)}
                        >
                          Editar
                        </button>
                        <button
                          className="ml-3 text-xs font-medium text-destructive hover:underline"
                          onClick={() =>
                            eliminar.mutate({ id: v.id, etiqueta: `la vianda de ${v.nombre_concurrente}` })
                          }
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="space-y-4">
          <Resumen titulo="Por concurrente" filas={agrupar((v) => v.nombre_concurrente)} />
          <Resumen titulo="Por profesional" filas={agrupar((v) => v.profesional)} />
          <Resumen titulo="Por administrativo" filas={agrupar((v) => v.administrativo)} />
          <Resumen titulo="Por semana" filas={agrupar((v) => `Semana ${v.semana}`)} />
          <Resumen titulo="Por mes" filas={agrupar((v) => (v.mes ? nombreMes(v.mes) : "—"))} />
        </div>
      </div>

      <Modal
        abierto={abierto}
        onClose={() => setAbierto(false)}
        titulo={borrador.id ? "Editar vianda" : "Nueva vianda"}
        footer={
          <>
            <button className={botonSecundario} onClick={() => setAbierto(false)}>
              Cancelar
            </button>
            <button className={botonPrimario} onClick={guardar}>
              Guardar
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <Etiqueta>Concurrente</Etiqueta>
            <select
              className={campo}
              value={borrador.concurrente_id ?? ""}
              onChange={(e) => setBorrador({ ...borrador, concurrente_id: e.target.value || null })}
            >
              <option value="">Seleccionar…</option>
              {personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            <Etiqueta>Profesional</Etiqueta>
            <input
              className={campo}
              value={borrador.profesional ?? ""}
              onChange={(e) => setBorrador({ ...borrador, profesional: e.target.value })}
            />
          </label>
          <label>
            <Etiqueta>Administrativo</Etiqueta>
            <input
              className={campo}
              value={borrador.administrativo ?? ""}
              onChange={(e) => setBorrador({ ...borrador, administrativo: e.target.value })}
            />
          </label>
          <label>
            <Etiqueta>Fecha</Etiqueta>
            <input
              type="date"
              className={campo}
              value={borrador.fecha ?? ""}
              onChange={(e) => setBorrador({ ...borrador, fecha: e.target.value })}
            />
          </label>
          <label>
            <Etiqueta>Cantidad</Etiqueta>
            <input
              type="number"
              min={1}
              className={campo}
              value={borrador.cantidad ?? 1}
              onChange={(e) => setBorrador({ ...borrador, cantidad: Number(e.target.value) })}
            />
          </label>
          <label>
            <Etiqueta>Precio unitario</Etiqueta>
            <input
              type="number"
              min={0}
              step="0.01"
              className={campo}
              value={borrador.precio_unitario ?? 0}
              onChange={(e) => setBorrador({ ...borrador, precio_unitario: Number(e.target.value) })}
            />
          </label>
          <label>
            <Etiqueta>Forma de pago</Etiqueta>
            <select
              className={campo}
              value={borrador.forma_pago ?? ""}
              onChange={(e) => setBorrador({ ...borrador, forma_pago: e.target.value })}
            >
              <option value="">Sin definir</option>
              {formasPago.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <label>
            <Etiqueta>Comprobante recibido</Etiqueta>
            <select
              className={campo}
              value={borrador.comprobante_recibido ? "si" : "no"}
              onChange={(e) => setBorrador({ ...borrador, comprobante_recibido: e.target.value === "si" })}
            >
              <option value="no">No</option>
              <option value="si">Sí</option>
            </select>
          </label>
          <label>
            <Etiqueta>Fecha del comprobante</Etiqueta>
            <input
              type="date"
              className={campo}
              value={borrador.fecha_comprobante ?? ""}
              onChange={(e) => setBorrador({ ...borrador, fecha_comprobante: e.target.value || null })}
            />
          </label>
          <label>
            <Etiqueta>Fecha de pago</Etiqueta>
            <input
              type="date"
              className={campo}
              value={borrador.fecha_pago ?? ""}
              onChange={(e) => setBorrador({ ...borrador, fecha_pago: e.target.value || null })}
            />
          </label>
          <label>
            <Etiqueta>Estado</Etiqueta>
            <select
              className={campo}
              value={borrador.estado ?? "pendiente"}
              onChange={(e) => setBorrador({ ...borrador, estado: e.target.value })}
            >
              {ESTADOS_VIANDA.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </label>
          <label className="sm:col-span-2">
            <Etiqueta>Observaciones</Etiqueta>
            <textarea
              rows={3}
              className={areaTexto}
              value={borrador.observaciones ?? ""}
              onChange={(e) => setBorrador({ ...borrador, observaciones: e.target.value })}
            />
          </label>
        </div>
      </Modal>
    </AppShell>
  );
}

function Resumen({ titulo, filas }: { titulo: string; filas: [string, number][] }) {
  return (
    <Panel title={titulo}>
      {filas.length === 0 ? (
        <p className="px-4 py-4 text-xs text-muted-foreground">Sin datos.</p>
      ) : (
        <ul className="divide-y divide-border">
          {filas.slice(0, 12).map(([k, n]) => (
            <li key={k} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-2 text-sm">
              <span className="truncate">{k}</span>
              <span className="tabular-nums font-medium">{n}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
