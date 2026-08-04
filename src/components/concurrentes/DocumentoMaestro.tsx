import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, Printer, Save, Upload, FileText, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Panel, EmptyState, Chip } from "@/components/ui-kit";
import { areaTexto, botonPrimario, botonSecundario, campo, Etiqueta } from "@/components/forms";
import { useEntidad } from "@/hooks/use-entidad";
import {
  fetchDocMaestro,
  fetchDocMaestroVersiones,
  guardarDocMaestro,
  docMaestroArchivosApi,
  subirVersionDocMaestro,
  urlDocumento,
  borrarArchivo,
  MAX_ARCHIVO_MB,
  type DocMaestroArchivo,
  type Concurrente,
} from "@/lib/api";
import { imprimirHTML } from "@/lib/export";
import { formatFechaHora } from "@/lib/format";

const escapar = (v: unknown) =>
  String(v ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] ?? c);

const pesoLegible = (b: number) =>
  b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;


/**
 * Documento maestro del concurrente: texto largo con versionado automático.
 * Cada guardado crea una versión nueva; las anteriores nunca se borran.
 */
export function DocumentoMaestro({ persona }: { persona: Concurrente }) {
  const qc = useQueryClient();
  const [texto, setTexto] = useState("");
  const [resumen, setResumen] = useState("");
  const [verVersiones, setVerVersiones] = useState(false);

  const { data: doc, isLoading } = useQuery({
    queryKey: ["doc-maestro", persona.id],
    queryFn: () => fetchDocMaestro(persona.id),
  });
  const { data: versiones = [] } = useQuery({
    queryKey: ["doc-maestro-versiones", persona.id],
    queryFn: () => fetchDocMaestroVersiones(persona.id),
  });

  useEffect(() => {
    setTexto(doc?.contenido ?? "");
    setResumen("");
  }, [doc?.contenido, persona.id]);

  const guardar = useMutation({
    mutationFn: () => guardarDocMaestro(persona.id, texto, resumen.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doc-maestro", persona.id] });
      qc.invalidateQueries({ queryKey: ["doc-maestro-versiones", persona.id] });
      qc.invalidateQueries({ queryKey: ["historial"] });
      qc.invalidateQueries({ queryKey: ["historial-full"] });
      setResumen("");
      toast.success("Documento maestro guardado");
    },
    onError: (e: Error) => toast.error(`No se pudo guardar: ${e.message}`),
  });

  function imprimir() {
    imprimirHTML(
      `Documento maestro — ${persona.nombre}`,
      `<h1>Documento maestro</h1>
<div class="meta">${escapar(persona.nombre)} · DNI ${escapar(persona.dni || "—")} · ${escapar(
        persona.prestacion || "—",
      )} · Versión ${doc?.version ?? 1} · Generado el ${new Date().toLocaleString("es-AR")}</div>
<div style="white-space:pre-wrap;font-size:12px;line-height:1.55">${escapar(texto)}</div>
<div class="firmas"><div class="firma">Firma responsable</div><div class="firma">Aclaración</div></div>`,
    );
  }

  const sinGuardar = texto !== (doc?.contenido ?? "");

  return (
    <div className="space-y-4">
      <Panel
        title={`Documento maestro${doc ? ` · versión ${doc.version}` : ""}`}
        action={
          <div className="flex gap-2">
            <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-input px-3 text-xs font-medium hover:bg-accent" onClick={imprimir}>
              <Printer className="h-3.5 w-3.5" /> Imprimir / PDF
            </button>
            <button
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-input px-3 text-xs font-medium hover:bg-accent"
              onClick={() => setVerVersiones((v) => !v)}
            >
              <History className="h-3.5 w-3.5" /> Versiones ({versiones.length})
            </button>
          </div>
        }
      >
        <div className="space-y-3 p-4">
          <p className="text-xs text-muted-foreground">
            Información permanente del concurrente: indicaciones médicas, datos familiares, restricciones,
            particularidades e información útil para cualquier profesional.
          </p>
          <textarea
            rows={16}
            className={areaTexto}
            placeholder={isLoading ? "Cargando…" : "Escribí acá toda la información importante…"}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <label className="block">
            <Etiqueta>Motivo del cambio (opcional)</Etiqueta>
            <input
              className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              maxLength={200}
              value={resumen}
              onChange={(e) => setResumen(e.target.value)}
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              className={botonPrimario}
              disabled={!sinGuardar || guardar.isPending}
              onClick={() => guardar.mutate()}
            >
              <Save className="h-4 w-4" /> Guardar nueva versión
            </button>
            {sinGuardar && <span className="text-xs text-warning">Hay cambios sin guardar</span>}
            {doc?.actualizado_por && (
              <span className="ml-auto text-[11px] text-muted-foreground">
                Última edición: {doc.actualizado_por}
              </span>
            )}
          </div>
        </div>
      </Panel>

      {verVersiones && (
        <Panel title="Historial de versiones">
          {versiones.length === 0 ? (
            <EmptyState icon={History} title="Sin versiones" hint="Al guardar se registra la primera versión." />
          ) : (
            <ul className="divide-y divide-border">
              {versiones.map((v) => (
                <li key={v.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip tone="info">v{v.version}</Chip>
                    <span className="text-xs text-muted-foreground">{formatFechaHora(v.created_at)}</span>
                    <span className="text-xs text-muted-foreground">{v.usuario || "—"}</span>
                    {v.resumen && <span className="text-xs">{v.resumen}</span>}
                    <button
                      className={`${botonSecundario} ml-auto h-8 px-2.5 text-xs`}
                      onClick={() => setTexto(v.contenido)}
                    >
                      Ver contenido
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </div>
  );
}
