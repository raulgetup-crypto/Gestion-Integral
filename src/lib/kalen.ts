import { supabase } from "@/integrations/supabase/client";
import { logHistorial, subirDocumento, urlDocumento, validarArchivo } from "@/lib/api";


export { urlDocumento, validarArchivo };

// El esquema es dinámico (tablas nuevas fuera de los tipos generados): se valida en runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/* ================= Tipos ================= */

export type Sede = { id: number; nombre: string; activa: boolean };

export type Usuario = {
  id: number;
  nombre: string;
  email: string;
  auth_user_id: string | null;
  rol: "admin" | "edicion" | "solo_lectura";
  activo: boolean;
};

export type TipoVencimiento = { id: number; nombre: string; dias_plazo: number; activo: boolean };

export const ESTADOS_ADMISION = [
  "consulta_recibida",
  "entrevista_programada",
  "entrevista_realizada",
  "documentacion_solicitada",
  "en_evaluacion",
  "admitido",
  "no_ingreso",
  "en_espera",
  "en_curso",
] as const;
export type EstadoAdmision = (typeof ESTADOS_ADMISION)[number];

export const ESTADO_ADMISION_LABEL: Record<EstadoAdmision, string> = {
  consulta_recibida: "Consulta recibida",
  entrevista_programada: "Entrevista programada",
  entrevista_realizada: "Entrevista realizada",
  documentacion_solicitada: "Documentación solicitada",
  en_evaluacion: "En evaluación",
  admitido: "Admitido",
  no_ingreso: "No ingresó",
  en_espera: "En espera",
  en_curso: "En curso (histórico)",
};

/** Motivos estructurados de no ingreso; "Otro" exige detalle. */
export const MOTIVOS_NO_INGRESO = [
  "Decisión de la familia",
  "No continuó el proceso",
  "No presentó documentación",
  "No obtuvo CUD",
  "No consiguió autorización de la obra social",
  "No corresponde al perfil/prestaciones del centro",
  "No hay disponibilidad de cupo",
  "Eligió otra institución",
  "Problemas de transporte",
  "Problemas económicos",
  "Cambio de domicilio",
  "No respondió / se perdió el contacto",
  "Otro",
] as const;


export type HistorialEstadoAdmision = {
  id: number;
  admision_id: number;
  concurrente_id: string | null;
  sede_id: number | null;
  estado_anterior: string;
  estado_nuevo: string;
  motivo_no_ingreso: string;
  observacion: string;
  usuario_id: number | null;
  fecha_hora: string;
};


export type Admision = {
  id: number;
  sede_id: number | null;
  concurrente_id: string | null;
  persona_id: string | null;
  fecha_solicitud: string | null;
  nombre_contacto: string;
  telefono: string;
  medio: string;
  motivo_consulta: string;
  estado: EstadoAdmision;
  motivo_no_ingreso: string;
  motivo_no_ingreso_codigo: string;
  motivo_no_ingreso_detalle: string;
  fecha_entrevista: string | null;
  observaciones: string;
  contacto_relacion: string;
  incluir_salud: boolean;
  diagnostico_cud: string;
  created_at: string;
  updated_at: string;
};

export const ESTADOS_DOCUMENTO = ["completo", "pendiente", "en_revision", "vencido"] as const;
export type EstadoDocumento = (typeof ESTADOS_DOCUMENTO)[number];

export const ESTADO_DOCUMENTO_LABEL: Record<EstadoDocumento, string> = {
  completo: "Completo",
  pendiente: "Pendiente",
  en_revision: "En revisión",
  vencido: "Vencido",
};

export type DocumentoKalen = {
  id: string;
  concurrente_id: string;
  nombre: string;
  tipo_documento: string;
  fecha_solicitud: string | null;
  fecha_recepcion: string | null;
  fecha_vencimiento: string | null;
  estado: EstadoDocumento;
  observaciones: string;
  activo: boolean;
  created_at: string;
  version?: number;
  storage_path?: string;
  archivo_nombre?: string;
  archivo_tamano?: number;
};

/** Tipos de documento habituales del centro (el campo admite texto libre igual). */
export const TIPOS_DOCUMENTO = [
  "CUD",
  "DNI",
  "Certificado escolar",
  "Certificado médico",
  "Constancia de CUIL",
  "Credencial obra social",
  "Negativa ANSES",
  "Formulario FIM",
  "Autorización de transporte",
  "Informe profesional",
  "Consentimiento informado",
] as const;


export const UBICACIONES_PLANILLA = [
  "Secretaría",
  "Banda Norte",
  "Coordinación",
  "Facturación",
  "Archivo",
] as const;
export type UbicacionPlanilla = (typeof UBICACIONES_PLANILLA)[number];

export const ESTADOS_FIRMA = ["pendiente_firma", "enviada_coordinacion", "firmada", "devuelta_obs"] as const;
export type EstadoFirma = (typeof ESTADOS_FIRMA)[number];

export const ESTADO_FIRMA_LABEL: Record<EstadoFirma, string> = {
  pendiente_firma: "Pendiente de firma",
  enviada_coordinacion: "Enviada a coordinación",
  firmada: "Firmada",
  devuelta_obs: "Devuelta con observaciones",
};

