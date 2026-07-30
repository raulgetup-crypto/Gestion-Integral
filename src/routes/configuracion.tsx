import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Plus, X, Settings as SettingsIcon, Moon, Sun, Activity } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, Chip, EmptyState } from "@/components/ui-kit";
import { fetchCatalogos, addCatalogo, removeCatalogo, fetchHistorial } from "@/lib/api";
import { tiempoRelativo } from "@/lib/format";
import { useTheme } from "@/components/theme-provider";

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

function CatalogoEditor({ tipo, label, valores }: { tipo: string; label: string; valores: string[] }) {
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
        <div className="flex flex-wrap gap-2">
          {valores.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
              {v}
              <button onClick={() => quitar.mutate(v)} className="text-muted-foreground hover:text-destructive" aria-label={`Quitar ${v}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {valores.length === 0 && <p className="text-xs text-muted-foreground">Sin valores cargados.</p>}
        </div>
      </div>
    </Panel>
  );
}

function ConfiguracionPage() {
  const { theme, toggle } = useTheme();
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
          <CatalogoEditor key={s.key} tipo={s.key} label={s.label} valores={catalogos[s.key] || []} />
        ))}
      </div>

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
