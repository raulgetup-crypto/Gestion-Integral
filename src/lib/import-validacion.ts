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

/** Acción a ejecutar por fila cuando el DNI ya existe en la base. */
export type AccionFila = "insert" | "update" | "skip";

export type FilaImport = {
  linea: number;
  datos: Partial<Concurrente>;
  errores: string[];
  advertencias: string[];
  duplicado: boolean;
  motivoDuplicado: string;
  /** id del concurrente existente con el mismo DNI (si lo hay) */
  existenteId: string | null;
  accion: AccionFila;
  /** true cuando el DNI fue generado automáticamente (TEMP-XXXX) */
  dniTemporal: boolean;
};


export type ResultadoLectura = {
  filas: FilaImport[];
  faltanColumnas: string[];
  cabeceras: string[];
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

export type MapeoColumnas = Record<string, string>;

/**
 * Separa "NOMBRE Y APELLIDO" en apellido y nombre.
 * Con coma: "CORDEYRO, EMILY" → apellido CORDEYRO / nombre EMILY.
 * Sin coma: "ARAMUNT MATEO" → apellido ARAMUNT / nombre MATEO (última palabra).
 */
export function separarNombre(completo: string): { apellido: string; nombre: string } {
  const s = completo.replace(/\s+/g, " ").trim();
  if (!s) return { apellido: "", nombre: "" };
  if (s.includes(",")) {
    const [ape, ...resto] = s.split(",");
    return { apellido: ape.trim(), nombre: resto.join(",").trim() };
  }
  const partes = s.split(" ");
  if (partes.length === 1) return { apellido: partes[0], nombre: "" };
  const nombre = partes.pop() as string;
  return { apellido: partes.join(" "), nombre };
}

/** Extrae el N° de afiliado entre paréntesis: "APROSS (12345/00)". */
export function extraerAfiliado(valor: string): { texto: string; afiliado: string } {
  const m = valor.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (!m) return { texto: valor.trim(), afiliado: "" };
  return { texto: m[1].trim(), afiliado: m[2].trim() };
}

/** Devuelve el mayor número usado en los DNI temporales TEMP-XXXX existentes. */
export function maxDniTemporal(dnis: (string | null | undefined)[]): number {
  let max = 0;
  for (const d of dnis) {
    const m = String(d ?? "").match(/^TEMP-(\d+)$/i);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max;
}


/** Detecta automáticamente qué cabecera del archivo corresponde a cada campo. */
export function detectarMapeo(cabeceras: string[]): MapeoColumnas {
  const mapa: MapeoColumnas = {};
  for (const col of COLUMNAS_PLANTILLA) {
    const h = cabeceras.find((c) => col.alias.includes(norm(c)));
    mapa[col.campo] = h ?? "";
  }
  return mapa;
}

/**
 * Valida el archivo contra la estructura real de `concurrentes`:
 * obligatorios NOT NULL, formato de DNI/teléfono/fecha, catálogos vigentes
 * (prestaciones y mutuales) y unicidad de DNI (índice UNIQUE en la base).
 */
export function validarFilas(
  crudo: Record<string, unknown>[],
  ctx: {
    existentes: Concurrente[];
    prestaciones: string[];
    obrasSociales: string[];
    mapa?: MapeoColumnas;
    accionDuplicados?: AccionFila;
  },
): ResultadoLectura {
  const cabeceras = Object.keys(crudo[0] ?? {});
  const mapa = ctx.mapa ?? detectarMapeo(cabeceras);
  const faltanColumnas: string[] = [];
  if (!mapa["prestacion"]) faltanColumnas.push("Prestación");
  if (!mapa["nombre_completo"] && !(mapa["apellido"] && mapa["nombre"]))
    faltanColumnas.push("Nombre y apellido (o Apellido + Nombre)");
  if (faltanColumnas.length) return { filas: [], faltanColumnas, cabeceras };

  const porDni = new Map(
    ctx.existentes.filter((p) => norm(p.dni)).map((p) => [norm(p.dni), p] as const),
  );
  const porLegacy = new Map(
    ctx.existentes.filter((p) => p.legacy_id).map((p) => [norm(p.legacy_id), p] as const),
  );
  const nombresBase = new Set(ctx.existentes.map((p) => norm(`${p.nombre} ${p.apellido}`)));
  const prestacionesOK = new Set(ctx.prestaciones.map(norm));
  const obrasOK = new Set(ctx.obrasSociales.map(norm));

  let secuenciaTemp = maxDniTemporal(ctx.existentes.map((p) => p.dni));
  const vistosDni = new Set<string>();
  const vistosNombre = new Set<string>();

  const filas = crudo.map<FilaImport>((r, i) => {
    const val = (campo: string) => String(r[mapa[campo] ?? ""] ?? "").trim();
    const errores: string[] = [];
    const advertencias: string[] = [];

    const completo = val("nombre_completo");
    const partes = completo ? separarNombre(completo) : { apellido: val("apellido"), nombre: val("nombre") };
    const apellido = partes.apellido;
    const nombre = partes.nombre;
    if (!apellido && !nombre) errores.push("Falta nombre y apellido");

    const dniRaw = val("dni").trim();
    let dni = /^temp-\d+$/i.test(dniRaw) ? dniRaw.toUpperCase() : dniRaw.replace(/\D/g, "");
    let dniTemporal = false;
    if (dniRaw && !dni) advertencias.push(`DNI ignorado por formato inválido: ${dniRaw}`);
    if (!dni) {
      secuenciaTemp += 1;
      dni = `TEMP-${String(secuenciaTemp).padStart(4, "0")}`;
      dniTemporal = true;
      advertencias.push(`DNI temporal generado: ${dni}`);
    } else if (!dniTemporal && /^\d+$/.test(dni) && (dni.length < 7 || dni.length > 9)) {
      errores.push("DNI inválido (7 a 9 dígitos)");
    }
    if (/^TEMP-/.test(dni) && !dniTemporal) dniTemporal = true;
    // un TEMP escrito a mano que ya exista se reemplaza por uno nuevo libre
    while (dniTemporal && (porDni.has(norm(dni)) || vistosDni.has(norm(dni)))) {
      secuenciaTemp += 1;
      dni = `TEMP-${String(secuenciaTemp).padStart(4, "0")}`;
    }

    const prestacion = val("prestacion");
    if (!prestacion) errores.push("Falta prestación");
    else if (prestacionesOK.size > 0 && !prestacionesOK.has(norm(prestacion)))
      advertencias.push(`Prestación fuera del catálogo: ${prestacion}`);

    const obraCruda = val("obra_social");
    const { texto: obraSocial, afiliado: afiliadoEnObra } = extraerAfiliado(obraCruda);
    if (obraSocial && obrasOK.size > 0 && !obrasOK.has(norm(obraSocial)))
      advertencias.push(`Obra social fuera del catálogo: ${obraSocial}`);

    let mutual = val("mutual");
    if (!mutual && obraSocial && obrasOK.has(norm(obraSocial))) mutual = obraSocial;
    if (mutual && obrasOK.size > 0 && !obrasOK.has(norm(mutual))) {
      advertencias.push(`Mutual fuera del catálogo, no se guarda: ${mutual}`);
      mutual = "";
    } else if (mutual) {
      mutual = ctx.obrasSociales.find((o) => norm(o) === norm(mutual)) ?? mutual;
    }

    const transporteRaw = norm(val("transporte"));
    let transporte = false;
    if (VALORES_SI.includes(transporteRaw)) transporte = true;
    else if (!VALORES_NO.includes(transporteRaw)) errores.push(`Transporte inválido: ${val("transporte")}`);

    const fnacRaw = mapa["fecha_nacimiento"] ? r[mapa["fecha_nacimiento"]] : "";
    const fnac = aFechaISO(fnacRaw);
    if (fnacRaw !== "" && fnacRaw != null && !fnac) errores.push("Fecha de nacimiento inválida");

    const telefonoRaw = val("telefono");
    const telefono = telefonoRaw.replace(/\D/g, "");
    if (telefonoRaw && telefono !== telefonoRaw)
      advertencias.push("Teléfono normalizado (se quitaron caracteres no numéricos)");

    const mail = val("mail");
    if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) advertencias.push("Email con formato dudoso");

    const claveDni = norm(dni);
    const claveNombre = norm(`${apellido}, ${nombre}`);
    const existente = dniTemporal ? undefined : porDni.get(claveDni);
    const existenteLegacy = dniTemporal ? undefined : porLegacy.get(claveDni);
    let motivoDuplicado = "";
    if (!dniTemporal && vistosDni.has(claveDni)) motivoDuplicado = "DNI repetido en el archivo";
    else if (existente) motivoDuplicado = "DNI ya existe en la base";
    else if (existenteLegacy) motivoDuplicado = "Coincide con un legajo existente";
    else if (vistosNombre.has(claveNombre)) motivoDuplicado = "Nombre repetido en el archivo";
    else if (nombresBase.has(claveNombre)) motivoDuplicado = "Nombre ya existe en la base";
    vistosDni.add(claveDni);
    vistosNombre.add(claveNombre);

    const enBase = Boolean(existente ?? existenteLegacy);
    const duplicado = Boolean(motivoDuplicado);
    const accion: AccionFila =
      errores.length > 0
        ? "skip"
        : enBase
          ? (ctx.accionDuplicados ?? "skip")
          : duplicado
            ? "skip"
            : "insert";

    return {
      linea: i + 2,
      errores,
      advertencias,
      duplicado,
      motivoDuplicado,
      existenteId: (existente ?? existenteLegacy)?.id ?? null,
      accion,
      dniTemporal,
      datos: {
        nombre: `${apellido}, ${nombre}`.replace(/^, |, $/g, ""),
        apellido,
        dni,
        fecha_nacimiento: fnac,
        obra_social: obraSocial,
        mutual,
        n_afiliado: val("n_afiliado") || afiliadoEnObra,
        prestacion,
        responsable: val("responsable"),
        telefono,
        wsp: telefono,
        mail,
        direccion: val("direccion"),
        lugar_firma: val("lugar_firma") || "Kalen",
        dias_x_semana: val("dias_x_semana"),
        dias_especificos: val("dias_especificos"),
        horarios: val("horarios"),
        transporte,
        observaciones: val("observaciones"),
        observaciones_administrativas: val("observaciones_administrativas"),
        tipo: transporte ? "transporte" : "prestacion",
        activo: true,
      },
    };
  });


  return { filas, faltanColumnas: [], cabeceras };
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
      Advertencias: f.advertencias.join(" · "),
    })),
    "errores-importacion",
    "xlsx",
    "Errores de importación",
  );
}