export const ESTADOS_RECEPCION = [
  "pendiente",
  "recibida_termino",
  "recibida_fuera_termino",
  "con_observaciones",
  "aprobada",
] as const;
export type EstadoRecepcion = (typeof ESTADOS_RECEPCION)[number];

export const ESTADO_RECEPCION_LABEL: Record<EstadoRecepcion, string> = {
  pendiente: "Pendiente",
  recibida_termino: "Recibida en término",
  recibida_fuera_termino: "Recibida fuera de término",
  con_observaciones: "Con observaciones",
  aprobada: "Aprobada",
};

export type Planilla = {
  id: number;
  concurrente_id: string;
  tipo_vencimiento_id: number | null;
  periodo: string | null;
  fecha_limite: string | null;
  fecha_recepcion: string | null;
  ubicacion_actual: UbicacionPlanilla;
  estado_firma: EstadoFirma;
  estado_recepcion: EstadoRecepcion;
  motivo_demora: string;
  responsable: string;
  validacion_aprossy_enviada: boolean;
  fecha_validacion_aprossy: string | null;
  created_at: string;
  updated_at: string;
};

export type Comunicacion = {
  id: number;
  concurrente_id: string | null;
  planilla_id: number | null;
  documento_id: string | null;
  fecha: string;
  destinatario: string;
  medio: string;
  mensaje_enviado: string;
  respuesta: string;
  compromiso: string;
  created_at: string;
};

export type EventoTimeline = {
  fecha: string;
  tipo_evento: string;
  descripcion: string;
  estado: string;
  link_id: string;
  origen_tabla: string;
};

/* ================= Utilidades ================= */

// Filas devueltas por tablas fuera de los tipos generados.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Fila = any;

function ok<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) throw Object.assign(new Error(res.error.message), { code: res.error.code });
  return res.data;
}

export function esDuplicado(error: unknown): boolean {
  const e = error as { code?: string; message?: string };
  return e?.code === "23505" || Boolean(e?.message?.includes("duplicate key"));
}

/** Suma días a una fecha ISO (YYYY-MM-DD) sin depender de la zona horaria del navegador. */
export function sumarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  const base = new Date(Date.UTC(a!, (m ?? 1) - 1, d ?? 1));
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}

