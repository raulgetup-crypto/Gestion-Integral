import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Upload,
  FileText,
  Trash2,
  ExternalLink,
  AlertTriangle,
  FolderOpen,
  BellRing,
  History,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, Chip, EmptyState, StatCard } from "@/components/ui-kit";
import { Exportar } from "@/components/Exportar";
import { campo, Etiqueta, Segmentado, botonPrimario } from "@/components/forms";
import { DocumentoForm } from "@/components/kalen/DocumentoForm";
import { fetchDocumentosKalen, ESTADO_DOCUMENTO_LABEL, type DocumentoKalen } from "@/lib/kalen";
import {
  documentosApi,
  eventosApi,
  fetchConcurrentes,
  fetchHistorial,
  subirDocumento,
  urlDocumento,
  borrarArchivo,
  validarArchivo,
  MAX_ARCHIVO_MB,
  type Documento,
} from "@/lib/api";
import { formatFecha, diasHasta, tiempoRelativo } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/documentacion")({
  head: () => ({
    meta: [
      { title: "Documentación — Centro de Día" },
      {
        name: "description",
        content: "Gestión de documentos PDF, imágenes y Word por concurrente, con vencimientos, recordatorios e historial.",
      },
      { property: "og:title", content: "Documentación — Centro de Día" },
      { property: "og:description", content: "Subí, organizá y controlá el vencimiento de la documentación del centro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DocumentacionPage,
});

const FILTROS_ESTADO = [
  { value: "todos" as const, label: "Todos" },
  { value: "vencidos" as const, label: "Vencidos" },
  { value: "porvencer" as const, label: "Por vencer" },
  { value: "sinvto" as const, label: "Sin vencimiento" },
];

function DocumentacionPage() {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("certificado");
  const [concurrenteId, setConcurrenteId] = useState("");
  const [vencimiento, setVencimiento] = useState("");
  const [recordatorio, setRecordatorio] = useState(true);
  const [filtro, setFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<"todos" | "vencidos" | "porvencer" | "sinvto">("todos");

  const { data: docs = [] } = useQuery({ queryKey: ["documentos"], queryFn: documentosApi.list });
  const { data: personas = [] } = useQuery({ queryKey: ["concurrentes"], queryFn: fetchConcurrentes });
  const { data: historial = [] } = useQuery({ queryKey: ["historial"], queryFn: () => fetchHistorial(80) });
  const { data: docsKalen = [] } = useQuery({ queryKey: ["documentos-kalen"], queryFn: fetchDocumentosKalen });
  const [formAbierto, setFormAbierto] = useState(false);
  const [docEditar, setDocEditar] = useState<DocumentoKalen | null>(null);

  const nombrePersona = (id: string | null) => personas.find((p) => p.id === id)?.nombre ?? "General";

  const subir = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Elegí un archivo");
      const problema = validarArchivo(file);
      if (problema) throw new Error(problema);
      const path = await subirDocumento(file, concurrenteId || null);
      const doc = await documentosApi.create({
        nombre: nombre.trim() || file.name,
        tipo,
        storage_path: path,
        concurrente_id: concurrenteId || null,
        vencimiento: vencimiento || null,
      });
      // Recordatorio: agenda automáticamente el vencimiento en el calendario.
      if (vencimiento && recordatorio) {
        await eventosApi.create({
          titulo: `Vence: ${doc.nombre}`,
          fecha: vencimiento,
          hora: "",
          prioridad: "alta",
          categoria: "documentacion",
          color: "rojo",
          estado: "pendiente",
          descripcion: `Documento de ${nombrePersona(doc.concurrente_id)}`,
          concurrente_id: doc.concurrente_id,
        });
      }
      return doc;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documentos"] });
      qc.invalidateQueries({ queryKey: ["eventos"] });
      qc.invalidateQueries({ queryKey: ["historial"] });
      setFile(null);
      setNombre("");
      setVencimiento("");
      toast.success("Documento cargado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const borrar = useMutation({
    mutationFn: async (d: Documento) => {
      await borrarArchivo(d.storage_path);
      await documentosApi.remove(d.id, `el documento "${d.nombre}"`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documentos"] });
      qc.invalidateQueries({ queryKey: ["historial"] });
      toast.success("Documento eliminado");
    },
    onError: (e: Error) => toast.error(`No se pudo eliminar: ${e.message}`),
  });

  const actualizarVto = useMutation({
    mutationFn: ({ id, vencimiento: v }: { id: string; vencimiento: string | null }) =>
      documentosApi.update(id, { vencimiento: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documentos"] });
      qc.invalidateQueries({ queryKey: ["historial"] });
    },
    onError: (e: Error) => toast.error(`No se pudo actualizar: ${e.message}`),
  });

  async function abrir(path: string) {
    const url = await urlDocumento(path);
    if (url) window.open(url, "_blank", "noopener");
    else toast.error("No se pudo abrir el archivo");
  }

  const lista = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    return docs.filter((d) => {
      const dias = diasHasta(d.vencimiento);
      if (estadoFiltro === "vencidos" && !(dias !== null && dias < 0)) return false;
      if (estadoFiltro === "porvencer" && !(dias !== null && dias >= 0 && dias <= 30)) return false;
      if (estadoFiltro === "sinvto" && d.vencimiento) return false;
      if (!q) return true;
      return [d.nombre, d.tipo, nombrePersona(d.concurrente_id)].join(" ").toLowerCase().includes(q);
    });
  }, [docs, filtro, estadoFiltro, personas]);

  const vencidos = docs.filter((d) => (diasHasta(d.vencimiento) ?? 1) < 0).length;
  const porVencer = docs.filter((d) => {
    const x = diasHasta(d.vencimiento);
    return x !== null && x >= 0 && x <= 30;
  }).length;

  const historialDocs = historial.filter((h) => h.entidad === "documento").slice(0, 12);

  return (
    <AppShell title="Documentación" description="Legajos digitales, vencimientos y recordatorios">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={FolderOpen} label="Documentos" value={docs.length} tone="info" />
        <StatCard icon={AlertTriangle} label="Vencidos" value={vencidos} tone="danger" />
        <StatCard icon={AlertTriangle} label="Vencen en 30 días" value={porVencer} tone="warning" />
      </div>

      <div className="mt-4">
        <Panel
          title="Control documental por concurrente"
          action={
            <button
              className={botonPrimario}
              onClick={() => {
                setDocEditar(null);
                setFormAbierto(true);
              }}
            >
              <Upload className="h-4 w-4" /> Nuevo documento
            </button>
          }
        >
          {docsKalen.length === 0 ? (
            <EmptyState icon={FileText} title="Sin documentos controlados" hint="Registrá el primer requisito con fechas y archivo." />
          ) : (
            <ul className="divide-y divide-border">
              {docsKalen.slice(0, 25).map((d) => {
                const dias = diasHasta(d.fecha_vencimiento);
                return (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {d.tipo_documento || d.nombre}
                        {d.version ? <span className="ml-2 text-xs text-muted-foreground">v{d.version}</span> : null}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {nombrePersona(d.concurrente_id)} · {ESTADO_DOCUMENTO_LABEL[d.estado] ?? d.estado}
                        {d.fecha_vencimiento ? ` · vence ${formatFecha(d.fecha_vencimiento)}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {dias !== null && (
                        <Chip tone={dias < 0 ? "danger" : dias <= 30 ? "warning" : "success"}>
                          {dias < 0 ? "Vencido" : `${dias} d`}
                        </Chip>
                      )}
                      {d.archivo_nombre ? <Chip tone="info">Con archivo</Chip> : <Chip>Sin archivo</Chip>}
                      <button
                        className="rounded-md px-2 py-1 text-xs text-primary hover:underline"
                        onClick={() => {
                          setDocEditar(d);
                          setFormAbierto(true);
                        }}
                      >
                        Abrir
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <DocumentoForm abierto={formAbierto} onClose={() => setFormAbierto(false)} inicial={docEditar} />

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Panel
            title={`${lista.length} documentos`}
            action={
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    placeholder="Buscar…"
                    className="h-8 w-32 rounded-lg border border-input bg-card pl-7 pr-2 text-xs sm:w-48"
                  />
                </div>
                <Exportar
                  filas={lista.map((d) => ({
                    Documento: d.nombre,
                    Tipo: d.tipo,
                    Concurrente: nombrePersona(d.concurrente_id),
                    Requisito: d.requisito ?? "",
                    Vencimiento: d.vencimiento ?? "",
                    Notas: d.notas ?? "",
                  }))}
                  nombre="documentacion"
                  titulo="Documentación"
                />
              </div>
            }
          >
            <div className="border-b border-border p-3">
              <Segmentado valor={estadoFiltro} opciones={FILTROS_ESTADO} onChange={setEstadoFiltro} />
            </div>
            {lista.length === 0 ? (
              <EmptyState icon={FileText} title="Sin documentos" hint="Subí el primer archivo desde el panel lateral." />
            ) : (
              <ul className="divide-y divide-border">
                {lista.map((d) => {
                  const dias = diasHasta(d.vencimiento);
                  return (
                    <li key={d.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{d.nombre}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {nombrePersona(d.concurrente_id)} · {d.tipo}
                        </p>
                      </div>
                      <div className="col-span-2 flex flex-wrap items-center gap-1 sm:col-span-1 sm:shrink-0">
                        {dias !== null && (
                          <Chip tone={dias < 0 ? "danger" : dias <= 30 ? "warning" : "success"}>
                            {dias < 0 ? "Vencido" : `${dias} d`}
                          </Chip>
                        )}
                        <input
                          type="date"
                          value={d.vencimiento ?? ""}
                          onChange={(e) => actualizarVto.mutate({ id: d.id, vencimiento: e.target.value || null })}
                          className="h-7 rounded-md border border-input bg-card px-2 text-[11px]"
                          aria-label="Vencimiento"
                        />
                        <button onClick={() => abrir(d.storage_path)} className="rounded-md p-1.5 text-muted-foreground hover:text-primary" aria-label="Abrir">
                          <ExternalLink className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => borrar.mutate(d)}
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

          <Panel title="Historial de documentación">
            {historialDocs.length === 0 ? (
              <EmptyState icon={History} title="Sin movimientos" />
            ) : (
              <ul className="divide-y divide-border">
                {historialDocs.map((h) => (
                  <li key={h.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5">
                    <span className="min-w-0 truncate text-sm">{h.detalle}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{tiempoRelativo(h.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <Panel title="Subir documento">
          <div className="space-y-3 p-4">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-6 text-center hover:bg-accent/40">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {file ? file.name : `PDF, Word o imagen (hasta ${MAX_ARCHIVO_MB} MB)`}
              </span>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.odt,image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  const problema = f ? validarArchivo(f) : null;
                  setErrorArchivo(problema);
                  setFile(problema ? null : f);
                  if (problema) toast.error(problema);
                }}
              />
            </label>
            {errorArchivo && <p className="text-xs text-destructive">{errorArchivo}</p>}

            <label className="block">
              <Etiqueta>Nombre del documento</Etiqueta>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={campo} placeholder="Opcional" />
            </label>
            <label className="block">
              <Etiqueta>Tipo</Etiqueta>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={campo}>
                <option value="certificado">Certificado de discapacidad</option>
                <option value="autorizacion">Autorización</option>
                <option value="informe">Informe</option>
                <option value="dni">DNI</option>
                <option value="credencial">Credencial obra social</option>
                <option value="otro">Otro</option>
              </select>
            </label>
            <label className="block">
              <Etiqueta>Concurrente</Etiqueta>
              <select value={concurrenteId} onChange={(e) => setConcurrenteId(e.target.value)} className={campo}>
                <option value="">General (sin concurrente)</option>
                {personas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <Etiqueta>Vencimiento (opcional)</Etiqueta>
              <input type="date" value={vencimiento} onChange={(e) => setVencimiento(e.target.value)} className={campo} />
            </label>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={recordatorio}
                disabled={!vencimiento}
                onChange={(e) => setRecordatorio(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <BellRing className="h-3.5 w-3.5" /> Crear recordatorio en el calendario
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
