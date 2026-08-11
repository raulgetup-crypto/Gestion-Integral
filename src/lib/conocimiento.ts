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
  contenido: string;
  fuente_informacion: string;
  personas_a_consultar: string;
  forma_correcta_firmar: string;
  errores_frecuentes: string;
  version: number;
  activo: boolean;
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
        .from("procedimiento")
        .select("*")
        .eq("activo", true)
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
    contenido: datos.contenido ?? "",
    fuente_informacion: datos.fuente_informacion ?? "",
    personas_a_consultar: datos.personas_a_consultar ?? "",
    forma_correcta_firmar: datos.forma_correcta_firmar ?? "",
    errores_frecuentes: datos.errores_frecuentes ?? "",
    version: 1,
    activo: true,
  };
  const creado = ok(await db.from("procedimiento").insert(payload).select().single()) as Procedimiento;
  await registrarHistorial({
    entidad: "procedimiento",
    entidad_id: creado.id,
    accion: "crear",
    version: 1,
    usuario,
    comentario: "Creación del procedimiento.",
  });
  return creado;
}

/** Editar un procedimiento sube la versión y exige un comentario del motivo del cambio. */
export async function editarProcedimiento(
  id: string,
  datos: Partial<Procedimiento>,
  usuario: string,
  comentario: string,
): Promise<Procedimiento> {
  const actual = ok(await db.from("procedimiento").select("version").eq("id", id).single()) as { version: number };
  const nuevaVersion = (actual?.version ?? 1) + 1;
  const payload = { ...datos, version: nuevaVersion };
  const actualizado = ok(
    await db.from("procedimiento").update(payload).eq("id", id).select().single(),
  ) as Procedimiento;
  await registrarHistorial({
    entidad: "procedimiento",
    entidad_id: id,
    accion: "editar",
    version: nuevaVersion,
    usuario,
    comentario,
  });
  return actualizado;
}

export async function bajaProcedimiento(id: string, usuario: string, comentario: string) {
  ok(await db.from("procedimiento").update({ activo: false }).eq("id", id));
  await registrarHistorial({
    entidad: "procedimiento",
    entidad_id: id,
    accion: "eliminar",
    version: null,
    usuario,
    comentario,
  });
}

export async function fetchHistorialDe(entidad: "procedimiento" | "glosario", entidadId: string) {
  return (
    ok(
      await db
        .from("historial_conocimiento")
        .select("*")
        .eq("entidad", entidad)
        .eq("entidad_id", entidadId)
        .order("created_at", { ascending: false }),
    ) ?? []
  );
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

