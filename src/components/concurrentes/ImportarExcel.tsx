import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { Modal, botonPrimario, botonSecundario } from "@/components/forms";
import { Chip } from "@/components/ui-kit";
import { insertConcurrentesMasivo, type Concurrente } from "@/lib/api";

/** Columnas esperadas del Excel y sus alias aceptados (sin acentos, en minúsculas). */
const COLUMNAS: { campo: string; etiqueta: string; alias: string[]; requerida?: boolean }[] = [
  { campo: "nombre", etiqueta: "Nombre", alias: ["nombre", "nombres"], requerida: true },
  { campo: "apellido", etiqueta: "Apellido", alias: ["apellido", "apellidos"], requerida: true },
  { campo: "dni", etiqueta: "DNI", alias: ["dni", "documento", "nro documento"], requerida: true },
  { campo: "fecha_nacimiento", etiqueta: "Fecha de nacimiento", alias: ["fecha de nacimiento", "fecha nacimiento", "nacimiento", "fnac"] },
  { campo: "obra_social", etiqueta: "Obra social", alias: ["obra social", "mutual", "obrasocial"] },
  { campo: "prestacion", etiqueta: "Prestaciones", alias: ["prestaciones", "prestacion", "prestación"] },
  { campo: "responsable", etiqueta: "Tutor", alias: ["tutor", "responsable", "tutor/a"] },
  { campo: "telefono", etiqueta: "Teléfono", alias: ["telefono", "teléfono", "tel", "celular"] },
  { campo: "direccion", etiqueta: "Dirección", alias: ["direccion", "dirección", "domicilio"] },
  { campo: "transporte", etiqueta: "Transporte", alias: ["transporte"] },
  { campo: "observaciones", etiqueta: "Observaciones", alias: ["observaciones", "observacion", "notas"] },
];

const norm = (s: unknown) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

type FilaImport = {
  linea: number;
  datos: Partial<Concurrente>;
  errores: string[];
  duplicado: boolean;
};

