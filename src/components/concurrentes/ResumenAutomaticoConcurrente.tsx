import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles, UtensilsCrossed } from "lucide-react";
import { Panel, Chip } from "@/components/ui-kit";
import {
  reglasPlanillaApi,
  fetchPrestacionesDe,
  actualizarComeViandas,
  type Concurrente,
} from "@/lib/api";
import { planillasDe } from "@/lib/planillas-reglas";
import { usePermisos } from "@/hooks/use-permisos";

/**
 * No guarda nada nuevo por su cuenta: lee las reglas de planilla ya cargadas en
 * Configuración y las prestaciones activas del concurrente, y muestra qué le
 * corresponde. El único dato que sí se guarda es el toggle de viandas.
 */
export function ResumenAutomaticoConcurrente({ concurrente }: { concurrente: Concurrente }) {
  const qc = useQueryClient();
  const { puedeEditar } = usePermisos();

  const { data: reglas = [] } = useQuery({ queryKey: ["reglas-planilla"], queryFn: reglasPlanillaApi.list });
  const { data: prestaciones = [] } = useQuery({
    queryKey: ["prestaciones", concurrente.id],
    queryFn: () => fetchPrestacionesDe(concurrente.id),
  });

  const sugeridas = useMemo(
    () => planillasDe(concurrente, prestaciones, reglas.filter((r) => r.activa)),
    [concurrente, prestaciones, reglas],
  );

  const viandas = useMutation({
    mutationFn: (valor: boolean) => actualizarComeViandas(concurrente.id, valor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["concurrentes"] });
      toast.success("Actualizado");
    },
    onError: (e: Error) => toast.error(`No se pudo actualizar: ${e.message}`),
  });

  const soloGeneral = sugeridas.length === 1 && sugeridas[0].tipo === "general";

  return (
    <Panel title="Resumen automático">
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" /> Calculado automáticamente a partir de la prestación y la mutual
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Planillas que corresponden
          </p>
          {soloGeneral ? (
            <p className="text-sm text-muted-foreground">
              Sin reglas específicas cargadas todavía para esta prestación/mutual — cargalas en
              Configuración → Reglas de planilla.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {sugeridas.map((s) => (
                <Chip key={s.tipo} tone="info">
                  {s.tipo} · {s.prestacion} ({s.modo})
                </Chip>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="inline-flex items-center gap-1.5 text-sm">
            <UtensilsCrossed className="h-4 w-4 text-muted-foreground" /> Consume viandas
          </span>
          <button
            disabled={!puedeEditar || viandas.isPending}
            onClick={() => viandas.mutate(!concurrente.come_viandas)}
            className="disabled:opacity-50"
          >
            <Chip tone={concurrente.come_viandas ? "success" : "muted"}>
              {concurrente.come_viandas ? "Sí" : "No"}
            </Chip>
          </button>
        </div>
      </div>
    </Panel>
  );
}

