import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, StatCard, EmptyState, Chip } from "@/components/ui-kit";
import { Modal, campo, areaTexto, botonPrimario, botonSecundario, Etiqueta } from "@/components/forms";
import { Exportar } from "@/components/Exportar";
import { useEntidad } from "@/hooks/use-entidad";
import { cronogramaApi, TIPOS_HITO, ESTADOS_HITO, type HitoCronograma } from "@/lib/api";
import { mesActual, nombreMes, formatFecha, hoyISO } from "@/lib/format";

export const Route = createFileRoute("/cronograma")({
  head: () => ({
    meta: [
      { title: "Cronograma administrativo — Centro de Día" },
      {
        name: "description",
        content: "Fechas clave de cada mes: cierre de planillas, entrega a mutuales, presentación y cobro, con responsable y estado.",
      },
      { property: "og:title", content: "Cronograma administrativo" },
      { property: "og:description", content: "Planificá el mes administrativo y no perdás ninguna fecha de entrega." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CronogramaPage,
});

const vacio = (mes: string): Partial<HitoCronograma> => ({
  mes,
  titulo: "",
  tipo: "entrega",
  fecha: hoyISO(),
  responsable: "",
  estado: "pendiente",
  observaciones: "",
});

function CronogramaPage() {
  const { datos: hitos, crear, actualizar, eliminar } = useEntidad<HitoCronograma>("cronograma", cronogramaApi, {
    etiqueta: "hito",
  });
  const [mes, setMes] = useState(mesActual());
  const [abierto, setAbierto] = useState(false);
  const [borrador, setBorrador] = useState<Partial<HitoCronograma>>(vacio(mesActual()));

  const delMes = useMemo(
    () => hitos.filter((h) => h.mes === mes).sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [hitos, mes],
  );
  const hoy = hoyISO();
  const vencidos = delMes.filter((h) => h.estado !== "cumplido" && h.fecha < hoy);
  const cumplidos = delMes.filter((h) => h.estado === "cumplido");

  function guardar() {
    if (!borrador.titulo?.trim()) return;
    crear.mutate({ ...borrador, mes });
    setAbierto(false);
    setBorrador(vacio(mes));
  }

  return (
    <AppShell title="Cronograma administrativo" description="Fechas clave del mes y responsables">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className={campo} />
          <span className="text-sm text-muted-foreground">{nombreMes(mes)}</span>
          <div className="ml-auto flex gap-2">
            <Exportar
              filas={delMes.map((h) => ({
                Fecha: formatFecha(h.fecha),
                Hito: h.titulo,
                Tipo: h.tipo,
                Responsable: h.responsable,
                Estado: h.estado,
              }))}
              nombre={`cronograma-${mes}`}
              titulo={`Cronograma administrativo — ${nombreMes(mes)}`}
            />
            <button
              className={botonPrimario}
              onClick={() => {
                setBorrador(vacio(mes));
                setAbierto(true);
              }}
            >
              <Plus className="h-4 w-4" /> Nuevo hito
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Hitos del mes" value={String(delMes.length)} icon={CalendarClock} />
          <StatCard label="Cumplidos" value={String(cumplidos.length)} icon={CalendarClock} tone="success" />
          <StatCard label="Vencidos" value={String(vencidos.length)} icon={CalendarClock} tone="warning" />
        </div>

        <Panel title={`Hitos de ${nombreMes(mes)}`}>
          {delMes.length === 0 ? (
            <EmptyState icon={CalendarClock} title="Sin hitos" hint="Cargá las fechas de cierre y entrega del mes." />
          ) : (
            <ul className="divide-y divide-border/60">
              {delMes.map((h) => {
                const vencido = h.estado !== "cumplido" && h.fecha < hoy;
                return (
                  <li key={h.id} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="w-24 text-sm text-muted-foreground">{formatFecha(h.fecha)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{h.titulo}</span>
                      {h.responsable && (
                        <span className="text-sm text-muted-foreground"> · {h.responsable}</span>
                      )}
                      {h.observaciones && (
                        <p className="text-xs text-muted-foreground">{h.observaciones}</p>
                      )}
                    </span>
                    <Chip tone="info">{h.tipo}</Chip>
                    <Chip tone={h.estado === "cumplido" ? "success" : vencido ? "warning" : "muted"}>
                      {vencido && h.estado !== "cumplido" ? "vencido" : h.estado}
                    </Chip>
                    <select
                      className={campo + " h-9 w-36"}
                      value={h.estado}
                      onChange={(e) => actualizar.mutate({ id: h.id, cambios: { estado: e.target.value } })}
                    >
                      {ESTADOS_HITO.map((e) => (
                        <option key={e} value={e}>
                          {e}
                        </option>
                      ))}
                    </select>
                    <button
                      className={botonSecundario}
                      onClick={() => eliminar.mutate({ id: h.id, etiqueta: `el hito "${h.titulo}"` })}
                    >
                      Eliminar
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <Modal abierto={abierto} onClose={() => setAbierto(false)} titulo="Nuevo hito administrativo">
        <div className="space-y-3">
          <div>
            <Etiqueta>Título</Etiqueta>
            <input
              className={campo}
              value={borrador.titulo ?? ""}
              onChange={(e) => setBorrador({ ...borrador, titulo: e.target.value })}
              placeholder="Entrega de planillas a APROSS"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Etiqueta>Fecha</Etiqueta>
              <input
                type="date"
                className={campo}
                value={borrador.fecha ?? ""}
                onChange={(e) => setBorrador({ ...borrador, fecha: e.target.value })}
              />
            </div>
            <div>
              <Etiqueta>Tipo</Etiqueta>
              <select
                className={campo}
                value={borrador.tipo ?? "entrega"}
                onChange={(e) => setBorrador({ ...borrador, tipo: e.target.value })}
              >
                {TIPOS_HITO.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Etiqueta>Responsable</Etiqueta>
            <input
              className={campo}
              value={borrador.responsable ?? ""}
              onChange={(e) => setBorrador({ ...borrador, responsable: e.target.value })}
            />
          </div>
          <div>
            <Etiqueta>Observaciones</Etiqueta>
            <textarea
              className={areaTexto}
              value={borrador.observaciones ?? ""}
              onChange={(e) => setBorrador({ ...borrador, observaciones: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button className={botonSecundario} onClick={() => setAbierto(false)}>
              Cancelar
            </button>
            <button className={botonPrimario} onClick={guardar}>
              Guardar
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
