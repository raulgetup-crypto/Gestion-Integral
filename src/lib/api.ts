import { supabase } from "@/integrations/supabase/client";

// Cliente sin tipado estricto: el esquema es dinámico y las tablas se validan en runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/* ================= Tipos ================= */
export type Concurrente = {
  id: string;
  legacy_id: string | null;
  nombre: string;
  apellido: string;
  dni: string;
  fecha_nacimiento: string | null;
  direccion: string;
  telefono: string;
  transporte: boolean;
  lugar_firma: string;
  grupo: string;
  prestacion: string;
  obra_social: string;
  mutual: string;
  observaciones_administrativas: string;
  n_afiliado: string;

  dias_x_semana: string;
  dias_especificos: string;
  horarios: string;
  responsable: string;
  mail: string;
  wsp: string;
  notas: string;
  observaciones: string;
  tipo: string;
  activo: boolean;
  fecha_baja: string | null;
  motivo_baja: string;
  created_at: string;
  updated_at: string;
};

export const LUGARES_FIRMA = ["Kalen", "Banda Norte", "Domicilio", "Otro"] as const;


export type PlanillaEstado = {
  id: string;
  concurrente_id: string;
  mes: string;
  /** Tipo de planilla (DAI, MIE, CD, TRANSPORTE…). "general" es la histórica. */
  tipo?: string;
  estados: Record<string, boolean>;
  ciclo?: CicloPlanilla;
  lote_id?: string | null;
  fecha_impresion?: string | null;
  impresa_por?: string;
  fecha_entrega?: string | null;
  fecha_recepcion?: string | null;
  fecha_firma?: string | null;
  fecha_escaneo?: string | null;
  fecha_archivado?: string | null;
};

export const CICLO_PLANILLA = [
  "pendiente",
  "impresa",
  "en_lote",
  "entregada",
  "recibida",
  "firmada",
  "escaneada",
  "archivada",
] as const;
export type CicloPlanilla = (typeof CICLO_PLANILLA)[number];

export const CICLO_LABEL: Record<CicloPlanilla, string> = {
  pendiente: "Pendiente",
  impresa: "Impresa",
  en_lote: "En lote",
  entregada: "Entregada",
  recibida: "Recibida",
  firmada: "Firmada",
  escaneada: "Escaneada",
  archivada: "Archivada",
};



export type Turno = {
  id: string;
  fecha: string;
  hora: string;
  tipo: string;
  nombre: string;
  contacto: string;
  obra_social: string;
  notas: string;
  estado: string;
  created_at: string;
};

export type Tarea = {
  id: string;
  titulo: string;
  prioridad: string;
  vence: string | null;
  notas: string;
  estado: string;
  created_at: string;
};

export type Evento = {
  id: string;
  titulo: string;
  fecha: string;
  hora: string;
  prioridad: string;
  categoria: string;
  color: string;
  estado: string;
  descripcion: string;
  concurrente_id: string | null;
  created_at: string;
};

export type Mensaje = {
  id: string;
  nombre: string;
  motivo: string;
  fecha: string;
  notas: string;
  estado: string;
  created_at: string;
};

export type Documento = {
  id: string;
  concurrente_id: string | null;
  nombre: string;
  tipo: string;
  requisito: string;
  storage_path: string;
  url: string;
  vencimiento: string | null;
  notas: string;
  created_at: string;
};

export type Factura = {
  id: string;
  concurrente_id: string | null;
  mes: string;
  monto: number;
  estado: string;
  notas: string;
  created_at: string;
};

export type CatalogoItem = { id: string; tipo: string; valor: string };

export type HistorialItem = {
  id: string;
  entidad: string;
  entidad_id: string | null;
  concurrente_id: string | null;
  accion: string;
  detalle: string;
  usuario: string;
  observaciones: string;
  created_at: string;
};

export type Requisito = {
  id: string;
  prestacion: string;
  documento: string;
  obligatorio: boolean;
  vence: boolean;
};

