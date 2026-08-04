import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Plus,
  Search,
  X,
  Pencil,
  Trash2,
  UserMinus,
  UserCheck,
  Mail,
  Phone,
  FileText,
  Clock,
  Users,
  Download,
  User,
  ClipboardList,
  CalendarDays,
  StickyNote,
  BookText,
  Receipt,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { ImportarExcel } from "@/components/concurrentes/ImportarExcel";
import { ChecklistRequisitos } from "@/components/concurrentes/ChecklistRequisitos";
import { Exportar } from "@/components/Exportar";
import { LUGARES_FIRMA } from "@/lib/api";

import { Panel, Chip, EmptyState } from "@/components/ui-kit";
import {
  fetchConcurrentes,
  createConcurrente,
  updateConcurrente,
  deleteConcurrente,
  fetchCatalogos,
  fetchHistorial,
  documentosApi,
  eventosApi,
  facturacionApi,
  fetchPlanillaAll,
  ESTADOS_PLANILLA,
  type Concurrente,
} from "@/lib/api";
import { iniciales, formatFecha, tiempoRelativo, hoyISO, nombreMes, moneda, diasHasta } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/concurrentes")({
  validateSearch: (search: Record<string, unknown>) => ({ id: (search.id as string) || "" }),
  head: () => ({
    meta: [
      { title: "Concurrentes — Centro de Día" },
      {
        name: "description",
        content: "Listado y ficha completa de concurrentes: datos personales, obra social, responsable, documentos e historial.",
      },
      { property: "og:title", content: "Concurrentes — Centro de Día" },
      { property: "og:description", content: "Ficha completa de cada concurrente con documentos e historial de acciones." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConcurrentesPage,
});

const VACIO: Partial<Concurrente> = {
  nombre: "",
  apellido: "",
  dni: "",
  fecha_nacimiento: null,
  direccion: "",
  telefono: "",
  transporte: false,
  lugar_firma: "Kalen",
  grupo: "",
  prestacion: "",
  obra_social: "",
  n_afiliado: "",
  dias_x_semana: "",
  dias_especificos: "",
  horarios: "",
  responsable: "",
  mail: "",
  wsp: "",
  notas: "",
  observaciones: "",
  tipo: "prestacion",
};


const field = "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function FormConcurrente({
  initial,
  onSave,
  onCancel,
  catalogos,
}: {
  initial?: Partial<Concurrente>;
  onSave: (v: Partial<Concurrente>) => void;
  onCancel: () => void;
  catalogos: Record<string, string[]>;
}) {
  const [form, setForm] = useState<Partial<Concurrente>>({ ...VACIO, ...initial });
  const set = (k: keyof Concurrente) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo label="Nombre y apellido">
          <input autoFocus value={form.nombre || ""} onChange={set("nombre")} className={field} />
        </Campo>
        <Campo label="Tipo">
          <select value={form.tipo} onChange={set("tipo")} className={field}>
            <option value="prestacion">Prestación</option>
            <option value="transporte">Transporte</option>
          </select>
        </Campo>
        <Campo label="Grupo">
          <input value={form.grupo || ""} onChange={set("grupo")} className={field} />
        </Campo>
        <Campo label="Prestación">
          <input list="cat-prestaciones" value={form.prestacion || ""} onChange={set("prestacion")} className={field} />
          <datalist id="cat-prestaciones">
            {(catalogos.prestaciones || []).map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </Campo>
        <Campo label="Obra social / mutual">
          <input list="cat-mutuales" value={form.obra_social || ""} onChange={set("obra_social")} className={field} />
          <datalist id="cat-mutuales">
            {(catalogos.mutuales || []).map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </Campo>
        <Campo label="N° de afiliado">
          <input value={form.n_afiliado || ""} onChange={set("n_afiliado")} className={field} />
        </Campo>
        <Campo label="Días por semana">
          <input value={form.dias_x_semana || ""} onChange={set("dias_x_semana")} className={field} />
        </Campo>
        <Campo label="Días específicos">
          <input value={form.dias_especificos || ""} onChange={set("dias_especificos")} className={field} />
        </Campo>
        <Campo label="Horarios">
          <input value={form.horarios || ""} onChange={set("horarios")} className={field} />
        </Campo>
        <Campo label="Responsable">
          <input list="cat-responsables" value={form.responsable || ""} onChange={set("responsable")} className={field} />
          <datalist id="cat-responsables">
            {(catalogos.responsables || []).map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </Campo>
        <Campo label="Mail">
          <input type="email" value={form.mail || ""} onChange={set("mail")} className={field} />
        </Campo>
        <Campo label="WhatsApp">
          <input value={form.wsp || ""} onChange={set("wsp")} className={field} />
        </Campo>
        <Campo label="DNI">
          <input value={form.dni || ""} onChange={set("dni")} className={field} />
        </Campo>
        <Campo label="Fecha de nacimiento">
          <input
            type="date"
            value={form.fecha_nacimiento || ""}
            onChange={(e) => setForm((f) => ({ ...f, fecha_nacimiento: e.target.value || null }))}
            className={field}
          />
        </Campo>
        <Campo label="Teléfono">
          <input value={form.telefono || ""} onChange={set("telefono")} className={field} />
        </Campo>
        <Campo label="Dirección">
          <input value={form.direccion || ""} onChange={set("direccion")} className={field} />
        </Campo>
        <Campo label="Lugar de firma">
          <select value={form.lugar_firma || "Kalen"} onChange={set("lugar_firma")} className={field}>
            {LUGARES_FIRMA.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Usa transporte">
          <select
            value={form.transporte ? "si" : "no"}
            onChange={(e) => setForm((f) => ({ ...f, transporte: e.target.value === "si" }))}
            className={field}
          >
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>
        </Campo>

      </div>
      <Campo label="Notas">
        <textarea rows={2} value={form.notas || ""} onChange={set("notas")} className={cn(field, "h-auto py-2")} />
      </Campo>
      <Campo label="Observaciones">
        <textarea rows={2} value={form.observaciones || ""} onChange={set("observaciones")} className={cn(field, "h-auto py-2")} />
      </Campo>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="h-10 rounded-lg border border-input px-4 text-sm font-medium hover:bg-accent">
          Cancelar
        </button>
        <button
          disabled={!form.nombre?.trim()}
          onClick={() => onSave(form)}
          className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}

const TABS = [
  { key: "personal", label: "Datos personales", icon: User },
  { key: "prestaciones", label: "Prestaciones", icon: ClipboardList },
  { key: "calendario", label: "Calendario", icon: CalendarDays },
  { key: "documentacion", label: "Documentación", icon: FileText },
  { key: "historial", label: "Historial", icon: Clock },
  { key: "observaciones", label: "Observaciones", icon: StickyNote },
  { key: "maestro", label: "Doc. maestro", icon: BookText },
  { key: "facturacion", label: "Facturación", icon: Receipt },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function Datos({ filas }: { filas: [string, string][] }) {
  return (
    <dl className="divide-y divide-border overflow-hidden rounded-xl border border-border">
      {filas.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[40%_minmax(0,1fr)] gap-3 px-4 py-2.5 text-sm">
          <dt className="truncate text-muted-foreground">{k}</dt>
          <dd className="min-w-0 break-words font-medium">{v || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

function Ficha({ persona, onClose }: { persona: Concurrente; onClose: () => void }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabKey>("personal");
  const [editando, setEditando] = useState(false);
  const [obs, setObs] = useState({ notas: persona.notas || "", observaciones: persona.observaciones || "" });

  const { data: catalogos = {} } = useQuery({ queryKey: ["catalogos"], queryFn: fetchCatalogos });
  const { data: docs = [] } = useQuery({ queryKey: ["documentos"], queryFn: documentosApi.list });
  const { data: historial = [] } = useQuery({ queryKey: ["historial-full"], queryFn: () => fetchHistorial(300) });
  const { data: eventos = [] } = useQuery({ queryKey: ["eventos"], queryFn: eventosApi.list });
  const { data: facturas = [] } = useQuery({ queryKey: ["facturacion"], queryFn: facturacionApi.list });
  const { data: planillas = [] } = useQuery({ queryKey: ["planilla-all"], queryFn: fetchPlanillaAll });

  const guardar = useMutation({
    mutationFn: (v: Partial<Concurrente>) => updateConcurrente(persona.id, v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["concurrentes"] });
      qc.invalidateQueries({ queryKey: ["historial"] });
      qc.invalidateQueries({ queryKey: ["historial-full"] });
      setEditando(false);
      toast.success("Ficha actualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const misDocs = docs.filter((d) => d.concurrente_id === persona.id);
  const miHistorial = historial.filter((h) => h.concurrente_id === persona.id);
  const misEventos = eventos
    .filter((e) => e.concurrente_id === persona.id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const misFacturas = facturas
    .filter((f) => f.concurrente_id === persona.id)
    .sort((a, b) => b.mes.localeCompare(a.mes));
  const misPlanillas = planillas
    .filter((p) => p.concurrente_id === persona.id)
    .sort((a, b) => b.mes.localeCompare(a.mes))
    .slice(0, 6);

  const hoy = hoyISO();
  const totalFacturado = misFacturas.reduce((a, f) => a + Number(f.monto || 0), 0);
  const totalCobrado = misFacturas.filter((f) => f.estado === "cobrado").reduce((a, f) => a + Number(f.monto || 0), 0);

  const contador: Record<TabKey, number | null> = {
    personal: null,
    prestaciones: null,
    calendario: misEventos.length,
    documentacion: misDocs.length,
    historial: miHistorial.length,
    observaciones: null,
    maestro: null,
    facturacion: misFacturas.length,
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button aria-label="Cerrar" className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-border bg-background shadow-2xl">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-border p-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
              {iniciales(persona.nombre)}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold">{persona.nombre}</h2>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <Chip tone={persona.activo ? "success" : "danger"}>{persona.activo ? "Activo" : "Baja"}</Chip>
                <Chip tone={persona.tipo === "transporte" ? "warning" : "info"}>
                  {persona.tipo === "transporte" ? "Transporte" : "Prestación"}
                </Chip>
                {persona.obra_social && <Chip>{persona.obra_social}</Chip>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex gap-1 overflow-x-auto border-b border-border px-3">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                tab === t.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              {contador[t.key] ? (
                <span className="rounded-full bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground">
                  {contador[t.key]}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* ---------- Datos personales ---------- */}
          {tab === "personal" &&
            (editando ? (
              <FormConcurrente
                initial={persona}
                catalogos={catalogos}
                onCancel={() => setEditando(false)}
                onSave={(v) => guardar.mutate(v)}
              />
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {persona.mail && (
                    <a href={`mailto:${persona.mail}`} className="inline-flex items-center gap-2 rounded-lg border border-input px-3 py-1.5 text-xs hover:bg-accent">
                      <Mail className="h-3.5 w-3.5" /> {persona.mail}
                    </a>
                  )}
                  {persona.wsp && (
                    <a
                      href={`https://wa.me/${persona.wsp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-input px-3 py-1.5 text-xs hover:bg-accent"
                    >
                      <Phone className="h-3.5 w-3.5" /> {persona.wsp}
                    </a>
                  )}
                </div>
                <Datos
                  filas={[
                    ["Nombre y apellido", persona.nombre],
                    ["Grupo", persona.grupo],
                    ["Obra social / mutual", persona.obra_social],
                    ["N° afiliado", persona.n_afiliado],
                    ["Responsable", persona.responsable],
                    ["Mail", persona.mail],
                    ["WhatsApp", persona.wsp],
                    ["Alta", formatFecha(persona.created_at?.slice(0, 10))],
                    ...(!persona.activo
                      ? ([["Baja", `${formatFecha(persona.fecha_baja)} · ${persona.motivo_baja || "sin motivo"}`]] as [string, string][])
                      : []),
                  ]}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setEditando(true)}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
                  >
                    <Pencil className="h-4 w-4" /> Editar ficha
                  </button>
                  {persona.activo ? (
                    <button
                      onClick={() => {
                        const motivo = window.prompt("Motivo de la baja:") ?? "";
                        guardar.mutate({ activo: false, fecha_baja: hoy, motivo_baja: motivo });
                      }}
                      className="inline-flex h-10 items-center gap-2 rounded-lg border border-input px-4 text-sm font-medium hover:bg-accent"
                    >
                      <UserMinus className="h-4 w-4" /> Dar de baja
                    </button>
                  ) : (
                    <button
                      onClick={() => guardar.mutate({ activo: true, fecha_baja: null, motivo_baja: "" })}
                      className="inline-flex h-10 items-center gap-2 rounded-lg border border-input px-4 text-sm font-medium hover:bg-accent"
                    >
                      <UserCheck className="h-4 w-4" /> Reactivar
                    </button>
                  )}
                </div>
              </div>
            ))}

          {/* ---------- Prestaciones ---------- */}
          {tab === "prestaciones" && (
            <div className="space-y-4">
              <Datos
                filas={[
                  ["Tipo", persona.tipo === "transporte" ? "Transporte" : "Prestación"],
                  ["Prestación", persona.prestacion],
                  ["Días por semana", persona.dias_x_semana],
                  ["Días específicos", persona.dias_especificos],
                  ["Horarios", persona.horarios],
                  ["Grupo", persona.grupo],
                ]}
              />
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Circuito de planilla (últimos meses)
                </p>
                {misPlanillas.length === 0 ? (
                  <EmptyState icon={ClipboardList} title="Sin planillas cargadas" hint="Marcá los estados desde Prestaciones o Transporte." />
                ) : (
                  <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                    {misPlanillas.map((pl) => (
                      <li key={pl.id} className="flex items-center gap-3 px-4 py-3">
                        <span className="w-28 shrink-0 text-sm font-medium">{nombreMes(pl.mes)}</span>
                        <div className="flex flex-wrap gap-1.5">
                          {ESTADOS_PLANILLA.map((e) => (
                            <Chip key={e.key} tone={pl.estados?.[e.key] ? "success" : "muted"}>
                              {e.label}
                            </Chip>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* ---------- Calendario ---------- */}
          {tab === "calendario" && (
            misEventos.length === 0 ? (
              <EmptyState icon={CalendarDays} title="Sin eventos" hint="Asociá fechas a esta persona desde el Calendario." />
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                {misEventos.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-xs font-bold text-accent-foreground">
                      {e.fecha.slice(8, 10)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{e.titulo}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatFecha(e.fecha)} {e.hora && `· ${e.hora}`} · {e.categoria}
                      </p>
                    </div>
                    <Chip tone={e.fecha >= hoy ? "info" : "muted"}>{e.fecha >= hoy ? "Próximo" : "Pasado"}</Chip>
                  </li>
                ))}
              </ul>
            )
          )}

          {/* ---------- Documentación ---------- */}
          {tab === "documentacion" && <div className="mb-4"><ChecklistRequisitos persona={persona} docs={misDocs} /></div>}
          {tab === "documentacion" &&

            (misDocs.length === 0 ? (
              <EmptyState icon={FileText} title="Sin documentos" hint="Subí documentación desde la sección Documentación." />
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                {misDocs.map((d) => {
                  const dias = diasHasta(d.vencimiento);
                  return (
                    <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{d.nombre}</p>
                        <p className="text-xs text-muted-foreground">Vence: {formatFecha(d.vencimiento)}</p>
                      </div>
                      {dias !== null && (
                        <Chip tone={dias < 0 ? "danger" : dias <= 30 ? "warning" : "success"}>
                          {dias < 0 ? "Vencido" : `${dias} d`}
                        </Chip>
                      )}
                      <Chip tone="muted">{d.tipo}</Chip>
                    </li>
                  );
                })}
              </ul>
            ))}

          {/* ---------- Historial ---------- */}
          {tab === "historial" &&
            (miHistorial.length === 0 ? (
              <EmptyState icon={Clock} title="Sin historial" hint="Las acciones sobre esta ficha se registran automáticamente." />
            ) : (
              <ul className="space-y-3">
                {miHistorial.map((h) => (
                  <li key={h.id} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0">
                      <p className="text-sm">{h.detalle || h.accion}</p>
                      <p className="text-xs text-muted-foreground">{tiempoRelativo(h.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ))}

          {/* ---------- Observaciones ---------- */}
          {tab === "observaciones" && (
            <div className="space-y-4">
              <Campo label="Notas">
                <textarea
                  rows={4}
                  value={obs.notas}
                  onChange={(e) => setObs((o) => ({ ...o, notas: e.target.value }))}
                  className={cn(field, "h-auto py-2")}
                />
              </Campo>
              <Campo label="Observaciones">
                <textarea
                  rows={8}
                  value={obs.observaciones}
                  onChange={(e) => setObs((o) => ({ ...o, observaciones: e.target.value }))}
                  className={cn(field, "h-auto py-2")}
                />
              </Campo>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setObs({ notas: persona.notas || "", observaciones: persona.observaciones || "" })}
                  className="h-10 rounded-lg border border-input px-4 text-sm font-medium hover:bg-accent"
                >
                  Descartar
                </button>
                <button
                  disabled={guardar.isPending}
                  onClick={() => guardar.mutate(obs)}
                  className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  Guardar observaciones
                </button>
              </div>
            </div>
          )}

          {/* ---------- Documento maestro ---------- */}
          {tab === "maestro" && <DocumentoMaestro persona={persona} />}


          {/* ---------- Facturación ---------- */}
          {tab === "facturacion" && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">Total facturado</p>
                  <p className="text-lg font-bold">{moneda(totalFacturado)}</p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">Cobrado</p>
                  <p className="text-lg font-bold">{moneda(totalCobrado)}</p>
                </div>
              </div>
              {misFacturas.length === 0 ? (
                <EmptyState icon={Receipt} title="Sin registros" hint="Cargá los montos desde la sección Facturación." />
              ) : (
                <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                  {misFacturas.map((f) => (
                    <li key={f.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{nombreMes(f.mes)}</p>
                        {f.notas && <p className="truncate text-xs text-muted-foreground">{f.notas}</p>}
                      </div>
                      <span className="text-sm font-semibold">{moneda(Number(f.monto || 0))}</span>
                      <Chip tone={f.estado === "cobrado" ? "success" : "warning"}>{f.estado}</Chip>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ConcurrentesPage() {
  const qc = useQueryClient();
  const { id } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<"activos" | "bajas" | "todos">("activos");
  const [tipo, setTipo] = useState<"todos" | "prestacion" | "transporte">("todos");
  const [nuevo, setNuevo] = useState(false);
  const [importar, setImportar] = useState(false);


  const { data: personas = [], isLoading } = useQuery({ queryKey: ["concurrentes"], queryFn: fetchConcurrentes });
  const { data: catalogos = {} } = useQuery({ queryKey: ["catalogos"], queryFn: fetchCatalogos });

  const crear = useMutation({
    mutationFn: createConcurrente,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["concurrentes"] });
      qc.invalidateQueries({ queryKey: ["historial"] });
      setNuevo(false);
      toast.success("Concurrente agregado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const borrar = useMutation({
    mutationFn: ({ id, nombre }: { id: string; nombre: string }) => deleteConcurrente(id, nombre),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["concurrentes"] });
      qc.invalidateQueries({ queryKey: ["historial"] });
      toast.success("Concurrente eliminado");
    },
  });

  const lista = useMemo(
    () =>
      personas
        .filter((p) => (filtro === "todos" ? true : filtro === "activos" ? p.activo : !p.activo))
        .filter((p) => (tipo === "todos" ? true : p.tipo === tipo))
        .filter((p) =>
          q.trim()
            ? `${p.nombre} ${p.obra_social} ${p.prestacion} ${p.responsable} ${p.n_afiliado}`
                .toLowerCase()
                .includes(q.toLowerCase())
            : true,
        ),
    [personas, filtro, tipo, q],
  );

  const seleccionada = personas.find((p) => p.id === id);

  function exportar() {
    const ws = XLSX.utils.json_to_sheet(
      lista.map((p) => ({
        Nombre: p.nombre,
        Estado: p.activo ? "Activo" : "Baja",
        Tipo: p.tipo,
        Grupo: p.grupo,
        Prestación: p.prestacion,
        "Obra social": p.obra_social,
        "N° afiliado": p.n_afiliado,
        Días: p.dias_x_semana,
        Horarios: p.horarios,
        Responsable: p.responsable,
        Mail: p.mail,
        WhatsApp: p.wsp,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Concurrentes");
    XLSX.writeFile(wb, "concurrentes.xlsx");
  }

  return (
    <AppShell title="Concurrentes" description={`${lista.length} de ${personas.length} registros`}>
      <div className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, obra social, afiliado o responsable…"
              className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)} className={cn(field, "w-auto")}>
              <option value="activos">Activos</option>
              <option value="bajas">Bajas</option>
              <option value="todos">Todos</option>
            </select>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)} className={cn(field, "w-auto")}>
              <option value="todos">Todo tipo</option>
              <option value="prestacion">Prestación</option>
              <option value="transporte">Transporte</option>
            </select>
            <button onClick={exportar} className="inline-flex h-10 items-center gap-2 rounded-lg border border-input px-3 text-sm font-medium hover:bg-accent">
              <Download className="h-4 w-4" />
            </button>
            <button
              onClick={() => setImportar(true)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-input px-3 text-sm font-medium hover:bg-accent"
            >
              Importar Excel
            </button>
            <ImportarExcel abierto={importar} onClose={() => setImportar(false)} existentes={personas} />


            <button
              onClick={() => setNuevo(true)}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              <Plus className="h-4 w-4" /> Nuevo
            </button>
          </div>
        </div>

        {nuevo && (
          <Panel title="Nuevo concurrente">
            <div className="p-4">
              <FormConcurrente catalogos={catalogos} onCancel={() => setNuevo(false)} onSave={(v) => crear.mutate(v)} />
            </div>
          </Panel>
        )}

        <Panel title="Listado">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : lista.length === 0 ? (
            <EmptyState icon={Users} title="Sin concurrentes" hint="Cambiá los filtros o agregá uno nuevo." />
          ) : (
            <ul className="divide-y divide-border">
              {lista.map((p) => (
                <li key={p.id} className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 hover:bg-accent/40">
                  <button
                    onClick={() => navigate({ search: { id: p.id } })}
                    className="flex min-w-0 items-center gap-3 text-left"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                      {iniciales(p.nombre)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{p.nombre}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[p.prestacion, p.obra_social, p.horarios].filter(Boolean).join(" · ") || "Sin datos"}
                      </span>
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    <Chip tone={p.tipo === "transporte" ? "warning" : "info"}>
                      {p.tipo === "transporte" ? "Transporte" : "Prestación"}
                    </Chip>
                    {!p.activo && <Chip tone="danger">Baja</Chip>}
                    <button
                      onClick={() => {
                        if (window.confirm(`¿Eliminar definitivamente a ${p.nombre}?`)) borrar.mutate({ id: p.id, nombre: p.nombre });
                      }}
                      className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      aria-label="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {seleccionada && <Ficha persona={seleccionada} onClose={() => navigate({ search: { id: "" } })} />}
    </AppShell>
  );
}
