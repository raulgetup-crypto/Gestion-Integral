import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PlanillaMensual } from "@/components/PlanillaMensual";

export const Route = createFileRoute("/transporte")({
  head: () => ({
    meta: [
      { title: "Transporte — Centro de Día" },
      {
        name: "description",
        content: "Planilla mensual del servicio de transporte: seguimiento de envío, firma, facturación y cobro.",
      },
      { property: "og:title", content: "Transporte — Centro de Día" },
      { property: "og:description", content: "Gestión del servicio de transporte de concurrentes mes a mes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell title="Transporte" description="Planilla mensual del servicio de transporte">
      <PlanillaMensual tipo="transporte" />
    </AppShell>
  ),
});
