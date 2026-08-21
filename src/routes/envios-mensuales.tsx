import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Check, Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, EmptyState, StatCard, Chip } from "@/components/ui-kit";
import {
  fetchConcurrentes,
  fetchEnviosDelMes,
  enviosApi,
  TIPOS_ENVIO,
  TIPO_ENVIO_LABEL,
  type EnvioMensual,
  type TipoEnvio,
  type Concurrente,
} from "@/lib/api";
import { mesActual, hoyISO } from "@/lib/format";
import { usePermisos } from "@/hooks/use-permisos";

export const Route = createFileRoute("/envios-mensuales")({
  head: () => ({
    meta: [
      { title: "Control de envíos mensuales — Kalen" },
      {
        name: "description",
        content: "Control mensual de envíos APROSS (IE, CD, CET), transporte UGP y otras mutuales, por concurrente.",
      },
      { property: "og:title", content: "Control de envíos mensuales — Kalen" },
      {
        property: "og:description",
        content: "Todos los tipos de envío del mes en una sola pantalla, con enviados y entregados por concurrente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EnviosMensualesPage,
});

function EnviosMensualesPage() {
  const qc = useQueryClient();
  const { puedeEditar } = usePermisos();

  const [mes, setMes] = useState(mesActual());
  const [busqueda, setBusqueda] = useState("");

  const { data: concurrentes = [] } = useQuery({ queryKey: ["concurrentes-envios"], queryFn: fetchConcurrentes });
  const { data: envios = [] } = useQuery({
    queryKey: ["envios-mes", mes],
    queryFn: () => fetchEnviosDelMes(mes),
  });

  const refrescar = () => qc.invalidateQueries({ queryKey: ["envios-mes", mes] });

  /** Índice tipo → (concurrente_id → envío) para resolver cada panel sin recorrer todo. */
  const porTipo = useMemo(() => {
    const m = new Map<string, Map<string, EnvioMensual>>();
    for (const e of envios) {
      if (!e.concurrente_id) continue;
      const sub = m.get(e.tipo) ?? new Map<string, EnvioMensual>();
      sub.set(e.concurrente_id, e);
      m.set(e.tipo, sub);
    }
    return m;
  }, [envios]);

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return concurrentes
      .filter((c) => c.activo)
      .filter((c) => !q || `${c.nombre} ${c.apellido}`.toLowerCase().includes(q));
  }, [concurrentes, busqueda]);

  const totales = useMemo(() => {
    let enviados = 0;
    let entregados = 0;
    for (const t of TIPOS_ENVIO) {
      const sub = porTipo.get(t);
      if (!sub) continue;
      for (const c of lista) {
        const e = sub.get(c.id);
        if (e?.enviado) enviados++;
        if (e?.entregado) entregados++;
      }
    }
    return { enviados, entregados, esperados: lista.length * TIPOS_ENVIO.length };
  }, [porTipo, lista]);

  async function marcar(c: Concurrente, tipo: TipoEnvio, campo: "enviado" | "entregado") {
    const existente = porTipo.get(tipo)?.get(c.id);
    const fechaCampo = campo === "enviado" ? "fecha_envio" : "fecha_entrega";
    try {
      if (existente) {
        await enviosApi.update(existente.id, {
          [campo]: !existente[campo],
          [fechaCampo]: !existente[campo] ? hoyISO() : null,
        } as Partial<EnvioMensual>);
      } else {
        await enviosApi.create({
          concurrente_id: c.id,
          mes,
          tipo,
          enviado: campo === "enviado",
          fecha_envio: campo === "enviado" ? hoyISO() : null,
          entregado: campo === "entregado",
          fecha_entrega: campo === "entregado" ? hoyISO() : null,
        });
      }
      refrescar();
    } catch (e) {
      toast.error(`No se pudo actualizar: ${(e as Error).message}`);
    }
  }

  return (
    <AppShell
      title="Control de envíos mensuales"
      description="APROSS (IE / CD / CET), transporte UGP y otras mutuales — quién falta este mes"
    >
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="month"
          className="h-10 rounded-lg border border-input bg-card px-3 text-sm"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
        />
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-10 w-full rounded-lg border border-input bg-card pl-8 pr-2 text-sm"
            placeholder="Buscar concurrente…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <StatCard icon={Send} label="Concurrentes activos" value={lista.length} tone="info" />
        <StatCard
          icon={Check}
          label="Enviados (todos los tipos)"
          value={`${totales.enviados} / ${totales.esperados}`}
          tone="success"
        />
        <StatCard
          icon={Check}
          label="Entregados (todos los tipos)"
          value={`${totales.entregados} / ${totales.esperados}`}
          tone="success"
        />
      </div>

      <div className="mt-4 space-y-4">
        {TIPOS_ENVIO.map((tipo) => {
          const sub = porTipo.get(tipo);
          const enviados = lista.filter((c) => sub?.get(c.id)?.enviado).length;
          const entregados = lista.filter((c) => sub?.get(c.id)?.entregado).length;
          return (
            <Panel
              key={tipo}
              title={TIPO_ENVIO_LABEL[tipo]}
              action={
                <div className="flex items-center gap-2 text-xs">
                  <Chip tone={enviados === lista.length && lista.length > 0 ? "success" : "muted"}>
                    Enviados {enviados}/{lista.length}
                  </Chip>
                  <Chip tone={entregados === lista.length && lista.length > 0 ? "success" : "muted"}>
                    Entregados {entregados}/{lista.length}
                  </Chip>
                </div>
              }
            >
              {lista.length === 0 ? (
                <EmptyState icon={Send} title="Sin concurrentes activos" hint="Revisá el buscador." />
              ) : (
                <ul className="divide-y divide-border">
                  {lista.map((c) => {
                    const e = sub?.get(c.id);
                    return (
                      <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                        <span className="min-w-[180px] text-sm font-medium">
                          {c.apellido}, {c.nombre}
                        </span>
                        {tipo === "otra_mutual" && e?.mutual_detalle && (
                          <span className="text-xs text-muted-foreground">{e.mutual_detalle}</span>
                        )}
                        <div className="ml-auto flex items-center gap-2">
                          <button
                            onClick={() => marcar(c, tipo, "enviado")}
                            disabled={!puedeEditar}
                            className="disabled:opacity-50"
                          >
                            <Chip tone={e?.enviado ? "success" : "muted"}>
                              {e?.enviado && <Check className="mr-1 inline h-3 w-3" />}
                              Enviado
                            </Chip>
                          </button>
                          <button
                            onClick={() => marcar(c, tipo, "entregado")}
                            disabled={!puedeEditar}
                            className="disabled:opacity-50"
                          >
                            <Chip tone={e?.entregado ? "success" : "muted"}>
                              {e?.entregado && <Check className="mr-1 inline h-3 w-3" />}
                              Entregado
                            </Chip>
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          );
        })}
      </div>
    </AppShell>
  );
}