export type Lote = {
  id: string;
  numero: string;
  prestacion: string;
  mutual: string;
  mes: string;
  fecha_armado: string;
  fecha_entrega: string | null;
  fecha_recepcion: string | null;
  entregado_por: string;
  recibido_por: string;
  lugar_entrega?: string;

  estado: string;
  notas: string;
  created_at: string;
  updated_at: string;
};

export type LoteItem = {
  id: string;
  lote_id: string;
  concurrente_id: string | null;
  nombre: string;
};

export const ESTADOS_LOTE = ["armado", "entregado", "recibido", "cerrado"] as const;

export const ESTADOS_PLANILLA = [
  { key: "impresa", label: "IMP", full: "Impresa" },
  { key: "enviado", label: "ENV", full: "Enviado" },
  { key: "entregado", label: "ENT", full: "Entregado" },
  { key: "recibida", label: "REC", full: "Recibida" },
  { key: "firmado", label: "FIR", full: "Firmado" },
  { key: "facturado", label: "FAC", full: "Facturado" },
  { key: "cobrado", label: "COB", full: "Cobrado" },
] as const;

/* ================= Helper ================= */
function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return (data ?? []) as T;
}

/** Usuario actual (email) para auditoría; cacheado para no consultar en cada acción. */
let usuarioActual = "";
export async function refrescarUsuarioAuditoria() {
  const { data } = await supabase.auth.getSession();
  usuarioActual = data.session?.user?.email ?? "";
  return usuarioActual;
}

