import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Search, Check } from "lucide-react";
import { toast } from "sonner";
import { fetchConcurrentes, fetchPlanilla, upsertPlanilla, ESTADOS_PLANILLA, logHistorial, type PlanillaEstado } from "@/lib/api";
import { mesActual, nombreMes } from "@/lib/format";
import { Panel, Chip, EmptyState } from "@/components/ui-kit";
import { Exportar } from "@/components/Exportar";
import type { Fila } from "@/lib/export";
import { cn } from "@/lib/utils";

export function PlanillaMensual({ tipo }: { tipo: "prestacion" | "transporte" }) {
  const qc = useQueryClient();
  const [mes, setMes] = useState(mesActual());
  const [q, setQ] = useState("");

  const { data: personas = [] } = useQuery({ queryKey: ["concurrentes"], queryFn: fetchConcurrentes });
  const { data: planilla = [] } = useQuery({ queryKey: ["planilla", mes], queryFn: () => fetchPlanilla(mes) });

  const estadoPorId = useMemo(() => {
    const map: Record<string, Record<string, boolean>> = {};
    for (const p of planilla) map[p.concurrente_id] = p.estados || {};
    return map;
  }, [planilla]);

  const lista = personas
    .filter((p) => p.activo && p.tipo === tipo)
    .filter((p) =>
      q.trim()
        ? `${p.nombre} ${p.obra_social} ${p.prestacion} ${p.responsable}`.toLowerCase().includes(q.toLowerCase())
        : true,
    );

  // Escritura segura: la fuente de verdad es la caché (no el render), se aplica
  // optimísticamente y se revierte si el backend falla. Evita que clics rápidos
  // pisen cambios previos con datos viejos.
  const toggle = useMutation({
    onMutate: async ({ id, key }: { id: string; key: string; nombre: string }) => {
      await qc.cancelQueries({ queryKey: ["planilla", mes] });
      const previo = qc.getQueryData<PlanillaEstado[]>(["planilla", mes]) ?? [];
      const fila = previo.find((p) => p.concurrente_id === id);
      const next = { ...(fila?.estados ?? {}), [key]: !(fila?.estados?.[key] ?? false) };
      qc.setQueryData<PlanillaEstado[]>(["planilla", mes], (old = []) =>
        fila
          ? old.map((p) => (p.concurrente_id === id ? { ...p, estados: next } : p))
          : [...old, { id: `tmp-${id}`, concurrente_id: id, mes, estados: next }],
      );
      return { previo, next, marcado: next[key] };
    },
    mutationFn: async ({ id }: { id: string; key: string; nombre: string }) => {
      const fila = (qc.getQueryData<PlanillaEstado[]>(["planilla", mes]) ?? []).find(
        (p) => p.concurrente_id === id,
      );
      await upsertPlanilla(id, mes, fila?.estados ?? {});
    },
    onSuccess: async (_d, vars, ctx) => {
      await logHistorial({
        entidad: "planilla",
        accion: ctx.marcado ? "marcado" : "desmarcado",
        detalle: `${vars.nombre}: ${vars.key} ${ctx.marcado ? "marcado" : "desmarcado"} (${nombreMes(mes)})`,
        concurrente_id: vars.id,
      }).catch(() => undefined);
      qc.invalidateQueries({ queryKey: ["historial"] });
    },
    onError: (e: Error, _vars, ctx) => {
      if (ctx?.previo) qc.setQueryData(["planilla", mes], ctx.previo);
      toast.error(`No se pudo guardar: ${e.message}`);
    },
    onSettled: () => {
      if (!toggle.isPending) qc.invalidateQueries({ queryKey: ["planilla", mes] });
    },
  });

  // Filas exportables: respetan el mes y la búsqueda activa.
  const filasExport: Fila[] = lista.map((p) => {
    const st = estadoPorId[p.id] || {};
    const base: Fila = {
      Nombre: p.nombre,
      Grupo: p.grupo,
      Prestación: p.prestacion,
      "Obra social": p.obra_social,
      "N° afiliado": p.n_afiliado,
      "Días x semana": p.dias_x_semana,
      Horarios: p.horarios,
      Responsable: p.responsable,
      "Lugar de firma": p.lugar_firma ?? "",
    };
    for (const e of ESTADOS_PLANILLA) base[e.full] = st[e.key] ? "SÍ" : "";
    return base;
  });

  const resumen = ESTADOS_PLANILLA.map((e) => ({
    ...e,
    total: lista.filter((p) => estadoPorId[p.id]?.[e.key]).length,
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
        <input
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="h-10 rounded-lg border border-input bg-card px-3 text-sm"
        />
        <div className="relative min-w-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, obra social o responsable…"
            className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm"
          />
        </div>
        <button
          onClick={exportar}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Download className="h-4 w-4" /> Exportar Excel
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {resumen.map((r) => (
          <div key={r.key} className="card-soft px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{r.full}</p>
            <p className="mt-1 text-xl font-bold">
              {r.total}
              <span className="ml-1 text-sm font-medium text-muted-foreground">/ {lista.length}</span>
            </p>
          </div>
        ))}
      </div>

      <Panel
        title={`${lista.length} registros · ${nombreMes(mes)}`}
        action={<Chip tone="muted">Guardado automático</Chip>}
      >
        {lista.length === 0 ? (
          <EmptyState icon={Search} title="Sin resultados" hint="Ajustá la búsqueda o agregá concurrentes." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Concurrente</th>
                  <th className="px-3 py-2.5 font-medium">Prestación</th>
                  <th className="px-3 py-2.5 font-medium">Obra social</th>
                  {ESTADOS_PLANILLA.map((e) => (
                    <th key={e.key} className="px-2 py-2.5 text-center font-medium" title={e.full}>
                      {e.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lista.map((p) => {
                  const st = estadoPorId[p.id] || {};
                  return (
                    <tr key={p.id} className="hover:bg-accent/40">
                      <td className="px-4 py-2.5">
                        <p className="font-medium">{p.nombre}</p>
                        <p className="text-xs text-muted-foreground">{p.responsable || "Sin responsable"}</p>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{p.prestacion || "—"}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{p.obra_social || "—"}</td>
                      {ESTADOS_PLANILLA.map((e) => (
                        <td key={e.key} className="px-2 py-2.5 text-center">
                          <button
                            onClick={() => toggle.mutate({ id: p.id, key: e.key, nombre: p.nombre })}
                            aria-label={`${e.full} de ${p.nombre}`}
                            className={cn(
                              "grid h-7 w-7 place-items-center rounded-md border transition-colors",
                              st[e.key]
                                ? "border-success bg-success text-success-foreground"
                                : "border-border bg-card hover:bg-accent",
                            )}
                          >
                            {st[e.key] && <Check className="h-4 w-4" />}
                          </button>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
