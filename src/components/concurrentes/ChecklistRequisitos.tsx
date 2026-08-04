import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, AlertTriangle } from "lucide-react";
import { fetchRequisitos, type Concurrente, type Documento } from "@/lib/api";
import { resumenDocumental } from "@/lib/requisitos";
import { Chip } from "@/components/ui-kit";
import { formatFecha } from "@/lib/format";

/** Checklist de documentación obligatoria según las prestaciones del concurrente. */
export function ChecklistRequisitos({ persona, docs }: { persona: Concurrente; docs: Documento[] }) {
  const { data: requisitos = [] } = useQuery({ queryKey: ["requisitos"], queryFn: fetchRequisitos });
  const resumen = resumenDocumental(persona, docs, requisitos);

  if (resumen.requisitos.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
        No hay requisitos definidos para “{persona.prestacion || "sin prestación"}”. Configurálos en Configuración.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone={resumen.completo ? "success" : "warning"}>
          {resumen.completo ? "Documentación completa" : "Documentación incompleta"}
        </Chip>
        {resumen.vencidos.length > 0 && <Chip tone="danger">{resumen.vencidos.length} vencidos</Chip>}
        {resumen.porVencer.length > 0 && <Chip tone="warning">{resumen.porVencer.length} por vencer</Chip>}
      </div>
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        {resumen.requisitos.map((r) => (
          <li key={r.documento} className="flex items-center gap-3 px-4 py-2.5">
            {r.vencido ? (
              <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
            ) : r.cargado ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className="min-w-0 flex-1 truncate text-sm">{r.documento}</span>
            {r.vencimiento && (
              <span className="shrink-0 text-xs text-muted-foreground">{formatFecha(r.vencimiento)}</span>
            )}
            <Chip tone={r.vencido ? "danger" : r.porVencer ? "warning" : r.cargado ? "success" : "muted"}>
              {r.vencido ? "Vencido" : r.porVencer ? "Por vencer" : r.cargado ? "OK" : "Falta"}
            </Chip>
          </li>
        ))}
      </ul>
    </div>
  );
}
