import { deleteCategoria, deleteConcepto } from "@/app/actions";
import { CategoriaDialog, ConceptoDialog } from "@/components/ajustes-dialogs";
import { DeleteButton } from "@/components/form-dialog";
import { Card, CardTitle, catColor, PageHeader } from "@/components/ui";
import { VehiculoDialog } from "@/components/vehiculo-dialogs";
import { getCatalogo, getVehiculos } from "@/lib/data";
import { formatPct, sum } from "@/lib/format";
import { COMBUSTIBLES } from "@/lib/types";

export const metadata = { title: "Ajustes" };

export default async function AjustesPage() {
  const [{ categorias, conceptos }, vehiculos] = await Promise.all([getCatalogo(), getVehiculos()]);
  const totalPct = sum(categorias.filter((c) => c.tipo === "gasto").map((c) => c.presupuesto_pct ?? 0));

  return (
    <>
      <PageHeader title="Ajustes" subtitle="Categorías, conceptos, presupuesto y vehículos" />

      <Card>
        <CardTitle action={<div className="flex gap-2"><ConceptoDialog categorias={categorias} /><CategoriaDialog /></div>}>
          Categorías y conceptos
        </CardTitle>
        <p className="mb-3 text-xs text-muted">
          Reparto del presupuesto: <b className="tnum">{formatPct(totalPct)}</b> de los ingresos
          {Math.abs(totalPct - 100) > 0.01 && <span className="text-neg"> (no suma 100 %)</span>}
        </p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {categorias.map((c, i) => (
            <div key={c.id} className="rounded-xl border border-border p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: catColor(c.nombre, i) }} />
                <span className="font-medium">{c.nombre}</span>
                <span className="text-xs text-muted">
                  {c.tipo}
                  {c.presupuesto_pct != null && ` · ${formatPct(c.presupuesto_pct)}`}
                </span>
                <div className="ml-auto flex">
                  <CategoriaDialog categoria={c} />
                  <DeleteButton action={deleteCategoria.bind(null, c.id)} label={`la categoría ${c.nombre}`} />
                </div>
              </div>
              <ul className="space-y-0.5 text-sm">
                {conceptos.filter((co) => co.categoria_id === c.id).map((co) => (
                  <li key={co.id} className="flex items-center rounded-md pl-4 hover:bg-surface-2">
                    <span className="flex-1">{co.nombre}</span>
                    <ConceptoDialog categorias={categorias} concepto={co} />
                    <DeleteButton action={deleteConcepto.bind(null, co.id)} label={`el concepto ${co.nombre}`} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-3">
        <CardTitle action={<VehiculoDialog />}>Vehículos</CardTitle>
        <ul className="divide-y divide-border/60 text-sm">
          {vehiculos.map((v) => (
            <li key={v.id} className="flex items-center gap-3 py-2">
              <span className="flex-1 font-medium">{v.nombre}</span>
              <span className="text-muted">{v.combustibles.map((c) => COMBUSTIBLES[c]).join(" + ")}</span>
              <span className="w-20 text-right text-xs text-muted">{v.activo ? "En uso" : "Retirado"}</span>
              <VehiculoDialog vehiculo={v} />
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
