import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Stethoscope, UserCheck, Users2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, Chip, EmptyState, StatCard } from "@/components/ui-kit";
import { Exportar } from "@/components/Exportar";
import { botonPrimario, campo, Etiqueta } from "@/components/forms";
import { ProfesionalForm } from "@/components/kalen/ProfesionalForm";
import { usePermisos } from "@/hooks/use-permisos";
import { fetchConcurrentes } from "@/lib/api";
import {
  ROLES_EQUIPO,
  ROL_EQUIPO_LABEL,
  bajaProfesional,
  fetchAsignaciones,
  fetchProfesionales,
  fetchSedes,
  guardarAsignacion,
  nombreProfesional,
  quitarAsignacion,
  type Profesional,
  type RolEquipo,
} from "@/lib/kalen";
import { formatFecha, hoyISO } from "@/lib/format";

export const Route = createFileRoute("/profesionales")({
  head: () => ({
    meta: [
      { title: "Profesionales — Centro de Día" },
      {
        name: "description",
        content:
          "Registro de profesionales del centro y asignación del equipo interdisciplinario de cada concurrente, con roles, referentes y períodos.",
      },
      { property: "og:title", content: "Profesionales — Centro de Día" },
      {
        property: "og:description",
        content: "Equipo interdisciplinario: profesionales, matrículas, sedes y asignaciones por concurrente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfesionalesPage,
});

function ProfesionalesPage() {
  const qc = useQueryClient();
  const { puedeEditar, esAdmin, usuarioId } = usePermisos();

  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Profesional | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [soloActivos, setSoloActivos] = useState(true);

  const [concurrenteSel, setConcurrenteSel] = useState("");
  const [profesionalSel, setProfesionalSel] = useState("");
  const [rolSel, setRolSel] = useState<RolEquipo>("equipo");

  const { data: profesionales = [] } = useQuery({ queryKey: ["profesionales"], queryFn: fetchProfesionales });
  const { data: asignaciones = [] } = useQuery({ queryKey: ["asignaciones"], queryFn: fetchAsignaciones });
  const { data: personas = [] } = useQuery({ queryKey: ["concurrentes"], queryFn: fetchConcurrentes });
  const { data: sedes = [] } = useQuery({ queryKey: ["sedes"], queryFn: fetchSedes });

  const nombreSede = (id: number | null) => sedes.find((s) => s.id === id)?.nombre ?? "—";

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return profesionales.filter((p) => {
      if (soloActivos && !p.activo) return false;
      if (!q) return true;
      return [p.nombre, p.apellido, p.dni, p.profesion, p.matricula, p.email]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [profesionales, busqueda, soloActivos]);

  const activos = profesionales.filter((p) => p.activo).length;
  const asignacionesActivas = asignaciones.filter((a) => a.activa);
  const concurrentesConEquipo = new Set(asignacionesActivas.map((a) => a.concurrente_id)).size;

  const equipoDelConcurrente = asignaciones.filter((a) => a.concurrente_id === concurrenteSel);

  const nombreConcurrente = (id: string) => {
    const p = personas.find((x) => x.id === id);
    return p ? `${p.apellido || ""} ${p.nombre}`.trim() : "Sin concurrente";
  };
  const nombreDe = (id: string) => {
    const p = profesionales.find((x) => x.id === id);
    return p ? nombreProfesional(p) : "Profesional";
  };

  const asignar = useMutation({
    mutationFn: () =>
      guardarAsignacion(
        {
          concurrente_id: concurrenteSel,
          profesional_id: profesionalSel,
          rol: rolSel,
          referente: rolSel === "referente",
          fecha_inicio: hoyISO(),
          activa: true,
        },
        usuarioId,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["asignaciones"] });
      setProfesionalSel("");
      toast.success("Profesional asignado al equipo");
    },
    onError: (e: Error) =>
      toast.error(
        e.message.includes("duplicate")
          ? "Ese profesional ya está asignado con ese rol."
          : `No se pudo asignar: ${e.message}`,
      ),
  });

  const quitar = useMutation({
    mutationFn: (id: string) => quitarAsignacion(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["asignaciones"] });
      toast.success("Asignación quitada");
    },
    onError: (e: Error) => toast.error(`No se pudo quitar: ${e.message}`),
  });

  const baja = useMutation({
    mutationFn: (id: string) => bajaProfesional(id, usuarioId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profesionales"] });
      toast.success("Profesional dado de baja");
    },
    onError: (e: Error) => toast.error(`No se pudo dar de baja: ${e.message}`),
  });

  const filasExport = lista.map((p) => ({
    Apellido: p.apellido,
    Nombre: p.nombre,
    Documento: p.dni,
    Profesión: p.profesion,
    Matrícula: p.matricula,
    Sede: nombreSede(p.sede_id),
    Correo: p.email,
    Teléfono: p.telefono,
    Ingreso: p.fecha_ingreso ? formatFecha(p.fecha_ingreso) : "",
    Estado: p.activo ? "Activo" : "Inactivo",
    Asignaciones: asignaciones.filter((a) => a.profesional_id === p.id && a.activa).length,
  }));

  function nuevo() {
    setEditando(null);
    setAbierto(true);
  }

  function asignarClick() {
    if (!concurrenteSel) return toast.error("Elegí un concurrente.");
    if (!profesionalSel) return toast.error("Elegí un profesional.");
    asignar.mutate();
  }

  return (
    <AppShell
      title="Profesionales"
      description="Equipo interdisciplinario y asignaciones por concurrente"
      actions={
        <>
          {puedeEditar && (
            <button className={botonPrimario} onClick={nuevo}>
              <Plus className="h-4 w-4" /> Nuevo profesional
            </button>
          )}
          <Exportar filas={filasExport} nombre="profesionales" titulo="Profesionales" />
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={Stethoscope} label="Profesionales activos" value={activos} tone="info" />
        <StatCard icon={UserCheck} label="Asignaciones vigentes" value={asignacionesActivas.length} tone="success" />
        <StatCard icon={Users2} label="Concurrentes con equipo" value={concurrentesConEquipo} tone="warning" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title={`Registro · ${lista.length}`}>
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="h-9 w-full rounded-lg border border-input bg-card pl-8 pr-2 text-sm"
                placeholder="Buscar por nombre, profesión, matrícula…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={soloActivos}
                onChange={(e) => setSoloActivos(e.target.checked)}
              />
              Solo activos
            </label>
          </div>

          {lista.length === 0 ? (
            <EmptyState
              icon={Stethoscope}
              title="Sin profesionales"
              hint="Registrá al equipo con el botón «Nuevo profesional»."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Profesional</th>
                    <th className="px-3 py-2 font-medium">Profesión</th>
                    <th className="px-3 py-2 font-medium">Matrícula</th>
                    <th className="px-3 py-2 font-medium">Sede</th>
                    <th className="px-3 py-2 font-medium">Contacto</th>
                    <th className="px-3 py-2 font-medium">Equipo</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lista.map((p) => (
                    <tr key={p.id} className="hover:bg-accent/40">
                      <td className="px-3 py-2">
                        <div className="font-medium">{nombreProfesional(p)}</div>
                        {!p.activo && <Chip tone="muted">Inactivo</Chip>}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{p.profesion || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.matricula || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{nombreSede(p.sede_id)}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {[p.telefono, p.email].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {asignaciones.filter((a) => a.profesional_id === p.id && a.activa).length}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {puedeEditar && (
                          <button
                            className="text-xs font-medium text-primary hover:underline"
                            onClick={() => {
                              setEditando(p);
                              setAbierto(true);
                            }}
                          >
                            Editar
                          </button>
                        )}
                        {esAdmin && p.activo && (
                          <button
                            className="ml-3 text-xs font-medium text-destructive hover:underline"
                            onClick={() => baja.mutate(p.id)}
                          >
                            Dar de baja
                          </button>
                        )}
                        {!puedeEditar && <span className="text-xs text-muted-foreground">Solo lectura</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Equipo por concurrente">
          <div className="space-y-3 px-4 py-3">
            <label className="block">
              <Etiqueta>Concurrente</Etiqueta>
              <select
                className={campo}
                value={concurrenteSel}
                onChange={(e) => setConcurrenteSel(e.target.value)}
              >
                <option value="">Seleccionar…</option>
                {personas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {`${p.apellido || ""} ${p.nombre}`.trim()}
                  </option>
                ))}
              </select>
            </label>

            {concurrenteSel && puedeEditar && (
              <div className="grid gap-2 sm:grid-cols-2">
                <label>
                  <Etiqueta>Profesional</Etiqueta>
                  <select
                    className={campo}
                    value={profesionalSel}
                    onChange={(e) => setProfesionalSel(e.target.value)}
                  >
                    <option value="">Seleccionar…</option>
                    {profesionales
                      .filter((p) => p.activo)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {nombreProfesional(p)}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  <Etiqueta>Rol en el equipo</Etiqueta>
                  <select
                    className={campo}
                    value={rolSel}
                    onChange={(e) => setRolSel(e.target.value as RolEquipo)}
                  >
                    {ROLES_EQUIPO.map((r) => (
                      <option key={r} value={r}>
                        {ROL_EQUIPO_LABEL[r]}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className={`${botonPrimario} sm:col-span-2`}
                  onClick={asignarClick}
                  disabled={asignar.isPending}
                >
                  <Plus className="h-4 w-4" /> Asignar al equipo
                </button>
              </div>
            )}

            {!concurrenteSel ? (
              <p className="text-xs text-muted-foreground">
                Elegí un concurrente para ver y armar su equipo interdisciplinario.
              </p>
            ) : equipoDelConcurrente.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {nombreConcurrente(concurrenteSel)} todavía no tiene equipo asignado.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {equipoDelConcurrente.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{nombreDe(a.profesional_id)}</span>
                      <span className="text-xs text-muted-foreground">
                        {ROL_EQUIPO_LABEL[a.rol] ?? a.rol}
                        {a.fecha_inicio ? ` · desde ${formatFecha(a.fecha_inicio)}` : ""}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      {a.referente && <Chip tone="info">Referente</Chip>}
                      {!a.activa && <Chip tone="muted">Finalizada</Chip>}
                      {esAdmin && (
                        <button
                          className="text-destructive hover:opacity-80"
                          title="Quitar asignación"
                          onClick={() => quitar.mutate(a.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      </div>

      <ProfesionalForm abierto={abierto} onClose={() => setAbierto(false)} profesional={editando} />
    </AppShell>
  );
}
