import * as XLSX from "xlsx";
import { toast } from "sonner";

/** Definición única de la plantilla oficial de importación de concurrentes. */
export type ColumnaPlantilla = {
  campo: string;
  etiqueta: string;
  alias: string[];
  requerida?: boolean;
  ayuda: string;
};

export const COLUMNAS_PLANTILLA: ColumnaPlantilla[] = [
  { campo: "nombre_completo", etiqueta: "Nombre y apellido", alias: ["nombre y apellido", "apellido y nombre", "nombre completo", "nombre_completo", "concurrente", "nombre y apellidos"], ayuda: "Alternativa a Apellido + Nombre. Ej.: CORDEYRO, EMILY o ARAMUNT MATEO." },
  { campo: "apellido", etiqueta: "Apellido", alias: ["apellido", "apellidos"], ayuda: "Obligatorio si no se usa Nombre y apellido." },
  { campo: "nombre", etiqueta: "Nombre", alias: ["nombre", "nombres"], ayuda: "Obligatorio si no se usa Nombre y apellido." },
  { campo: "dni", etiqueta: "DNI", alias: ["dni", "documento", "nro documento"], ayuda: "Opcional. Si está vacío se genera un DNI temporal TEMP-0001." },
  { campo: "fecha_nacimiento", etiqueta: "Fecha de nacimiento", alias: ["fecha de nacimiento", "fecha nacimiento", "nacimiento", "fnac"], ayuda: "Opcional. Formato DD/MM/AAAA." },
  { campo: "prestacion", etiqueta: "Prestación", alias: ["prestacion", "prestación", "prestaciones"], requerida: true, ayuda: "Obligatorio. Texto libre." },
  { campo: "obra_social", etiqueta: "Obra social", alias: ["obra social", "obrasocial", "mutual", "tipo", "obra social / mutual", "obra social/mutual"], ayuda: "Opcional. Si trae (N° afiliado) entre paréntesis se separa automáticamente." },
  { campo: "n_afiliado", etiqueta: "N° de afiliado", alias: ["n afiliado", "nro afiliado", "numero de afiliado", "afiliado"], ayuda: "Opcional. Texto." },
  { campo: "transporte", etiqueta: "Transporte", alias: ["transporte"], ayuda: "Opcional. Valores válidos: SI / NO." },
  { campo: "responsable", etiqueta: "Responsable", alias: ["responsable", "tutor", "tutor/a", "dai", "responsable (dai)"], ayuda: "Opcional. Nombre del tutor o referente." },
  { campo: "telefono", etiqueta: "Teléfono", alias: ["telefono", "teléfono", "tel", "celular", "wsp"], ayuda: "Opcional. Solo números." },
  { campo: "mail", etiqueta: "Email", alias: ["mail", "email", "correo"], ayuda: "Opcional." },
  { campo: "direccion", etiqueta: "Dirección", alias: ["direccion", "dirección", "domicilio"], ayuda: "Opcional." },
  { campo: "lugar_firma", etiqueta: "Lugar de firma", alias: ["lugar de firma", "lugar firma", "firma"], ayuda: "Opcional. Kalen / Banda Norte / Domicilio / Otro." },
  { campo: "dias_x_semana", etiqueta: "Días por semana", alias: ["dias x semana", "días x semana", "dias por semana", "dias /sem", "días /sem", "dias/sem", "días/sem"], ayuda: "Opcional. Número." },
  { campo: "dias_especificos", etiqueta: "Días específicos", alias: ["dias especificos", "días específicos", "dias específicos", "días especificos"], ayuda: "Opcional. Ej.: Lunes y miércoles." },
  { campo: "horarios", etiqueta: "Horarios", alias: ["horarios", "horario"], ayuda: "Opcional. Ej.: 09:00 a 13:00." },
  { campo: "observaciones", etiqueta: "Observaciones", alias: ["observaciones", "observacion", "notas"], ayuda: "Opcional." },
];


const EJEMPLOS: Record<string, string>[] = [
  {
    Apellido: "Pérez",
    Nombre: "Ana María",
    DNI: "30123456",
    "Fecha de nacimiento": "05/03/1994",
    Prestación: "Centro de Día",
    "Obra social": "APROSS",
    "N° de afiliado": "123456/00",
    Transporte: "SI",
    Responsable: "Pérez, Julio",
    Teléfono: "3584112233",
    Email: "familia.perez@mail.com",
    Dirección: "Belgrano 123",
    "Lugar de firma": "Kalen",
    "Días por semana": "5",
    Horarios: "09:00 a 13:00",
    Observaciones: "Retira la madre",
  },
  {
    Apellido: "Gómez",
    Nombre: "Luis",
    DNI: "28987654",
    "Fecha de nacimiento": "18/11/1981",
    Prestación: "Rehabilitación",
    "Obra social": "PROFE",
    "N° de afiliado": "",
    Transporte: "NO",
    Responsable: "",
    Teléfono: "3584556677",
    Email: "",
    Dirección: "San Martín 456",
    "Lugar de firma": "Banda Norte",
    "Días por semana": "3",
    Horarios: "14:00 a 17:00",
    Observaciones: "",
  },
];

/**
 * Genera y descarga la plantilla oficial: hoja de carga con ejemplos,
 * hoja de instrucciones y hoja con los valores válidos del sistema.
 */
export function descargarPlantilla(opciones: {
  prestaciones: string[];
  obrasSociales: string[];
  lugaresFirma: readonly string[];
}) {
  const wb = XLSX.utils.book_new();

  const hoja = XLSX.utils.json_to_sheet(EJEMPLOS, {
    header: COLUMNAS_PLANTILLA.map((c) => c.etiqueta),
  });
  hoja["!cols"] = COLUMNAS_PLANTILLA.map((c) => ({ wch: Math.max(14, c.etiqueta.length + 4) }));
  XLSX.utils.book_append_sheet(wb, hoja, "Concurrentes");

  const instrucciones = COLUMNAS_PLANTILLA.map((c) => ({
    Columna: c.etiqueta,
    Obligatorio: c.requerida ? "SÍ" : "No",
    Indicaciones: c.ayuda,
  }));
  const hojaInstr = XLSX.utils.json_to_sheet(instrucciones);
  hojaInstr["!cols"] = [{ wch: 24 }, { wch: 12 }, { wch: 62 }];
  XLSX.utils.book_append_sheet(wb, hojaInstr, "Instrucciones");

  const largo = Math.max(
    opciones.prestaciones.length,
    opciones.obrasSociales.length,
    opciones.lugaresFirma.length,
    2,
  );
  const validos = Array.from({ length: largo }, (_, i) => ({
    Prestaciones: opciones.prestaciones[i] ?? "",
    "Obras sociales": opciones.obrasSociales[i] ?? "",
    Transporte: ["SI", "NO"][i] ?? "",
    "Lugar de firma": opciones.lugaresFirma[i] ?? "",
  }));
  const hojaValidos = XLSX.utils.json_to_sheet(validos);
  hojaValidos["!cols"] = [{ wch: 26 }, { wch: 26 }, { wch: 14 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, hojaValidos, "Valores válidos");

  XLSX.writeFile(wb, "plantilla-concurrentes-kalen.xlsx");
  toast.success("Plantilla oficial descargada");
}

/** Ejemplos expuestos para las vistas previas del importador. */
export const EJEMPLOS_PLANTILLA = EJEMPLOS;
