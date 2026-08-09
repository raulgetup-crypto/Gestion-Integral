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
        content: "Control mensual de envíos: IE por mail, transporte UGP y otras mutuales, por concurrente.",
      },
    ],
  }),
  component: EnviosMensualesPage,
});

function EnviosMensualesPage() {
  const qc = useQueryClient();
  const { puedeEditar } = usePermisos();

  const [mes, setMes] = useState(mesActual());
  const [tipo, setTipo] = useState<(typeof TIPOS_ENVIO)[number]>("ie_mail");
  const [busqueda, setBusqueda] = useState("");

  const { data: concurrentes = [] } = useQuery({ queryKey: ["concurrentes-envios"], queryFn: fetchConcurrentes });
  const { data: envios = [] } = useQuery({
    queryKey: ["envios-mes", mes],
    queryFn: () => fetchEnviosDelMes(mes),
  });

  const refrescar = () => qc.invalidateQueries({ queryKey: ["envios-mes", mes] });

  const enviosDelTipo = useMemo(
    () => new Map(envios.filter((e) => e.tipo === tipo).map((e) => [e.concurrente_id, e])),
    [envios, tipo],
  );

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return concurrentes
      .filter((c) => c.activo)
      .filter((c) => !q || `${c.nombre} ${c.apellido}`.toLowerCase().includes(q));
  }, [concurrentes, busqueda]);

  const totalEnviado = lista.filter((c) => enviosDelTipo.get(c.id)?.enviado).length;
  const totalEntregado = lista.filter((c) => enviosDelTipo.get(c.id)?.entregado).length;

  async function marcar(c: Concurrente, campo: "enviado" | "entregado") {
    const existente = enviosDelTipo.get(c.id);
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
      description="IE por mail al DAI, transporte UGP y otras mutuales — quién falta este mes"
    >
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="month"
          className="h-10 rounded-lg border border-input bg-card px-3 text-sm"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
        />
        <select
          className="h-10 rounded-lg border border-input bg-card px-3 text-sm"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as (typeof TIPOS_ENVIO)[number])}
        >
          {TIPOS_ENVIO.map((t) => (
            <option key={t} value={t}>
              {TIPO_ENVIO_LABEL[t]}
            </option>
          ))}
        </select>
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
        <StatCard icon={Send} label="Total concurrentes" value={lista.length} tone="info" />
        <StatCard icon={Check} label="Enviados" value={`${totalEnviado} / ${lista.length}`} tone="success" />
        <StatCard icon={Check} label="Entregados" value={`${totalEntregado} / ${lista.length}`} tone="success" />
      </div>

      <div className="mt-4">
        <Panel title={`${TIPO_ENVIO_LABEL[tipo]} · ${lista.length} concurrentes`}>
          {lista.length === 0 ? (
            <EmptyState icon={Send} title="Sin concurrentes activos" hint="Revisá el buscador o los filtros." />
          ) : (
            <ul className="divide-y divide-border">
              {lista.map((c) => {
                const e = enviosDelTipo.get(c.id);
                return (
                  <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <span className="min-w-[180px] font-medium">
                      {c.apellido}, {c.nombre}
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                      <button onClick={() => marcar(c, "enviado")} disabled={!puedeEditar} className="disabled:opacity-50">
                        <Chip tone={e?.enviado ? "success" : "muted"}>
                          {e?.enviado && <Check className="mr-1 inline h-3 w-3" />}
                          Enviado
                        </Chip>
                      </button>
                      <button onClick={() => marcar(c, "entregado")} disabled={!puedeEditar} className="disabled:opacity-50">
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
      </div>
    </AppShell>
  );
}

