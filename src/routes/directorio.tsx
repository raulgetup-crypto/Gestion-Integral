import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Phone, MessageCircle, Trash2, BookUser } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, EmptyState, StatCard } from "@/components/ui-kit";
import { Exportar } from "@/components/Exportar";
import { botonPrimario } from "@/components/forms";
import { DirectorioForm } from "@/components/kalen/DirectorioForm";
import { usePermisos } from "@/hooks/use-permisos";
import { fetchSedes } from "@/lib/kalen";
import { bajaContacto, fetchDirectorio, type Directorio } from "@/lib/directorio";

export const Route = createFileRoute("/directorio")({
  head: () => ({
    meta: [
      { title: "Directorio — Kalen" },
      {
        name: "description",
        content: "Directorio telefónico institucional: mutuales, transporte, proveedores y contactos internos.",
      },
    ],
  }),
  component: DirectorioPage,
});

/** Solo dígitos, para armar el link de WhatsApp (wa.me exige el número sin espacios/guiones). */
function soloDigitos(tel: string) {
  return tel.replace(/\D/g, "");
}

function DirectorioPage() {
  const qc = useQueryClient();
  const { puedeEditar, esAdmin, usuarioId } = usePermisos();

  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Directorio | null>(null);
  const [busqueda, setBusqueda] = useState("");

  const { data: contactos = [] } = useQuery({ queryKey: ["directorio"], queryFn: fetchDirectorio });
  const { data: sedes = [] } = useQuery({ queryKey: ["sedes"], queryFn: fetchSedes });

  const nombreSede = (id: number | null) => sedes.find((s) => s.id === id)?.nombre ?? "Ambas sedes";

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return contactos;
    return contactos.filter((c) =>
      [c.nombre, c.cargo, c.institucion, c.area, c.telefono, c.email].join(" ").toLowerCase().includes(q),
    );
  }, [contactos, busqueda]);

  const baja = useMutation({
    mutationFn: (id: string) => bajaContacto(id, usuarioId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["directorio"] });
      toast.success("Contacto dado de baja");
    },
    onError: (e: Error) => toast.error(`No se pudo dar de baja: ${e.message}`),
  });

  const filasExport = lista.map((c) => ({
    Nombre: c.nombre,
    Cargo: c.cargo,
    Área: c.area,
    Institución: c.institucion,
    Sede: nombreSede(c.sede_id),
    Teléfono: c.telefono,
    "Teléfono alternativo": c.telefono_alternativo,
    Correo: c.email,
  }));

  function nuevo() {
    setEditando(null);
    setAbierto(true);
  }

  return (
    <AppShell
      title="Directorio"
      description="Contactos institucionales: mutuales, transporte, proveedores y mantenimiento"
      actions={
        <>
          {puedeEditar && (
            <button className={botonPrimario} onClick={nuevo}>
              <Plus className="h-4 w-4" /> Nuevo contacto
            </button>
          )}
          <Exportar filas={filasExport} nombre="directorio" titulo="Directorio institucional" />
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={BookUser} label="Contactos activos" value={contactos.length} tone="info" />
      </div>

      <div className="mt-4">
        <Panel title={`Contactos · ${lista.length}`}>
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="h-9 w-full rounded-lg border border-input bg-card pl-8 pr-2 text-sm"
                placeholder="Buscar por nombre, área, institución, teléfono…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>

          {lista.length === 0 ? (
            <EmptyState
              icon={BookUser}
              title="Sin contactos"
              hint="Agregá el primero con el botón «Nuevo contacto»."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Contacto</th>
                    <th className="px-3 py-2 font-medium">Área / Institución</th>
                    <th className="px-3 py-2 font-medium">Sede</th>
                    <th className="px-3 py-2 font-medium">Contacto directo</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lista.map((c) => (
                    <tr key={c.id} className="hover:bg-accent/40">
                      <td className="px-3 py-2">
                        <div className="font-medium">{c.nombre}</div>
                        {c.cargo && <div className="text-xs text-muted-foreground">{c.cargo}</div>}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {[c.area, c.institucion].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{nombreSede(c.sede_id)}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-3">
                          {c.telefono && (
                            <>
                              <a
                                href={`tel:${soloDigitos(c.telefono)}`}
                                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                                title={`Llamar a ${c.telefono}`}
                              >
                                <Phone className="h-3.5 w-3.5" /> Llamar
                              </a>
                              <a
                                href={`https://wa.me/549${soloDigitos(c.telefono)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                                title={`WhatsApp a ${c.telefono}`}
                              >
                                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                              </a>
                            </>
                          )}
                          {!c.telefono && <span className="text-xs text-muted-foreground">Sin teléfono</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {puedeEditar && (
                          <button
                            className="text-xs font-medium text-primary hover:underline"
                            onClick={() => {
                              setEditando(c);
                              setAbierto(true);
                            }}
                          >
                            Editar
                          </button>
                        )}
                        {esAdmin && (
                          <button
                            className="ml-3 text-destructive hover:opacity-80"
                            title="Dar de baja"
                            onClick={() => baja.mutate(c.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <DirectorioForm abierto={abierto} onClose={() => setAbierto(false)} contacto={editando} />
    </AppShell>
  );
}
