import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CrudApi } from "@/lib/api";

/**
 * Hook genérico de entidad: una sola fuente de verdad para listar, crear,
 * editar y eliminar. Centraliza invalidaciones y avisos para que ninguna
 * escritura falle en silencio ni quede la UI desincronizada.
 */
export function useEntidad<T extends { id: string }>(
  key: string,
  api: CrudApi<T>,
  opts?: { etiqueta?: string },
) {
  const qc = useQueryClient();
  const nombre = opts?.etiqueta ?? "registro";

  const refrescar = useCallback(() => {
    qc.invalidateQueries({ queryKey: [key] });
    qc.invalidateQueries({ queryKey: ["historial"] });
  }, [qc, key]);

  const query = useQuery({ queryKey: [key], queryFn: api.list });

  const crear = useMutation({
    mutationFn: (input: Partial<T>) => api.create(input),
    onSuccess: () => {
      refrescar();
      toast.success(`${cap(nombre)} guardado`);
    },
    onError: (e: Error) => toast.error(`No se pudo guardar: ${e.message}`),
  });

  const actualizar = useMutation({
    mutationFn: ({ id, cambios }: { id: string; cambios: Partial<T> }) => api.update(id, cambios),
    // Actualización optimista: la UI responde al instante y se revierte si falla.
    onMutate: async ({ id, cambios }) => {
      await qc.cancelQueries({ queryKey: [key] });
      const previo = qc.getQueryData<T[]>([key]);
      qc.setQueryData<T[]>([key], (old) =>
        (old ?? []).map((row) => (row.id === id ? { ...row, ...cambios } : row)),
      );
      return { previo };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.previo) qc.setQueryData([key], ctx.previo);
      toast.error(`No se pudo actualizar: ${e.message}`);
    },
    onSettled: refrescar,
  });

  const eliminar = useMutation({
    mutationFn: ({ id, etiqueta }: { id: string; etiqueta?: string }) => api.remove(id, etiqueta),
    onSuccess: () => {
      refrescar();
      toast.success(`${cap(nombre)} eliminado`);
    },
    onError: (e: Error) => toast.error(`No se pudo eliminar: ${e.message}`),
  });

  return {
    datos: query.data ?? [],
    cargando: query.isLoading,
    error: query.error,
    crear,
    actualizar,
    eliminar,
    refrescar,
  };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
