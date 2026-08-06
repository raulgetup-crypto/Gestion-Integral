import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  ClipboardList,
  PenLine,
  Clock,
  Bus,
  UtensilsCrossed,
  UserPlus,
  FileWarning,
  CheckCircle2,
} from "lucide-react";
import { Panel, Chip, EmptyState, StatCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { usePermisos } from "@/hooks/use-permisos";
import { useAlertas, type Alerta } from "@/hooks/use-alertas";
import { marcarRevisadas, ultimaRevision } from "@/lib/alertas-revisadas";

const tonoDe = (a: Alerta): "danger" | "warning" => (a.nivel === "rojo" ? "danger" : "warning");

function Fila({ a }: { a: Alerta }) {
  const contenido = (
    <>
      <span
        aria-hidden
        className={`h-2 w-2 shrink-0 rounded-full ${a.nivel === "rojo" ? "bg-destructive" : "bg-amber-500"}`}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{a.titulo}</p>
        <p className="truncate text-xs text-muted-foreground">{a.sub}</p>
      </div>
      <Chip tone={tonoDe(a)}>{a.chip}</Chip>
    </>
  );
  const clase = "flex items-center gap-3 px-4 py-3 hover:bg-accent/40";
  return (
    <li>
      {a.concurrenteId ? (
        <Link to="/vista-360" search={{ id: a.concurrenteId }} className={clase}>
          {contenido}
        </Link>
      ) : (
        <Link to={a.modulo ?? "/alertas"} className={clase}>
          {contenido}
        </Link>
      )}
    </li>
  );
}

function Bloque({
  titulo,
  icono: Icono,
  alertas,
  modulo,
}: {
  titulo: string;
  icono: typeof AlertTriangle;
  alertas: Alerta[];
  modulo?: string;
}) {
  const [verTodo, setVerTodo] = useState(false);
  const ordenadas = [...alertas].sort((a, b) => (a.nivel === b.nivel ? 0 : a.nivel === "rojo" ? -1 : 1));
  const visibles = verTodo ? ordenadas : ordenadas.slice(0, 6);
  return (
    <Panel
      title={`${titulo} · ${alertas.length}`}
      action={
        modulo ? (
          <Link to={modulo} className="text-xs font-medium text-primary hover:underline">
            Ir al módulo
          </Link>
        ) : undefined
      }
    >
      {alertas.length === 0 ? (
        <EmptyState icon={Icono} title="Sin pendientes" />
      ) : (
        <>
          <ul className="divide-y divide-border">
            {visibles.map((a) => (
              <Fila key={a.id} a={a} />
            ))}
          </ul>
          {alertas.length > 6 && (
            <button
              type="button"
              onClick={() => setVerTodo((v) => !v)}
              className="w-full border-t border-border px-4 py-2 text-xs font-medium text-primary hover:bg-accent/40"
            >
              {verTodo ? "Ver menos" : `Ver las ${alertas.length}`}
            </button>
          )}
        </>
      )}
    </Panel>
  );
}

export function CentroAlertas() {
  const { grupos, total, rojas, amarillas } = useAlertas();
  const { puedeEditar, usuarioId } = usePermisos();
  const qc = useQueryClient();

  const { data: revision } = useQuery({ queryKey: ["alertas-revisadas"], queryFn: () => ultimaRevision("todas") });

  const marcar = useMutation({
    mutationFn: () => marcarRevisadas({ usuarioId, observaciones: `${total} alerta(s) activas` }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alertas-revisadas"] });
      toast.success("Revisión registrada");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "No se pudo registrar la revisión"),
  });

  const fechaRevision = revision?.fecha_revision
    ? new Date(revision.fecha_revision).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {fechaRevision ? `Última revisión: ${fechaRevision}` : "Sin revisiones registradas"}
        </p>
        {puedeEditar && (
          <Button size="sm" variant="outline" disabled={marcar.isPending} onClick={() => marcar.mutate()}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Marcar todas como revisadas
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={AlertTriangle} label="Alertas totales" value={total} tone={total ? "warning" : "default"} />
        <StatCard icon={FileWarning} label="Críticas (rojo)" value={rojas} tone={rojas ? "danger" : "default"} />
        <StatCard icon={Clock} label="Por vencer (amarillo)" value={amarillas} tone="warning" />
        <StatCard
          icon={CheckCircle2}
          label="Comprobantes pendientes"
          value={grupos.ansesPendientes.length + grupos.viandasPendientes.length}
          tone="info"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Bloque titulo="Documentos por vencer o vencidos" icono={AlertTriangle} alertas={grupos.docsVencen} modulo="/documentacion" />
        <Bloque titulo="Documentación requerida faltante" icono={FileWarning} alertas={grupos.checklistFaltante} modulo="/documentacion" />
        <Bloque titulo="Planillas pendientes de recepción" icono={ClipboardList} alertas={grupos.sinRecepcion} modulo="/planillas" />
        <Bloque titulo="Firmas pendientes" icono={PenLine} alertas={grupos.firmasPendientes} modulo="/firmas" />
        <Bloque titulo="Planillas con demora justificada" icono={Clock} alertas={grupos.demoradas} modulo="/planillas" />
        <Bloque titulo="Comprobantes ANSES pendientes" icono={Bus} alertas={grupos.ansesPendientes} modulo="/transporte" />
        <Bloque titulo="Comprobantes de viandas pendientes" icono={UtensilsCrossed} alertas={grupos.viandasPendientes} modulo="/viandas" />
        <Bloque titulo="Admisiones sin entrevista (+5 días)" icono={UserPlus} alertas={grupos.admisionesDemoradas} modulo="/admisiones" />
      </div>
    </div>
  );
}
