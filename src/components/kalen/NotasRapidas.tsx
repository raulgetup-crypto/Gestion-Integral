import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { StickyNote, Check, ArrowRightCircle } from "lucide-react";
import { Panel, EmptyState } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { tareasApi } from "@/lib/api";
import { usePermisos } from "@/hooks/use-permisos";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type NotaRapida = {
  id: string;
  titulo: string;
  texto: string;
  estado: string;
  created_at: string;
};

async function fetchNotas(): Promise<NotaRapida[]> {
  const { data, error } = await db
    .from("notas_rapidas")
    .select("*")
    .neq("estado", "resuelta")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as NotaRapida[]) ?? [];
}

/** Captura rápida: "esto apareció ahora y no quiero olvidarlo". No confundir con Tarea. */
export function NotasRapidas() {
  const qc = useQueryClient();
  const { usuarioId, puedeEditar } = usePermisos();
  const [texto, setTexto] = useState("");

  const { data: notas = [] } = useQuery({ queryKey: ["notas-rapidas"], queryFn: fetchNotas });
  const refrescar = () => qc.invalidateQueries({ queryKey: ["notas-rapidas"] });

  const agregar = useMutation({
    mutationFn: async () => {
      const { error } = await db
        .from("notas_rapidas")
        .insert({ titulo: texto.trim().slice(0, 80), texto: texto.trim(), estado: "pendiente" });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setTexto("");
      refrescar();
    },
    onError: (e: Error) => toast.error(`No se pudo guardar: ${e.message}`),
  });

  const resolver = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("notas_rapidas").update({ estado: "resuelta" }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: refrescar,
  });

  const convertir = useMutation({
    mutationFn: async (nota: NotaRapida) => {
      await tareasApi.create({ titulo: nota.texto || nota.titulo, prioridad: "media", estado: "pendiente", notas: "" });
      const { error } = await db.from("notas_rapidas").update({ estado: "resuelta" }).eq("id", nota.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      refrescar();
      toast.success("Convertida en tarea");
    },
    onError: (e: Error) => toast.error(`No se pudo convertir: ${e.message}`),
  });

  return (
    <Panel title="Notas rápidas">
      <div className="p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (texto.trim()) agregar.mutate();
          }}
          className="flex gap-2"
        >
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribí algo y apretá Enter…"
            disabled={!puedeEditar}
            className="h-10 flex-1 rounded-lg border border-input bg-card px-3 text-sm disabled:opacity-50"
          />
        </form>

        {notas.length === 0 ? (
          <div className="mt-3">
            <EmptyState icon={StickyNote} title="Sin notas pendientes" hint="Escribí algo arriba para no olvidarlo." />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {notas.map((n) => (
              <li key={n.id} className="flex items-center gap-2 py-2 text-sm">
                <span className="flex-1">{n.contenido}</span>
                <button onClick={() => convertir.mutate(n)} title="Convertir en tarea" className="rounded-md p-1.5 text-muted-foreground hover:bg-accent">
                  <ArrowRightCircle className="h-4 w-4" />
                </button>
                <button onClick={() => resolver.mutate(n.id)} title="Marcar resuelta" className="rounded-md p-1.5 text-muted-foreground hover:bg-accent">
                  <Check className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}

