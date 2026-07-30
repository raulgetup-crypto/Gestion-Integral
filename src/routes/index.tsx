import { createFileRoute } from "@tanstack/react-router";
// @ts-expect-error - JS component without type declarations
import PanelLaboral from "@/components/PanelLaboral.jsx";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Panel Laboral — Gestión de concurrentes y tareas" },
      {
        name: "description",
        content:
          "Panel de trabajo para gestionar concurrentes, planilla mensual, tareas del día, turnero y próximas fechas.",
      },
      { property: "og:title", content: "Panel Laboral — Gestión de concurrentes y tareas" },
      {
        property: "og:description",
        content:
          "Gestioná concurrentes, planilla mensual, tareas diarias, turnero y mensajes desde un solo panel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PanelLaboral,
});
