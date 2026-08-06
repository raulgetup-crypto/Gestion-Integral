import { supabase } from "@/integrations/supabase/client";

export type AlertaRevisada = {
  id: string;
  usuario_id: number | null;
  tipo_alerta: string;
  fecha_revision: string;
  observaciones: string;
};

/** Última revisión registrada (opcionalmente por categoría). */
export async function ultimaRevision(tipo = "todas"): Promise<AlertaRevisada | null> {
  const { data, error } = await supabase
    .from("alertas_revisadas")
    .select("id,usuario_id,tipo_alerta,fecha_revision,observaciones")
    .eq("tipo_alerta", tipo)
    .order("fecha_revision", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as AlertaRevisada | null;
}

/** Registra que el usuario revisó las alertas. No borra ni oculta alertas. */
export async function marcarRevisadas(params: { usuarioId: number | null; tipo?: string; observaciones?: string }) {
  const { error } = await supabase.from("alertas_revisadas").insert({
    usuario_id: params.usuarioId,
    tipo_alerta: params.tipo ?? "todas",
    observaciones: params.observaciones ?? "",
  });
  if (error) throw error;
}
