import * as XLSX from "xlsx";
import type { Concurrente } from "@/lib/api";
import { COLUMNAS_PLANTILLA } from "@/lib/plantilla-import";
import { exportar } from "@/lib/export";

export const norm = (s: unknown) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export type FilaImport = {
  linea: number;
  datos: Partial<Concurrente>;
  errores: string[];
  duplicado: boolean;
  motivoDuplicado: string;
};

export type ResultadoLectura = {
  filas: FilaImport[];
  faltanColumnas: string[];
};

/** Lee XLSX, XLS o CSV y devuelve las filas crudas de la primera hoja. */
export async function leerArchivo(file: File): Promise<Record<string, unknown>[]> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array", raw: false });
  const hoja = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, { defval: "" });
}

/** Convierte fechas de Excel (serial o texto) a ISO; devuelve null si no es válida. */
export function aFechaISO(valor: unknown): string | null {
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
    const mes = Number(dmy[2]);
    const dia = Number(dmy[1]);
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
    return `${y}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}

const VALORES_SI = ["si", "sí", "x", "true", "1", "s"];
const VALORES_NO = ["no", "false", "0", "n", ""];

/**
 * Valida el archivo contra la plantilla oficial. Ninguna fila con error o
 * duplicada se marca como importable.
 */
export function validarFilas(
  crudo: Record<string, unknown>[],
  ctx: { existentes: Concurrente[]; prestaciones: string[]; obrasSociales: string[] },
): ResultadoLectura {
  const cabeceras = Object.keys(crudo[0] ?? {});
  const mapa = new Map<string, string>();
  for (const col of COLUMNAS_PLANTILLA) {
    const h = cabeceras.find((c) => col.alias.includes(norm(c)));
    if (h) mapa.set(col.campo, h);
  }
  const faltanColumnas = COLUMNAS_PLANTILLA.filter((c) => c.requerida && !mapa.has(c.campo)).map(
    (c) => c.etiqueta,
  );
  if (faltanColumnas.length) return { filas: [], faltanColumnas };

  const dnisBase = new Set(ctx.existentes.map((p) => norm(p.dni)).filter(Boolean));
  const nombresBase = new Set(ctx.existentes.map((p) => norm(`${p.nombre} ${p.apellido}`)));
  const prestacionesOK = new Set(ctx.prestaciones.map(norm));
  const obrasOK = new Set(ctx.obrasSociales.map(norm));

  const vistosDni = new Set<string>();
  const vistosNombre = new Set<string>();

  const filas = crudo.map<FilaImport>((r, i) => {
    const val = (campo: string) => String(r[mapa.get(campo) ?? ""] ?? "").trim();
    const nombre = val("nombre");
    const apellido = val("apellido");
    const dni = val("dni").replace(/\D/g, "");
    const errores: string[] = [];

    if (!nombre) errores.push("Falta nombre");
    if (!apellido) errores.push("Falta apellido");
    if (!dni) errores.push("Falta DNI");
    else if (dni.length < 7 || dni.length > 9) errores.push("DNI inválido (7 a 9 dígitos)");

    const prestacion = val("prestacion");
    if (!prestacion) errores.push("Falta prestación");
    else if (prestacionesOK.size > 0 && !prestacionesOK.has(norm(prestacion)))
      errores.push(`Prestación inexistente: ${prestacion}`);

    const obraSocial = val("obra_social");
    if (!obraSocial) errores.push("Falta obra social");
    else if (obrasOK.size > 0 && !obrasOK.has(norm(obraSocial)))
      errores.push(`Obra social inexistente: ${obraSocial}`);

    const transporteRaw = norm(val("transporte"));
    let transporte = false;
    if (VALORES_SI.includes(transporteRaw)) transporte = true;
    else if (!VALORES_NO.includes(transporteRaw)) errores.push(`Transporte inválido: ${val("transporte")}`);

    const fnacRaw = mapa.has("fecha_nacimiento") ? r[mapa.get("fecha_nacimiento")!] : "";
    const fnac = aFechaISO(fnacRaw);
    if (fnacRaw !== "" && fnacRaw != null && !fnac) errores.push("Fecha de nacimiento inválida");

    const claveDni = norm(dni);
    const claveNombre = norm(`${apellido}, ${nombre}`);
    let motivoDuplicado = "";
    if (claveDni && vistosDni.has(claveDni)) motivoDuplicado = "DNI repetido en el archivo";
    else if (claveDni && dnisBase.has(claveDni)) motivoDuplicado = "DNI ya existe en la base";
    else if (vistosNombre.has(claveNombre)) motivoDuplicado = "Nombre repetido en el archivo";
    else if (nombresBase.has(claveNombre)) motivoDuplicado = "Nombre ya existe en la base";
    if (claveDni) vistosDni.add(claveDni);
    vistosNombre.add(claveNombre);

    const telefono = val("telefono");

    return {
      linea: i + 2,
      errores,
      duplicado: Boolean(motivoDuplicado),
      motivoDuplicado,
      datos: {
        nombre: `${apellido}, ${nombre}`.replace(/^, |, $/g, ""),
        apellido,
        dni,
        fecha_nacimiento: fnac,
        obra_social: obraSocial,
        n_afiliado: val("n_afiliado"),
        prestacion,
        responsable: val("responsable"),
        telefono,
        wsp: telefono,
        mail: val("mail"),
        direccion: val("direccion"),
        lugar_firma: val("lugar_firma") || "Kalen",
        dias_x_semana: val("dias_x_semana"),
        horarios: val("horarios"),
        transporte,
        observaciones: val("observaciones"),
        tipo: transporte ? "transporte" : "prestacion",
        activo: true,
      },
    };
  });

  return { filas, faltanColumnas: [] };
}

/** Descarga en Excel el detalle completo de filas rechazadas. */
export function exportarErrores(filas: FilaImport[]) {
  const problematicas = filas.filter((f) => f.errores.length > 0 || f.duplicado);
  exportar(
    problematicas.map((f) => ({
      Fila: f.linea,
      Nombre: String(f.datos.nombre ?? ""),
      DNI: String(f.datos.dni ?? ""),
      Estado: f.errores.length ? "Con error" : "Duplicado",
      Detalle: f.errores.length ? f.errores.join(" · ") : f.motivoDuplicado,
    })),
    "errores-importacion",
    "xlsx",
    "Errores de importación",
  );
}