export async function logHistorial(entry: {
  entidad: string;
  accion: string;
  detalle?: string;
  entidad_id?: string | null;
  concurrente_id?: string | null;
  observaciones?: string;
}): Promise<{ ok: boolean }> {
  if (!usuarioActual) await refrescarUsuarioAuditoria().catch(() => "");
  // La auditoría nunca debe romper la operación principal: se registra el fallo y se sigue.
  try {
    const { error } = await db.from("historial").insert({
      entidad: entry.entidad,
      accion: entry.accion,
      detalle: entry.detalle ?? "",
      entidad_id: entry.entidad_id ?? null,
      concurrente_id: entry.concurrente_id ?? null,
      usuario: usuarioActual,
      observaciones: entry.observaciones ?? "",
    });
    if (error) {
      console.error("[historial] no se pudo registrar la acción:", error.message);
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.error("[historial] no se pudo registrar la acción:", e);
    return { ok: false };
  }
}


/* ================= Concurrentes ================= */
export async function fetchConcurrentes() {
  return unwrap<Concurrente[]>(
    await db.from("concurrentes").select("*").order("nombre", { ascending: true }),
  );
}

export async function createConcurrente(input: Partial<Concurrente>) {
  const { data, error } = await db.from("concurrentes").insert(input).select().single();
  if (error) throw new Error(error.message);
  await logHistorial({
    entidad: "concurrente",
    accion: "alta",
    detalle: `Se dio de alta a ${data.nombre}`,
    concurrente_id: data.id,
  });
  return data as Concurrente;
}

export async function updateConcurrente(id: string, input: Partial<Concurrente>) {
  const { data, error } = await supabase
    .from("concurrentes")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  await logHistorial({
    entidad: "concurrente",
    accion: input.activo === false ? "baja" : "edicion",
    detalle:
      input.activo === false
        ? `Baja de ${data.nombre}${input.motivo_baja ? ` — ${input.motivo_baja}` : ""}`
        : `Se actualizó la ficha de ${data.nombre}`,
    concurrente_id: id,
  });
  return data as Concurrente;
}

/**
 * Baja lógica: nunca se borra físicamente un concurrente (se perdería documentación,
 * facturación e historial asociado). Se marca inactivo con fecha y motivo de baja.
 * Reversible: basta con volver a poner activo = true.
 */
export async function deleteConcurrente(id: string, nombre: string, motivo = "") {
  const { error } = await db
    .from("concurrentes")
    .update({
      activo: false,
      fecha_baja: new Date().toISOString().slice(0, 10),
      motivo_baja: motivo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await logHistorial({
    entidad: "concurrente",
    accion: "baja",
    detalle: `Se dio de baja a ${nombre}${motivo ? ` — ${motivo}` : ""}`,
    concurrente_id: id,
  });
}

/* ================= Planilla ================= */
export async function fetchPlanilla(mes: string) {
  return unwrap<PlanillaEstado[]>(await db.from("planilla_estados").select("*").eq("mes", mes));
}

export async function fetchPlanillaAll() {
  return unwrap<PlanillaEstado[]>(await db.from("planilla_estados").select("*"));
}

// Cola de escritura por (concurrente, mes): garantiza que dos clics rápidos
// se apliquen en orden y que la última marca quede realmente guardada.
const colaPlanilla = new Map<string, Promise<void>>();

export async function upsertPlanilla(
  concurrente_id: string,
  mes: string,
  estados: Record<string, boolean>,
  tipo = "general",
) {
  const clave = `${concurrente_id}|${mes}|${tipo}`;
  const anterior = colaPlanilla.get(clave) ?? Promise.resolve();
  const actual = anterior
    .catch(() => undefined)
    .then(async () => {
      const { error } = await supabase
        .from("planilla_estados")
        .upsert(
          { concurrente_id, mes, tipo, estados, updated_at: new Date().toISOString() } as never,
          { onConflict: "concurrente_id,mes,tipo" },
        );
      if (error) throw new Error(error.message);
    });
  colaPlanilla.set(clave, actual);
  try {
    await actual;
  } finally {
    if (colaPlanilla.get(clave) === actual) colaPlanilla.delete(clave);
  }
}


/* ================= CRUD genérico con historial automático ================= */
type CrudCfg<T> = {
  table: string;
  orderCol: string;
  asc?: boolean;
  entidad: string;
  /** Texto legible de la fila, usado en el historial. */
  label: (row: Partial<T>) => string;
};

export type CrudApi<T extends { id: string }> = {
  list: () => Promise<T[]>;
  create: (input: Partial<T>) => Promise<T>;
  update: (id: string, input: Partial<T>) => Promise<T>;
  remove: (id: string, label?: string) => Promise<void>;
};

function crud<T extends { id: string; concurrente_id?: string | null }>(cfg: CrudCfg<T>): CrudApi<T> {
  const { table, orderCol, asc = true, entidad, label } = cfg;
  return {
    list: async (): Promise<T[]> =>
      unwrap<T[]>(await db.from(table).select("*").order(orderCol, { ascending: asc })),

    create: async (input: Partial<T>): Promise<T> => {
      const { data, error } = await db.from(table).insert(input).select().single();
      if (error) throw new Error(error.message);
      await logHistorial({
        entidad,
        accion: "alta",
        detalle: `Se creó ${label(data)}`,
        entidad_id: data.id,
        concurrente_id: data.concurrente_id ?? null,
      });
      return data as T;
    },

    update: async (id: string, input: Partial<T>): Promise<T> => {
      const { data, error } = await db.from(table).update(input).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      await logHistorial({
        entidad,
        accion: "edicion",
        detalle: `Se modificó ${label(data)}${describirCambios(input)}`,
        entidad_id: id,
        concurrente_id: data.concurrente_id ?? null,
      });
      return data as T;
    },

    remove: async (id: string, textoLabel?: string) => {
      const { error } = await db.from(table).delete().eq("id", id);
      if (error) throw new Error(error.message);
      await logHistorial({
        entidad,
        accion: "eliminado",
        detalle: `Se eliminó ${textoLabel ?? entidad}`,
        entidad_id: id,
      });
    },
  };
}

/** Resume los campos tocados para que el historial sea informativo y no genérico. */
function describirCambios(input: Record<string, unknown>) {
  const claves = Object.keys(input).filter((k) => !["updated_at", "id"].includes(k));
  if (claves.length === 0) return "";
  const legibles: Record<string, string> = {
    estado: "estado",
    prioridad: "prioridad",
    fecha: "fecha",
    hora: "hora",
    vencimiento: "vencimiento",
    monto: "monto",
  };
  const resumen = claves
    .slice(0, 4)
    .map((k) => {
      const v = input[k];
      const nombre = legibles[k] ?? k;
      return v === null || v === "" ? nombre : `${nombre}: ${String(v).slice(0, 40)}`;
    })
    .join(", ");
  return ` (${resumen})`;
}

export const turnosApi = crud<Turno>({
  table: "turnos",
  orderCol: "fecha",
  entidad: "turno",
  label: (t) => `el turno de ${t.nombre ?? "—"} (${t.fecha ?? ""} ${t.hora ?? ""})`.trim(),
});
export const tareasApi = crud<Tarea>({
  table: "tareas",
  orderCol: "created_at",
  asc: false,
  entidad: "tarea",
  label: (t) => `la tarea "${t.titulo ?? "—"}"`,
});
export const eventosApi = crud<Evento>({
  table: "eventos",
  orderCol: "fecha",
  entidad: "evento",
  label: (e) => `el evento "${e.titulo ?? "—"}"`,
});
export const mensajesApi = crud<Mensaje>({
  table: "mensajes",
  orderCol: "created_at",
  asc: false,
  entidad: "mensaje",
  label: (m) => `la consulta de ${m.nombre ?? "—"}`,
});
export const documentosApi = crud<Documento>({
  table: "documentos",
  orderCol: "created_at",
  asc: false,
  entidad: "documento",
  label: (d) => `el documento "${d.nombre ?? "—"}"`,
});
export const facturacionApi = crud<Factura>({
  table: "facturacion",
  orderCol: "created_at",
  asc: false,
  entidad: "facturacion",
  label: (f) => `la facturación de ${f.mes ?? "—"}`,
});


export async function fetchCatalogos() {
  const rows = unwrap<CatalogoItem[]>(
    await db.from("catalogos").select("*").order("valor", { ascending: true }),
  );
  const grouped: Record<string, string[]> = { prestaciones: [], mutuales: [], responsables: [] };
  for (const r of rows) {
    grouped[r.tipo] = grouped[r.tipo] || [];
    grouped[r.tipo].push(r.valor);
  }
  return grouped;
}

export async function addCatalogo(tipo: string, valor: string) {
  const { error } = await db.from("catalogos").insert({ tipo, valor });
  if (error) throw new Error(error.message);
}

export async function removeCatalogo(tipo: string, valor: string) {
  const { error } = await db.from("catalogos").delete().eq("tipo", tipo).eq("valor", valor);
  if (error) throw new Error(error.message);
}

export async function fetchHistorial(limit = 50) {
  return unwrap<HistorialItem[]>(
    await db.from("historial").select("*").order("created_at", { ascending: false }).limit(limit),
  );
}

/* ================= Storage ================= */
export const MAX_ARCHIVO_MB = 20;

const EXTENSIONES_OK = [".pdf", ".doc", ".docx", ".odt", ".jpg", ".jpeg", ".png", ".webp", ".heic", ".gif"];

/** Valida extensión y tamaño antes de gastar una subida (evita errores silenciosos). */
export function validarArchivo(file: File): string | null {
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!EXTENSIONES_OK.includes(ext)) {
    return `Formato no admitido (${ext || "sin extensión"}). Se aceptan PDF, Word e imágenes.`;
  }
  if (file.size > MAX_ARCHIVO_MB * 1024 * 1024) return `El archivo supera los ${MAX_ARCHIVO_MB} MB.`;
  if (file.size === 0) return "El archivo está vacío.";
  return null;
}

export async function subirDocumento(file: File, concurrenteId: string | null) {
  const problema = validarArchivo(file);
  if (problema) throw new Error(problema);
  // Nombre único: timestamp + aleatorio evita colisiones con subidas simultáneas.
  const seguro = file.name.replace(/[^\w.\-]/g, "_").slice(-80);
  const path = `${concurrenteId ?? "general"}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${seguro}`;
  const { error } = await db.storage.from("documentos").upload(path, file, { upsert: false });
  if (error) throw new Error(error.message);
  return path;
}


export async function urlDocumento(path: string) {
  const { data } = await db.storage.from("documentos").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? "";
}

export async function borrarArchivo(path: string) {
  if (path) await db.storage.from("documentos").remove([path]);
}

/* ================= Requisitos documentales ================= */
export async function fetchRequisitos() {
  return unwrap<Requisito[]>(
    await db.from("requisitos_documentales").select("*").order("prestacion").order("documento"),
  );
}

export async function addRequisito(input: Partial<Requisito>) {
  const { error } = await db.from("requisitos_documentales").insert(input);
  if (error) throw new Error(error.message);
}

export async function removeRequisito(id: string) {
  const { error } = await db.from("requisitos_documentales").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ================= Lotes ================= */
export const lotesApi = crud<Lote>({
  table: "lotes",
  orderCol: "created_at",
  asc: false,
  entidad: "lote",
  label: (l) => `el lote ${l.numero ?? "—"}`,
});

export async function fetchLoteItems(loteId?: string) {
  let q = db.from("lote_items").select("*").order("nombre", { ascending: true });
  if (loteId) q = q.eq("lote_id", loteId);
  return unwrap<LoteItem[]>(await q);
}

export async function setLoteItems(loteId: string, items: { concurrente_id: string; nombre: string }[]) {
  // Reemplazo atómico en el servidor: si algo falla, el lote conserva su contenido anterior.
  const { error } = await db.rpc("set_lote_items", {
    p_lote_id: loteId,
    p_items: items.map((i) => ({ concurrente_id: i.concurrente_id, nombre: i.nombre })),
  });
  if (error) throw new Error(error.message);
  await logHistorial({
    entidad: "lote",
    accion: "edicion",
    detalle: `Se actualizó el contenido del lote (${items.length} planillas)`,
    entidad_id: loteId,
  });
}

/** Cambia la etapa del ciclo de varias planillas de un mes (atómico en el servidor). */
export async function setCicloPlanillas(
  ids: string[],
  mes: string,
  ciclo: CicloPlanilla,
  opciones: { loteId?: string | null; detalle?: string; tipo?: string; observaciones?: string } = {},
) {
  if (ids.length === 0) return 0;
  if (!usuarioActual) await refrescarUsuarioAuditoria().catch(() => "");
  const { data, error } = await db.rpc("set_ciclo_planillas", {
    p_ids: ids,
    p_mes: mes,
    p_ciclo: ciclo,
    p_lote_id: opciones.loteId ?? null,
    p_usuario: usuarioActual,
    p_tipo: opciones.tipo ?? "general",
    p_observaciones: opciones.observaciones ?? "",
  });
  if (error) throw new Error(error.message);

  await logHistorial({
    entidad: "planilla",
    accion: ciclo,
    detalle: opciones.detalle ?? `${ids.length} planillas pasaron a "${CICLO_LABEL[ciclo]}" (${mes})`,
    entidad_id: opciones.loteId ?? null,
  });
  return (data as number) ?? ids.length;
}

/** Aplica una etapa del ciclo a todas las planillas de un lote. */
export async function setCicloLote(loteId: string, ciclo: CicloPlanilla, numero?: string) {
  const { error } = await db.rpc("set_ciclo_lote", { p_lote_id: loteId, p_ciclo: ciclo });
  if (error) throw new Error(error.message);
  await logHistorial({
    entidad: "lote",
    accion: ciclo,
    detalle: `Lote ${numero ?? ""}: planillas marcadas como "${CICLO_LABEL[ciclo]}"`.trim(),
    entidad_id: loteId,
  });
}

/** Siguiente número correlativo sugerido: AAAA-NNN. */
export function siguienteNumeroLote(lotes: Lote[]) {

  const anio = new Date().getFullYear();
  const n = lotes.filter((l) => l.numero.startsWith(`${anio}-`)).length + 1;
  return `${anio}-${String(n).padStart(3, "0")}`;
}

/* ================= Importación masiva ================= */
export async function insertConcurrentesMasivo(filas: Partial<Concurrente>[]) {
  if (filas.length === 0) return 0;
  const { data, error } = await db.from("concurrentes").insert(filas).select("id,nombre");
  if (error) throw new Error(error.message);
  await logHistorial({
    entidad: "concurrente",
    accion: "importacion",
    detalle: `Importación masiva: ${data.length} concurrentes desde Excel`,
    observaciones: (data as { nombre: string }[]).map((d) => d.nombre).slice(0, 30).join(", "),
  });
  return data.length as number;
}

/**
 * Importación tolerante a fallos: inserta fila por fila para que un registro
 * rechazado (DNI duplicado en base, dato inválido) no cancele toda la carga.
 */
export async function importarConcurrentesTolerante(filas: Partial<Concurrente>[]) {
  const importados: string[] = [];
  const fallidos: { nombre: string; motivo: string }[] = [];
  for (const fila of filas) {
    const { data, error } = await db.from("concurrentes").insert(fila).select("id,nombre").single();
    if (error) fallidos.push({ nombre: String(fila.nombre ?? "—"), motivo: error.message });
    else importados.push(data.nombre as string);
  }
  // Solo se registra en historial si algo se importó realmente.
  if (importados.length > 0) {
    await logHistorial({
      entidad: "concurrente",
      accion: "importacion",
      detalle: `Importación masiva: ${importados.length} concurrentes desde archivo`,
      observaciones: importados.slice(0, 40).join(", "),
    });
  }
  return { importados: importados.length, fallidos };
}

/**
 * Importación masiva atómica: toda la carga se procesa dentro de una función
 * de base de datos, por lo que si una sola fila falla no se guarda ninguna.
 */
export async function importarConcurrentesLote(
  items: { accion: "insert" | "update"; datos: Partial<Concurrente> }[],
): Promise<{ insertados: number; actualizados: number }> {
  const { data, error } = await (db as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
  }).rpc("importar_concurrentes_lote", { p_items: items });
  if (error) throw new Error(error.message);
  const r = (data ?? {}) as { insertados?: number; actualizados?: number };
  const insertados = r.insertados ?? 0;
  const actualizados = r.actualizados ?? 0;
  await logHistorial({
    entidad: "concurrente",
    accion: "importacion",
    detalle: `Importación masiva: ${insertados} insertados, ${actualizados} actualizados`,
    observaciones: items
      .map((i) => `${i.accion === "update" ? "ACT" : "NUEVO"} ${String(i.datos.nombre ?? "—")}`)
      .slice(0, 40)
      .join(", "),
  });
  return { insertados, actualizados };
}


/* ================= Viandas ================= */
export type Vianda = {
  id: string;
  concurrente_id: string | null;
  nombre_concurrente: string;
  profesional: string;
  administrativo: string;
  mes: string;
  semana: number;
  fecha: string;
  cantidad: number;
  precio_unitario: number;
  observaciones: string;
  forma_pago: string;
  comprobante_recibido: boolean;
  fecha_comprobante: string | null;
  fecha_pago: string | null;
  estado: string;
  created_at: string;
  updated_at: string;
};

export const ESTADOS_VIANDA = ["pendiente", "pagado", "anulado"] as const;

export const viandasApi = crud<Vianda>({
  table: "viandas",
  orderCol: "fecha",
  asc: false,
  entidad: "vianda",
  label: (v) => `la vianda de ${v.nombre_concurrente || "—"} (${v.fecha ?? ""})`.trim(),
});

/* ================= Notas rápidas ================= */
export type NotaRapida = {
  id: string;
  titulo: string;
  texto: string;
  categoria: string;
  prioridad: string;
  fecha: string;
  estado: string;
  created_at: string;
  updated_at: string;
};

export const CATEGORIAS_NOTA = [
  "Admisiones",
  "Llamados",
  "Familias",
  "Dirección",
  "Transporte",
  "APROSS",
  "ANSES",
  "Documentación",
  "Pendientes",
  "Otros",
] as const;

export const PRIORIDADES_NOTA = ["alta", "media", "baja"] as const;
export const ESTADOS_NOTA = ["pendiente", "en proceso", "resuelto", "archivado"] as const;

export const notasApi = crud<NotaRapida>({
  table: "notas_rapidas",
  orderCol: "created_at",
  asc: false,
  entidad: "nota",
  label: (n) => `la nota "${n.titulo ?? "—"}"`,
});

/* ================= Documento maestro ================= */
export type DocMaestro = {
  id: string;
  concurrente_id: string;
  contenido: string;
  version: number;
  actualizado_por: string;
  created_at: string;
  updated_at: string;
};

export type DocMaestroVersion = {
  id: string;
  concurrente_id: string | null;
  documento_id: string | null;
  version: number;
  contenido: string;
  usuario: string;
  resumen: string;
  created_at: string;
};

export async function fetchDocMaestro(concurrenteId: string): Promise<DocMaestro | null> {
  const { data, error } = await db
    .from("documento_maestro")
    .select("*")
    .eq("concurrente_id", concurrenteId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as DocMaestro) ?? null;
}

export async function fetchDocMaestroVersiones(concurrenteId: string) {
  return unwrap<DocMaestroVersion[]>(
    await db
      .from("documento_maestro_versiones")
      .select("*")
      .eq("concurrente_id", concurrenteId)
      .order("version", { ascending: false }),
  );
}

/**
 * Guarda el documento maestro creando siempre una versión nueva.
 * Las versiones anteriores nunca se modifican ni se eliminan.
 */
export async function guardarDocMaestro(concurrenteId: string, contenido: string, resumen = "") {
  if (!usuarioActual) await refrescarUsuarioAuditoria().catch(() => "");
  const actual = await fetchDocMaestro(concurrenteId);
  const version = (actual?.version ?? 0) + 1;

  let doc: DocMaestro;
  if (actual) {
    const { data, error } = await db
      .from("documento_maestro")
      .update({ contenido, version, actualizado_por: usuarioActual, updated_at: new Date().toISOString() })
      .eq("id", actual.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    doc = data as DocMaestro;
  } else {
    const { data, error } = await db
      .from("documento_maestro")
      .insert({ concurrente_id: concurrenteId, contenido, version, actualizado_por: usuarioActual })
      .select()
      .single();
    if (error) throw new Error(error.message);
    doc = data as DocMaestro;
  }

  const { error: errVer } = await db.from("documento_maestro_versiones").insert({
    concurrente_id: concurrenteId,
    documento_id: doc.id,
    version,
    contenido,
    usuario: usuarioActual,
    resumen,
  });
  if (errVer) throw new Error(errVer.message);

  await logHistorial({
    entidad: "documento_maestro",
    accion: actual ? "edicion" : "alta",
    detalle: `Documento maestro guardado (versión ${version})`,
    entidad_id: doc.id,
    concurrente_id: concurrenteId,
    observaciones: resumen,
  });

  return doc;
}

/* ================= Documento maestro · versiones de archivo ================= */
export type DocMaestroArchivo = {
  id: string;
  concurrente_id: string;
  version: number;
  nombre: string;
  storage_path: string;
  mime: string;
  tamano: number;
  descripcion: string;
  usuario: string;
  created_at: string;
  updated_at: string;
};

/** CRUD genérico (con historial automático) reutilizado por useEntidad. */
export const docMaestroArchivosApi = crud<DocMaestroArchivo>({
  table: "documento_maestro_archivos",
  orderCol: "created_at",
  asc: false,
  entidad: "documento_maestro",
  label: (a) => `el archivo "${a.nombre ?? "—"}" del documento maestro`,
});

/**
 * Sube un archivo del documento maestro como nueva versión.
 * Nunca reemplaza versiones anteriores: cada subida es V1, V2, V3…
 */
export async function subirVersionDocMaestro(
  concurrenteId: string,
  file: File,
  descripcion = "",
  versiones: DocMaestroArchivo[] = [],
) {
  if (!usuarioActual) await refrescarUsuarioAuditoria().catch(() => "");
  const problema = validarArchivo(file);
  if (problema) throw new Error(problema);
  const version = Math.max(0, ...versiones.map((v) => v.version)) + 1;
  const path = await subirDocumento(file, `maestro-${concurrenteId}`);
  return docMaestroArchivosApi.create({
    concurrente_id: concurrenteId,
    version,
    nombre: file.name,
    storage_path: path,
    mime: file.type || "",
    tamano: file.size,
    descripcion,
    usuario: usuarioActual,
  });
}

/* ================= Viandas · deuda por concurrente ================= */
export function deudaViandas(viandas: Vianda[]) {
  const activas = viandas.filter((v) => v.estado !== "anulado");
  const importe = (v: Vianda) => v.cantidad * Number(v.precio_unitario || 0);
  return {
    total: activas.reduce((s, v) => s + importe(v), 0),
    pagado: activas.filter((v) => v.estado === "pagado").reduce((s, v) => s + importe(v), 0),
    deuda: activas.filter((v) => v.estado !== "pagado").reduce((s, v) => s + importe(v), 0),
    pendientes: activas.filter((v) => v.estado !== "pagado").length,
    sinComprobante: activas.filter((v) => !v.comprobante_recibido).length,
    cantidad: activas.reduce((s, v) => s + v.cantidad, 0),
  };
}

/* ================= Sprint 2A · Prestaciones, cronograma y control APROSS ================= */
export type ConcurrentePrestacion = {
  id: string;
  concurrente_id: string;
  prestacion: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  activa: boolean;
  principal: boolean;
  observaciones: string;
  created_at: string;
  updated_at: string;
};

export type PrestacionHorario = {
  id: string;
  prestacion_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  horas: number;
  observaciones: string;
  created_at: string;
  updated_at: string;
};

export type RegistroHoras = {
  id: string;
  concurrente_id: string;
  prestacion_id: string | null;
  fecha: string;
  horas: number;
  tipo: string;
  mes: string;
  observaciones: string;
  usuario: string;
  created_at: string;
  updated_at: string;
};

export const prestacionesApi = crud<ConcurrentePrestacion>({
  table: "concurrente_prestaciones",
  orderCol: "created_at",
  entidad: "prestacion",
  label: (p) => `la prestación "${p.prestacion ?? "—"}"`,
});

export const horariosApi = crud<PrestacionHorario>({
  table: "prestacion_horarios",
  orderCol: "dia_semana",
  entidad: "cronograma",
  label: (h) => `el horario ${h.hora_inicio ?? ""}-${h.hora_fin ?? ""}`.trim(),
});

export const registroHorasApi = crud<RegistroHoras>({
  table: "registro_horas",
  orderCol: "fecha",
  asc: false,
  entidad: "registro_horas",
  label: (r) => `el registro de ${r.horas ?? 0} h (${r.tipo ?? ""}) del ${r.fecha ?? ""}`,
});

/** Prestaciones de un concurrente, la principal activa primero. */
export async function fetchPrestacionesDe(concurrenteId: string) {
  return unwrap<ConcurrentePrestacion[]>(
    await db
      .from("concurrente_prestaciones")
      .select("*")
      .eq("concurrente_id", concurrenteId)
      .order("principal", { ascending: false })
      .order("created_at", { ascending: true }),
  );
}

/** Cronograma semanal de una o varias prestaciones. */
export async function fetchHorariosDe(prestacionIds: string[]) {
  if (prestacionIds.length === 0) return [] as PrestacionHorario[];
  return unwrap<PrestacionHorario[]>(
    await db
      .from("prestacion_horarios")
      .select("*")
      .in("prestacion_id", prestacionIds)
      .order("dia_semana", { ascending: true })
      .order("hora_inicio", { ascending: true }),
  );
}

/** Registros de horas de un concurrente (opcionalmente de un mes YYYY-MM). */
export async function fetchRegistroHorasDe(concurrenteId: string, mes?: string) {
  let q = db.from("registro_horas").select("*").eq("concurrente_id", concurrenteId);
  if (mes) q = q.eq("mes", mes);
  return unwrap<RegistroHoras[]>(await q.order("fecha", { ascending: false }));
}

/** Todos los registros de un mes, para el panel de alertas. */
export async function fetchRegistroHorasMes(mes: string) {
  return unwrap<RegistroHoras[]>(
    await db.from("registro_horas").select("*").eq("mes", mes).order("fecha", { ascending: false }),
  );
}
