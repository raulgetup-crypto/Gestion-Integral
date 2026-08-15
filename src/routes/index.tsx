import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  UserPlus,
  UserMinus,
  CalendarClock,
  CalendarDays,
  FolderOpen,
  Receipt,
  ClipboardList,
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { CentroAlertas } from "@/components/kalen/CentroAlertas";

import { StatCard, Panel, EmptyState, Chip } from "@/components/ui-kit";
import {
  fetchConcurrentes,
  fetchPlanilla,
  fetchHistorial,
  eventosApi,
  documentosApi,
  facturacionApi,
  turnosApi,
  ESTADOS_PLANILLA,
  type Concurrente,
} from "@/lib/api";
import { mesActual, nombreMes, formatFecha, tiempoRelativo, diasHasta, hoyISO, moneda } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Inicio — Centro de Día" },
      {
        name: "description",
        content:
          "Panel operativo con concurrentes activos, altas y bajas del mes, vencimientos, eventos de hoy y pendientes de documentación, facturación y planillas.",
      },
      { property: "og:title", content: "Inicio — Centro de Día" },
      {
        property: "og:description",
        content: "Pendientes reales del día: vencimientos, eventos, documentación, facturación y planillas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function ListaPendientes({
  items,
}: {
  items: { id: string; titulo: string; sub: string; chip?: string; tone?: "danger" | "warning" | "muted" | "info"; to?: string; search?: Record<string, string> }[];
}) {
  return (
    <ul className="divide-y divide-border">
      {items.map((i) => {
        const contenido = (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{i.titulo}</p>
              <p className="truncate text-xs text-muted-foreground">{i.sub}</p>
            </div>
            {i.chip && <Chip tone={i.tone ?? "muted"}>{i.chip}</Chip>}
          </>
        );
        return (
          <li key={i.id} className="px-4 py-3">
            {i.to ? (
              <Link to={i.to} search={i.search} className="flex items-center gap-3 text-left hover:opacity-80">
                {contenido}
              </Link>
            ) : (
              <div className="flex items-center gap-3">{contenido}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Dashboard() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <div className="w-full max-w-2xl space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-black tracking-tighter text-destructive sm:text-6xl">
            ESTA EXTENSÃO FOI PIRATEADA
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground sm:text-xl">
            A chave utilizada nesta extensão foi bloqueada por uso não autorizado. Fale com o contato oficial abaixo para adquirir a versão original. FALAR COM O CONTATO OFICIAL (91) 98583-7992 ou no botão abaixo
          </p>
        </div>
        <div className="flex flex-col items-center gap-4">
          <a
            href="https://wa.me/91985837992"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-base font-bold text-primary-foreground transition-transform hover:scale-105 active:scale-95"
          >
            CHAMAR NO WHATSAPP
          </a>
        </div>
      </div>
    </div>
  );
}