/** Convierte fechas de Excel (serial o texto) a ISO; devuelve null si no es válida. */
function aFechaISO(valor: unknown): string | null {
  if (valor == null || valor === "") return null;
  if (typeof valor === "number") {
    const d = XLSX.SSF.parse_date_code(valor);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(valor).trim();
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmy) {
    const y = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    return `${y}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}

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

  const dnisExistentes = useMemo(
    () => new Set(existentes.map((p) => norm(p.dni)).filter(Boolean)),
    [existentes],
  );
  const nombresExistentes = useMemo(
    () => new Set(existentes.map((p) => norm(`${p.nombre} ${p.apellido}`))),
    [existentes],
  );

  function limpiar() {
    setFilas([]);
    setFaltanColumnas([]);
    setNombreArchivo("");
  }

  async function leer(file: File) {
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const hoja = wb.Sheets[wb.SheetNames[0]];
      const crudo = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, { defval: "" });
      if (crudo.length === 0) {
        toast.error("El archivo no tiene filas");
        return;
      }

      const cabeceras = Object.keys(crudo[0]);
      const mapa = new Map<string, string>();
      for (const col of COLUMNAS) {
        const h = cabeceras.find((c) => col.alias.includes(norm(c)));
        if (h) mapa.set(col.campo, h);
      }
      const faltan = COLUMNAS.filter((c) => c.requerida && !mapa.has(c.campo)).map((c) => c.etiqueta);
      setFaltanColumnas(faltan);
      setNombreArchivo(file.name);
      if (faltan.length) {
        setFilas([]);
        return;
      }

      const vistosDni = new Set<string>();
      const vistosNombre = new Set<string>();

      const parseadas: FilaImport[] = crudo.map((r, i) => {
        const val = (campo: string) => String(r[mapa.get(campo) ?? ""] ?? "").trim();
        const nombre = val("nombre");
        const apellido = val("apellido");
        const dni = val("dni").replace(/\D/g, "");
        const errores: string[] = [];
        if (!nombre) errores.push("Falta nombre");
        if (!apellido) errores.push("Falta apellido");
        if (!dni) errores.push("Falta DNI");
        else if (dni.length < 7 || dni.length > 9) errores.push("DNI inválido");

        const fnacRaw = mapa.has("fecha_nacimiento") ? r[mapa.get("fecha_nacimiento")!] : "";
        const fnac = aFechaISO(fnacRaw);
        if (fnacRaw !== "" && fnacRaw != null && !fnac) errores.push("Fecha de nacimiento inválida");

        const claveNombre = norm(`${nombre} ${apellido}`);
        const claveDni = norm(dni);
        const duplicado =
          (Boolean(claveDni) && (dnisExistentes.has(claveDni) || vistosDni.has(claveDni))) ||
          nombresExistentes.has(claveNombre) ||
          vistosNombre.has(claveNombre);
        if (claveDni) vistosDni.add(claveDni);
        vistosNombre.add(claveNombre);

        const transporte = ["si", "sí", "x", "true", "1"].includes(norm(val("transporte")));

        return {
          linea: i + 2,
          duplicado,
          errores,
          datos: {
            nombre: `${apellido}, ${nombre}`.replace(/^, |, $/g, ""),
            apellido,
            dni,
            fecha_nacimiento: fnac,
            obra_social: val("obra_social"),
            prestacion: val("prestacion"),
            responsable: val("responsable"),
            telefono: val("telefono"),
            wsp: val("telefono"),
            direccion: val("direccion"),
            transporte,
            observaciones: val("observaciones"),
            tipo: transporte ? "transporte" : "prestacion",
            activo: true,
          },
        };
      });

      setFilas(parseadas);
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
      const n = await insertConcurrentesMasivo(validas.map((f) => f.datos));
      qc.invalidateQueries({ queryKey: ["concurrentes"] });
      qc.invalidateQueries({ queryKey: ["historial"] });
      toast.success(`${n} concurrentes importados`);
      limpiar();
      onClose();
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
      titulo="Importar concurrentes desde Excel"
      footer={
        <>
          <button
            className={botonSecundario}
            onClick={() => {
              limpiar();
              onClose();
            }}
          >
            Cancelar
          </button>
          <button className={botonPrimario} disabled={validas.length === 0 || guardando} onClick={importar}>
            Importar {validas.length > 0 ? `${validas.length} válidos` : ""}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-6 text-center hover:bg-accent/40">
          <Upload className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {nombreArchivo || "Elegí un archivo .xlsx o .xls"}
          </span>
          <input
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void leer(f);
            }}
          />
        </label>

        <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          <p className="mb-1 font-medium text-foreground">Columnas admitidas</p>
          {COLUMNAS.map((c) => c.etiqueta + (c.requerida ? " *" : "")).join(" · ")}
        </div>

        {faltanColumnas.length > 0 && (
          <p className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Faltan columnas obligatorias: {faltanColumnas.join(", ")}
          </p>
        )}

        {filas.length > 0 && (
          <>
            <div className="flex flex-wrap gap-2">
              <Chip tone="success">
                <CheckCircle2 className="h-3 w-3" /> {validas.length} válidos
              </Chip>
              <Chip tone="warning">{duplicadas.length} duplicados</Chip>
              <Chip tone="danger">{conError.length} con error</Chip>
            </div>

            <div className="max-h-72 overflow-auto rounded-lg border border-border">
              <table className="w-full min-w-[560px] text-xs">
                <thead className="sticky top-0 bg-muted text-left uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 font-medium">#</th>
                    <th className="px-2 py-2 font-medium">Nombre</th>
                    <th className="px-2 py-2 font-medium">DNI</th>
                    <th className="px-2 py-2 font-medium">Obra social</th>
                    <th className="px-2 py-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filas.map((f) => (
                    <tr key={f.linea} className={f.errores.length || f.duplicado ? "bg-destructive/5" : ""}>
                      <td className="px-2 py-1.5 text-muted-foreground">{f.linea}</td>
                      <td className="px-2 py-1.5">{f.datos.nombre}</td>
                      <td className="px-2 py-1.5">{f.datos.dni}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{f.datos.obra_social}</td>
                      <td className="px-2 py-1.5">
                        {f.errores.length > 0 ? (
                          <span className="text-destructive">{f.errores.join(", ")}</span>
                        ) : f.duplicado ? (
                          <span className="text-warning">Duplicado — no se importa</span>
                        ) : (
                          <span className="text-success">Listo</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <FileSpreadsheet className="h-3.5 w-3.5" /> Solo se insertan las filas válidas y no duplicadas.
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
