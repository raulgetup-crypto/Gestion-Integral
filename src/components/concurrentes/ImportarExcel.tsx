import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Download, FileDown, Upload } from "lucide-react";
import { toast } from "sonner";
import { Modal, botonPrimario, botonSecundario, campo } from "@/components/forms";
import { Chip } from "@/components/ui-kit";
import { importarConcurrentesLote, fetchCatalogos, LUGARES_FIRMA, type Concurrente } from "@/lib/api";
import { COLUMNAS_PLANTILLA, descargarPlantilla } from "@/lib/plantilla-import";
import {
  detectarMapeo,
  exportarErrores,
  leerArchivo,
  validarFilas,
  type AccionFila,
  type FilaImport,
  type MapeoColumnas,
} from "@/lib/import-validacion";

type Informe = {
  insertados: number;
  actualizados: number;
  saltados: number;
  errores: number;
  dniReal: number;
  dniTemporal: number;
};


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
  const [crudo, setCrudo] = useState<Record<string, unknown>[]>([]);
  const [cabeceras, setCabeceras] = useState<string[]>([]);
  const [mapa, setMapa] = useState<MapeoColumnas>({});
  const [filas, setFilas] = useState<FilaImport[]>([]);
  const [faltanColumnas, setFaltanColumnas] = useState<string[]>([]);
  const [politica, setPolitica] = useState<AccionFila>("skip");
  const [guardando, setGuardando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [informe, setInforme] = useState<Informe | null>(null);

  const { data: catalogos } = useQuery({ queryKey: ["catalogos"], queryFn: fetchCatalogos });
  const prestaciones = useMemo(() => catalogos?.prestaciones ?? [], [catalogos]);
  const obrasSociales = useMemo(() => catalogos?.mutuales ?? [], [catalogos]);

  function limpiar() {
    setFilas([]);
    setCrudo([]);
    setCabeceras([]);
    setMapa({});
    setFaltanColumnas([]);
    setNombreArchivo("");
    setInforme(null);
    setProgreso(0);
  }

  function revalidar(datos: Record<string, unknown>[], m: MapeoColumnas, pol: AccionFila) {
    const r = validarFilas(datos, {
      existentes,
      prestaciones,
      obrasSociales,
      mapa: m,
      accionDuplicados: pol,
    });
    setFaltanColumnas(r.faltanColumnas);
    setFilas(r.filas);
  }

  async function leer(file: File) {
    try {
      const datos = await leerArchivo(file);
      if (datos.length === 0) {
        toast.error("El archivo no tiene filas");
        return;
      }
      const heads = Object.keys(datos[0] ?? {});
      const m = detectarMapeo(heads);
      setNombreArchivo(file.name);
      setCrudo(datos);
      setCabeceras(heads);
      setMapa(m);
      setInforme(null);
      revalidar(datos, m, politica);
    } catch (e) {
      toast.error(`No se pudo leer el archivo: ${(e as Error).message}`);
    }
  }

  function cambiarMapeo(campoDb: string, cabecera: string) {
    const m = { ...mapa, [campoDb]: cabecera };
    setMapa(m);
    revalidar(crudo, m, politica);
  }

  function cambiarPolitica(pol: AccionFila) {
    setPolitica(pol);
    revalidar(crudo, mapa, pol);
  }

  function cambiarAccionFila(linea: number, accion: AccionFila) {
    setFilas((prev) => prev.map((f) => (f.linea === linea ? { ...f, accion } : f)));
  }

  const aProcesar = filas.filter((f) => f.errores.length === 0 && f.accion !== "skip");
  const conError = filas.filter((f) => f.errores.length > 0);
  const duplicadas = filas.filter((f) => f.duplicado && f.errores.length === 0);
  const saltadas = filas.filter((f) => f.errores.length === 0 && f.accion === "skip");
  const conAviso = filas.filter((f) => f.errores.length === 0 && f.advertencias.length > 0);

  async function importar() {
    setGuardando(true);
    setProgreso(10);
    const tick = setInterval(() => setProgreso((p) => (p < 85 ? p + 5 : p)), 120);
    try {
      const r = await importarConcurrentesLote(
        aProcesar.map((f) => ({ accion: f.accion === "update" ? "update" : "insert", datos: f.datos })),
      );
      setProgreso(100);
      qc.invalidateQueries({ queryKey: ["concurrentes"] });
      qc.invalidateQueries({ queryKey: ["historial"] });
      setInforme({
        insertados: r.insertados,
        actualizados: r.actualizados,
        saltados: saltadas.length,
        errores: conError.length,
      });
      toast.success(`${r.insertados} insertados · ${r.actualizados} actualizados`);
    } catch (e) {
      setProgreso(0);
      toast.error(`Importación cancelada, no se guardó ningún registro: ${(e as Error).message}`);
    } finally {
      clearInterval(tick);
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
      ancho="sm:max-w-3xl"
      footer={
        <>
          <button
            className={botonSecundario}
            onClick={() => {
              limpiar();
              onClose();
            }}
          >
            {guardando ? "Cancelar" : "Cerrar"}
          </button>
          <button className={botonPrimario} disabled={aProcesar.length === 0 || guardando} onClick={importar}>
            {guardando ? "Importando…" : `Importar ${aProcesar.length > 0 ? aProcesar.length : ""}`}
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
            Faltan columnas obligatorias: {faltanColumnas.join(", ")}. Asignálas manualmente abajo o usá la
            plantilla oficial.
          </p>
        )}

        {cabeceras.length > 0 && (
          <details className="rounded-lg border border-border p-3" open={faltanColumnas.length > 0}>
            <summary className="cursor-pointer text-xs font-medium">Mapeo de columnas</summary>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {COLUMNAS_PLANTILLA.map((c) => (
                <label key={c.campo} className="text-xs">
                  <span className="mb-1 block text-muted-foreground">
                    {c.etiqueta}
                    {c.requerida ? " *" : ""}
                  </span>
                  <select
                    className={campo}
                    value={mapa[c.campo] ?? ""}
                    onChange={(e) => cambiarMapeo(c.campo, e.target.value)}
                  >
                    <option value="">— sin asignar —</option>
                    {cabeceras.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </details>
        )}

        {guardando && (
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-150"
              style={{ width: `${progreso}%` }}
            />
          </div>
        )}

        {informe && (
          <div className="rounded-lg border border-border bg-success/5 p-3 text-xs">
            <p className="mb-1 font-medium text-foreground">Informe de importación</p>
            <p>✅ Insertados: {informe.insertados}</p>
            <p>🔄 Actualizados: {informe.actualizados}</p>
            <p>⏭️ Saltados: {informe.saltados}</p>
            <p>❌ Con error: {informe.errores}</p>
          </div>
        )}

        {filas.length > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="success">
                <CheckCircle2 className="h-3 w-3" /> {aProcesar.length} a procesar
              </Chip>
              <Chip tone="warning">{duplicadas.length} duplicados</Chip>
              <Chip tone="warning">{conAviso.length} con advertencia</Chip>
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

            <label className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              Si el DNI ya existe en la base:
              <select
                className={`${campo} h-9 w-auto`}
                value={politica}
                onChange={(e) => cambiarPolitica(e.target.value as AccionFila)}
              >
                <option value="skip">Saltar</option>
                <option value="update">Actualizar</option>
              </select>
              <span>· la carga es todo o nada: si una fila falla, no se guarda ninguna.</span>
            </label>

            <div className="max-h-72 overflow-auto rounded-lg border border-border">
              <table className="w-full min-w-[680px] text-xs">
                <thead className="sticky top-0 bg-muted text-left uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 font-medium">#</th>
                    <th className="px-2 py-2 font-medium">Nombre</th>
                    <th className="px-2 py-2 font-medium">DNI</th>
                    <th className="px-2 py-2 font-medium">Estado</th>
                    <th className="px-2 py-2 font-medium">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filas.map((f) => (
                    <tr
                      key={f.linea}
                      className={
                        f.errores.length
                          ? "bg-destructive/5"
                          : f.duplicado || f.advertencias.length
                            ? "bg-warning/5"
                            : ""
                      }
                    >
                      <td className="px-2 py-1.5 text-muted-foreground">{f.linea}</td>
                      <td className="px-2 py-1.5">{f.datos.nombre}</td>
                      <td className="px-2 py-1.5 tabular-nums">{f.datos.dni}</td>
                      <td className="px-2 py-1.5">
                        {f.errores.length > 0 ? (
                          <span className="text-destructive">{f.errores.join(" · ")}</span>
                        ) : f.duplicado ? (
                          <span className="text-warning">{f.motivoDuplicado}</span>
                        ) : f.advertencias.length > 0 ? (
                          <span className="text-warning">{f.advertencias.join(" · ")}</span>
                        ) : (
                          <span className="text-success">Válido</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        {f.errores.length > 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <select
                            className="h-7 rounded-md border border-input bg-card px-1.5 text-xs"
                            value={f.accion}
                            onChange={(e) => cambiarAccionFila(f.linea, e.target.value as AccionFila)}
                          >
                            <option value="insert" disabled={Boolean(f.existenteId)}>
                              Insertar
                            </option>
                            <option value="update" disabled={!f.existenteId}>
                              Actualizar
                            </option>
                            <option value="skip">Saltar</option>
                          </select>
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
