import { Download } from "lucide-react";
import { exportar, type Fila } from "@/lib/export";

/** Botonera única de exportación (Excel / CSV / PDF) reutilizada por todos los listados. */
export function Exportar({
  filas,
  nombre,
  titulo,
  className,
}: {
  filas: Fila[];
  nombre: string;
  titulo?: string;
  className?: string;
}) {
  const base =
    "inline-flex h-9 items-center gap-1.5 rounded-lg border border-input px-3 text-xs font-medium transition-colors hover:bg-accent";
  return (
    <div className={className ? `flex gap-2 ${className}` : "flex gap-2"}>
      <button className={base} onClick={() => exportar(filas, nombre, "xlsx", titulo)}>
        <Download className="h-3.5 w-3.5" /> Excel
      </button>
      <button className={base} onClick={() => exportar(filas, nombre, "csv", titulo)}>
        <Download className="h-3.5 w-3.5" /> CSV
      </button>
      <button className={base} onClick={() => exportar(filas, nombre, "pdf", titulo)}>
        <Download className="h-3.5 w-3.5" /> PDF
      </button>
    </div>
  );
}
