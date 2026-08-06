import { useQuery } from "@tanstack/react-query";
import { fetchUsuarioActual, type Usuario } from "@/lib/kalen";
import { useSession } from "@/hooks/use-session";

export type Rol = Usuario["rol"];

/**
 * Permisos efectivos del usuario logueado.
 * El rol se resuelve contra la tabla `usuarios` (vinculada por auth_user_id o email).
 * Ante la duda (usuario no vinculado todavía) se asume "solo_lectura": nunca se abre de más.
 */
export function usePermisos() {
  const { session, cargando: cargandoSesion } = useSession();

  const { data: usuario = null, isLoading } = useQuery({
    queryKey: ["usuario-actual", session?.user.id ?? null],
    queryFn: fetchUsuarioActual,
    enabled: Boolean(session),
    staleTime: 5 * 60 * 1000,
  });

  const rol: Rol = usuario?.rol ?? "solo_lectura";
  const activo = usuario ? usuario.activo : Boolean(session);

  return {
    usuario,
    usuarioId: usuario?.id ?? null,
    rol,
    activo,
    cargando: cargandoSesion || isLoading,
    esAdmin: activo && rol === "admin",
    puedeEditar: activo && (rol === "admin" || rol === "edicion"),
    soloLectura: !activo || rol === "solo_lectura",
  };
}
