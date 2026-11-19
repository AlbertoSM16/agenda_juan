"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIAS_VEHICULO } from "@/lib/types";

export type ActionState = { ok: boolean; error?: string; ts?: number };

const decimal = z.preprocess(
  (v) => (typeof v === "string" ? (v.trim() === "" ? undefined : Number(v.replace(",", "."))) : v),
  z.number({ message: "Número no válido" }).finite(),
);
const optDecimal = z.preprocess(
  (v) => (typeof v === "string" ? (v.trim() === "" ? null : Number(v.replace(",", "."))) : v),
  z.number().finite().nullable(),
);
const optText = z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().trim().nullable());
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida");
const uuid = z.string().uuid();

async function run(fn: (sb: Awaited<ReturnType<typeof createClient>>) => PromiseLike<{ error: { message: string; code?: string } | null }>): Promise<ActionState> {
  const sb = await createClient();
  const { error } = await fn(sb);
  if (error) {
    const msg = error.code === "23503" ? "No se puede borrar: hay registros que lo usan." : error.message;
    return { ok: false, error: msg };
  }
  revalidatePath("/", "layout");
  return { ok: true, ts: Date.now() };
}

function parse<T extends z.ZodTypeAny>(schema: T, form: FormData): { data: z.infer<T> } | { error: string } {
  const r = schema.safeParse(Object.fromEntries(form));
  return r.success ? { data: r.data } : { error: r.error.issues.map((i) => i.message).join(" · ") };
}

// ───────────── Auth ─────────────
export async function login(_: ActionState, form: FormData): Promise<ActionState> {
  const sb = await createClient();
  const { error } = await sb.auth.signInWithPassword({
    email: String(form.get("email") ?? ""),
    password: String(form.get("password") ?? ""),
  });
  if (error) {
    console.error("[login]", error.status, error.code, error.message);
    return { ok: false, error: error.status === 400 ? "Email o contraseña incorrectos" : `No se pudo iniciar sesión: ${error.message}` };
  }
  redirect("/");
}

export async function logout() {
  const sb = await createClient();
  await sb.auth.signOut();
  redirect("/login");
}

// ───────────── Movimientos ─────────────
const movSchema = z.object({
  id: uuid.optional().or(z.literal("")),
  fecha,
  concepto_id: uuid,
  cantidad: decimal.refine((n) => n >= 0, "La cantidad no puede ser negativa"),
  comentario: optText,
});

export async function saveMovimiento(_: ActionState, form: FormData): Promise<ActionState> {
  const p = parse(movSchema, form);
  if ("error" in p) return { ok: false, error: p.error };
  const { id, ...m } = p.data;
  const sb = await createClient();
  // tipo y categoría se derivan del concepto para que siempre sean coherentes
  const { data: c, error } = await sb.from("conceptos").select("categoria_id, categorias(tipo)").eq("id", m.concepto_id).single();
  if (error || !c) return { ok: false, error: "Concepto no encontrado" };
  const row = { ...m, categoria_id: c.categoria_id, tipo: (c.categorias as unknown as { tipo: string }).tipo };
  return run((s) => (id ? s.from("movimientos").update(row).eq("id", id) : s.from("movimientos").insert(row)));
}

export async function deleteMovimiento(id: string): Promise<ActionState> {
  return run((s) => s.from("movimientos").delete().eq("id", uuid.parse(id)));
}

// ───────────── Catálogo ─────────────
const catSchema = z.object({
  id: uuid.optional().or(z.literal("")),
  nombre: z.string().trim().min(1, "Pon un nombre"),
  tipo: z.enum(["ingreso", "gasto"]),
  presupuesto_pct: optDecimal,
  orden: z.coerce.number().int().default(10),
});
export async function saveCategoria(_: ActionState, form: FormData): Promise<ActionState> {
  const p = parse(catSchema, form);
  if ("error" in p) return { ok: false, error: p.error };
  const { id, ...row } = p.data;
  return run((s) => (id ? s.from("categorias").update(row).eq("id", id) : s.from("categorias").insert(row)));
}
export async function deleteCategoria(id: string): Promise<ActionState> {
  return run((s) => s.from("categorias").delete().eq("id", uuid.parse(id)));
}

