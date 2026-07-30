import { supabase } from "@/integrations/supabase/client";

// Cliente sin tipado estricto: el esquema es dinámico y las tablas se validan en runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/* ================= Tipos ================= */
export type Concurrente = {
  id: string;
  legacy_id: string | null;
  nombre: string;
  grupo: string;
  prestacion: string;
  obra_social: string;
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

export type PlanillaEstado = {
  id: string;
  concurrente_id: string;
  mes: string;
  estados: Record<string, boolean>;
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
  created_at: string;
};

export const ESTADOS_PLANILLA = [
  { key: "enviado", label: "ENV", full: "Enviado" },
  { key: "entregado", label: "ENT", full: "Entregado" },
  { key: "firmado", label: "FIR", full: "Firmado" },
  { key: "facturado", label: "FAC", full: "Facturado" },
  { key: "cobrado", label: "COB", full: "Cobrado" },
] as const;

/* ================= Helper ================= */
function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return (data ?? []) as T;
}

export async function logHistorial(entry: {
  entidad: string;
  accion: string;
  detalle?: string;
  entidad_id?: string | null;
  concurrente_id?: string | null;
}) {
  await db.from("historial").insert({
    entidad: entry.entidad,
    accion: entry.accion,
    detalle: entry.detalle ?? "",
    entidad_id: entry.entidad_id ?? null,
    concurrente_id: entry.concurrente_id ?? null,
  });
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

export async function deleteConcurrente(id: string, nombre: string) {
  const { error } = await db.from("concurrentes").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await logHistorial({ entidad: "concurrente", accion: "eliminado", detalle: `Se eliminó a ${nombre}` });
}

/* ================= Planilla ================= */
export async function fetchPlanilla(mes: string) {
  return unwrap<PlanillaEstado[]>(await db.from("planilla_estados").select("*").eq("mes", mes));
}

export async function fetchPlanillaAll() {
  return unwrap<PlanillaEstado[]>(await db.from("planilla_estados").select("*"));
}

export async function upsertPlanilla(concurrente_id: string, mes: string, estados: Record<string, boolean>) {
  const { error } = await supabase
    .from("planilla_estados")
    .upsert({ concurrente_id, mes, estados, updated_at: new Date().toISOString() }, { onConflict: "concurrente_id,mes" });
  if (error) throw new Error(error.message);
}

/* ================= Genéricos ================= */
function crud<T extends { id: string }>(table: string, orderCol: string, asc = true) {
  return {
    list: async (): Promise<T[]> =>
      unwrap<T[]>(await db.from(table).select("*").order(orderCol, { ascending: asc })),
    create: async (input: Partial<T>): Promise<T> => {
      const { data, error } = await db.from(table).insert(input).select().single();
      if (error) throw new Error(error.message);
      return data as T;
    },
    update: async (id: string, input: Partial<T>): Promise<T> => {
      const { data, error } = await db.from(table).update(input).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data as T;
    },
    remove: async (id: string) => {
      const { error } = await db.from(table).delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
  };
}

export const turnosApi = crud<Turno>("turnos", "fecha");
export const tareasApi = crud<Tarea>("tareas", "created_at", false);
export const eventosApi = crud<Evento>("eventos", "fecha");
export const mensajesApi = crud<Mensaje>("mensajes", "created_at", false);
export const documentosApi = crud<Documento>("documentos", "created_at", false);
export const facturacionApi = crud<Factura>("facturacion", "created_at", false);

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
export async function subirDocumento(file: File, concurrenteId: string | null) {
  const path = `${concurrenteId ?? "general"}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
  const { error } = await db.storage.from("documentos").upload(path, file);
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
