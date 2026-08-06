import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Paperclip } from "lucide-react";
import { Modal, botonPrimario, botonSecundario } from "@/components/forms";
import { Texto, Fecha, Selector, Area, ResumenErrores, useUsuarioActual } from "@/components/kalen/campos";
import { fetchConcurrentes, MAX_ARCHIVO_MB } from "@/lib/api";
import {
  ESTADOS_DOCUMENTO,
  ESTADO_DOCUMENTO_LABEL,
  TIPOS_DOCUMENTO,
  diasHasta,
  guardarDocumento,
  fetchVersionesDocumento,
  subirVersionDocumento,
  urlDocumento,
  validarArchivo,
  type DocumentoKalen,
} from "@/lib/kalen";


type Borrador = Partial<DocumentoKalen>;

const VACIO: Borrador = {
  concurrente_id: "",
  tipo_documento: "",
  fecha_solicitud: new Date().toISOString().slice(0, 10),
  fecha_recepcion: null,
  fecha_vencimiento: null,
  estado: "pendiente",
  observaciones: "",
  activo: true,
};

/** Tono visual del vencimiento: vencido, próximo (30 días) o en regla. */
export function tonoVencimiento(fecha: string | null): "danger" | "warning" | "muted" {
  const d = diasHasta(fecha);
  if (d === null) return "muted";
  if (d < 0) return "danger";
  return d <= 30 ? "warning" : "muted";
}

