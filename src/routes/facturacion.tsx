import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, Receipt, Download, Check } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Panel, Chip, EmptyState, StatCard } from "@/components/ui-kit";
import { facturacionApi, fetchConcurrentes, logHistorial, type Factura } from "@/lib/api";
import { mesActual, nombreMes, moneda } from "@/lib/format";

export const Route = createFileRoute("/facturacion")({
  head: () => ({
    meta: [
      { title: "Facturación — Centro de Día" },
      {
        name: "description",
        content: "Registro de facturación mensual por concurrente: montos emitidos, presentados, cobrados y pendientes.",
      },
      { property: "og:title", content: "Facturación — Centro de Día" },
      { property: "og:description", content: "Control de montos facturados y cobrados mes a mes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FacturacionPage,
});

const field = "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm";

function FacturacionPage() {
  const qc = useQueryClient();
  const [mes, setMes] = useState(mesActual());
  const [form, setForm] = useState<Partial<Factura>>({ concurrente_id: "", monto: 0, estado: "emitida", notas: "" });

  const { data: facturas = [] } = useQuery({ queryKey: ["facturacion"], queryFn: facturacionApi.list });
  const { data: personas = [] } = useQuery({ queryKey: ["concurrentes"], queryFn: fetchConcurrentes });

  const nombrePersona = (id: string | null) => personas.find((p) => p.id === id)?.nombre ?? "Sin asignar";

  const crear = useMutation({
    mutationFn: () =>
      facturacionApi.create({
        ...form,
        mes,
        concurrente_id: form.concurrente_id || null,
        monto: Number(form.monto) || 0,
      }),
    onSuccess: () => {
      // El historial ya se registra automáticamente en la capa de servicios.
      qc.invalidateQueries({ queryKey: ["facturacion"] });
      qc.invalidateQueries({ queryKey: ["historial"] });
      setForm({ concurrente_id: "", monto: 0, estado: "emitida", notas: "" });
      toast.success("Factura registrada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const actualizar = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: string }) => facturacionApi.update(id, { estado }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facturacion"] });
      qc.invalidateQueries({ queryKey: ["historial"] });
    },
    onError: (e: Error) => toast.error(`No se pudo actualizar: ${e.message}`),
  });

  const borrar = useMutation({
    mutationFn: (id: string) => facturacionApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facturacion"] });
      qc.invalidateQueries({ queryKey: ["historial"] });
    },
    onError: (e: Error) => toast.error(`No se pudo eliminar: ${e.message}`),
  });


  const delMes = useMemo(() => facturas.filter((f) => f.mes === mes), [facturas, mes]);
  const total = delMes.reduce((a, f) => a + Number(f.monto), 0);
  const cobrado = delMes.filter((f) => f.estado === "cobrado").reduce((a, f) => a + Number(f.monto), 0);

  function exportar() {
    const ws = XLSX.utils.json_to_sheet(
      delMes.map((f) => ({
        Concurrente: nombrePersona(f.concurrente_id),
        Mes: nombreMes(f.mes),
        Monto: Number(f.monto),
        Estado: f.estado,
        Notas: f.notas,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Facturación");
    XLSX.writeFile(wb, `facturacion-${mes}.xlsx`);
  }

  return (
    <AppShell title="Facturación" description={`Movimientos de ${nombreMes(mes)}`}>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Receipt} label="Total del mes" value={moneda(total)} hint={`${delMes.length} facturas`} tone="info" />
        <StatCard icon={Check} label="Cobrado" value={moneda(cobrado)} tone="success" />
        <StatCard icon={Receipt} label="Pendiente" value={moneda(total - cobrado)} tone="warning" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Panel
          title="Facturas"
          action={
            <div className="flex items-center gap-2">
              <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="h-8 rounded-lg border border-input bg-card px-2 text-xs" />
              <button onClick={exportar} className="rounded-md p-1.5 text-muted-foreground hover:text-primary" aria-label="Exportar">
                <Download className="h-4 w-4" />
              </button>
            </div>
          }
        >
          {delMes.length === 0 ? (
            <EmptyState icon={Receipt} title="Sin facturas este mes" hint="Registrá la primera desde el panel de la derecha." />
          ) : (
            <ul className="divide-y divide-border">
              {delMes.map((f) => (
                <li key={f.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{nombrePersona(f.concurrente_id)}</p>
                    <p className="truncate text-xs text-muted-foreground">{f.notas || "Sin notas"}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums">{moneda(Number(f.monto))}</span>
                    <select
                      value={f.estado}
                      onChange={(e) => actualizar.mutate({ id: f.id, estado: e.target.value })}
                      className="h-8 rounded-lg border border-input bg-card px-2 text-xs"
                    >
                      <option value="emitida">Emitida</option>
                      <option value="presentada">Presentada</option>
                      <option value="cobrado">Cobrada</option>
                    </select>
                    <button onClick={() => borrar.mutate(f.id)} className="rounded-md p-1.5 text-muted-foreground hover:text-destructive" aria-label="Eliminar">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Nueva factura">
          <div className="space-y-3 p-4">
            <select value={form.concurrente_id ?? ""} onChange={(e) => setForm({ ...form, concurrente_id: e.target.value })} className={field}>
              <option value="">Sin concurrente</option>
              {personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Monto"
              value={form.monto || ""}
              onChange={(e) => setForm({ ...form, monto: Number(e.target.value) })}
              className={field}
            />
            <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} className={field}>
              <option value="emitida">Emitida</option>
              <option value="presentada">Presentada</option>
              <option value="cobrado">Cobrada</option>
            </select>
            <textarea rows={2} placeholder="Notas" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm" />
            <Chip tone="muted">Se registra en {nombreMes(mes)}</Chip>
            <button
              onClick={() => crear.mutate()}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground"
            >
              <Plus className="h-4 w-4" /> Registrar factura
            </button>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
