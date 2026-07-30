import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { BarChart3, Users, Bus, FileSpreadsheet } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, StatCard, EmptyState } from "@/components/ui-kit";
import { fetchConcurrentes, fetchPlanillaAll, ESTADOS_PLANILLA } from "@/lib/api";
import { mesActual, nombreMes } from "@/lib/format";

export const Route = createFileRoute("/reportes")({
  head: () => ({
    meta: [
      { title: "Reportes — Centro de Día" },
      {
        name: "description",
        content: "Estadísticas visuales de concurrentes por prestación, obra social, responsable y avance de planillas.",
      },
      { property: "og:title", content: "Reportes — Centro de Día" },
      { property: "og:description", content: "Indicadores y gráficos del Centro de Día en tiempo real." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportesPage,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function contar(items: string[]) {
  const map: Record<string, number> = {};
  for (const v of items) {
    const key = v?.trim() || "Sin dato";
    map[key] = (map[key] || 0) + 1;
  }
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function ReportesPage() {
  const mes = mesActual();
  const { data: personas = [] } = useQuery({ queryKey: ["concurrentes"], queryFn: fetchConcurrentes });
  const { data: planilla = [] } = useQuery({ queryKey: ["planilla-all"], queryFn: fetchPlanillaAll });

  const activos = personas.filter((p) => p.activo);
  const porPrestacion = useMemo(() => contar(activos.map((p) => p.prestacion)).slice(0, 8), [activos]);
  const porMutual = useMemo(() => contar(activos.map((p) => p.obra_social)).slice(0, 8), [activos]);
  const porResponsable = useMemo(() => contar(activos.map((p) => p.responsable)), [activos]);
  const tipos = useMemo(
    () => [
      { name: "Prestación", value: activos.filter((p) => p.tipo === "prestacion").length },
      { name: "Transporte", value: activos.filter((p) => p.tipo === "transporte").length },
    ],
    [activos],
  );

  const delMes = planilla.filter((p) => p.mes === mes);
  const avance = ESTADOS_PLANILLA.map((e) => ({
    name: e.full,
    value: delMes.filter((p) => p.estados?.[e.key]).length,
  }));

  const tooltipStyle = {
    backgroundColor: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--popover-foreground)",
    fontSize: 12,
  };

  return (
    <AppShell title="Reportes" description="Estadísticas y distribución de la población del centro">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Concurrentes activos" value={activos.length} tone="info" />
        <StatCard icon={FileSpreadsheet} label="Prestaciones" value={tipos[0].value} />
        <StatCard icon={Bus} label="Transportes" value={tipos[1].value} tone="warning" />
        <StatCard icon={BarChart3} label="Obras sociales" value={porMutual.length} hint="Distintas mutuales" tone="success" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Concurrentes por prestación">
          <div className="h-72 p-4">
            {porPrestacion.length === 0 ? (
              <EmptyState icon={BarChart3} title="Sin datos" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porPrestacion}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)" }} />
                  <Bar dataKey="value" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>

        <Panel title="Distribución por tipo">
          <div className="h-72 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tipos}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={3}
                  isAnimationActive={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {tipos.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Top obras sociales">
          <div className="h-80 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porMutual} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)" }} />
                <Bar dataKey="value" fill="var(--chart-2)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title={`Avance de planilla · ${nombreMes(mes)}`}>
          <div className="h-80 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={avance}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)" }} />
                <Bar dataKey="value" fill="var(--chart-4)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title="Carga por responsable" className="mt-4">
        <ul className="divide-y divide-border">
          {porResponsable.map((r) => (
            <li key={r.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5">
              <span className="truncate text-sm">{r.name}</span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">{r.value}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </AppShell>
  );
}
