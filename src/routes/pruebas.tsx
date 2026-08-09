import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, XCircle, ShieldCheck, Play } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, EmptyState, Chip } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { usePermisos } from "@/hooks/use-permisos";
import {
  ejecutarPruebasRlsDirectorio,
  type ResultadoRls,
} from "@/lib/rls-tests.functions";

export const Route = createFileRoute("/pruebas")({
  head: () => ({
    meta: [
      { title: "Pruebas de permisos — Centro de Día" },
      {
        name: "description",
        content:
          "Pruebas de integración de permisos (RLS) sobre el directorio para los roles admin, edición y solo lectura.",
      },
      { property: "og:title", content: "Pruebas de permisos — Centro de Día" },
      {
        property: "og:description",
        content:
          "Verificación automática de lectura, alta, edición y borrado del directorio por rol.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PruebasPage,
});

function PruebasPage() {
  const { esAdmin, cargando } = usePermisos();
  const ejecutar = useServerFn(ejecutarPruebasRlsDirectorio);
  const [error, setError] = useState<string | null>(null);

  const mutacion = useMutation<ResultadoRls[]>({
    mutationFn: async () => await ejecutar({ data: undefined }),
    onMutate: () => setError(null),
    onError: (e) => setError(e instanceof Error ? e.message : "Error inesperado"),
  });

  const resultados = mutacion.data ?? [];
  const fallidas = resultados.filter((r) => !r.ok).length;

  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Pruebas de permisos</h1>
            <p className="text-sm text-muted-foreground">
              Verifica lectura, alta, edición y borrado del directorio para los roles
              administrador, edición y solo lectura.
            </p>
          </div>
          {esAdmin && (
            <Button onClick={() => mutacion.mutate()} disabled={mutacion.isPending}>
              <Play className="mr-2 size-4" />
              {mutacion.isPending ? "Ejecutando…" : "Ejecutar pruebas"}
            </Button>
          )}
        </header>

        {!cargando && !esAdmin && (
          <Panel>
            <EmptyState
              icon={ShieldCheck}
              title="Acceso restringido"
              description="Solo un administrador puede ejecutar las pruebas de permisos."
            />
          </Panel>
        )}

        {error && (
          <Panel>
            <p className="text-sm text-destructive">{error}</p>
          </Panel>
        )}

        {resultados.length > 0 && (
          <Panel
            title="Resultados"
            actions={
              <Chip tone={fallidas === 0 ? "success" : "danger"}>
                {fallidas === 0
                  ? `${resultados.length}/${resultados.length} correctas`
                  : `${fallidas} fallidas`}
              </Chip>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Rol</th>
                    <th className="py-2 pr-4 font-medium">Operación</th>
                    <th className="py-2 pr-4 font-medium">Esperado</th>
                    <th className="py-2 pr-4 font-medium">Obtenido</th>
                    <th className="py-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((r) => (
                    <tr key={`${r.rol}-${r.operacion}`} className="border-t border-border/60">
                      <td className="py-2 pr-4">{r.rol}</td>
                      <td className="py-2 pr-4 font-mono text-xs">{r.operacion}</td>
                      <td className="py-2 pr-4">{r.esperado}</td>
                      <td className="py-2 pr-4">{r.obtenido}</td>
                      <td className="py-2">
                        {r.ok ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 className="size-4" /> OK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-destructive">
                            <XCircle className="size-4" /> Falla
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </div>
    </AppShell>
  );
}
