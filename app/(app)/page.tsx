import { Donut } from "@/components/charts";
import { PeriodSelect } from "@/components/month-select";
import { MovimientoDialog } from "@/components/movimiento-dialog";
import { MovimientosTable } from "@/components/movimientos-table";
import { Card, CardTitle, catColor, cx, Empty, Meter, PageHeader, Stat } from "@/components/ui";
import { getCatalogo, getMesesConDatos, getMovimientosMes } from "@/lib/data";
import { CATEGORIAS_AHORRO, monthOptions, resumenMes } from "@/lib/finanzas";
import { currentMonth, formatEUR, formatMes, formatPct, sum, todayISO } from "@/lib/format";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes: mesParam } = await searchParams;
  const mes = /^\d{4}-\d{2}$/.test(mesParam ?? "") ? mesParam! : currentMonth();
  const [{ categorias, conceptos }, rango, movs] = await Promise.all([getCatalogo(), getMesesConDatos(), getMovimientosMes(mes)]);
  const r = resumenMes(movs, categorias, conceptos);
  const ahorro = sum(r.porGasto.filter((c) => CATEGORIAS_AHORRO.includes(c.categoria.nombre)).map((c) => c.real));
  const color = (nombre: string) => catColor(nombre, categorias.findIndex((c) => c.nombre === nombre));
  const defaultFecha = mes === currentMonth() ? todayISO() : `${mes}-01`;

  return (
    <>
      <PageHeader title="Resumen del mes" subtitle={<span className="capitalize">{formatMes(mes)}</span>}>
        <PeriodSelect options={monthOptions(rango.primero, rango.ultimo)} value={mes} />
        <MovimientoDialog categorias={categorias} conceptos={conceptos} defaultFecha={defaultFecha} />
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ingresos" value={formatEUR(r.ingresos)} tone="pos" />
        <Stat label="Gastos" value={formatEUR(r.gastos)} hint="Incluye ahorro e inversión" />
        <Stat label="Saldo" value={formatEUR(r.saldo)} tone={r.saldo >= 0 ? "accent" : "neg"} hint="Ingresos − gastos" />
        <Stat
          label="Ahorro + inversión"
          value={formatEUR(ahorro)}
          hint={r.ingresos ? `${formatPct((ahorro / r.ingresos) * 100)} de los ingresos` : undefined}
        />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardTitle>Resumen de ingresos</CardTitle>
          {r.porIngreso.length ? (
            <div className="grid items-center gap-4 sm:grid-cols-[1fr_140px]">
              <table className="w-full text-sm">
                <tbody>
                  {r.porIngreso.map((c) => (
                    <tr key={c.categoria.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2">
                        <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: color(c.categoria.nombre) }} />
                        {c.categoria.nombre}
                      </td>
                      <td className="tnum py-2 text-right font-medium">{formatEUR(c.real)}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td className="pt-2">Total</td>
                    <td className="tnum pt-2 text-right">{formatEUR(r.ingresos)}</td>
                  </tr>
                </tbody>
              </table>
              <Donut height={140} data={r.porIngreso.map((c) => ({ name: c.categoria.nombre, value: c.real, color: color(c.categoria.nombre) }))} />
            </div>
          ) : (
            <Empty>Sin ingresos este mes.</Empty>
          )}
        </Card>

        <Card className="lg:col-span-3">
          <CardTitle>Resumen de gastos · presupuesto</CardTitle>
          <div className="-mx-4 overflow-x-auto sm:-mx-5">
            <table className="w-full min-w-[440px] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="px-4 pb-2 font-medium sm:px-5">Categoría</th>
                  <th className="pb-2 text-right font-medium">%</th>
                  <th className="pb-2 text-right font-medium">Presupuesto</th>
                  <th className="pb-2 text-right font-medium">Real</th>
                  <th className="px-4 pb-2 text-right font-medium sm:px-5">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {r.porGasto.map((c) => {
                  const diff = c.presupuesto != null ? c.presupuesto - c.real : null;
                  return (
                    <tr key={c.categoria.id} className="border-t border-border/60">
                      <td className="px-4 py-2 sm:px-5">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ background: color(c.categoria.nombre) }} />
                          {c.categoria.nombre}
                        </div>
                        {c.presupuesto != null && (
                          <div className="mt-1.5 pl-4">
                            <Meter value={c.real} max={c.presupuesto} color={color(c.categoria.nombre)} />
                          </div>
                        )}
                      </td>
                      <td className="tnum py-2 text-right text-muted">{c.categoria.presupuesto_pct != null ? formatPct(c.categoria.presupuesto_pct) : "—"}</td>
                      <td className="tnum py-2 text-right text-muted">{formatEUR(c.presupuesto)}</td>
                      <td className="tnum py-2 text-right font-medium">{formatEUR(c.real)}</td>
                      <td className={cx("tnum px-4 py-2 text-right sm:px-5", diff != null && (diff >= 0 ? "text-pos" : "text-neg"))}>
                        {formatEUR(diff)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t border-border font-semibold">
                  <td className="px-4 pt-2 sm:px-5">Total</td>
                  <td />
                  <td className="tnum pt-2 text-right">{formatEUR(sum(r.porGasto.map((c) => c.presupuesto ?? 0)))}</td>
                  <td className="tnum pt-2 text-right">{formatEUR(r.gastos)}</td>
                  <td className={cx("tnum px-4 pt-2 text-right sm:px-5", r.saldo >= 0 ? "text-pos" : "text-neg")}>{formatEUR(r.saldo)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {r.porGasto.map((c) => (
          <Card key={c.categoria.id}>
            <CardTitle>
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: color(c.categoria.nombre) }} />
                {c.categoria.nombre}
              </span>
            </CardTitle>
            {c.subcategorias.length ? (
              <ul className="space-y-1.5 text-sm">
                {c.subcategorias.map((s) => (
                  <li key={s.nombre} className="flex items-baseline justify-between gap-2">
                    <span className="truncate">{s.nombre}</span>
                    <span className="tnum shrink-0 font-medium">{formatEUR(s.real)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>Sin gastos.</Empty>
            )}
            <div className="mt-3 space-y-1 border-t border-border pt-2 text-sm">
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="tnum">{formatEUR(c.real)}</span>
              </div>
              {c.presupuesto != null && (
                <div className="flex justify-between text-muted">
                  <span>Saldo</span>
                  <span className={cx("tnum font-medium", c.presupuesto - c.real >= 0 ? "text-pos" : "text-neg")}>
                    {formatEUR(c.presupuesto - c.real)}
                  </span>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-3">
        <CardTitle>Registros del mes · {movs.length}</CardTitle>
        <MovimientosTable movimientos={movs} categorias={categorias} conceptos={conceptos} />
      </Card>
    </>
  );
}
