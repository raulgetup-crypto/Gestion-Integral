import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Segmentado } from "@/components/forms";
import { TurnosSection } from "@/components/turnero/TurnosSection";
import { TareasSection } from "@/components/turnero/TareasSection";
import { MensajesSection } from "@/components/turnero/MensajesSection";

export const Route = createFileRoute("/turnero")({
  head: () => ({
    meta: [
      { title: "Turnero — Centro de Día" },
      {
        name: "description",
        content: "Turnero con guardado automático: admisiones, entrevistas, tareas del día y consultas recibidas.",
      },
      { property: "og:title", content: "Turnero — Centro de Día" },
      { property: "og:description", content: "Agenda de turnos, tareas pendientes y consultas del Centro de Día." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TurneroPage,
});

const TABS = [
  { value: "turnos" as const, label: "Turnos" },
  { value: "tareas" as const, label: "Tareas" },
  { value: "consultas" as const, label: "Consultas" },
];

function TurneroPage() {
  const [tab, setTab] = useState<"turnos" | "tareas" | "consultas">("turnos");
  return (
    <AppShell title="Turnero" description="Turnos, tareas del día y consultas">
      <Segmentado valor={tab} opciones={TABS} onChange={setTab} className="mb-4 sm:w-fit" />
      {tab === "turnos" && <TurnosSection />}
      {tab === "tareas" && <TareasSection />}
      {tab === "consultas" && <MensajesSection />}
    </AppShell>
  );
}
