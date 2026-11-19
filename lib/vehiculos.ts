import { sum } from "@/lib/format";
import type { Combustible, GastoVehiculo, Repostaje } from "@/lib/types";

const avg = (xs: number[]) => (xs.length ? sum(xs) / xs.length : null);

/** Mismos cálculos que el Excel: consumo medio = media de los consumos de cada repostaje */
export function statsCombustible(reps: Repostaje[]) {
  return {
    repostajes: reps.length,
    coste: sum(reps.map((r) => r.coste)),
    litros: sum(reps.map((r) => r.litros)),
    distancia: sum(reps.map((r) => r.distancia ?? 0)),
    consumo: avg(reps.filter((r) => r.consumo != null).map((r) => r.consumo!)),
    precio: avg(reps.filter((r) => r.precio_litro != null).map((r) => r.precio_litro!)),
  };
}

export function statsVehiculo(reps: Repostaje[], gastos: GastoVehiculo[]) {
  const comb = statsCombustible(reps);
  const otros = sum(gastos.map((g) => g.coste));
  return { ...comb, otros, total: comb.coste + otros, costeKm: comb.distancia ? (comb.coste + otros) / comb.distancia : null };
}

/** Último km de odómetro por combustible (los repostajes llegan ordenados por fecha desc) */
export function ultimosKm(reps: Repostaje[]) {
  const out: Partial<Record<Combustible, number>> = {};
  for (const r of reps) if (r.km_odometro != null && out[r.combustible] == null) out[r.combustible] = r.km_odometro;
  return out;
}

export const yearOf = (iso: string) => Number(iso.slice(0, 4));