/** Primer día del mes de una fecha ISO. */
export function primerDiaDelMes(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

/** Días que faltan (negativo si ya venció). */
export function diasHasta(iso: string | null): number | null {
  if (!iso) return null;
  const hoy = new Date().toISOString().slice(0, 10);
  const ms = Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${hoy}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** Regla de negocio: estado de recepción derivado de las fechas. */
export function estadoRecepcionSegunFechas(
  fechaRecepcion: string | null,
  fechaLimite: string | null,
): EstadoRecepcion {
  if (!fechaRecepcion) return "pendiente";
  if (!fechaLimite) return "recibida_termino";
  return fechaRecepcion <= fechaLimite ? "recibida_termino" : "recibida_fuera_termino";
}

/* ================= Catálogos ================= */

export async function fetchSedes(): Promise<Sede[]> {
  return ok(await db.from("sedes").select("*").order("nombre")) ?? [];
}

export async function fetchTiposVencimiento(): Promise<TipoVencimiento[]> {
  return ok(await db.from("tipos_vencimiento").select("*").order("nombre")) ?? [];
}

/**
 * Usuario de la tabla `usuarios` que corresponde a la sesión activa.
 * Busca por auth_user_id y, si todavía no está vinculado, por email.
 * Se usa para completar created_by / updated_by sin mostrarlos en los formularios.
 */
export async function fetchUsuarioActual(): Promise<Usuario | null> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return null;

  const porAuth = ok(
    await db.from("usuarios").select("*").eq("auth_user_id", user.id).maybeSingle(),
  ) as Usuario | null;
  if (porAuth) return porAuth;

  if (user.email) {
    const porEmail = ok(
      await db.from("usuarios").select("*").eq("email", user.email).maybeSingle(),
    ) as Usuario | null;
    if (porEmail) return porEmail;
  }
  return null;
}

/** Campos de auditoría automáticos (nunca se piden en el formulario). */
export function auditoria(usuarioId: number | null | undefined, esAlta: boolean) {
  const campos: Record<string, unknown> = { updated_by: usuarioId ?? null };
  if (esAlta) campos.created_by = usuarioId ?? null;
  return campos;
}

/** Traza una operación relevante una sola vez (alta o modificación). */
async function trazar(opts: {
  entidad: string;
  esAlta: boolean;
  detalle: string;
  id?: string | number | null;
  concurrenteId?: string | null;
  observaciones?: string;
}) {
  await logHistorial({
    entidad: opts.entidad,
    accion: opts.esAlta ? "alta" : "edicion",
    detalle: opts.detalle,
    entidad_id: typeof opts.id === "string" ? opts.id : null,
    concurrente_id: opts.concurrenteId ?? null,
    observaciones: opts.observaciones ?? "",
  });
}

/**
 * Baja lógica única para entidades operativas: nunca se borra físicamente,
 * se marca inactiva, se guarda quién/cuándo/por qué y se deja rastro en historial.
 */
async function bajaLogica(opts: {
  tabla: string;
  flag: "activo" | "activa";
  id: string | number;
  usuarioId: number | null;
  motivo: string;
  entidad: string;
  detalle: string;
  concurrenteId?: string | null;
}) {
  const motivo = (opts.motivo ?? "").trim();
  if (!motivo) throw new Error("Indicá el motivo de la baja.");
  ok(
    await db
      .from(opts.tabla)
      .update({
        [opts.flag]: false,
        fecha_baja: new Date().toISOString(),
        usuario_baja: opts.usuarioId ?? null,
        motivo_baja: motivo,
        updated_by: opts.usuarioId ?? null,
      })
      .eq("id", opts.id),
  );
  await logHistorial({
    entidad: opts.entidad,
    accion: "baja",
    detalle: opts.detalle,
    entidad_id: typeof opts.id === "string" ? opts.id : null,
    concurrente_id: opts.concurrenteId ?? null,
    observaciones: motivo,
  });
}

/* ================= Concurrentes (ficha maestra) ================= */

export const MODALIDADES_INGRESO = ["particular", "obra_social", "becado", "otro"] as const;
export type ModalidadIngreso = (typeof MODALIDADES_INGRESO)[number];

export const MODALIDAD_LABEL: Record<ModalidadIngreso, string> = {
  particular: "Particular",
  obra_social: "Obra social",
  becado: "Becado",
  otro: "Otro",
};

/** Etiqueta de cobertura para encabezados (Vista 360°, listados). */
export function etiquetaModalidad(c: {
  modalidad_ingreso?: string | null;
  servicio_beca?: string | null;
  obra_social?: string | null;
}): string {
  const m = (c.modalidad_ingreso ?? "obra_social") as ModalidadIngreso;
  const servicio = (c.servicio_beca ?? "").trim();
  if (m === "becado") return servicio ? `Becado - ${servicio}` : "Becado";
  if (m === "particular") return "Particular";
  if (m === "otro") return servicio || "Otro";
  return (c.obra_social ?? "").trim() || "Sin obra social";
}

export type FichaConcurrente = {
  id?: string;
  sede_id: number | null;
  dni: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string | null;
  obra_social: string;
  colegio: string;
  numero_institucion: string;
  fecha_ingreso: string | null;
  activo: boolean;
  observaciones: string;
  modalidad_ingreso: ModalidadIngreso;
  servicio_beca: string;
  genera_planilla: boolean;
};

export async function dniDuplicado(dni: string, excluirId?: string): Promise<boolean> {
  const limpio = dni.trim();
  if (!limpio) return false;
  let q = db.from("concurrentes").select("id").eq("dni", limpio).limit(1);
  if (excluirId) q = q.neq("id", excluirId);
  const filas = (ok(await q) ?? []) as { id: string }[];
  return filas.length > 0;
}

export async function guardarFicha(ficha: FichaConcurrente, usuarioId: number | null) {
  const payload = {
    sede_id: ficha.sede_id,
    dni: ficha.dni.trim(),
    nombre: ficha.nombre.trim(),
    apellido: ficha.apellido.trim(),
    fecha_nacimiento: ficha.fecha_nacimiento || null,
    obra_social: ficha.obra_social.trim(),
    colegio: ficha.colegio.trim(),
    numero_institucion: ficha.numero_institucion.trim(),
    fecha_ingreso: ficha.fecha_ingreso || null,
    activo: ficha.activo,
    observaciones: ficha.observaciones,
    modalidad_ingreso: ficha.modalidad_ingreso,
    servicio_beca: ficha.modalidad_ingreso === "becado" || ficha.modalidad_ingreso === "otro"
      ? ficha.servicio_beca.trim()
      : "",
    genera_planilla: ficha.genera_planilla,
    ...auditoria(usuarioId, !ficha.id),
  };

  const esAlta = !ficha.id;
  const fila = esAlta
    ? ok<Fila>(await db.from("concurrentes").insert(payload).select().single())
    : ok<Fila>(await db.from("concurrentes").update(payload).eq("id", ficha.id).select().single());
  await trazar({
    entidad: "concurrente",
    esAlta,
    detalle: `Ficha de ${payload.apellido} ${payload.nombre}`.trim(),
    id: fila?.id ?? null,
    concurrenteId: fila?.id ?? null,
  });
  return fila;
}

/* ================= Admisiones ================= */

export async function fetchAdmisiones(): Promise<Admision[]> {
  return (
    ok(
      await db
        .from("admisiones")
        .select("*")
        .eq("activo", true)
        .order("created_at", { ascending: false }),
    ) ?? []
  );
}

/** Separa "Apellido, Nombre" o "Nombre Apellido" en dos partes. */
export function separarContacto(texto: string): { nombre: string; apellido: string } {
  const t = texto.trim().replace(/\s+/g, " ");
  if (!t) return { nombre: "", apellido: "" };
  if (t.includes(",")) {
    const [ape, nom] = t.split(",");
    return { nombre: (nom ?? "").trim(), apellido: (ape ?? "").trim() };
  }
  const partes = t.split(" ");
  if (partes.length === 1) return { nombre: t, apellido: "" };
  return { nombre: partes.slice(0, -1).join(" "), apellido: partes.at(-1)! };
}

export type DatosPersonaAdmision = {
  id?: string | null;
  nombre: string;
  apellido?: string;
  documento_tipo?: string | null;
  documento_numero?: string | null;
  telefono?: string;
  email?: string | null;
  fecha_nacimiento?: string | null;
};

export type ResultadoAdmision = {
  admision_id: number;
  persona_id: string;
  concurrente_id: string | null;
  concurrente_creado: boolean;
  persona_creada: boolean;
};

/**
 * Alta/edición de admisión en una sola transacción del servidor:
 * resuelve o crea la Persona (por documento), guarda la admisión y, si queda
 * admitida, genera el concurrente vinculado por persona_id. Si algo falla,
 * no queda ningún registro parcial.
 */
export const CONTACTO_RELACION = ["Madre", "Padre", "Titular", "Otro"] as const;

export async function guardarAdmision(
  admision: Partial<Admision> & { estado: EstadoAdmision },
  usuarioId: number | null,
  persona: DatosPersonaAdmision,
): Promise<ResultadoAdmision> {
  const { data, error } = await db.rpc("admision_registrar", {
    p_admision_id: admision.id ?? null,
    p_persona: {
      id: persona.id ?? null,
      nombre: persona.nombre ?? "",
      apellido: persona.apellido ?? "",
      documento_tipo: persona.documento_tipo || "DNI",
      documento_numero: persona.documento_numero ?? "",
      telefono: persona.telefono ?? admision.telefono ?? "",
      email: persona.email ?? "",
      fecha_nacimiento: persona.fecha_nacimiento ?? "",
    },
    p_admision: {
      sede_id: admision.sede_id ?? null,
      fecha_solicitud: admision.fecha_solicitud ?? "",
      telefono: admision.telefono ?? "",
      medio: admision.medio ?? "",
      motivo_consulta: admision.motivo_consulta ?? "",
      estado: admision.estado,
      motivo_no_ingreso_codigo: admision.motivo_no_ingreso_codigo ?? "",
      motivo_no_ingreso_detalle: admision.motivo_no_ingreso_detalle ?? "",
      fecha_entrevista: admision.fecha_entrevista ?? "",
      observaciones: admision.observaciones ?? "",
      contacto_relacion: admision.contacto_relacion ?? "",
      incluir_salud: admision.incluir_salud ?? false,
      diagnostico_cud: admision.diagnostico_cud ?? "",
    },
    p_usuario_id: usuarioId,
  });

  if (error) throw new Error(error.message);
  return data as ResultadoAdmision;
}

/** Admisiones de una persona, para consultar su recorrido histórico. */
export async function fetchAdmisionesPersona(personaId: string): Promise<Admision[]> {
  return (
    ok(
      await db
        .from("admisiones")
        .select("*")
        .eq("persona_id", personaId)
        .eq("activo", true)
        .order("created_at", { ascending: false }),
    ) ?? []
  );
}


/** Anulación de admisión: baja lógica, nunca borrado (rompería la trazabilidad). */
export async function anularAdmision(id: number, usuarioId: number | null, motivo: string) {
  const previa = ok<Fila>(await db.from("admisiones").select("concurrente_id").eq("id", id).single());
  await bajaLogica({
    tabla: "admisiones",
    flag: "activo",
    id,
    usuarioId,
    motivo,
    entidad: "admision",
    detalle: `Admisión #${id} anulada`,
    concurrenteId: previa?.concurrente_id ?? null,
  });
}

/* ================= Documentos ================= */

export async function fetchDocumentosKalen(): Promise<DocumentoKalen[]> {
  return (
    ok(
      await db
        .from("documentos")
        .select("*")
        .eq("activo", true)
        .order("created_at", { ascending: false }),
    ) ?? []
  );
}

export async function guardarDocumento(
  doc: Partial<DocumentoKalen> & { concurrente_id: string },
  usuarioId: number | null,
) {
  const payload = {
    concurrente_id: doc.concurrente_id,
    nombre: (doc.tipo_documento ?? "").trim() || "Documento",
    tipo_documento: (doc.tipo_documento ?? "").trim(),
    fecha_solicitud: doc.fecha_solicitud || null,
    fecha_recepcion: doc.fecha_recepcion || null,
    fecha_vencimiento: doc.fecha_vencimiento || null,
    estado: doc.estado ?? "pendiente",
    observaciones: doc.observaciones ?? "",
    activo: doc.activo ?? true,
    ...auditoria(usuarioId, !doc.id),
  };

  const esAlta = !doc.id;
  const fila = esAlta
    ? ok<Fila>(await db.from("documentos").insert(payload).select().single())
    : ok<Fila>(await db.from("documentos").update(payload).eq("id", doc.id).select().single());
  await trazar({
    entidad: "documento",
    esAlta,
    detalle: `${payload.nombre} · ${payload.estado}`,
    id: fila?.id ?? null,
    concurrenteId: payload.concurrente_id,
  });
  return fila;
}

export async function bajaDocumento(id: string, usuarioId: number | null, motivo = "Baja operativa") {
  const previo = ok<Fila>(await db.from("documentos").select("concurrente_id, nombre").eq("id", id).single());
  await bajaLogica({
    tabla: "documentos",
    flag: "activo",
    id,
    usuarioId,
    motivo,
    entidad: "documento",
    detalle: `Documento "${previo?.nombre ?? id}" dado de baja`,
    concurrenteId: previo?.concurrente_id ?? null,
  });
}

export type DocumentoVersion = {
  id: string;
  documento_id: string;
  concurrente_id: string | null;
  version: number;
  storage_path: string;
  nombre: string;
  mime: string;
  tamano: number;
  usuario: string;
  created_at: string;
};

export async function fetchVersionesDocumento(documentoId: string): Promise<DocumentoVersion[]> {
  if (!documentoId) return [];
  return (
    ok(
      await db
        .from("documento_versiones")
        .select("*")
        .eq("documento_id", documentoId)
        .order("version", { ascending: false }),
    ) ?? []
  );
}

/** Sube un archivo como nueva versión del documento y lo marca como archivo vigente. */
export async function subirVersionDocumento(opciones: {
  documentoId: string;
  concurrenteId: string;
  file: File;
  usuario: string;
  usuarioId: number | null;
}) {
  const { documentoId, concurrenteId, file, usuario, usuarioId } = opciones;
  const versiones = await fetchVersionesDocumento(documentoId);
  const version = Math.max(0, ...versiones.map((v) => v.version)) + 1;
  const path = await subirDocumento(file, concurrenteId);

  const creada = ok(
    await db
      .from("documento_versiones")
      .insert({
        documento_id: documentoId,
        concurrente_id: concurrenteId,
        version,
        storage_path: path,
        nombre: file.name,
        mime: file.type || "",
        tamano: file.size,
        usuario,
        created_by: usuarioId ?? null,
      })
      .select()
      .single(),
  ) as DocumentoVersion;

  ok(
    await db
      .from("documentos")
      .update({
        version,
        storage_path: path,
        archivo_nombre: file.name,
        archivo_tamano: file.size,
        updated_by: usuarioId ?? null,
      })
      .eq("id", documentoId),
  );

  return creada;
}



/* ================= Planillas ================= */

export async function fetchPlanillas(): Promise<Planilla[]> {
  return (
    ok(
      await db
        .from("planillas")
        .select("*")
        .eq("activo", true)
        .order("periodo", { ascending: false }),
    ) ?? []
  );
}

export async function guardarPlanilla(
  planilla: Partial<Planilla> & { concurrente_id: string },
  usuarioId: number | null,
) {
  const payload = {
    concurrente_id: planilla.concurrente_id,
    tipo_vencimiento_id: planilla.tipo_vencimiento_id ?? null,
    periodo: planilla.periodo || null,
    fecha_limite: planilla.fecha_limite || null,
    fecha_recepcion: planilla.fecha_recepcion || null,
    ubicacion_actual: planilla.ubicacion_actual ?? "Secretaría",
    estado_firma: planilla.estado_firma ?? "pendiente_firma",
    estado_recepcion: planilla.estado_recepcion ?? "pendiente",
    motivo_demora: planilla.motivo_demora ?? "",
    responsable: planilla.responsable ?? "",
    validacion_aprossy_enviada: planilla.validacion_aprossy_enviada ?? false,
    fecha_validacion_aprossy: planilla.validacion_aprossy_enviada
      ? planilla.fecha_validacion_aprossy || null
      : null,
    ...auditoria(usuarioId, !planilla.id),
  };

  const esAlta = !planilla.id;
  const fila = esAlta
    ? ok<Fila>(await db.from("planillas").insert(payload).select().single())
    : ok<Fila>(await db.from("planillas").update(payload).eq("id", planilla.id).select().single());
  await trazar({
    entidad: "planilla",
    esAlta,
    detalle: `Planilla #${fila?.id ?? ""} · ${payload.estado_recepcion} · firma ${payload.estado_firma}`,
    concurrenteId: payload.concurrente_id,
  });
  return fila;
}

/** Anulación de planilla: baja lógica; el registro sigue disponible para informes. */
export async function anularPlanilla(id: number, usuarioId: number | null, motivo: string) {
  const previa = ok<Fila>(await db.from("planillas").select("concurrente_id").eq("id", id).single());
  await bajaLogica({
    tabla: "planillas",
    flag: "activo",
    id,
    usuarioId,
    motivo,
    entidad: "planilla",
    detalle: `Planilla #${id} anulada`,
    concurrenteId: previa?.concurrente_id ?? null,
  });
}

/* ================= Comunicaciones ================= */

export async function fetchComunicaciones(): Promise<Comunicacion[]> {
  return (
    ok(
      await db
        .from("comunicaciones")
        .select("*")
        .eq("activo", true)
        .order("fecha", { ascending: false }),
    ) ?? []
  );
}

export async function guardarComunicacion(
  com: Partial<Comunicacion>,
  usuarioId: number | null,
) {
  const payload = {
    concurrente_id: com.concurrente_id || null,
    planilla_id: com.planilla_id ?? null,
    documento_id: com.documento_id || null,
    fecha: com.fecha ?? new Date().toISOString(),
    destinatario: com.destinatario ?? "",
    medio: com.medio ?? "",
    mensaje_enviado: com.mensaje_enviado ?? "",
    respuesta: com.respuesta ?? "",
    compromiso: com.compromiso ?? "",
    ...auditoria(usuarioId, !com.id),
  };

  const esAlta = !com.id;
  const fila = esAlta
    ? ok<Fila>(await db.from("comunicaciones").insert(payload).select().single())
    : ok<Fila>(await db.from("comunicaciones").update(payload).eq("id", com.id).select().single());
  await trazar({
    entidad: "comunicacion",
    esAlta,
    detalle: `Comunicación #${fila?.id ?? ""} · ${payload.medio || "sin medio"} · ${payload.destinatario || "sin destinatario"}`,
    concurrenteId: payload.concurrente_id,
  });
  return fila;
}

/** Anulación de comunicación: baja lógica; la conversación queda en el historial. */
export async function anularComunicacion(id: number, usuarioId: number | null, motivo: string) {
  const previa = ok<Fila>(await db.from("comunicaciones").select("concurrente_id").eq("id", id).single());
  await bajaLogica({
    tabla: "comunicaciones",
    flag: "activo",
    id,
    usuarioId,
    motivo,
    entidad: "comunicacion",
    detalle: `Comunicación #${id} anulada`,
    concurrenteId: previa?.concurrente_id ?? null,
  });
}

/* ================= Timeline 360° ================= */

export async function fetchTimeline(concurrenteId: string): Promise<EventoTimeline[]> {
  return ok(await db.rpc("get_concurrente_timeline", { p_concurrente_id: concurrenteId })) ?? [];
}

/** Fecha y hora legible en horario de Argentina. */
export function formatoFechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ================= Usuarios (administración) ================= */

export const ROLES = ["admin", "edicion", "solo_lectura"] as const;

export const ROL_LABEL: Record<Usuario["rol"], string> = {
  admin: "Administrador",
  edicion: "Edición",
  solo_lectura: "Solo lectura",
};

export async function fetchUsuarios(): Promise<Usuario[]> {
  return ok(await db.from("usuarios").select("*").order("nombre")) ?? [];
}

export async function guardarUsuario(
  u: Partial<Usuario> & { nombre: string; email: string; rol: Usuario["rol"] },
): Promise<Usuario> {
  const payload = {
    nombre: u.nombre.trim(),
    email: u.email.trim().toLowerCase(),
    rol: u.rol,
    activo: u.activo ?? true,
    auth_user_id: u.auth_user_id || null,
  };
  const esAlta = !u.id;
  const fila = esAlta
    ? ok<Fila>(await db.from("usuarios").insert(payload).select().single())
    : ok<Fila>(await db.from("usuarios").update(payload).eq("id", u.id).select().single());
  await trazar({
    entidad: "usuario",
    esAlta,
    detalle: `${payload.nombre} (${payload.email}) · rol ${payload.rol}`,
  });
  return fila;
}

export async function cambiarActivoUsuario(id: number, activo: boolean) {
  ok(await db.from("usuarios").update({ activo }).eq("id", id));
  await logHistorial({
    entidad: "usuario",
    accion: activo ? "reactivacion" : "baja",
    detalle: `Usuario #${id} ${activo ? "reactivado" : "desactivado"}`,
  });
}

/* ================= Historial de estados de admisiones ================= */

export async function fetchHistorialAdmisiones(): Promise<HistorialEstadoAdmision[]> {
  return (
    ok(
      await db
        .from("historial_estados_admisiones")
        .select("*")
        .order("fecha_hora", { ascending: false }),
    ) ?? []
  );
}

export async function fetchHistorialAdmision(admisionId: number): Promise<HistorialEstadoAdmision[]> {
  return (
    ok(
      await db
        .from("historial_estados_admisiones")
        .select("*")
        .eq("admision_id", admisionId)
        .order("fecha_hora", { ascending: false }),
    ) ?? []
  );
}
export type HistorialEtapaPersona = {
  id: number;
  persona_id: string;
  sede_id: number | null;
  etapa_anterior: string;
  etapa_nueva: string;
  observacion: string;
  usuario_id: number | null;
  fecha_hora: string;
};

export async function fetchHistorialEtapasPersonas(): Promise<HistorialEtapaPersona[]> {
  return (
    ok(
      await db
        .from("historial_etapas_personas")
        .select("*")
        .order("fecha_hora", { ascending: false }),
    ) ?? []
  );
}
/* ================= Transporte: solicitudes de traslado ================= */

export const TIPOS_TRASLADO = ["ida", "vuelta", "ida_vuelta"] as const;
export type TipoTraslado = (typeof TIPOS_TRASLADO)[number];

export const TIPO_TRASLADO_LABEL: Record<TipoTraslado, string> = {
  ida: "Solo ida",
  vuelta: "Solo vuelta",
  ida_vuelta: "Ida y vuelta",
};

export const ESTADOS_TRASLADO = [
  "solicitado",
  "en_gestion",
  "autorizado",
  "activo",
  "suspendido",
  "rechazado",
  "finalizado",
] as const;
export type EstadoTraslado = (typeof ESTADOS_TRASLADO)[number];

export const ESTADO_TRASLADO_LABEL: Record<EstadoTraslado, string> = {
  solicitado: "Solicitado",
  en_gestion: "En gestión",
  autorizado: "Autorizado",
  activo: "Activo",
  suspendido: "Suspendido",
  rechazado: "Rechazado",
  finalizado: "Finalizado",
};

/** Financiadores habituales del traslado (el campo admite texto libre). */
export const FINANCIADORES_TRASLADO = [
  "APROSS",
  "PAMI",
  "Obra social",
  "Mutual",
  "Familia",
  "Municipio",
  "Institución",
] as const;

export type SolicitudTransporte = {
  id: string;
  concurrente_id: string | null;
  admision_id: number | null;
  sede_id: number | null;
  fecha_solicitud: string | null;
  tipo_traslado: TipoTraslado;
  estado: EstadoTraslado;
  empresa: string;
  chofer: string;
  telefono_transportista: string;
  domicilio_origen: string;
  domicilio_destino: string;
  dias: string;
  hora_ida: string;
  hora_vuelta: string;
  requiere_acompanante: boolean;
  financiador: string;
  monto_mensual: number;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  motivo_rechazo: string;
  observaciones: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export async function fetchSolicitudesTransporte(): Promise<SolicitudTransporte[]> {
  return (
    ok(
      await db
        .from("transporte_solicitudes")
        .select("*")
        .eq("activo", true)
        .order("fecha_solicitud", { ascending: false }),
    ) ?? []
  );
}

/** Solicitudes de traslado de un concurrente (para la ficha y el timeline). */
export async function fetchSolicitudesTransporteConcurrente(
  concurrenteId: string,
): Promise<SolicitudTransporte[]> {
  if (!concurrenteId) return [];
  return (
    ok(
      await db
        .from("transporte_solicitudes")
        .select("*")
        .eq("concurrente_id", concurrenteId)
        .eq("activo", true)
        .order("fecha_solicitud", { ascending: false }),
    ) ?? []
  );
}

export async function guardarSolicitudTransporte(
  s: Partial<SolicitudTransporte>,
  usuarioId: number | null,
): Promise<SolicitudTransporte> {
  const payload = {
    concurrente_id: s.concurrente_id || null,
    admision_id: s.admision_id ?? null,
    sede_id: s.sede_id ?? null,
    fecha_solicitud: s.fecha_solicitud || new Date().toISOString().slice(0, 10),
    tipo_traslado: s.tipo_traslado ?? "ida_vuelta",
    estado: s.estado ?? "solicitado",
    empresa: s.empresa ?? "",
    chofer: s.chofer ?? "",
    telefono_transportista: s.telefono_transportista ?? "",
    domicilio_origen: s.domicilio_origen ?? "",
    domicilio_destino: s.domicilio_destino ?? "",
    dias: s.dias ?? "",
    hora_ida: s.hora_ida ?? "",
    hora_vuelta: s.hora_vuelta ?? "",
    requiere_acompanante: s.requiere_acompanante ?? false,
    financiador: s.financiador ?? "",
    monto_mensual: Number(s.monto_mensual ?? 0) || 0,
    fecha_inicio: s.fecha_inicio || null,
    fecha_fin: s.fecha_fin || null,
    motivo_rechazo: s.motivo_rechazo ?? "",
    observaciones: s.observaciones ?? "",
    ...auditoria(usuarioId, !s.id),
  };

  const esAlta = !s.id;
  const fila = esAlta
    ? ok<Fila>(await db.from("transporte_solicitudes").insert(payload).select().single())
    : ok<Fila>(await db.from("transporte_solicitudes").update(payload).eq("id", s.id).select().single());
  await trazar({
    entidad: "transporte",
    esAlta,
    detalle: `Traslado ${payload.tipo_traslado} · ${payload.estado}`,
    id: fila?.id ?? null,
    concurrenteId: payload.concurrente_id,
  });
  return fila;
}

/** Baja lógica: nunca se borra el historial de traslados. */
export async function bajaSolicitudTransporte(
  id: string,
  usuarioId: number | null,
  motivo = "Baja operativa",
) {
  const previo = ok<Fila>(
    await db.from("transporte_solicitudes").select("concurrente_id").eq("id", id).single(),
  );
  await bajaLogica({
    tabla: "transporte_solicitudes",
    flag: "activo",
    id,
    usuarioId,
    motivo,
    entidad: "transporte",
    detalle: "Solicitud de transporte dada de baja",
    concurrenteId: previo?.concurrente_id ?? null,
  });
}

/* ================= Etapa 6 · Profesionales y equipo interdisciplinario ================= */

export const PROFESIONES = [
  "Psicología",
  "Psicopedagogía",
  "Fonoaudiología",
  "Terapia ocupacional",
  "Kinesiología",
  "Trabajo social",
  "Acompañante terapéutico",
  "Musicoterapia",
  "Docente / educador",
  "Enfermería",
  "Médico/a",
  "Nutrición",
  "Administración",
  "Otro",
] as const;

export const ROLES_EQUIPO = [
  "referente",
  "terapista",
  "acompanante",
  "docente",
  "coordinacion",
  "equipo",
] as const;
export type RolEquipo = (typeof ROLES_EQUIPO)[number];

export const ROL_EQUIPO_LABEL: Record<RolEquipo, string> = {
  referente: "Referente de caso",
  terapista: "Terapista tratante",
  acompanante: "Acompañante terapéutico",
  docente: "Docente / educador",
  coordinacion: "Coordinación",
  equipo: "Equipo interdisciplinario",
};

export type Profesional = {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  profesion: string;
  matricula: string;
  email: string;
  telefono: string;
  sede_id: number | null;
  fecha_ingreso: string | null;
  activo: boolean;
  observaciones: string;
  created_at: string;
  updated_at: string;
};

export type AsignacionProfesional = {
  id: string;
  concurrente_id: string;
  profesional_id: string;
  rol: RolEquipo;
  referente: boolean;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  activa: boolean;
  observaciones: string;
  created_at: string;
  updated_at: string;
};

export function nombreProfesional(p: Pick<Profesional, "nombre" | "apellido">) {
  return [p.apellido, p.nombre].filter(Boolean).join(", ") || "Sin nombre";
}

export async function fetchProfesionales(): Promise<Profesional[]> {
  return ok(await db.from("profesionales").select("*").order("apellido")) ?? [];
}

export async function guardarProfesional(
  p: Partial<Profesional>,
  usuarioId: number | null,
): Promise<Profesional> {
  const payload = {
    nombre: (p.nombre ?? "").trim(),
    apellido: (p.apellido ?? "").trim(),
    dni: (p.dni ?? "").trim(),
    profesion: p.profesion ?? "",
    matricula: (p.matricula ?? "").trim(),
    email: (p.email ?? "").trim(),
    telefono: (p.telefono ?? "").trim(),
    sede_id: p.sede_id ?? null,
    fecha_ingreso: p.fecha_ingreso || null,
    activo: p.activo ?? true,
    observaciones: p.observaciones ?? "",
    ...auditoria(usuarioId, !p.id),
  };
  const esAlta = !p.id;
  const fila = esAlta
    ? ok<Fila>(await db.from("profesionales").insert(payload).select().single())
    : ok<Fila>(await db.from("profesionales").update(payload).eq("id", p.id).select().single());
  await trazar({
    entidad: "profesional",
    esAlta,
    detalle: `${payload.apellido} ${payload.nombre} · ${payload.profesion || "sin profesión"}`.trim(),
    id: fila?.id ?? null,
  });
  return fila;
}

/** Baja lógica: el profesional queda inactivo y conserva su historial de asignaciones. */
export async function bajaProfesional(id: string, usuarioId: number | null, motivo = "Baja del equipo") {
  await bajaLogica({
    tabla: "profesionales",
    flag: "activo",
    id,
    usuarioId,
    motivo,
    entidad: "profesional",
    detalle: "Profesional dado de baja",
  });
}

export async function fetchAsignaciones(): Promise<AsignacionProfesional[]> {
  return (
    ok(
      await db
        .from("concurrente_profesionales")
        .select("*")
        .eq("activa", true)
        .order("created_at"),
    ) ?? []
  );
}

export async function fetchAsignacionesConcurrente(
  concurrenteId: string,
): Promise<AsignacionProfesional[]> {
  if (!concurrenteId) return [];
  return (
    ok(
      await db
        .from("concurrente_profesionales")
        .select("*")
        .eq("concurrente_id", concurrenteId)
        .eq("activa", true)
        .order("created_at"),
    ) ?? []
  );
}

export async function guardarAsignacion(
  a: Partial<AsignacionProfesional>,
  usuarioId: number | null,
): Promise<AsignacionProfesional> {
  const payload = {
    concurrente_id: a.concurrente_id,
    profesional_id: a.profesional_id,
    rol: a.rol ?? "equipo",
    referente: a.referente ?? false,
    fecha_inicio: a.fecha_inicio || null,
    fecha_fin: a.fecha_fin || null,
    activa: a.activa ?? true,
    observaciones: a.observaciones ?? "",
    ...auditoria(usuarioId, !a.id),
  };
  const esAlta = !a.id;
  const fila = esAlta
    ? ok<Fila>(await db.from("concurrente_profesionales").insert(payload).select().single())
    : ok<Fila>(await db.from("concurrente_profesionales").update(payload).eq("id", a.id).select().single());
  await trazar({
    entidad: "asignacion",
    esAlta,
    detalle: `Equipo · rol ${payload.rol}${payload.referente ? " (referente)" : ""}`,
    id: fila?.id ?? null,
    concurrenteId: payload.concurrente_id ?? null,
  });
  return fila;
}

/** Fin de asignación: baja lógica, conserva el paso del profesional por el equipo. */
export async function finalizarAsignacion(id: string, usuarioId: number | null, motivo: string) {
  const previa = ok<Fila>(
    await db.from("concurrente_profesionales").select("concurrente_id").eq("id", id).single(),
  );
  ok(
    await db
      .from("concurrente_profesionales")
      .update({ fecha_fin: new Date().toISOString().slice(0, 10) })
      .eq("id", id),
  );
  await bajaLogica({
    tabla: "concurrente_profesionales",
    flag: "activa",
    id,
    usuarioId,
    motivo,
    entidad: "asignacion",
    detalle: "Asignación de profesional finalizada",
    concurrenteId: previa?.concurrente_id ?? null,
  });
}

