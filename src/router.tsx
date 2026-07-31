import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Datos siempre frescos al volver a la app; reintentos ante fallos de red.
        staleTime: 15_000,
        gcTime: 5 * 60_000,
        retry: 2,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 1,
        // Red de seguridad: ninguna escritura puede fallar en silencio.
        onError: (error) => {
          const msg = error instanceof Error ? error.message : "Error desconocido";
          toast.error(`No se pudo guardar el cambio: ${msg}`);
        },
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