const conceptoSchema = z.object({
  id: uuid.optional().or(z.literal("")),
  nombre: z.string().trim().min(1, "Pon un nombre"),
  categoria_id: uuid,
});
export async function saveConcepto(_: ActionState, form: FormData): Promise<ActionState> {
  const p = parse(conceptoSchema, form);
  if ("error" in p) return { ok: false, error: p.error };
  const { id, ...row } = p.data;
  return run(async (s) => {
    const res = id ? await s.from("conceptos").update(row).eq("id", id) : await s.from("conceptos").insert(row);
    // mantener la categoría de los movimientos si el concepto cambia de categoría
    if (!res.error && id) {
      const { data: cat } = await s.from("categorias").select("tipo").eq("id", row.categoria_id).single();
      await s.from("movimientos").update({ categoria_id: row.categoria_id, tipo: cat?.tipo }).eq("concepto_id", id);
    }
    return res;
  });
}
export async function deleteConcepto(id: string): Promise<ActionState> {
  return run((s) => s.from("conceptos").delete().eq("id", uuid.parse(id)));
}

// ───────────── Vehículos ─────────────
const vehSchema = z.object({
  id: uuid.optional().or(z.literal("")),
  nombre: z.string().trim().min(1, "Pon un nombre"),
  combustibles: z.array(z.enum(["diesel", "gasolina", "glp"])).min(1, "Elige al menos un combustible"),
  activo: z.boolean(),
});
export async function saveVehiculo(_: ActionState, form: FormData): Promise<ActionState> {
  const r = vehSchema.safeParse({
    id: form.get("id") ?? undefined,
    nombre: form.get("nombre"),
    combustibles: form.getAll("combustibles"),
    activo: form.get("activo") === "on",
  });
  if (!r.success) return { ok: false, error: r.error.issues.map((i) => i.message).join(" · ") };
  const { id, ...row } = r.data;
  return run((s) => (id ? s.from("vehiculos").update(row).eq("id", id) : s.from("vehiculos").insert(row)));
}

const repSchema = z.object({
  id: uuid.optional().or(z.literal("")),
  vehiculo_id: uuid,
  fecha,
  combustible: z.enum(["diesel", "gasolina", "glp"]),
  litros: decimal.refine((n) => n > 0, "Los litros deben ser mayores que 0"),
  precio_litro: optDecimal,
  coste: optDecimal,
  km_odometro: optDecimal,
  distancia: optDecimal,
  comentario: optText,
});
export async function saveRepostaje(_: ActionState, form: FormData): Promise<ActionState> {
  const p = parse(repSchema, form);
  if ("error" in p) return { ok: false, error: p.error };
  const { id, ...r } = p.data;
  const coste = r.coste ?? (r.precio_litro != null ? r.litros * r.precio_litro : null);
  if (coste == null) return { ok: false, error: "Indica el coste o el precio por litro" };
  const row = {
    ...r,
    coste,
    precio_litro: r.precio_litro ?? coste / r.litros,
    consumo: r.distancia && r.distancia > 0 ? (r.litros * 100) / r.distancia : null,
  };
  return run((s) => (id ? s.from("repostajes").update(row).eq("id", id) : s.from("repostajes").insert(row)));
}
export async function deleteRepostaje(id: string): Promise<ActionState> {
  return run((s) => s.from("repostajes").delete().eq("id", uuid.parse(id)));
}

const gastoVehSchema = z.object({
  id: uuid.optional().or(z.literal("")),
  vehiculo_id: uuid.nullable().or(z.literal("").transform(() => null)),
  anio: z.coerce.number().int().min(2000).max(2100),
  fecha: fecha.nullable().or(z.literal("").transform(() => null)),
  categoria: z.enum(CATEGORIAS_VEHICULO),
  concepto: z.string().trim().min(1, "Describe el gasto"),
  coste: decimal,
});
export async function saveGastoVehiculo(_: ActionState, form: FormData): Promise<ActionState> {
  const p = parse(gastoVehSchema, form);
  if ("error" in p) return { ok: false, error: p.error };
  const { id, ...row } = p.data;
  if (row.fecha) row.anio = Number(row.fecha.slice(0, 4));
  return run((s) => (id ? s.from("gastos_vehiculo").update(row).eq("id", id) : s.from("gastos_vehiculo").insert(row)));
}
export async function deleteGastoVehiculo(id: string): Promise<ActionState> {
  return run((s) => s.from("gastos_vehiculo").delete().eq("id", uuid.parse(id)));
}
