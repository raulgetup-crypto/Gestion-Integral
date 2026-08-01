export const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// Zona horaria fija: el servidor (UTC) y el navegador deben coincidir,
// si no la fecha "de hoy" difiere y React falla al hidratar.
export const ZONA = "America/Argentina/Buenos_Aires";

export function hoyISO() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function mesActual() {
  return hoyISO().slice(0, 7);
}

export function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function parseISO(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function nombreMes(mes: string) {
  const [y, m] = mes.split("-");
  return `${MESES[Number(m) - 1]} ${y}`;
}

export function formatFecha(iso?: string | null) {
  if (!iso) return "—";
  const d = parseISO(iso.slice(0, 10));
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatFechaHora(ts: string) {
  return new Date(ts).toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function diasHasta(iso?: string | null) {
  if (!iso) return null;
  const hoy = parseISO(hoyISO());
  const target = parseISO(iso.slice(0, 10));
  return Math.round((target.getTime() - hoy.getTime()) / 86400000);
}

export function tiempoRelativo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `hace ${d} d`;
  return formatFecha(new Date(ts).toISOString());
}

export function iniciales(nombre: string) {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export function moneda(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}
