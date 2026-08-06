import { supabase } from "@/integrations/supabase/client";

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
  "en_curso",
  "entrevista_realizada",
  "admitido",
  "no_ingreso",
  "en_espera",
] as const;
export type EstadoAdmision = (typeof ESTADOS_ADMISION)[number];

export const ESTADO_ADMISION_LABEL: Record<EstadoAdmision, string> = {
  en_curso: "En curso",
  entrevista_realizada: "Entrevista realizada",
  admitido: "Admitido",
  no_ingreso: "No ingresó",
  en_espera: "En espera",
};

export type Admision = {
  id: number;
  sede_id: number | null;
  concurrente_id: string | null;
  fecha_solicitud: string | null;
  nombre_contacto: string;
  telefono: string;
  medio: string;
  motivo_consulta: string;
  estado: EstadoAdmision;
  motivo_no_ingreso: string;
  fecha_entrevista: string | null;
  observaciones: string;
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
};

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

/* ================= Concurrentes (ficha maestra) ================= */

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
    ...auditoria(usuarioId, !ficha.id),
  };

  if (ficha.id) {
    return ok(await db.from("concurrentes").update(payload).eq("id", ficha.id).select().single());
  }
  return ok(await db.from("concurrentes").insert(payload).select().single());
}

/* ================= Admisiones ================= */

export async function fetchAdmisiones(): Promise<Admision[]> {
  return ok(await db.from("admisiones").select("*").order("created_at", { ascending: false })) ?? [];
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

export async function guardarAdmision(
  admision: Partial<Admision> & { estado: EstadoAdmision },
  usuarioId: number | null,
): Promise<Admision> {
  const payload = {
    sede_id: admision.sede_id ?? null,
    concurrente_id: admision.concurrente_id ?? null,
    fecha_solicitud: admision.fecha_solicitud || null,
    nombre_contacto: admision.nombre_contacto ?? "",
    telefono: admision.telefono ?? "",
    medio: admision.medio ?? "",
    motivo_consulta: admision.motivo_consulta ?? "",
    estado: admision.estado,
    motivo_no_ingreso: admision.motivo_no_ingreso ?? "",
    fecha_entrevista: admision.fecha_entrevista || null,
    observaciones: admision.observaciones ?? "",
    ...auditoria(usuarioId, !admision.id),
  };

  const guardada: Admision = admision.id
    ? ok(await db.from("admisiones").update(payload).eq("id", admision.id).select().single())
    : ok(await db.from("admisiones").insert(payload).select().single());

  // Al pasar a "admitido" se genera la ficha del concurrente automáticamente.
  if (guardada.estado === "admitido" && !guardada.concurrente_id) {
    const { nombre, apellido } = separarContacto(guardada.nombre_contacto);
    const nuevo = ok(
      await db
        .from("concurrentes")
        .insert({
          sede_id: guardada.sede_id,
          nombre: nombre || guardada.nombre_contacto || "Sin nombre",
          apellido,
          dni: `SIN_DNI-A${guardada.id}`,
          telefono: guardada.telefono ?? "",
          observaciones: guardada.motivo_consulta ?? "",
          fecha_ingreso: new Date().toISOString().slice(0, 10),
          activo: true,
          ...auditoria(usuarioId, true),
        })
        .select("id")
        .single(),
    ) as { id: string };

    return ok(
      await db.from("admisiones").update({ concurrente_id: nuevo.id }).eq("id", guardada.id).select().single(),
    );
  }

  return guardada;
}

export async function eliminarAdmision(id: number) {
  ok(await db.from("admisiones").delete().eq("id", id));
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

  if (doc.id) {
    return ok(await db.from("documentos").update(payload).eq("id", doc.id).select().single());
  }
  return ok(await db.from("documentos").insert(payload).select().single());
}

export async function bajaDocumento(id: string, usuarioId: number | null) {
  ok(await db.from("documentos").update({ activo: false, updated_by: usuarioId ?? null }).eq("id", id));
}

/* ================= Planillas ================= */

export async function fetchPlanillas(): Promise<Planilla[]> {
  return ok(await db.from("planillas").select("*").order("periodo", { ascending: false })) ?? [];
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
    ...auditoria(usuarioId, !planilla.id),
  };

  if (planilla.id) {
    return ok(await db.from("planillas").update(payload).eq("id", planilla.id).select().single());
  }
  return ok(await db.from("planillas").insert(payload).select().single());
}

export async function eliminarPlanilla(id: number) {
  ok(await db.from("planillas").delete().eq("id", id));
}

/* ================= Comunicaciones ================= */

export async function fetchComunicaciones(): Promise<Comunicacion[]> {
  return ok(await db.from("comunicaciones").select("*").order("fecha", { ascending: false })) ?? [];
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

  if (com.id) {
    return ok(await db.from("comunicaciones").update(payload).eq("id", com.id).select().single());
  }
  return ok(await db.from("comunicaciones").insert(payload).select().single());
}

export async function eliminarComunicacion(id: number) {
  ok(await db.from("comunicaciones").delete().eq("id", id));
}

/* ================= Timeline 360° ================= */

export async function fetchTimeline(concurrenteId: string): Promise<EventoTimeline[]> {
  return ok(await db.rpc("get_concurrente_timeline", { p_concurrente_id: concurrenteId })) ?? [];
}
