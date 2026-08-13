import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function ok<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export type Procedimiento = {
  id: string;
  categoria: string;
  titulo: string;
  paso_a_paso: string;
  version: number;
  historial: HistorialConocimiento[];
  created_at: string;
  updated_at: string;
};

export type Glosario = {
  id: string;
  termino: string;
  definicion: string;
  categoria: string;
  created_at: string;
  updated_at: string;
};

export type HistorialConocimiento = {
  id: string;
  entidad: "procedimiento" | "glosario";
  entidad_id: string;
  accion: "crear" | "editar" | "eliminar";
  version: number | null;
  usuario: string;
  comentario: string;
  created_at: string;
};

async function registrarHistorial(
  entrada: Omit<HistorialConocimiento, "id" | "created_at">,
) {
  await db.from("historial_conocimiento").insert(entrada);
}

/* ================= Procedimientos ================= */

export async function fetchProcedimientos(): Promise<Procedimiento[]> {
  return (
    ok(
      await db
        .from("procedimientos")
        .select("*")
        .order("categoria", { ascending: true }),
    ) ?? []
  );
}

export async function crearProcedimiento(
  datos: Partial<Procedimiento> & { titulo: string },
  usuario: string,
): Promise<Procedimiento> {
  const payload = {
    categoria: datos.categoria ?? "",
    titulo: datos.titulo.trim(),
    paso_a_paso: datos.paso_a_paso ?? "",
    version: 1,
    historial: [{
      accion: "crear",
      version: 1,
      usuario,
      comentario: "Creación del procedimiento.",
      created_at: new Date().toISOString(),
    }],
  };
  return ok(await db.from("procedimientos").insert(payload).select().single()) as Procedimiento;
}

/** Editar un procedimiento sube la versión y exige un comentario del motivo del cambio. */
export async function editarProcedimiento(
  id: string,
  datos: Partial<Procedimiento>,
  usuario: string,
  comentario: string,
): Promise<Procedimiento> {
  const actual = ok(
    await db.from("procedimientos").select("version, historial").eq("id", id).single(),
  ) as { version: number; historial: HistorialConocimiento[] | null };
  const nuevaVersion = (actual?.version ?? 1) + 1;
  const payload = {
    categoria: datos.categoria ?? "",
    titulo: datos.titulo?.trim(),
    paso_a_paso: datos.paso_a_paso ?? "",
    version: nuevaVersion,
    historial: [...(Array.isArray(actual.historial) ? actual.historial : []), {
      accion: "editar",
      version: nuevaVersion,
      usuario,
      comentario,
      created_at: new Date().toISOString(),
    }],
    updated_at: new Date().toISOString(),
  };
  return ok(await db.from("procedimientos").update(payload).eq("id", id).select().single()) as Procedimiento;
}

export async function bajaProcedimiento(id: string, usuario: string, comentario: string) {
  void usuario;
  void comentario;
  ok(await db.from("procedimientos").delete().eq("id", id));
}

export async function fetchHistorialDe(
  entidad: "procedimiento" | "glosario",
  entidadId: string,
): Promise<HistorialConocimiento[]> {
  if (entidad !== "procedimiento") return [];
  const registro = ok(
    await db.from("procedimientos").select("historial").eq("id", entidadId).single(),
  ) as { historial: HistorialConocimiento[] | null };
  return (Array.isArray(registro.historial) ? registro.historial : [])
    .map((item, index) => ({
      ...item,
      id: item.id ?? `${entidadId}-${index}`,
      entidad: "procedimiento" as const,
      entidad_id: entidadId,
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/* ================= Glosario ================= */

export async function fetchGlosario(): Promise<Glosario[]> {
  return (ok(await db.from("glosario").select("*").order("termino", { ascending: true })) ?? []) as Glosario[];
}

export async function crearTermino(
  datos: Partial<Glosario> & { termino: string },
  usuario: string,
): Promise<Glosario> {
  const payload = {
    termino: datos.termino.trim(),
    definicion: datos.definicion ?? "",
    categoria: datos.categoria ?? "",
  };
  const creado = ok(await db.from("glosario").insert(payload).select().single()) as Glosario;
  await registrarHistorial({
    entidad: "glosario",
    entidad_id: creado.id,
    accion: "crear",
    version: null,
    usuario,
    comentario: "Término agregado.",
  });
  return creado;
}

export async function editarTermino(
  id: string,
  datos: Partial<Glosario>,
  usuario: string,
): Promise<Glosario> {
  const actualizado = ok(await db.from("glosario").update(datos).eq("id", id).select().single()) as Glosario;
  await registrarHistorial({
    entidad: "glosario",
    entidad_id: id,
    accion: "editar",
    version: null,
    usuario,
    comentario: "Definición actualizada.",
  });
  return actualizado;
}

export async function eliminarTermino(id: string, usuario: string) {
  ok(await db.from("glosario").delete().eq("id", id));
  await registrarHistorial({
    entidad: "glosario",
    entidad_id: id,
    accion: "eliminar",
    version: null,
    usuario,
    comentario: "Término eliminado.",
  });
}

