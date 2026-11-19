import { MovimientoDialog } from "@/components/movimiento-dialog";
import { MovimientosTable } from "@/components/movimientos-table";
import { btn, Card, cx, Field, inputCls, PageHeader, Stat } from "@/components/ui";
import { getCatalogo, getMovimientos } from "@/lib/data";
import { currentMonth, formatEUR, nextMonth, sum } from "@/lib/format";

export const metadata = { title: "Movimientos" };

type SP = { desde?: string; hasta?: string; tipo?: string; categoria?: string; q?: string };
const ym = (v: string | undefined, def: string) => (/^\d{4}-\d{2}$/.test(v ?? "") ? v! : def);

export default async function MovimientosPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const now = currentMonth();
  const desde = ym(sp.desde, `${now.slice(0, 4)}-01`);
  const hasta = ym(sp.hasta, now);
  const [{ categorias, conceptos }, all] = await Promise.all([getCatalogo(), getMovimientos(desde, nextMonth(hasta))]);
  const conName = new Map(conceptos.map((c) => [c.id, c.nombre.toLowerCase()]));
  const q = (sp.q ?? "").trim().toLowerCase();
  const movs = all.filter(
    (m) =>
      (!sp.tipo || m.tipo === sp.tipo) &&
      (!sp.categoria || m.categoria_id === sp.categoria) &&
      (!q || (m.comentario ?? "").toLowerCase().includes(q) || (conName.get(m.concepto_id) ?? "").includes(q)),
  );
  const ingresos = sum(movs.filter((m) => m.tipo === "ingreso").map((m) => m.cantidad));
  const gastos = sum(movs.filter((m) => m.tipo === "gasto").map((m) => m.cantidad));

  return (
    <>
      <PageHeader title="Movimientos" subtitle="Busca, filtra y edita todos los registros">
        <MovimientoDialog categorias={categorias} conceptos={conceptos} />
      </PageHeader>

      <Card className="mb-3">
        <form className="grid grid-cols-2 items-end gap-3 md:grid-cols-6">
          <Field label="Desde">
            <input type="month" name="desde" defaultValue={desde} className={inputCls} />
          </Field>
          <Field label="Hasta">
            <input type="month" name="hasta" defaultValue={hasta} className={inputCls} />
          </Field>
          <Field label="Tipo">
            <select name="tipo" defaultValue={sp.tipo ?? ""} className={inputCls}>
              <option value="">Todos</option>
              <option value="gasto">Gastos</option>
              <option value="ingreso">Ingresos</option>
            </select>
          </Field>
          <Field label="Categoría">
            <select name="categoria" defaultValue={sp.categoria ?? ""} className={inputCls}>
              <option value="">Todas</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Texto">
            <input name="q" defaultValue={sp.q ?? ""} placeholder="Concepto o comentario" className={inputCls} />
          </Field>
          <button className={cx(btn.base, btn.outline)}>Filtrar</button>
        </form>
      </Card>

      <div className="mb-3 grid grid-cols-3 gap-3">
        <Stat label="Ingresos" value={formatEUR(ingresos)} tone="pos" />
        <Stat label="Gastos" value={formatEUR(gastos)} />
        <Stat label="Registros" value={movs.length} />
      </div>

      <Card>
        <MovimientosTable movimientos={movs} categorias={categorias} conceptos={conceptos} />
      </Card>
    </>
  );
}
