import * as XLSX from "xlsx";
import { toast } from "sonner";

export type Formato = "xlsx" | "csv" | "pdf";

export type Fila = Record<string, string | number>;

/** Exporta cualquier listado respetando los filtros ya aplicados por la vista. */
export function exportar(filas: Fila[], nombreArchivo: string, formato: Formato, titulo?: string) {
  if (filas.length === 0) {
    toast.error("No hay filas para exportar");
    return;
  }
  if (formato === "pdf") {
    imprimirTabla(titulo ?? nombreArchivo, filas);
    return;
  }
  const ws = XLSX.utils.json_to_sheet(filas);
  if (formato === "csv") {
    descargar(`${nombreArchivo}.csv`, "\uFEFF" + XLSX.utils.sheet_to_csv(ws), "text/csv;charset=utf-8");
  } else {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, (titulo ?? "Datos").slice(0, 28));
    XLSX.writeFile(wb, `${nombreArchivo}.xlsx`);
  }
  toast.success(`Exportado (${formato.toUpperCase()})`);
}

function descargar(nombre: string, contenido: string, mime: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Archivo descargado");
}

export const escapar = (v: unknown) =>
  String(v ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] ?? c);

/** PDF vía diálogo de impresión del navegador: sin dependencias extra ni servidor. */
export function imprimirHTML(titulo: string, cuerpo: string) {
  const w = window.open("", "_blank", "noopener,width=900,height=700");
  if (!w) {
    toast.error("El navegador bloqueó la ventana de impresión");
    return;
  }
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapar(titulo)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:ui-sans-serif,system-ui,Segoe UI,Arial,sans-serif;color:#111;margin:28px;font-size:12px}
  h1{font-size:18px;margin:0 0 4px}
  .meta{color:#555;font-size:11px;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th,td{border:1px solid #ccc;padding:5px 7px;text-align:left;vertical-align:top}
  th{background:#f2f2f2;text-transform:uppercase;font-size:10px;letter-spacing:.03em}
  tr{break-inside:avoid}
  .firmas{display:flex;gap:48px;margin-top:56px}
  .firma{flex:1;border-top:1px solid #333;padding-top:6px;font-size:11px;color:#444}
  @page{margin:16mm}
</style></head><body>${cuerpo}
<script>window.onload=function(){window.print()}<\/script></body></html>`);
  w.document.close();
}

export function imprimirTabla(titulo: string, filas: Fila[], extra?: string) {
  const cols = Object.keys(filas[0] ?? {});
  const cuerpo = `<h1>${escapar(titulo)}</h1>
<div class="meta">${filas.length} registros · Generado el ${new Date().toLocaleString("es-AR")}</div>
${extra ?? ""}
<table><thead><tr>${cols.map((c) => `<th>${escapar(c)}</th>`).join("")}</tr></thead>
<tbody>${filas
    .map((f) => `<tr>${cols.map((c) => `<td>${escapar(f[c])}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
  imprimirHTML(titulo, cuerpo);
}
