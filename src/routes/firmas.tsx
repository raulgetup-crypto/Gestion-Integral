import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { PenLine, Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, EmptyState, Chip, StatCard } from "@/components/ui-kit";
import { campo, Segmentado } from "@/components/forms";
import { Exportar } from "@/components/Exportar";
import { fetchConcurrentes, fetchPlanilla, updateConcurrente, LUGARES_FIRMA } from "@/lib/api";
import { usePermisos } from "@/hooks/use-permisos";
import { mesActual, nombreMes } from "@/lib/format";

export const Route = createFileRoute("/firmas")({
  head: () => ({
    meta: [
      { title: "Firmas — Centro de Día" },
      {
        name: "description",
        content: "Listado filtrable de concurrentes por lugar de firma: Kalen, Banda Norte, domicilio u otro.",
      },
      { property: "og:title", content: "Firmas — Centro de Día" },
      { property: "og:description", content: "Control de planillas pendientes de firma por lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FirmasPage,
});

const FILTROS = [{ value: "Todos", label: "Todos" }, ...LUGARES_FIRMA.map((l) => ({ value: l, label: l }))];

function FirmasPage() {
  const qc = useQueryClient();
  const { puedeEditar } = usePermisos();
  const [lugar, setLugar] = useState("Banda Norte");
  const [soloPendientes, setSoloPendientes] = useState(true);
  const [q, setQ] = useState("");
  const mes = mesActual();

  const { data: personas = [] } = useQuery({ queryKey: ["concurrentes"], queryFn: fetchConcurrentes });
  const { data: planilla = [] } = useQuery({ queryKey: ["planilla", mes], queryFn: () => fetchPlanilla(mes) });

  const cambiarLugar = useMutation({
    mutationFn: ({ id, valor }: { id: string; valor: string }) => updateConcurrente(id, { lugar_firma: valor }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["concurrentes"] });
      qc.invalidateQueries({ queryKey: ["historial"] });
    },
    onError: (e: Error) => toast.error(`No se pudo actualizar: ${e.message}`),
  });

  const firmado = (id: string) => Boolean(planilla.find((p) => p.concurrente_id === id)?.estados?.["firmado"]);

  const lista = useMemo(() => {
    const texto = q.trim().toLowerCase();
    return personas
      .filter((p) => p.activo)
      .filter((p) => (lugar === "Todos" ? true : (p.lugar_firma || "Kalen") === lugar))
      .filter((p) => (soloPendientes ? !firmado(p.id) : true))
      .filter((p) => (texto ? `${p.nombre} ${p.obra_social}`.toLowerCase().includes(texto) : true));
  }, [personas, planilla, lugar, soloPendientes, q]);

  const enBandaNorte = personas.filter((p) => p.activo && p.lugar_firma === "Banda Norte");

  return (
    <AppShell title="Firmas" description={`Lugar de firma y pendientes de ${nombreMes(mes)}`}>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={PenLine} label="Banda Norte" value={enBandaNorte.length} tone="info" />
        <StatCard
          icon={PenLine}
          label="Pendientes en Banda Norte"
          value={enBandaNorte.filter((p) => !firmado(p.id)).length}
          tone="warning"
        />
        <StatCard icon={PenLine} label="Firmadas del mes" value={personas.filter((p) => p.activo && firmado(p.id)).length} tone="success" />
      </div>

      <div className="mt-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <Segmentado valor={lugar} opciones={FILTROS} onChange={setLugar} className="flex-wrap" />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={soloPendientes}
              onChange={(e) => setSoloPendientes(e.target.checked)}
            />
            Solo pendientes de firma
          </label>
        </div>

        <Panel
          title={`${lista.length} concurrentes`}
          action={
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar…"
                  className="h-8 w-32 rounded-lg border border-input bg-card pl-7 pr-2 text-xs sm:w-44"
                />
              </div>
              <Exportar
                filas={lista.map((p) => ({
                  Concurrente: p.nombre,
                  "Obra social": p.obra_social,
                  Prestación: p.prestacion,
                  "Lugar de firma": p.lugar_firma || "Kalen",
                  Firmada: firmado(p.id) ? "SÍ" : "NO",
                }))}
                nombre={`firmas-${lugar.toLowerCase().replace(/\s+/g, "-")}`}
                titulo={`Firmas · ${lugar}`}
              />
            </div>
          }
        >
          {lista.length === 0 ? (
            <EmptyState icon={PenLine} title="Sin resultados" hint="Ajustá los filtros o el lugar de firma." />
          ) : (
            <ul className="divide-y divide-border">
              {lista.map((p) => (
                <li key={p.id} className="grid gap-2 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.nombre}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.obra_social || "Sin obra social"} · {p.prestacion || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Chip tone={firmado(p.id) ? "success" : "warning"}>{firmado(p.id) ? "Firmada" : "Pendiente"}</Chip>
                    <select
                      className={`${campo} h-8 w-36 text-xs`}
                      value={p.lugar_firma || "Kalen"}
                      onChange={(e) => cambiarLugar.mutate({ id: p.id, valor: e.target.value })}
                      aria-label={`Lugar de firma de ${p.nombre}`}
                      disabled={!puedeEditar}
                    >
                      {LUGARES_FIRMA.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
