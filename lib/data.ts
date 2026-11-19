import "server-only";
import { createClient } from "@/lib/supabase/server";
import { nextMonth } from "@/lib/format";
import type { Categoria, Concepto, GastoVehiculo, Movimiento, Repostaje, Vehiculo } from "@/lib/types";

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export async function getCatalogo() {
  const sb = await createClient();
  const [cats, conceptos] = await Promise.all([
    sb.from("categorias").select("id,nombre,tipo,presupuesto_pct,orden").order("orden").order("nombre"),
    sb.from("conceptos").select("id,nombre,categoria_id").order("nombre"),
  ]);
  return { categorias: check<Categoria[]>(cats), conceptos: check<Concepto[]>(conceptos) };
}

/** Movimientos entre dos meses "YYYY-MM" (hasta exclusivo) */
export async function getMovimientos(desde: string, hasta: string) {
  const sb = await createClient();
  return check<Movimiento[]>(
    await sb
      .from("movimientos")
      .select("id,fecha,tipo,categoria_id,concepto_id,cantidad,comentario")
      .gte("fecha", `${desde}-01`)
      .lt("fecha", `${hasta}-01`)
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5000),
  );
}

export const getMovimientosMes = (ym: string) => getMovimientos(ym, nextMonth(ym));

/** Lista de meses con datos ("YYYY-MM"), del más reciente al más antiguo */
export async function getMesesConDatos() {
  const sb = await createClient();
  const [first, last] = await Promise.all([
    sb.from("movimientos").select("fecha").order("fecha").limit(1).maybeSingle(),
    sb.from("movimientos").select("fecha").order("fecha", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const a = (first.data?.fecha as string | undefined)?.slice(0, 7);
  const b = (last.data?.fecha as string | undefined)?.slice(0, 7);
  return { primero: a ?? null, ultimo: b ?? null };
}

export async function getVehiculos() {
  const sb = await createClient();
  return check<Vehiculo[]>(await sb.from("vehiculos").select("id,nombre,combustibles,activo,orden").order("orden").order("nombre"));
}

export async function getRepostajes(filtro: { vehiculoId?: string; anio?: number } = {}) {
  const sb = await createClient();
  let qy = sb
    .from("repostajes")
    .select("id,vehiculo_id,fecha,combustible,coste,litros,precio_litro,km_odometro,distancia,consumo,comentario")
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5000);
  if (filtro.vehiculoId) qy = qy.eq("vehiculo_id", filtro.vehiculoId);
  if (filtro.anio) qy = qy.gte("fecha", `${filtro.anio}-01-01`).lt("fecha", `${filtro.anio + 1}-01-01`);
  return check<Repostaje[]>(await qy);
}

export async function getGastosVehiculo(filtro: { vehiculoId?: string; anio?: number } = {}) {
  const sb = await createClient();
  let qy = sb
    .from("gastos_vehiculo")
    .select("id,vehiculo_id,anio,fecha,categoria,concepto,coste")
    .order("anio", { ascending: false })
    .order("created_at");
  if (filtro.vehiculoId) qy = qy.eq("vehiculo_id", filtro.vehiculoId);
  if (filtro.anio) qy = qy.eq("anio", filtro.anio);
  return check<GastoVehiculo[]>(await qy);
}
