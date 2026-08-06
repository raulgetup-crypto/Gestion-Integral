import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ShieldAlert, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, EmptyState, Chip } from "@/components/ui-kit";
import { Modal, Etiqueta, campo, botonPrimario, botonSecundario } from "@/components/forms";
import { usePermisos } from "@/hooks/use-permisos";
import {
  ROLES,
  ROL_LABEL,
  cambiarActivoUsuario,
  fetchUsuarios,
  guardarUsuario,
  type Usuario,
} from "@/lib/kalen";

export const Route = createFileRoute("/admin/usuarios")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Usuarios y roles — Kalen" },
      {
        name: "description",
        content: "Administración de usuarios del sistema: alta, asignación de roles y activación de accesos.",
      },
      { property: "og:title", content: "Usuarios y roles — Kalen" },
      { property: "og:description", content: "Gestión de accesos y permisos del equipo administrativo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: UsuariosPage,
});

const vacio = { nombre: "", email: "", rol: "solo_lectura" as Usuario["rol"], activo: true, auth_user_id: "" };

function UsuariosPage() {
  const { esAdmin, cargando } = usePermisos();
  const qc = useQueryClient();
  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ["usuarios"],
    queryFn: fetchUsuarios,
    enabled: esAdmin,
  });

  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState<typeof vacio & { id?: number }>(vacio);

  const guardar = useMutation({
    mutationFn: () =>
      guardarUsuario({
        id: form.id,
        nombre: form.nombre,
        email: form.email,
        rol: form.rol,
        activo: form.activo,
        auth_user_id: form.auth_user_id || null,
      }),
    onSuccess: () => {
      toast.success("Usuario guardado.");
      setAbierto(false);
      qc.invalidateQueries({ queryKey: ["usuarios"] });
      qc.invalidateQueries({ queryKey: ["usuario-actual"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const alternar = useMutation({
    mutationFn: (u: Usuario) => cambiarActivoUsuario(u.id, !u.activo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["usuarios"] });
      qc.invalidateQueries({ queryKey: ["usuario-actual"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!cargando && !esAdmin) {
    return (
      <AppShell title="Usuarios y roles" description="Acceso restringido">
        <Panel title="Sin permisos">
          <EmptyState
            icon={ShieldAlert}
            title="Solo administradores"
            hint="Pedile a un administrador que te asigne el rol correspondiente."
          />
        </Panel>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Usuarios y roles"
      description={`${usuarios.length} usuario(s) del sistema`}
      actions={
        <button
          className={botonPrimario}
          onClick={() => {
            setForm(vacio);
            setAbierto(true);
          }}
        >
          <Plus className="h-4 w-4" /> Nuevo usuario
        </button>
      }
    >
      <Panel title="Equipo">
        {isLoading || cargando ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Cargando…</p>
        ) : usuarios.length === 0 ? (
          <EmptyState icon={Users} title="Sin usuarios" hint="Agregá el primer usuario del sistema." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Nombre</th>
                  <th className="px-4 py-2">Correo</th>
                  <th className="px-4 py-2">Rol</th>
                  <th className="px-4 py-2">Estado</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className="border-t border-border hover:bg-accent/40">
                    <td className="px-4 py-2 font-medium">{u.nombre}</td>
                    <td className="px-4 py-2 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-2">
                      <Chip tone={u.rol === "admin" ? "info" : u.rol === "edicion" ? "success" : "warning"}>
                        {ROL_LABEL[u.rol]}
                      </Chip>
                    </td>
                    <td className="px-4 py-2">
                      <Chip tone={u.activo ? "success" : "danger"}>{u.activo ? "Activo" : "Inactivo"}</Chip>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        className="text-xs font-medium text-primary hover:underline"
                        onClick={() => {
                          setForm({
                            id: u.id,
                            nombre: u.nombre,
                            email: u.email,
                            rol: u.rol,
                            activo: u.activo,
                            auth_user_id: u.auth_user_id ?? "",
                          });
                          setAbierto(true);
                        }}
                      >
                        Editar
                      </button>
                      <button
                        className="ml-3 text-xs font-medium text-muted-foreground hover:underline"
                        onClick={() => alternar.mutate(u)}
                      >
                        {u.activo ? "Desactivar" : "Activar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Modal
        abierto={abierto}
        onClose={() => setAbierto(false)}
        titulo={form.id ? "Editar usuario" : "Nuevo usuario"}
        footer={
          <>
            <button className={botonSecundario} onClick={() => setAbierto(false)}>
              Cancelar
            </button>
            <button
              className={botonPrimario}
              disabled={guardar.isPending}
              onClick={() => {
                if (!form.nombre.trim() || !form.email.trim()) {
                  toast.error("Completá nombre y correo.");
                  return;
                }
                guardar.mutate();
              }}
            >
              Guardar
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block">
            <Etiqueta>Nombre</Etiqueta>
            <input
              className={campo}
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </label>
          <label className="block">
            <Etiqueta>Correo (debe coincidir con el de acceso)</Etiqueta>
            <input
              className={campo}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label className="block">
            <Etiqueta>Rol</Etiqueta>
            <select
              className={campo}
              value={form.rol}
              onChange={(e) => setForm({ ...form, rol: e.target.value as Usuario["rol"] })}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROL_LABEL[r]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => setForm({ ...form, activo: e.target.checked })}
            />
            Acceso activo
          </label>
        </div>
      </Modal>
    </AppShell>
  );
}