export function DocumentoForm({
  abierto,
  onClose,
  inicial,
  concurrenteId,
}: {
  abierto: boolean;
  onClose: () => void;
  inicial?: DocumentoKalen | null;
  concurrenteId?: string;
}) {
  const qc = useQueryClient();
  const { usuario, usuarioId } = useUsuarioActual();
  const { data: concurrentes = [] } = useQuery({ queryKey: ["concurrentes"], queryFn: fetchConcurrentes });

  const [f, setF] = useState<Borrador>(VACIO);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);

  const { data: versiones = [] } = useQuery({
    queryKey: ["documento-versiones", f.id],
    queryFn: () => fetchVersionesDocumento(String(f.id)),
    enabled: Boolean(abierto && f.id),
  });

  useEffect(() => {
    if (!abierto) return;
    setErrores({});
    setFile(null);
    setErrorArchivo(null);
    setF(inicial ? { ...inicial } : { ...VACIO, concurrente_id: concurrenteId ?? "" });
  }, [abierto, inicial, concurrenteId]);

  const set = <K extends keyof Borrador>(k: K, v: Borrador[K]) => setF((p) => ({ ...p, [k]: v }));

  const elegirArchivo = (elegido: File | null) => {
    if (!elegido) {
      setFile(null);
      setErrorArchivo(null);
      return;
    }
    const problema = validarArchivo(elegido);
    setErrorArchivo(problema);
    setFile(problema ? null : elegido);
  };

  const abrirVersion = async (path: string) => {
    const url = await urlDocumento(path);
    if (url) window.open(url, "_blank", "noopener");
    else toast.error("No se pudo generar el enlace del archivo.");
  };

  const dias = diasHasta(f.fecha_vencimiento ?? null);
  const tono = tonoVencimiento(f.fecha_vencimiento ?? null);

  const guardar = useMutation({
    mutationFn: async () => {
      const e: Record<string, string> = {};
      const existe = concurrentes.some((c) => c.id === f.concurrente_id);
      if (!f.concurrente_id || !existe) e.concurrente_id = "Elegí un concurrente existente para cargar el documento.";
      if (!f.tipo_documento?.trim()) e.tipo_documento = "El tipo de documento es obligatorio.";
      if (errorArchivo) e.archivo = errorArchivo;
      setErrores(e);
      if (Object.keys(e).length) throw new Error("VALIDACION");

      const guardado = (await guardarDocumento(
        { ...f, concurrente_id: f.concurrente_id! },
        usuarioId,
      )) as DocumentoKalen;

      if (file && guardado?.id) {
        await subirVersionDocumento({
          documentoId: guardado.id,
          concurrenteId: f.concurrente_id!,
          file,
          usuario: usuario?.nombre ?? "",
          usuarioId,
        });
      }
      return guardado;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documentos-kalen"] });
      qc.invalidateQueries({ queryKey: ["documentos"] });
      qc.invalidateQueries({ queryKey: ["documento-versiones"] });
      toast.success(file ? "Documento guardado con nueva versión" : f.id ? "Documento actualizado" : "Documento cargado");
      onClose();
    },
    onError: (err: Error) => {
      if (err.message === "VALIDACION") return;
      toast.error(`No se pudo guardar: ${err.message}`);
    },
  });


  return (
    <Modal
      abierto={abierto}
      onClose={onClose}
      titulo={f.id ? "Editar documento" : "Nuevo documento"}
      ancho="sm:max-w-2xl"
      footer={
        <>
          <button className={botonSecundario} type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className={botonPrimario} type="button" disabled={guardar.isPending} onClick={() => guardar.mutate()}>
            {guardar.isPending ? "Guardando…" : "Guardar documento"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <ResumenErrores errores={errores} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Selector
            label="Concurrente"
            requerido
            value={f.concurrente_id ?? null}
            error={errores.concurrente_id}
            opciones={concurrentes.map((c) => ({
              value: c.id,
              label: `${c.apellido || ""} ${c.nombre}`.trim() + (c.dni ? ` · ${c.dni}` : ""),
            }))}
            onChange={(v) => set("concurrente_id", v)}
          />
          <Texto
            label="Tipo de documento"
            requerido
            value={f.tipo_documento ?? ""}
            error={errores.tipo_documento}
            placeholder="CUD, DNI, certificado escolar…"
            sugerencias={TIPOS_DOCUMENTO}
            onChange={(v) => set("tipo_documento", v)}
          />

          <Fecha
            label="Fecha de solicitud"
            value={f.fecha_solicitud ?? null}
            onChange={(v) => set("fecha_solicitud", v || null)}
          />
          <Fecha
            label="Fecha de recepción"
            value={f.fecha_recepcion ?? null}
            onChange={(v) => set("fecha_recepcion", v || null)}
          />
          <Fecha
            label="Fecha de vencimiento"
            value={f.fecha_vencimiento ?? null}
            onChange={(v) => set("fecha_vencimiento", v || null)}
          />
          <Selector
            label="Estado"
            vacio={null}
            value={f.estado ?? "pendiente"}
            opciones={ESTADOS_DOCUMENTO.map((e) => ({ value: e, label: ESTADO_DOCUMENTO_LABEL[e] }))}
            onChange={(v) => set("estado", v as DocumentoKalen["estado"])}
          />
        </div>

        {dias !== null && tono !== "muted" && (
          <p
            className={
              tono === "danger"
                ? "rounded-lg bg-destructive/15 px-3 py-2 text-xs font-medium text-destructive"
                : "rounded-lg bg-warning/20 px-3 py-2 text-xs font-medium text-warning"
            }
          >
            {dias < 0 ? `Documento vencido hace ${Math.abs(dias)} día(s).` : `Vence en ${dias} día(s).`}
          </p>
        )}

        <Area label="Observaciones" value={f.observaciones ?? ""} onChange={(v) => set("observaciones", v)} />

        <div className="rounded-xl border border-border/60 p-3">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Paperclip className="h-4 w-4" /> Archivo del documento
          </p>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.odt,.jpg,.jpeg,.png,.webp,.heic,.gif"
            className="block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-medium"
            onChange={(e) => elegirArchivo(e.target.files?.[0] ?? null)}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            PDF, Word o imagen · hasta {MAX_ARCHIVO_MB} MB. Cada archivo se guarda como una versión nueva.
          </p>
          {errorArchivo && <p className="mt-1 text-xs font-medium text-destructive">{errorArchivo}</p>}

          {versiones.length > 0 && (
            <ul className="mt-3 space-y-1">
              {versiones.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-2 py-1.5 text-xs"
                >
                  <span className="truncate">
                    <strong>v{v.version}</strong> · {v.nombre}
                    {v.usuario ? ` · ${v.usuario}` : ""} · {new Date(v.created_at).toLocaleDateString("es-AR")}
                  </span>
                  <button
                    type="button"
                    className="inline-flex shrink-0 items-center gap-1 text-primary hover:underline"
                    onClick={() => abrirVersion(v.storage_path)}
                  >
                    <Download className="h-3.5 w-3.5" /> Abrir
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!f.id && <p className="mt-2 text-xs text-muted-foreground">El historial de versiones se ve al reabrir el documento.</p>}
        </div>

      </div>
    </Modal>
  );
}
