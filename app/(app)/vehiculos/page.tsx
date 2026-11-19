import Link from "next/link";
import { ArrowRight, Car } from "lucide-react";
import { Bars } from "@/components/charts";
import { GastosVehiculoList } from "@/components/gastos-vehiculo-list";
import { PeriodSelect } from "@/components/month-select";
import { Card, CardTitle, PageHeader, Stat } from "@/components/ui";
import { GastoVehiculoDialog } from "@/components/vehiculo-dialogs";
import { getGastosVehiculo, getRepostajes, getVehiculos } from "@/lib/data";
import { formatEUR, formatNum, sum, todayISO } from "@/lib/format";
import { COMBUSTIBLES } from "@/lib/types";
import { statsCombustible, statsVehiculo, yearOf } from "@/lib/vehiculos";

export const metadata = { title: "Vehículos" };

export default async function VehiculosPage({ searchParams }: { searchParams: Promise<{ anio?: string }> }) {
  const sp = await searchParams;
  const [vehiculos, reps, gastos] = await Promise.all([getVehiculos(), getRepostajes(), getGastosVehiculo()]);
  const thisYear = yearOf(todayISO());
  const allYears = [...new Set([thisYear, ...reps.map((r) => yearOf(r.fecha)), ...gastos.map((g) => g.anio)])].sort((a, b) => b - a);
  const anio = /^\d{4}$/.test(sp.anio ?? "") ? Number(sp.anio) : thisYear;

  const repsY = reps.filter((r) => yearOf(r.fecha) === anio);
  const gastosY = gastos.filter((g) => g.anio === anio);
  const visibles = vehiculos.filter((v) => v.activo || repsY.some((r) => r.vehiculo_id === v.id) || gastosY.some((g) => g.vehiculo_id === v.id));
  const sinAsignar = gastosY.filter((g) => !g.vehiculo_id);

  const combustibleY = sum(repsY.map((r) => r.coste));
  const otrosY = sum(gastosY.map((g) => g.coste));
  const historial = [...allYears].reverse().map((y) => ({
    anio: String(y),
    combustible: sum(reps.filter((r) => yearOf(r.fecha) === y).map((r) => r.coste)),
    otros: sum(gastos.filter((g) => g.anio === y).map((g) => g.coste)),
  }));

  return (
    <>
      <PageHeader title="Vehículos" subtitle="Combustible, consumo y mantenimiento">
        <PeriodSelect options={allYears.map((y) => ({ value: String(y), label: String(y) }))} value={String(anio)} param="anio" />
        <GastoVehiculoDialog vehiculos={vehiculos} anio={anio} />
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={`Total ${anio}`} value={formatEUR(combustibleY + otrosY)} tone="accent" />
        <Stat label="Combustible" value={formatEUR(combustibleY)} hint={`${repsY.length} repostajes`} />
        <Stat label="Mantenimiento y otros" value={formatEUR(otrosY)} hint={`${gastosY.length} gastos`} />
        <Stat label="Km recorridos" value={`${formatNum(sum(repsY.map((r) => r.distancia ?? 0)), 0)} km`} />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {visibles.map((v) => {
          const rv = repsY.filter((r) => r.vehiculo_id === v.id);
          const s = statsVehiculo(rv, gastosY.filter((g) => g.vehiculo_id === v.id));
          return (
            <Link key={v.id} href={`/vehiculos/${v.id}?anio=${anio}`} className="group">
              <Card className="h-full transition-colors group-hover:border-accent">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-soft text-accent"><Car size={18} /></span>
                    <div>
                      <h2 className="font-semibold leading-tight">{v.nombre}</h2>
                      <p className="text-xs text-muted">{v.combustibles.map((c) => COMBUSTIBLES[c]).join(" + ")}{!v.activo && " · retirado"}</p>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-muted transition-transform group-hover:translate-x-0.5" />
                </div>
                <dl className="grid grid-cols-3 gap-3 text-sm">
                  <div><dt className="text-xs text-muted">Total</dt><dd className="tnum font-semibold">{formatEUR(s.total)}</dd></div>
                  <div><dt className="text-xs text-muted">Combustible</dt><dd className="tnum">{formatEUR(s.coste)}</dd></div>
                  <div><dt className="text-xs text-muted">Otros</dt><dd className="tnum">{formatEUR(s.otros)}</dd></div>
                  <div><dt className="text-xs text-muted">Km</dt><dd className="tnum">{formatNum(s.distancia, 0)}</dd></div>
                  <div><dt className="text-xs text-muted">€/km</dt><dd className="tnum">{s.costeKm != null ? formatNum(s.costeKm, 3) : "—"}</dd></div>
                  <div><dt className="text-xs text-muted">Repostajes</dt><dd className="tnum">{s.repostajes}</dd></div>
                </dl>
                {v.combustibles.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3 text-xs">
                    {v.combustibles.map((c) => {
                      const sc = statsCombustible(rv.filter((r) => r.combustible === c));
                      if (!sc.repostajes) return null;
                      return (
                        <span key={c} className="rounded-lg bg-surface-2 px-2 py-1">
                          {COMBUSTIBLES[c]}: <b className="tnum">{sc.consumo != null ? `${formatNum(sc.consumo)} L/100` : "—"}</b> · <span className="tnum">{sc.precio != null ? `${formatNum(sc.precio, 3)} €/L` : ""}</span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Card>
          <CardTitle>Coste por año</CardTitle>
          <Bars
            data={historial}
            xKey="anio"
            series={[
              { key: "combustible", label: "Combustible", color: "var(--c6)", stack: "a" },
              { key: "otros", label: "Mantenimiento y otros", color: "var(--c5)", stack: "a" },
            ]}
          />
        </Card>
        <Card>
          <CardTitle>Gastos sin asignar a un coche · {anio}</CardTitle>
          <GastosVehiculoList gastos={sinAsignar} vehiculos={vehiculos} />
        </Card>
      </div>
    </>
  );
}
