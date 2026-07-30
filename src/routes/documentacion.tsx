import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Upload, FileText, Trash2, ExternalLink, AlertTriangle, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, Chip, EmptyState, StatCard } from "@/components/ui-kit";
import {
  documentosApi,
  fetchConcurrentes,
  subirDocumento,
  urlDocumento,
  borrarArchivo,
  logHistorial,
} from "@/lib/api";
import { formatFecha, diasHasta } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/documentacion")({
  head: () => ({
    meta: [
      { title: "Documentación — Centro de Día" },
      {
        name: "description",
        content: "Gestión de documentos PDF, imágenes y Word por concurrente, con control de vencimientos y alertas.",
      },
      { property: "og:title", content: "Documentación — Centro de Día" },
      { property: "og:description", content: "Subí, organizá y controlá el vencimiento de la documentación del centro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DocumentacionPage,
});

const field = "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm";

function DocumentacionPage() {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("certificado");
  const [concurrenteId, setConcurrenteId] = useState("");
  const [vencimiento, setVencimiento] = useState("");
  const [filtro, setFiltro] = useState("");

  const { data: docs = [] } = useQuery({ queryKey: ["documentos"], queryFn: documentosApi.list });
  const { data: personas = [] } = useQuery({ queryKey: ["concurrentes"], queryFn: fetchConcurrentes });

  const nombrePersona = (id: string | null) => personas.find((p) => p.id === id)?.nombre ?? "General";

  const subir = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Elegí un archivo");
      const path = await subirDocumento(file, concurrenteId || null);
      return documentosApi.create({
        nombre: nombre.trim() || file.name,
        tipo,
        storage_path: path,
        concurrente_id: concurrenteId || null,
        vencimiento: vencimiento || null,
      });
    },
    onSuccess: (d) => {
      logHistorial({
        entidad: "documento",
        accion: "alta",
        detalle: `Documento "${d.nombre}" cargado para ${nombrePersona(d.concurrente_id)}`,
        entidad_id: d.id,
        concurrente_id: d.concurrente_id,
      });
      qc.invalidateQueries({ queryKey: ["documentos"] });
      qc.invalidateQueries({ queryKey: ["historial"] });
      setFile(null);
      setNombre("");
      setVencimiento("");
      toast.success("Documento cargado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const borrar = useMutation({
    mutationFn: async ({ id, path }: { id: string; path: string }) => {
      await borrarArchivo(path);
      await documentosApi.remove(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documentos"] });
      toast.success("Documento eliminado");
    },
  });

  async function abrir(path: string) {
    const url = await urlDocumento(path);
    if (url) window.open(url, "_blank", "noopener");
    else toast.error("No se pudo abrir el archivo");
  }

  const lista = docs.filter((d) =>
    filtro.trim() ? `${d.nombre} ${d.tipo} ${nombrePersona(d.concurrente_id)}`.toLowerCase().includes(filtro.toLowerCase()) : true,
  );
  const vencidos = docs.filter((d) => d.vencimiento && (diasHasta(d.vencimiento) ?? 99) < 0).length;
  const porVencer = docs.filter((d) => {
    const dd = diasHasta(d.vencimiento);
    return dd !== null && dd >= 0 && dd <= 30;
  }).length;

  return (
    <AppShell title="Documentación" description="PDF, imágenes y Word con control de vencimientos">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={FolderOpen} label="Documentos" value={docs.length} tone="info" />
        <StatCard icon={AlertTriangle} label="Vencidos" value={vencidos} tone="danger" />
        <StatCard icon={AlertTriangle} label="Vencen en 30 días" value={porVencer} tone="warning" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Panel
          title={`${lista.length} documentos`}
          action={
            <input
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Buscar…"
              className="h-8 w-40 rounded-lg border border-input bg-card px-2 text-xs"
            />
          }
        >
          {lista.length === 0 ? (
            <EmptyState icon={FileText} title="Sin documentos" hint="Subí el primer archivo desde el panel de la derecha." />
          ) : (
            <ul className="divide-y divide-border">
              {lista.map((d) => {
                const dias = diasHasta(d.vencimiento);
                return (
                  <li key={d.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{d.nombre}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {nombrePersona(d.concurrente_id)} · {d.tipo}
                        {d.vencimiento ? ` · vence ${formatFecha(d.vencimiento)}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {dias !== null && (
                        <Chip tone={dias < 0 ? "danger" : dias <= 30 ? "warning" : "success"}>
                          {dias < 0 ? "Vencido" : `${dias} d`}
                        </Chip>
                      )}
                      <button onClick={() => abrir(d.storage_path)} className="rounded-md p-1.5 text-muted-foreground hover:text-primary" aria-label="Abrir">
                        <ExternalLink className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => borrar.mutate({ id: d.id, path: d.storage_path })}
                        className="rounded-md p-1.5 text-muted-foreground hover:text-destructive"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Subir documento">
          <div className="space-y-3 p-4">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-6 text-center hover:bg-accent/40">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{file ? file.name : "Elegí un PDF, imagen o Word"}</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx,image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <input placeholder="Nombre del documento" value={nombre} onChange={(e) => setNombre(e.target.value)} className={field} />
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={field}>
              <option value="certificado">Certificado de discapacidad</option>
              <option value="autorizacion">Autorización</option>
              <option value="informe">Informe</option>
              <option value="dni">DNI</option>
              <option value="credencial">Credencial obra social</option>
              <option value="otro">Otro</option>
            </select>
            <select value={concurrenteId} onChange={(e) => setConcurrenteId(e.target.value)} className={field}>
              <option value="">General (sin concurrente)</option>
              {personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Vencimiento (opcional)</span>
              <input type="date" value={vencimiento} onChange={(e) => setVencimiento(e.target.value)} className={field} />
            </label>
            <button
              disabled={!file || subir.isPending}
              onClick={() => subir.mutate()}
              className={cn(
                "inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground",
                (!file || subir.isPending) && "opacity-50",
              )}
            >
              <Upload className="h-4 w-4" /> {subir.isPending ? "Subiendo…" : "Subir documento"}
            </button>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
