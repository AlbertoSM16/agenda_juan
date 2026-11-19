import { currentMonth, formatMes, nextMonth, sum } from "@/lib/format";
import type { Categoria, Concepto, Movimiento } from "@/lib/types";

/** Meses desde `primero` hasta el mayor de `ultimo`/mes actual, del más reciente al más antiguo */
export function monthOptions(primero: string | null, ultimo: string | null) {
  const now = currentMonth();
  const end = ultimo && ultimo > now ? ultimo : now;
  const out: { value: string; label: string }[] = [];
  for (let m = primero ?? now; m <= end; m = nextMonth(m)) out.push({ value: m, label: formatMes(m) });
  return out.reverse();
}

export function resumenMes(movs: Movimiento[], categorias: Categoria[], conceptos: Concepto[]) {
  const catById = new Map(categorias.map((c) => [c.id, c]));
  const conById = new Map(conceptos.map((c) => [c.id, c]));
  const ingresos = sum(movs.filter((m) => m.tipo === "ingreso").map((m) => m.cantidad));
  const gastos = sum(movs.filter((m) => m.tipo === "gasto").map((m) => m.cantidad));

  const porCategoria = (tipo: "ingreso" | "gasto") =>
    categorias
      .filter((c) => c.tipo === tipo)
      .map((c) => {
        const ms = movs.filter((m) => m.categoria_id === c.id);
        const real = sum(ms.map((m) => m.cantidad));
        const presupuesto = c.presupuesto_pct != null ? (ingresos * c.presupuesto_pct) / 100 : null;
        const sub = new Map<string, number>();
        for (const m of ms) {
          const n = conById.get(m.concepto_id)?.nombre ?? "—";
          sub.set(n, (sub.get(n) ?? 0) + m.cantidad);
        }
        return {
          categoria: c,
          real,
          presupuesto,
          subcategorias: [...sub].map(([nombre, real]) => ({ nombre, real })).sort((a, b) => b.real - a.real),
        };
      });

  return {
    ingresos,
    gastos,
    saldo: ingresos - gastos,
    porIngreso: porCategoria("ingreso").filter((c) => c.real > 0),
    porGasto: porCategoria("gasto").filter((c) => c.real > 0 || c.presupuesto != null),
    catById,
    conById,
  };
}

/** Ahorro + Inversión (categorías "de ahorro") sobre ingresos */
export const CATEGORIAS_AHORRO = ["Ahorro", "Inversión"];
