import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, EmptyState, Chip } from "@/components/ui-kit";
import { campo, botonPrimario } from "@/components/forms";
import { ConcurrenteForm } from "@/components/kalen/ConcurrenteForm";
import { fetchConcurrentes, type Concurrente } from "@/lib/api";
import type { FichaConcurrente } from "@/lib/kalen";

export const Route = createFileRoute("/ficha-maestra")({
  head: () => ({
    meta: [
      { title: "Ficha maestra de concurrentes — Kalen" },
      {
        name: "description",
        content:
          "Alta y edición de la ficha maestra del concurrente: DNI único, sede, obra social y datos de institución.",
      },
      { property: "og:title", content: "Ficha maestra de concurrentes — Kalen" },
      { property: "og:description", content: "Datos maestros del concurrente con validaciones APROSS y DNI único." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FichaMaestraPage,
});

type ConcurrenteExt = Concurrente & {
  sede_id?: number | null;
  colegio?: string;
  numero_institucion?: string;
  fecha_ingreso?: string | null;
};

function aFicha(c: ConcurrenteExt): Partial<FichaConcurrente> {
  return {
    id: c.id,
    sede_id: c.sede_id ?? null,
    dni: c.dni ?? "",
    nombre: c.nombre ?? "",
    apellido: c.apellido ?? "",
    fecha_nacimiento: c.fecha_nacimiento ?? null,
    obra_social: c.obra_social ?? "",
    colegio: c.colegio ?? "",
    numero_institucion: c.numero_institucion ?? "",
    fecha_ingreso: c.fecha_ingreso ?? null,
    activo: c.activo,
    observaciones: c.observaciones ?? "",
  };
}

function FichaMaestraPage() {
  const { data: concurrentes = [], isLoading } = useQuery({
    queryKey: ["concurrentes"],
    queryFn: fetchConcurrentes,
  });
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [inicial, setInicial] = useState<Partial<FichaConcurrente> | null>(null);

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const arr = concurrentes as ConcurrenteExt[];
    if (!q) return arr;
    return arr.filter((c) =>
      `${c.nombre} ${c.apellido} ${c.dni} ${c.obra_social}`.toLowerCase().includes(q),
    );
  }, [concurrentes, busqueda]);

  return (
    <AppShell
      title="Ficha maestra"
      description={`${lista.length} concurrente(s) · DNI único, sede y datos de institución`}
      actions={
        <button
          className={botonPrimario}
          onClick={() => {
            setInicial(null);
            setAbierto(true);
          }}
        >
          <Plus className="h-4 w-4" /> Nueva ficha
        </button>
      }
    >
      <div className="space-y-4">


        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className={`${campo} pl-9`}
            placeholder="Buscar por nombre, apellido, DNI u obra social…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <Panel title="Concurrentes">
          {isLoading ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Cargando…</p>
          ) : lista.length === 0 ? (
            <EmptyState icon={Users} title="Sin concurrentes" hint="Creá la primera ficha maestra." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">Concurrente</th>
                    <th className="px-4 py-2">DNI</th>
                    <th className="px-4 py-2">Obra social</th>
                    <th className="px-4 py-2">Estado</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {lista.map((c) => (
                    <tr key={c.id} className="border-t border-border hover:bg-accent/40">
                      <td className="px-4 py-2 font-medium">{`${c.apellido || ""} ${c.nombre}`.trim()}</td>
                      <td className="px-4 py-2 text-muted-foreground">{c.dni}</td>
                      <td className="px-4 py-2 text-muted-foreground">{c.obra_social || "—"}</td>
                      <td className="px-4 py-2">
                        <Chip tone={c.activo ? "success" : "danger"}>{c.activo ? "Activo" : "Inactivo"}</Chip>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          className="text-xs font-medium text-primary hover:underline"
                          onClick={() => {
                            setInicial(aFicha(c));
                            setAbierto(true);
                          }}
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <ConcurrenteForm abierto={abierto} onClose={() => setAbierto(false)} inicial={inicial} />
    </AppShell>
  );
}
