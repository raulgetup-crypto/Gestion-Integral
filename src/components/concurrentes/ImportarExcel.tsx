import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Download, FileDown, Upload } from "lucide-react";
import { toast } from "sonner";
import { Modal, botonPrimario, botonSecundario } from "@/components/forms";
import { Chip } from "@/components/ui-kit";
import { importarConcurrentesTolerante, fetchCatalogos, LUGARES_FIRMA, type Concurrente } from "@/lib/api";
import { COLUMNAS_PLANTILLA, descargarPlantilla } from "@/lib/plantilla-import";
import { exportarErrores, leerArchivo, validarFilas, type FilaImport } from "@/lib/import-validacion";

export function ImportarExcel({
  abierto,
  onClose,
  existentes,
}: {
  abierto: boolean;
  onClose: () => void;
  existentes: Concurrente[];
}) {
  const qc = useQueryClient();
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [filas, setFilas] = useState<FilaImport[]>([]);
  const [faltanColumnas, setFaltanColumnas] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [resumen, setResumen] = useState<string>("");

  const { data: catalogos } = useQuery({ queryKey: ["catalogos"], queryFn: fetchCatalogos });
  const prestaciones = useMemo(() => catalogos?.prestaciones ?? [], [catalogos]);
  const obrasSociales = useMemo(() => catalogos?.mutuales ?? [], [catalogos]);

  function limpiar() {
    setFilas([]);
    setFaltanColumnas([]);
    setNombreArchivo("");
    setResumen("");
  }

  async function leer(file: File) {
    try {
      const crudo = await leerArchivo(file);
      if (crudo.length === 0) {
        toast.error("El archivo no tiene filas");
        return;
      }
      const r = validarFilas(crudo, { existentes, prestaciones, obrasSociales });
      setNombreArchivo(file.name);
      setFaltanColumnas(r.faltanColumnas);
      setFilas(r.filas);
      setResumen("");
    } catch (e) {
      toast.error(`No se pudo leer el archivo: ${(e as Error).message}`);
    }
  }

  const validas = filas.filter((f) => f.errores.length === 0 && !f.duplicado);
  const conError = filas.filter((f) => f.errores.length > 0);
  const duplicadas = filas.filter((f) => f.duplicado && f.errores.length === 0);

  async function importar() {
    setGuardando(true);
    try {
      const r = await importarConcurrentesTolerante(validas.map((f) => f.datos));
      qc.invalidateQueries({ queryKey: ["concurrentes"] });
      qc.invalidateQueries({ queryKey: ["historial"] });
      setResumen(
        `Procesados: ${filas.length} · Importados: ${r.importados} · Omitidos: ${
          filas.length - validas.length
        } · Duplicados: ${duplicadas.length} · Errores: ${conError.length + r.fallidos.length}`,
      );
      if (r.fallidos.length) {
        toast.warning(`${r.importados} importados, ${r.fallidos.length} rechazados por la base`);
      } else {
        toast.success(`${r.importados} concurrentes importados`);
      }
    } catch (e) {
      toast.error(`No se pudo importar: ${(e as Error).message}`);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal
      abierto={abierto}
      onClose={() => {
        limpiar();
        onClose();
      }}
      titulo="Importación masiva de concurrentes"
      footer={
        <>
          <button
            className={botonSecundario}
            onClick={() => {
              limpiar();
              onClose();
            }}
          >
            Cerrar
          </button>
          <button className={botonPrimario} disabled={validas.length === 0 || guardando} onClick={importar}>
            Importar {validas.length > 0 ? `${validas.length} válidos` : ""}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <button
          className={`${botonSecundario} w-full`}
          onClick={() => descargarPlantilla({ prestaciones, obrasSociales, lugaresFirma: LUGARES_FIRMA })}
        >
          <FileDown className="h-4 w-4" /> Descargar plantilla oficial
        </button>

        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-6 text-center hover:bg-accent/40">
          <Upload className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {nombreArchivo || "Elegí un archivo .xlsx, .xls o .csv"}
          </span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void leer(f);
            }}
          />
        </label>

        <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          <p className="mb-1 font-medium text-foreground">Columnas de la plantilla</p>
          {COLUMNAS_PLANTILLA.map((c) => c.etiqueta + (c.requerida ? " *" : "")).join(" · ")}
        </div>

        {faltanColumnas.length > 0 && (
          <p className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Faltan columnas obligatorias: {faltanColumnas.join(", ")}. Usá la plantilla oficial.
          </p>
        )}

        {resumen && (
          <p className="rounded-lg bg-success/10 p-3 text-xs font-medium text-success">{resumen}</p>
        )}

        {filas.length > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="success">
                <CheckCircle2 className="h-3 w-3" /> {validas.length} válidos
              </Chip>
              <Chip tone="warning">{duplicadas.length} duplicados</Chip>
              <Chip tone="danger">{conError.length} con error</Chip>
              {(conError.length > 0 || duplicadas.length > 0) && (
                <button
                  className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg border border-input px-2.5 text-xs font-medium hover:bg-accent"
                  onClick={() => exportarErrores(filas)}
                >
                  <Download className="h-3.5 w-3.5" /> Descargar errores
                </button>
              )}
            </div>

            <div className="max-h-72 overflow-auto rounded-lg border border-border">
              <table className="w-full min-w-[560px] text-xs">
                <thead className="sticky top-0 bg-muted text-left uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 font-medium">#</th>
                    <th className="px-2 py-2 font-medium">Nombre</th>
                    <th className="px-2 py-2 font-medium">DNI</th>
                    <th className="px-2 py-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filas.map((f) => (
                    <tr key={f.linea}>
                      <td className="px-2 py-1.5 text-muted-foreground">{f.linea}</td>
                      <td className="px-2 py-1.5">{f.datos.nombre}</td>
                      <td className="px-2 py-1.5 tabular-nums">{f.datos.dni}</td>
                      <td className="px-2 py-1.5">
                        {f.errores.length > 0 ? (
                          <span className="text-destructive">{f.errores.join(" · ")}</span>
                        ) : f.duplicado ? (
                          <span className="text-warning">{f.motivoDuplicado}</span>
                        ) : (
                          <span className="text-success">Válido</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
