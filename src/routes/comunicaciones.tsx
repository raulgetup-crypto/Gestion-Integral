import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, EmptyState, Chip } from "@/components/ui-kit";
import { botonPrimario, campo } from "@/components/forms";
import { ComunicacionForm } from "@/components/kalen/ComunicacionForm";
import { fetchConcurrentes } from "@/lib/api";
import { fetchComunicaciones, type Comunicacion } from "@/lib/kalen";
import { formatFechaHora } from "@/lib/format";

export const Route = createFileRoute("/comunicaciones")({
  head: () => ({
    meta: [
      { title: "Diario de comunicaciones — Kalen" },
      {
        name: "description",
        content: "Registro de llamados, mensajes y compromisos con familias, vinculados a planillas y documentos.",
      },
      { property: "og:title", content: "Diario de comunicaciones — Kalen" },
      { property: "og:description", content: "Qué se pidió, quién respondió y qué se comprometió, con fecha y hora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComunicacionesPage,
});

function ComunicacionesPage() {
  const { data: comunicaciones = [], isLoading } = useQuery({
    queryKey: ["comunicaciones"],
    queryFn: fetchComunicaciones,
  });
  const { data: concurrentes = [] } = useQuery({ queryKey: ["concurrentes"], queryFn: fetchConcurrentes });

  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [inicial, setInicial] = useState<Comunicacion | null>(null);

  const nombre = useMemo(() => {
    const m = new Map(concurrentes.map((c) => [c.id, `${c.apellido || ""} ${c.nombre}`.trim()]));
    return (id: string | null) => (id ? (m.get(id) ?? "—") : "—");
  }, [concurrentes]);

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return comunicaciones;
    return comunicaciones.filter((c) =>
      `${c.destinatario} ${c.medio} ${c.mensaje_enviado} ${c.respuesta} ${nombre(c.concurrente_id)}`
        .toLowerCase()
        .includes(q),
    );
  }, [comunicaciones, busqueda, nombre]);

  return (
    <AppShell
      title="Comunicaciones"
      description={`${lista.length} registro(s) de seguimiento`}
      actions={
        <button
          className={botonPrimario}
          onClick={() => {
            setInicial(null);
            setAbierto(true);
          }}
        >
          <Plus className="h-4 w-4" /> Nueva comunicación
        </button>
      }
    >
      <div className="space-y-4">
        <input
          className={`${campo} sm:max-w-md`}
          placeholder="Buscar por concurrente, destinatario o mensaje…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        <Panel title="Diario de seguimiento">
          {isLoading ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Cargando…</p>
          ) : lista.length === 0 ? (
            <EmptyState icon={MessageSquare} title="Sin comunicaciones" hint="Registrá el primer contacto." />
          ) : (
            <ul className="divide-y divide-border">
              {lista.map((c) => (
                <li key={c.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{nombre(c.concurrente_id)}</span>
                    {c.medio && <Chip tone="info">{c.medio}</Chip>}
                    <span className="text-xs text-muted-foreground">{formatFechaHora(c.fecha)}</span>
                    <button
                      className="ml-auto text-xs font-medium text-primary hover:underline"
                      onClick={() => {
                        setInicial(c);
                        setAbierto(true);
                      }}
                    >
                      Editar
                    </button>
                  </div>
                  <p className="mt-1 text-sm">{c.mensaje_enviado}</p>
                  {c.respuesta && (
                    <p className="mt-1 text-sm text-muted-foreground">Respuesta: {c.respuesta}</p>
                  )}
                  {c.compromiso && (
                    <p className="mt-1 text-xs font-medium text-warning">Compromiso: {c.compromiso}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <ComunicacionForm abierto={abierto} onClose={() => setAbierto(false)} inicial={inicial} />
    </AppShell>
  );
}
