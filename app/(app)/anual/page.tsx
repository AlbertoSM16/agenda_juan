import { Bars } from "@/components/charts";
import { PeriodSelect } from "@/components/month-select";
import { Card, CardTitle, catColor, cx, PageHeader, Stat } from "@/components/ui";
import { getCatalogo, getMesesConDatos, getMovimientos } from "@/lib/data";
import { CATEGORIAS_AHORRO } from "@/lib/finanzas";
import { currentMonth, formatEUR, formatNum, formatPct, MESES_CORTOS, sum } from "@/lib/format";

export const metadata = { title: "Anual" };

export default async function AnualPage({ searchParams }: { searchParams: Promise<{ anio?: string }> }) {
  const sp = await searchParams;
  const anio = /^\d{4}$/.test(sp.anio ?? "") ? Number(sp.anio) : Number(currentMonth().slice(0, 4));
  const [{ categorias, conceptos }, rango, movs] = await Promise.all([
    getCatalogo(),
    getMesesConDatos(),
    getMovimientos(`${anio}-01`, `${anio + 1}-01`),
  ]);
  const first = Number((rango.primero ?? currentMonth()).slice(0, 4));
  const last = Math.max(Number((rango.ultimo ?? currentMonth()).slice(0, 4)), Number(currentMonth().slice(0, 4)));
  const years = Array.from({ length: last - first + 1 }, (_, i) => last - i).map((y) => ({ value: String(y), label: String(y) }));

  const mesIdx = (f: string) => Number(f.slice(5, 7)) - 1;
  const meses = MESES_CORTOS.map((label, i) => {
    const ms = movs.filter((m) => mesIdx(m.fecha) === i);
    const ingresos = sum(ms.filter((m) => m.tipo === "ingreso").map((m) => m.cantidad));
    const gastos = sum(ms.filter((m) => m.tipo === "gasto").map((m) => m.cantidad));
    const row: Record<string, number | string> = { mes: label, ingresos, gastos, saldo: ingresos - gastos };
    for (const c of categorias.filter((c) => c.tipo === "gasto"))
      row[c.id] = sum(ms.filter((m) => m.categoria_id === c.id).map((m) => m.cantidad));
    return row;
  });
  const conDatos = meses.filter((m) => (m.ingresos as number) > 0 || (m.gastos as number) > 0);

  const ingresos = sum(movs.filter((m) => m.tipo === "ingreso").map((m) => m.cantidad));
  const gastos = sum(movs.filter((m) => m.tipo === "gasto").map((m) => m.cantidad));
  const ahorroIds = new Set(categorias.filter((c) => CATEGORIAS_AHORRO.includes(c.nombre)).map((c) => c.id));
  const ahorro = sum(movs.filter((m) => ahorroIds.has(m.categoria_id)).map((m) => m.cantidad));

  // Matriz concepto × mes (como la hoja Gastos_global)
  const catGasto = categorias.filter((c) => c.tipo === "gasto");
  const filas = catGasto.flatMap((c, ci) =>
    conceptos
      .filter((co) => co.categoria_id === c.id)
      .map((co) => {
        const vals = MESES_CORTOS.map((_, i) => sum(movs.filter((m) => m.concepto_id === co.id && mesIdx(m.fecha) === i).map((m) => m.cantidad)));
        return { cat: c.nombre, color: catColor(c.nombre, ci), concepto: co.nombre, vals, total: sum(vals) };
      })
      .filter((f) => f.total > 0),
  );
  const ingresoFila = MESES_CORTOS.map((_, i) => meses[i].ingresos as number);

  return (
    <>
      <PageHeader title="Visión anual" subtitle="Evolución mensual y gasto por concepto">
        <PeriodSelect options={years} value={String(anio)} param="anio" />
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ingresos" value={formatEUR(ingresos)} tone="pos" hint={conDatos.length ? `${formatEUR(ingresos / conDatos.length)} / mes` : undefined} />
        <Stat label="Gastos" value={formatEUR(gastos)} hint={conDatos.length ? `${formatEUR(gastos / conDatos.length)} / mes` : undefined} />
        <Stat label="Saldo" value={formatEUR(ingresos - gastos)} tone={ingresos - gastos >= 0 ? "accent" : "neg"} />
        <Stat label="Ahorro + inversión" value={formatEUR(ahorro)} hint={ingresos ? `${formatPct((ahorro / ingresos) * 100)} de los ingresos` : undefined} />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Card>
          <CardTitle>Ingresos vs gastos</CardTitle>
          <Bars
            data={meses}
            xKey="mes"
            series={[
              { key: "ingresos", label: "Ingresos", color: "var(--pos)" },
              { key: "gastos", label: "Gastos", color: "var(--c7)" },
            ]}
          />
        </Card>
        <Card>
          <CardTitle>Gasto por categoría</CardTitle>
          <Bars
            data={meses}
            xKey="mes"
            series={catGasto.map((c, i) => ({ key: c.id, label: c.nombre, color: catColor(c.nombre, i), stack: "a" }))}
          />
        </Card>
      </div>

      <Card className="mt-3">
        <CardTitle>Gasto por concepto y mes</CardTitle>
        <div className="-mx-4 overflow-x-auto sm:-mx-5">
          <table className="w-full min-w-[960px] text-xs">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="sticky left-0 bg-surface px-4 py-2 text-left font-medium sm:px-5">Concepto</th>
                {MESES_CORTOS.map((m) => (
                  <th key={m} className="px-2 py-2 text-right font-medium capitalize">
                    {m}
                  </th>
                ))}
                <th className="px-4 py-2 text-right font-semibold sm:px-5">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border bg-pos-soft/40 font-medium">
                <td className="sticky left-0 bg-surface px-4 py-1.5 text-pos sm:px-5">Ingresos</td>
                {ingresoFila.map((v, i) => (
                  <td key={i} className="tnum px-2 py-1.5 text-right text-pos">{v ? formatNum(v, 0) : ""}</td>
                ))}
                <td className="tnum px-4 py-1.5 text-right font-semibold text-pos sm:px-5">{formatNum(ingresos, 0)}</td>
              </tr>
              {filas.map((f) => (
                <tr key={f.cat + f.concepto} className="border-b border-border/50 hover:bg-surface-2/60">
                  <td className="sticky left-0 whitespace-nowrap bg-surface px-4 py-1.5 sm:px-5">
                    <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: f.color }} />
                    {f.concepto}
                    <span className="ml-1 text-muted">· {f.cat}</span>
                  </td>
                  {f.vals.map((v, i) => (
                    <td key={i} className={cx("tnum px-2 py-1.5 text-right", !v && "text-muted/40")}>{v ? formatNum(v, 0) : "·"}</td>
                  ))}
                  <td className="tnum px-4 py-1.5 text-right font-semibold sm:px-5">{formatNum(f.total, 0)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="sticky left-0 bg-surface px-4 py-2 sm:px-5">Total gastos</td>
                {meses.map((m, i) => (
                  <td key={i} className="tnum px-2 py-2 text-right">{(m.gastos as number) ? formatNum(m.gastos as number, 0) : ""}</td>
                ))}
                <td className="tnum px-4 py-2 text-right sm:px-5">{formatNum(gastos, 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
