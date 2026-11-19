import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { deleteRepostaje } from "@/app/actions";
import { Lines } from "@/components/charts";
import { DeleteButton } from "@/components/form-dialog";
import { GastosVehiculoList } from "@/components/gastos-vehiculo-list";
import { PeriodSelect } from "@/components/month-select";
import { Card, CardTitle, Empty, PageHeader, Stat } from "@/components/ui";
import { GastoVehiculoDialog, RepostajeDialog } from "@/components/vehiculo-dialogs";
import { getGastosVehiculo, getRepostajes, getVehiculos } from "@/lib/data";
import { formatEUR, formatFecha, formatNum, todayISO } from "@/lib/format";
import { COMBUSTIBLES, type Combustible } from "@/lib/types";
import { statsCombustible, statsVehiculo, ultimosKm, yearOf } from "@/lib/vehiculos";

const COLOR: Record<Combustible, string> = { diesel: "var(--c1)", gasolina: "var(--c2)", glp: "var(--c3)" };

export default async function VehiculoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ anio?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [vehiculos, reps, gastos] = await Promise.all([getVehiculos(), getRepostajes({ vehiculoId: id }), getGastosVehiculo({ vehiculoId: id })]);
  const v = vehiculos.find((x) => x.id === id);
  if (!v) notFound();

  const thisYear = yearOf(todayISO());
  const years = [...new Set([thisYear, ...reps.map((r) => yearOf(r.fecha)), ...gastos.map((g) => g.anio)])].sort((a, b) => b - a);
  const anio = /^\d{4}$/.test(sp.anio ?? "") ? Number(sp.anio) : thisYear;
  const repsY = reps.filter((r) => yearOf(r.fecha) === anio);
  const gastosY = gastos.filter((g) => g.anio === anio);
  const s = statsVehiculo(repsY, gastosY);
  const combs = [...new Set([...v.combustibles, ...repsY.map((r) => r.combustible)])];

  const serie = [...repsY].reverse().map((r) => ({
    fecha: formatFecha(r.fecha).slice(0, 5),
    [`c_${r.combustible}`]: r.consumo != null ? Math.round(r.consumo * 100) / 100 : null,
    [`p_${r.combustible}`]: r.precio_litro != null ? Math.round(r.precio_litro * 1000) / 1000 : null,
  }));

  return (
    <>
      <Link href={`/vehiculos?anio=${anio}`} className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-text">
        <ChevronLeft size={15} /> Vehículos
      </Link>
      <PageHeader title={v.nombre} subtitle={v.combustibles.map((c) => COMBUSTIBLES[c]).join(" + ")}>
        <PeriodSelect options={years.map((y) => ({ value: String(y), label: String(y) }))} value={String(anio)} param="anio" />
        <GastoVehiculoDialog vehiculos={vehiculos} vehiculoId={v.id} anio={anio} />
        <RepostajeDialog vehiculo={v} ultimoKm={ultimosKm(reps)} />
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={`Total ${anio}`} value={formatEUR(s.total)} tone="accent" hint={s.costeKm != null ? `${formatNum(s.costeKm, 3)} €/km` : undefined} />
        <Stat label="Combustible" value={formatEUR(s.coste)} hint={`${formatNum(s.litros, 0)} L en ${s.repostajes} repostajes`} />
        <Stat label="Km recorridos" value={`${formatNum(s.distancia, 0)} km`} />
        <Stat label="Mantenimiento y otros" value={formatEUR(s.otros)} />
      </div>

      {combs.length > 0 && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {combs.map((c) => {
            const sc = statsCombustible(repsY.filter((r) => r.combustible === c));
            return (
              <Card key={c} className="p-4">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR[c] }} /> {COMBUSTIBLES[c]}
                </p>
                <dl className="grid grid-cols-3 gap-2 text-sm">
                  <div><dt className="text-xs text-muted">Consumo medio</dt><dd className="tnum font-semibold">{sc.consumo != null ? `${formatNum(sc.consumo)} L` : "—"}</dd></div>
                  <div><dt className="text-xs text-muted">€/L medio</dt><dd className="tnum">{sc.precio != null ? formatNum(sc.precio, 3) : "—"}</dd></div>
                  <div><dt className="text-xs text-muted">Coste</dt><dd className="tnum">{formatEUR(sc.coste)}</dd></div>
                </dl>
              </Card>
            );
          })}
        </div>
      )}

      {serie.length > 1 && (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <Card>
            <CardTitle>Consumo (L/100 km)</CardTitle>
            <Lines data={serie} xKey="fecha" series={combs.filter((c) => repsY.some((r) => r.combustible === c && r.consumo != null)).map((c) => ({ key: `c_${c}`, label: COMBUSTIBLES[c], color: COLOR[c] }))} />
          </Card>
          <Card>
            <CardTitle>Precio (€/L)</CardTitle>
            <Lines data={serie} decimals={2} xKey="fecha" series={combs.filter((c) => repsY.some((r) => r.combustible === c)).map((c) => ({ key: `p_${c}`, label: COMBUSTIBLES[c], color: COLOR[c] }))} />
          </Card>
        </div>
      )}

      <div className="mt-3 grid gap-3 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardTitle>Repostajes · {repsY.length}</CardTitle>
          {repsY.length ? (
            <div className="-mx-4 overflow-x-auto sm:-mx-5">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b border-border text-right text-xs text-muted">
                    <th className="px-4 py-2 text-left font-medium sm:px-5">Fecha</th>
                    <th className="px-2 py-2 text-left font-medium">Tipo</th>
                    <th className="px-2 py-2 font-medium">Litros</th>
                    <th className="px-2 py-2 font-medium">€/L</th>
                    <th className="px-2 py-2 font-medium">Coste</th>
                    <th className="px-2 py-2 font-medium">Km</th>
                    <th className="px-2 py-2 font-medium">Distancia</th>
                    <th className="px-2 py-2 font-medium">L/100</th>
                    <th className="w-20 px-4 sm:px-5" />
                  </tr>
                </thead>
                <tbody className="tnum text-right">
                  {repsY.map((r) => (
                    <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-surface-2/60">
                      <td className="whitespace-nowrap px-4 py-1.5 text-left text-muted sm:px-5">{formatFecha(r.fecha)}</td>
                      <td className="px-2 py-1.5 text-left">
                        <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full" style={{ background: COLOR[r.combustible] }} />{COMBUSTIBLES[r.combustible]}</span>
                      </td>
                      <td className="px-2 py-1.5">{formatNum(r.litros)}</td>
                      <td className="px-2 py-1.5">{formatNum(r.precio_litro, 3)}</td>
                      <td className="px-2 py-1.5 font-medium">{formatEUR(r.coste)}</td>
                      <td className="px-2 py-1.5 text-muted">{formatNum(r.km_odometro, 0)}</td>
                      <td className="px-2 py-1.5">{r.distancia != null ? formatNum(r.distancia, 0) : "—"}</td>
                      <td className="px-2 py-1.5">{formatNum(r.consumo)}</td>
                      <td className="px-4 py-1 sm:px-5">
                        <div className="flex justify-end">
                          <RepostajeDialog vehiculo={v} ultimoKm={ultimosKm(reps.filter((x) => x.fecha < r.fecha))} repostaje={r} />
                          <DeleteButton action={deleteRepostaje.bind(null, r.id)} label="este repostaje" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No hay repostajes en {anio}.</Empty>
          )}
        </Card>
        <Card>
          <CardTitle>Mantenimiento y otros · {formatEUR(s.otros)}</CardTitle>
          <GastosVehiculoList gastos={gastosY} vehiculos={vehiculos} />
        </Card>
      </div>
    </>
  );
}
