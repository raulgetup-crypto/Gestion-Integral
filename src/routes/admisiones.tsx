import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, UserPlus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, EmptyState, Chip } from "@/components/ui-kit";
import { botonPrimario } from "@/components/forms";
import { AdmisionForm } from "@/components/kalen/AdmisionForm";
import { ESTADO_ADMISION_LABEL, fetchAdmisiones, type Admision } from "@/lib/kalen";
import { formatFecha } from "@/lib/format";
import { usePermisos } from "@/hooks/use-permisos";

export const Route = createFileRoute("/admisiones")({
  validateSearch: (s: Record<string, unknown>) => ({
    persona: typeof s.persona === "string" ? s.persona : "",
  }),
  head: () => ({
    meta: [
      { title: "Admisiones — Kalen" },
      {
        name: "description",
        content: "Primer contacto, entrevistas y derivaciones: seguimiento de admisiones por sede y estado.",
      },
      { property: "og:title", content: "Admisiones — Kalen" },
      { property: "og:description", content: "Del primer llamado al alta del concurrente, sin cargar dos veces." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdmisionesPage,
});

const tono = (estado: Admision["estado"]) =>
  estado === "admitido"
    ? "success"
    : estado === "no_ingreso"
      ? "danger"
      : estado === "en_espera"
        ? "warning"
        : "info";

function AdmisionesPage() {
  const { puedeEditar } = usePermisos();
  const { persona } = Route.useSearch();
  const { data: admisiones = [], isLoading } = useQuery({ queryKey: ["admisiones"], queryFn: fetchAdmisiones });
  const [abierto, setAbierto] = useState(false);
  const [inicial, setInicial] = useState<Admision | null>(null);

  // Enlace desde el Turnero: abre la ficha de esa persona (su admisión existente o una nueva vinculada).
  useEffect(() => {
    if (!persona) return;
    const suya = admisiones.find((a) => a.persona_id === persona) ?? null;
    setInicial(suya);
    setAbierto(true);
  }, [persona, admisiones]);

  return (
    <AppShell
      title="Admisiones"
      description={`${admisiones.length} solicitud(es) registradas`}
      actions={
        puedeEditar ? (
          <button
            className={botonPrimario}
            onClick={() => {
              setInicial(null);
              setAbierto(true);
            }}
          >
            <Plus className="h-4 w-4" /> Nueva admisión
          </button>
        ) : undefined
      }
    >
      <Panel title="Solicitudes">
        {isLoading ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Cargando…</p>
        ) : admisiones.length === 0 ? (
          <EmptyState icon={UserPlus} title="Sin admisiones" hint="Registrá el primer contacto." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Contacto</th>
                  <th className="px-4 py-2">Solicitud</th>
                  <th className="px-4 py-2">Estado</th>
                  <th className="px-4 py-2">Ficha</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {admisiones.map((a) => (
                  <tr key={a.id} className="border-t border-border hover:bg-accent/40">
                    <td className="px-4 py-2">
                      <p className="font-medium">{a.nombre_contacto || "—"}</p>
                      <p className="text-xs text-muted-foreground">{a.telefono || a.medio || ""}</p>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {a.fecha_solicitud ? formatFecha(a.fecha_solicitud) : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <Chip tone={tono(a.estado)}>{ESTADO_ADMISION_LABEL[a.estado]}</Chip>
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {a.concurrente_id ? "Vinculada" : "Sin ficha"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {puedeEditar ? (
                        <button
                          className="text-xs font-medium text-primary hover:underline"
                          onClick={() => {
                            setInicial(a);
                            setAbierto(true);
                          }}
                        >
                          Editar
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Solo lectura</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <AdmisionForm abierto={abierto} onClose={() => setAbierto(false)} inicial={inicial} />
    </AppShell>
  );
}
