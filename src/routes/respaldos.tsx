import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { DatabaseBackup, Download, Loader2, RefreshCw, Trash2, ShieldCheck, HardDriveDownload } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, StatCard, EmptyState, Chip } from "@/components/ui-kit";
import { botonPrimario, botonSecundario } from "@/components/forms";
import { usePermisos } from "@/hooks/use-permisos";
import { exportar } from "@/lib/export";
import {
  respaldosApi,
  leerTabla,
  aplanar,
  formatoTamano,
  TABLAS_EXPORTABLES,
  type Respaldo,
} from "@/lib/respaldos";
import { formatFecha } from "@/lib/format";

export const Route = createFileRoute("/respaldos")({
  head: () => ({
    meta: [
      { title: "Respaldos y exportación — Centro de Día" },
      {
        name: "description",
        content:
          "Copias de seguridad automáticas de toda la base y exportación general de cualquier módulo en Excel, CSV o JSON.",
      },
      { property: "og:title", content: "Respaldos y exportación — Centro de Día" },
      { property: "og:description", content: "Backups diarios verificables y descarga completa de la información." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RespaldosPage,
});

const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "short", timeStyle: "short" });

const TONO_ESTADO: Record<string, "success" | "warning" | "danger"> = { ok: "success", parcial: "warning", error: "danger" };

function RespaldosPage() {
  const qc = useQueryClient();
  const { esAdmin, usuario } = usePermisos();
  const [seleccion, setSeleccion] = useState<string[]>(TABLAS_EXPORTABLES.map((t) => t.tabla));
  const [exportando, setExportando] = useState(false);

  const { data: respaldos = [], isLoading } = useQuery({ queryKey: ["respaldos"], queryFn: respaldosApi.listar });

  const ejecutar = useMutation({
    mutationFn: () => respaldosApi.ejecutar(usuario?.nombre ?? ""),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["respaldos"] });
      if (r.estado === "ok") toast.success(`Respaldo generado (${r.total_registros} registros)`);
      else toast.warning(`Respaldo ${r.estado}: ${r.detalle || "revisá el detalle"}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const borrar = useMutation({
    mutationFn: (r: Respaldo) => respaldosApi.eliminar(r),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["respaldos"] });
      toast.success("Respaldo eliminado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ultimo = respaldos[0];
  const okRecientes = useMemo(() => respaldos.filter((r) => r.estado === "ok").length, [respaldos]);
  const pesoTotal = useMemo(() => respaldos.reduce((a, r) => a + (r.tamano ?? 0), 0), [respaldos]);

  const descargar = async (r: Respaldo) => {
    if (!r.storage_path) return toast.error("Este respaldo no tiene archivo asociado");
    try {
      const url = await respaldosApi.urlDescarga(r.storage_path);
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const alternar = (tabla: string) =>
    setSeleccion((s) => (s.includes(tabla) ? s.filter((t) => t !== tabla) : [...s, tabla]));

  /** Exportación general: un libro Excel con una hoja por módulo, o un JSON completo. */
  const exportarGeneral = async (formato: "xlsx" | "json") => {
    if (seleccion.length === 0) return toast.error("Elegí al menos un módulo");
    setExportando(true);
    try {
      const wb = XLSX.utils.book_new();
      const bundle: Record<string, unknown[]> = {};
      let total = 0;
      for (const tabla of seleccion) {
        const filas = await leerTabla(tabla);
        total += filas.length;
        bundle[tabla] = filas;
        if (formato === "xlsx") {
          const ws = XLSX.utils.json_to_sheet(filas.length ? aplanar(filas) : [{ sin_datos: "" }]);
          XLSX.utils.book_append_sheet(wb, ws, tabla.slice(0, 28));
        }
      }
      const sello = new Date().toISOString().slice(0, 10);
      if (formato === "xlsx") {
        XLSX.writeFile(wb, `exportacion-general-${sello}.xlsx`);
      } else {
        const url = URL.createObjectURL(
          new Blob([JSON.stringify({ generado: new Date().toISOString(), datos: bundle }, null, 2)], {
            type: "application/json",
          }),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = `exportacion-general-${sello}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
      toast.success(`Exportación lista (${total} registros)`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExportando(false);
    }
  };

  const exportarTabla = async (tabla: string, etiqueta: string) => {
    try {
      const filas = aplanar(await leerTabla(tabla));
      exportar(filas, `${tabla}-${new Date().toISOString().slice(0, 10)}`, "csv", etiqueta);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <AppShell
      title="Respaldos y exportación"
      description="Copias de seguridad automáticas de toda la base y descarga general de la información."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Último respaldo" value={ultimo ? fechaHora(ultimo.created_at) : "Sin registros"} icon={DatabaseBackup} />
        <StatCard label="Respaldos correctos" value={String(okRecientes)} icon={ShieldCheck} />
        <StatCard label="Registros del último" value={String(ultimo?.total_registros ?? 0)} icon={HardDriveDownload} />
        <StatCard label="Espacio ocupado" value={formatoTamano(pesoTotal)} icon={Download} />
      </div>

      <Panel
        title="Copia de seguridad · diaria automática 03:00"
        action={
          esAdmin ? (
            <button className={botonPrimario} onClick={() => ejecutar.mutate()} disabled={ejecutar.isPending}>
              {ejecutar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Respaldar ahora
            </button>
          ) : null
        }
      >
        {isLoading ? (
          <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando historial…
          </div>
        ) : respaldos.length === 0 ? (
          <EmptyState
            icon={DatabaseBackup}
            title="Todavía no hay respaldos"
            hint="Generá el primero con «Respaldar ahora»; luego el proceso diario continúa solo."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left">Fecha</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                  <th className="px-3 py-2 text-right">Registros</th>
                  <th className="px-3 py-2 text-right">Tamaño</th>
                  <th className="px-3 py-2 text-left">Detalle</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {respaldos.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2 whitespace-nowrap">{fechaHora(r.created_at)}</td>
                    <td className="px-3 py-2 capitalize">{r.tipo}</td>
                    <td className="px-3 py-2">
                      <Chip tone={TONO_ESTADO[r.estado] ?? "warning"}>{r.estado}</Chip>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.total_registros}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatoTamano(r.tamano)}</td>
                    <td className="max-w-[280px] truncate px-3 py-2 text-xs text-muted-foreground" title={r.detalle}>
                      {r.detalle || "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-2">
                        {esAdmin && r.storage_path ? (
                          <button className={botonSecundario} onClick={() => void descargar(r)}>
                            <Download className="h-3.5 w-3.5" /> Descargar
                          </button>
                        ) : null}
                        {esAdmin ? (
                          <button
                            className={botonSecundario}
                            onClick={() => {
                              if (confirm("¿Eliminar este respaldo y su archivo?")) borrar.mutate(r);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel
        title="Exportación general"
        action={
          <div className="flex gap-2">
            <button className={botonSecundario} onClick={() => setSeleccion(TABLAS_EXPORTABLES.map((t) => t.tabla))}>
              Todos
            </button>
            <button className={botonSecundario} onClick={() => setSeleccion([])}>
              Ninguno
            </button>
            <button className={botonSecundario} onClick={() => void exportarGeneral("json")} disabled={exportando}>
              JSON
            </button>
            <button className={botonPrimario} onClick={() => void exportarGeneral("xlsx")} disabled={exportando}>
              {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Excel completo
            </button>
          </div>
        }
      >
        <div className="grid gap-2 p-1 sm:grid-cols-2 lg:grid-cols-3">
          {TABLAS_EXPORTABLES.map((t) => (
            <div
              key={t.tabla}
              className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
            >
              <label className="flex min-w-0 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={seleccion.includes(t.tabla)}
                  onChange={() => alternar(t.tabla)}
                />
                <span className="truncate">{t.etiqueta}</span>
              </label>
              <button
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                onClick={() => void exportarTabla(t.tabla, t.etiqueta)}
              >
                CSV
              </button>
            </div>
          ))}
        </div>
        <p className="px-3 pb-2 pt-3 text-xs text-muted-foreground">
          Las exportaciones respetan los permisos del usuario: solo se descarga la información que ya podés ver.
          Último respaldo verificado: {ultimo ? formatFecha(ultimo.created_at) : "—"}.
        </p>
      </Panel>
    </AppShell>
  );
}
