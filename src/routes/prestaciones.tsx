import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PlanillaMensual } from "@/components/PlanillaMensual";

export const Route = createFileRoute("/prestaciones")({
  head: () => ({
    meta: [
      { title: "Prestaciones — Centro de Día" },
      {
        name: "description",
        content: "Planilla mensual de prestaciones: enviado, entregado, firmado, facturado y cobrado por concurrente.",
      },
      { property: "og:title", content: "Prestaciones — Centro de Día" },
      { property: "og:description", content: "Seguimiento mensual de prestaciones con guardado automático y exportación a Excel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell title="Prestaciones" description="Planilla mensual de concurrentes con prestación">
      <PlanillaMensual tipo="prestacion" />
    </AppShell>
  ),
});
