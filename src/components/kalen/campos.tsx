import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { campo, areaTexto, Etiqueta } from "@/components/forms";
import { fetchUsuarioActual } from "@/lib/kalen";
import { cn } from "@/lib/utils";

/** Usuario de la tabla `usuarios` vinculado a la sesión (para created_by / updated_by). */
export function useUsuarioActual() {
  const q = useQuery({ queryKey: ["usuario-actual"], queryFn: fetchUsuarioActual, staleTime: 60_000 });
  return { usuario: q.data ?? null, usuarioId: q.data?.id ?? null, cargando: q.isLoading };
}

export function Campo({
  label,
  error,
  requerido,
  children,
}: {
  label: string;
  error?: string;
  requerido?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <Etiqueta>
        {label}
        {requerido && <span className="text-destructive"> *</span>}
      </Etiqueta>
      {children}
      {error && <span className="mt-1 block text-xs font-medium text-destructive">{error}</span>}
    </label>
  );
}

const conError = (error?: string) => cn(campo, error && "border-destructive focus:border-destructive focus:ring-destructive/20");

export function Texto({
  label,
  value,
  onChange,
  error,
  requerido,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  requerido?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <Campo label={label} error={error} requerido={requerido}>
      <input
        type={type}
        className={conError(error)}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Campo>
  );
}

/** Fecha con selector de calendario nativo (input date). */
export function Fecha({
  label,
  value,
  onChange,
  error,
  requerido,
  disabled,
}: {
  label: string;
  value: string | null;
  onChange: (v: string) => void;
  error?: string;
  requerido?: boolean;
  disabled?: boolean;
}) {
  return (
    <Campo label={label} error={error} requerido={requerido}>
      <input
        type="date"
        disabled={disabled}
        className={cn(conError(error), disabled && "opacity-60")}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </Campo>
  );
}

export function Selector<T extends string | number>({
  label,
  value,
  onChange,
  opciones,
  error,
  requerido,
  vacio = "— Seleccionar —",
}: {
  label: string;
  value: T | null;
  onChange: (v: string) => void;
  opciones: readonly { value: T; label: string }[];
  error?: string;
  requerido?: boolean;
  vacio?: string | null;
}) {
  return (
    <Campo label={label} error={error} requerido={requerido}>
      <select className={conError(error)} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        {vacio !== null && <option value="">{vacio}</option>}
        {opciones.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </Campo>
  );
}

export function Area({
  label,
  value,
  onChange,
  error,
  requerido,
  filas = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  requerido?: boolean;
  filas?: number;
}) {
  return (
    <Campo label={label} error={error} requerido={requerido}>
      <textarea
        rows={filas}
        className={cn(areaTexto, error && "border-destructive focus:border-destructive focus:ring-destructive/20")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Campo>
  );
}

/** Resumen de errores arriba del formulario, en rojo. */
export function ResumenErrores({ errores }: { errores: Record<string, string> }) {
  const lista = Object.values(errores).filter(Boolean);
  if (!lista.length) return null;
  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2">
      <p className="text-xs font-semibold text-destructive">Revisá estos campos antes de guardar:</p>
      <ul className="mt-1 list-disc pl-4 text-xs text-destructive">
        {lista.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
    </div>
  );
}
