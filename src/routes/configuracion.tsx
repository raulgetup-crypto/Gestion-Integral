import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Plus, X, Settings as SettingsIcon, Moon, Sun, Activity, Pencil, Trash2, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, Chip, EmptyState } from "@/components/ui-kit";
import { Modal, campo, areaTexto, botonPrimario, botonSecundario, Etiqueta } from "@/components/forms";
import { fetchCatalogos, addCatalogo, removeCatalogo, fetchHistorial, reglasPlanillaApi, type ReglaPlanilla } from "@/lib/api";
import { tiempoRelativo } from "@/lib/format";
import { useTheme } from "@/components/theme-provider";
import { usePermisos } from "@/hooks/use-permisos";

export const Route = createFileRoute("/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración — Centro de Día" },
      {
        name: "description",
        content: "Catálogos de prestaciones, obras sociales y responsables, apariencia del sistema e historial completo.",
      },
      { property: "og:title", content: "Configuración — Centro de Día" },
      { property: "og:description", content: "Personalizá catálogos, tema y revisá el historial de acciones." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConfiguracionPage,
});

const SECCIONES = [
  { key: "prestaciones", label: "Prestaciones" },
  { key: "mutuales", label: "Obras sociales / mutuales" },
  { key: "responsables", label: "Responsables" },
];

function CatalogoEditor({
  tipo,
  label,
  valores,
  esAdmin,
}: {
  tipo: string;
  label: string;
  valores: string[];
  esAdmin: boolean;
}) {
  const qc = useQueryClient();
  const [valor, setValor] = useState("");

  const agregar = useMutation({
    mutationFn: () => addCatalogo(tipo, valor.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalogos"] });
      setValor("");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const quitar = useMutation({
    mutationFn: (v: string) => removeCatalogo(tipo, v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogos"] }),
  });

  return (
    <Panel title={label} action={<Chip tone="muted">{valores.length}</Chip>}>
      <div className="space-y-3 p-4">
        {esAdmin && (
          <div className="flex gap-2">
            <input
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && valor.trim() && agregar.mutate()}
              placeholder="Agregar valor…"
              className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
            />
            <button
              disabled={!valor.trim()}
              onClick={() => agregar.mutate()}
              className="inline-flex h-10 shrink-0 items-center gap-1 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {valores.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
              {v}
              {esAdmin && (
                <button onClick={() => quitar.mutate(v)} className="text-muted-foreground hover:text-destructive" aria-label={`Quitar ${v}`}>
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
          {valores.length === 0 && <p className="text-xs text-muted-foreground">Sin valores cargados.</p>}
        </div>
      </div>
    </Panel>
  );
}

const MODOS_FACTURACION = ["", "horas", "modulo"] as const;
const MODO_LABEL: Record<string, string> = { "": "Cualquiera", horas: "Por horas", modulo: "Por módulo" };

function reglaVacia(): Partial<ReglaPlanilla> {
  return {
    nombre: "",
    prestacion: "",
    mutual: "",
    modo_facturacion: "",
    tipo_planilla: "",
    prioridad: 10,
    activa: true,
    observaciones: "",
  };
}

/**
 * Gestión de reglas de planilla (qué planilla corresponde según prestación + mutual
 * + modo de facturación). El motor que las aplica ya existe en src/lib/planillas-reglas.ts;
 * esto es únicamente la pantalla para cargarlas sin necesitar SQL. Campo vacío = comodín
 * (aplica a cualquier valor), tal como ya lo interpreta el motor.
 */
function ReglasPlanillaEditor({ esAdmin }: { esAdmin: boolean }) {
  const qc = useQueryClient();
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<ReglaPlanilla | null>(null);
  const [form, setForm] = useState<Partial<ReglaPlanilla>>(reglaVacia());

  const { data: reglas = [] } = useQuery({ queryKey: ["reglas-planilla"], queryFn: reglasPlanillaApi.list });

  const refrescar = () => qc.invalidateQueries({ queryKey: ["reglas-planilla"] });

  const guardar = useMutation({
    mutationFn: () =>
      editando ? reglasPlanillaApi.update(editando.id, form) : reglasPlanillaApi.create(form),
    onSuccess: () => {
      refrescar();
      toast.success(editando ? "Regla actualizada" : "Regla creada");
      cerrar();
    },
    onError: (e: Error) => toast.error(`No se pudo guardar: ${e.message}`),
  });

  const borrar = useMutation({
    mutationFn: (r: ReglaPlanilla) => reglasPlanillaApi.remove(r.id, `la regla "${r.nombre}"`),
    onSuccess: () => {
      refrescar();
      toast.success("Regla eliminada");
    },
    onError: (e: Error) => toast.error(`No se pudo eliminar: ${e.message}`),
  });

  function nueva() {
    setEditando(null);
    setForm(reglaVacia());
    setAbierto(true);
  }
  function editar(r: ReglaPlanilla) {
    setEditando(r);
    setForm({ ...r });
    setAbierto(true);
  }
  function cerrar() {
    setAbierto(false);
    setEditando(null);
  }

  return (
    <Panel
      title="Reglas de planilla"
      className="mt-4"
      action={
        esAdmin && (
          <button onClick={nueva} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground">
            <Plus className="h-3.5 w-3.5" /> Nueva regla
          </button>
        )
      }
    >
      <p className="px-4 pt-3 text-xs text-muted-foreground">
        Define qué planilla corresponde según prestación + mutual + modo de facturación. Dejar
        un campo vacío significa "cualquiera" (comodín). La prioridad más baja se evalúa primero.
      </p>

      {reglas.length === 0 ? (
        <EmptyState icon={ListChecks} title="Sin reglas cargadas" hint="Agregá la primera con «Nueva regla»." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Nombre</th>
                <th className="px-3 py-2 font-medium">Prestación</th>
                <th className="px-3 py-2 font-medium">Mutual</th>
                <th className="px-3 py-2 font-medium">Modo</th>
                <th className="px-3 py-2 font-medium">Tipo de planilla</th>
                <th className="px-3 py-2 font-medium">Prioridad</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reglas.map((r) => (
                <tr key={r.id} className="hover:bg-accent/40">
                  <td className="px-3 py-2 font-medium">
                    {r.nombre} {!r.activa && <Chip tone="muted">Inactiva</Chip>}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{r.prestacion || "Cualquiera"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.mutual || "Cualquiera"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{MODO_LABEL[r.modo_facturacion] ?? r.modo_facturacion}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.tipo_planilla}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.prioridad}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {esAdmin && (
                      <>
                        <button onClick={() => editar(r)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent" aria-label="Editar">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => window.confirm(`¿Eliminar la regla "${r.nombre}"?`) && borrar.mutate(r)}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {abierto && (
        <Modal
          abierto={abierto}
          onClose={cerrar}
          titulo={editando ? "Editar regla" : "Nueva regla"}
          footer={
            <>
              <button className={botonSecundario} onClick={cerrar}>
                Cancelar
              </button>
              <button className={botonPrimario} onClick={() => guardar.mutate()} disabled={!form.nombre?.trim() || guardar.isPending}>
                {guardar.isPending ? "Guardando…" : "Guardar"}
              </button>
            </>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <Etiqueta>Nombre</Etiqueta>
              <input className={campo} value={form.nombre ?? ""} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} />
            </label>
            <label>
              <Etiqueta hint="Vacío = cualquiera">Prestación</Etiqueta>
              <input className={campo} value={form.prestacion ?? ""} onChange={(e) => setForm((f) => ({ ...f, prestacion: e.target.value }))} />
            </label>
            <label>
              <Etiqueta hint="Vacío = cualquiera">Mutual</Etiqueta>
              <input className={campo} value={form.mutual ?? ""} onChange={(e) => setForm((f) => ({ ...f, mutual: e.target.value }))} />
            </label>
            <label>
              <Etiqueta>Modo de facturación</Etiqueta>
              <select
                className={campo}
                value={form.modo_facturacion ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, modo_facturacion: e.target.value }))}
              >
                {MODOS_FACTURACION.map((m) => (
                  <option key={m} value={m}>
                    {MODO_LABEL[m]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <Etiqueta>Tipo de planilla</Etiqueta>
              <input
                className={campo}
                placeholder="ej: ie_mail, cd_cet, transporte, otras_mutuales"
                value={form.tipo_planilla ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, tipo_planilla: e.target.value }))}
              />
            </label>
            <label>
              <Etiqueta hint="Menor número = mayor prioridad">Prioridad</Etiqueta>
              <input
                type="number"
                className={campo}
                value={form.prioridad ?? 10}
                onChange={(e) => setForm((f) => ({ ...f, prioridad: Number(e.target.value) }))}
              />
            </label>
            <label>
              <Etiqueta>Estado</Etiqueta>
              <select
                className={campo}
                value={form.activa ? "si" : "no"}
                onChange={(e) => setForm((f) => ({ ...f, activa: e.target.value === "si" }))}
              >
                <option value="si">Activa</option>
                <option value="no">Inactiva</option>
              </select>
            </label>
            <label className="sm:col-span-2">
              <Etiqueta>Observaciones</Etiqueta>
              <textarea
                className={areaTexto}
                rows={3}
                value={form.observaciones ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
              />
            </label>
          </div>
        </Modal>
      )}
    </Panel>
  );
}

function ConfiguracionPage() {
  const { theme, toggle } = useTheme();
  const { esAdmin } = usePermisos();
  const { data: catalogos = {} } = useQuery({ queryKey: ["catalogos"], queryFn: fetchCatalogos });
  const { data: historial = [] } = useQuery({ queryKey: ["historial-full"], queryFn: () => fetchHistorial(100) });

  return (
    <AppShell title="Configuración" description="Catálogos, apariencia e historial del sistema">
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Apariencia">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">Modo {theme === "dark" ? "oscuro" : "claro"}</p>
              <p className="text-xs text-muted-foreground">La preferencia se guarda en este dispositivo.</p>
            </div>
            <button onClick={toggle} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-input px-4 text-sm font-medium hover:bg-accent">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} Cambiar
            </button>
          </div>
        </Panel>

        <Panel title="Sistema">
          <div className="space-y-2 p-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <SettingsIcon className="h-4 w-4" /> Datos guardados en la nube con sincronización automática.
            </div>
            <p className="text-xs text-muted-foreground">
              Atajo de búsqueda global: <kbd className="rounded border border-border bg-muted px-1.5 py-0.5">Ctrl/⌘ + K</kbd>
            </p>
          </div>
        </Panel>

        {SECCIONES.map((s) => (
          <CatalogoEditor key={s.key} tipo={s.key} label={s.label} valores={catalogos[s.key] || []} esAdmin={esAdmin} />
        ))}
      </div>

      <ReglasPlanillaEditor esAdmin={esAdmin} />

      <Panel title="Historial completo" className="mt-4">
        {historial.length === 0 ? (
          <EmptyState icon={Activity} title="Sin actividad" hint="Las acciones se registran automáticamente." />
        ) : (
          <ul className="max-h-[520px] divide-y divide-border overflow-y-auto">
            {historial.map((h) => (
              <li key={h.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm">{h.detalle || `${h.entidad}: ${h.accion}`}</p>
                  <p className="text-xs text-muted-foreground">{tiempoRelativo(h.created_at)}</p>
                </div>
                <Chip tone="muted">{h.entidad}</Chip>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </AppShell>
  );
}
