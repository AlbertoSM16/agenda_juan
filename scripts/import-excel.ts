/**
 * Importa los Excel originales y genera supabase/seed.local.sql (NO se sube a git).
 *
 *   npm run import -- "<Finanzas_personales.xlsx>" "<Gastos anuales vehículos .xlsx>"
 *
 * Después ejecuta el SQL generado en Supabase > SQL Editor (o con psql).
 * El seed vacía las tablas antes de insertar, así que puede repetirse.
 */
import { randomUUID } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";

const [finPath, vehPath] = process.argv.slice(2);
if (!finPath || !vehPath) {
  console.error('Uso: npm run import -- "<Finanzas.xlsx>" "<Vehiculos.xlsx>"');
  process.exit(1);
}

// ───────────── utilidades ─────────────
const excelDate = (serial: number) =>
  new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86_400_000).toISOString().slice(0, 10);
const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
const str = (v: unknown) => (v == null ? "" : String(v)).replace(/\s+/g, " ").trim();
const q = (v: string | number | null | undefined) =>
  v == null || v === "" ? "null" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`;
const cell = (ws: XLSX.WorkSheet, addr: string) => ws[addr] as XLSX.CellObject | undefined;
const val = (ws: XLSX.WorkSheet, addr: string) => cell(ws, addr)?.v;
const lastRow = (ws: XLSX.WorkSheet) => XLSX.utils.decode_range(ws["!ref"] ?? "A1").e.r + 1;
const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

const sql: string[] = [
  "-- Generado por scripts/import-excel.ts — contiene datos personales, no subir a git",
  "begin;",
  "truncate movimientos, conceptos, categorias, repostajes, gastos_vehiculo, vehiculos restart identity cascade;",
];

// ───────────── Finanzas ─────────────
const fin = XLSX.readFile(finPath, { cellFormula: false });
const dash = fin.Sheets["Dashboard"];
if (!dash) throw new Error("No encuentro la hoja Dashboard");

// Presupuesto por categoría: Dashboard!B20:C23
const presupuesto = new Map<string, number>();
for (let r = 20; r <= 30; r++) {
  const name = str(val(dash, `B${r}`));
  const pct = num(val(dash, `C${r}`));
  if (name && pct != null && !/^total$/i.test(name)) presupuesto.set(name, round(pct * 100, 3));
}

type Mov = { fecha: string; tipo: "ingreso" | "gasto"; categoria: string; concepto: string; cantidad: number; comentario: string };
const movs: Mov[] = [];
for (let r = 10; r <= lastRow(dash); r++) {
  const f = num(val(dash, `S${r}`));
  const cantidad = num(val(dash, `X${r}`));
  if (f == null || cantidad == null) continue;
  const tipo = str(val(dash, `U${r}`)).toLowerCase();
  if (tipo !== "ingreso" && tipo !== "gasto") throw new Error(`Tipo desconocido en fila ${r}: ${tipo}`);
  movs.push({
    fecha: excelDate(f),
    tipo,
    categoria: str(val(dash, `V${r}`)),
    concepto: str(val(dash, `W${r}`)),
    cantidad,
    comentario: str(val(dash, `Y${r}`)),
  });
}

// Categorías (orden: las del presupuesto primero, luego ingresos)
const ORDEN = ["Gastos Generales", "Lujos", "Ahorro", "Inversión"];
const cats = new Map<string, { id: string; tipo: string }>();
for (const m of movs) if (!cats.has(m.categoria)) cats.set(m.categoria, { id: randomUUID(), tipo: m.tipo });
for (const name of presupuesto.keys()) if (!cats.has(name)) cats.set(name, { id: randomUUID(), tipo: "gasto" });
for (const [name, c] of cats) {
  const orden = ORDEN.includes(name) ? ORDEN.indexOf(name) : 10;
  sql.push(
    `insert into categorias (id, nombre, tipo, presupuesto_pct, orden) values (${q(c.id)}, ${q(name)}, ${q(c.tipo)}, ${q(presupuesto.get(name) ?? null)}, ${orden});`,
  );
}

const conceptos = new Map<string, string>(); // "cat|concepto" -> id
for (const m of movs) {
  const key = `${m.categoria}|${m.concepto}`;
  if (conceptos.has(key)) continue;
  const id = randomUUID();
  conceptos.set(key, id);
  sql.push(`insert into conceptos (id, nombre, categoria_id) values (${q(id)}, ${q(m.concepto)}, ${q(cats.get(m.categoria)!.id)});`);
}

for (let i = 0; i < movs.length; i += 200) {
  const chunk = movs.slice(i, i + 200).map(
    (m) =>
      `(${q(m.fecha)}, ${q(m.tipo)}, ${q(cats.get(m.categoria)!.id)}, ${q(conceptos.get(`${m.categoria}|${m.concepto}`)!)}, ${m.cantidad}, ${q(m.comentario)})`,
  );
  sql.push(`insert into movimientos (fecha, tipo, categoria_id, concepto_id, cantidad, comentario) values\n${chunk.join(",\n")};`);
}

// ───────────── Vehículos ─────────────
const veh = XLSX.readFile(vehPath, { cellFormula: true });
const vehiculos = new Map<string, { id: string; combustibles: string[]; activo: boolean; orden: number }>([
  ["Audi A4", { id: randomUUID(), combustibles: ["diesel"], activo: true, orden: 0 }],
  ["Dacia", { id: randomUUID(), combustibles: ["glp", "gasolina"], activo: true, orden: 1 }],
  ["Seat Exeo", { id: randomUUID(), combustibles: ["diesel"], activo: false, orden: 2 }],
  ["Seat Córdoba", { id: randomUUID(), combustibles: ["gasolina"], activo: false, orden: 3 }],
]);
for (const [nombre, v] of vehiculos)
  sql.push(
    `insert into vehiculos (id, nombre, combustibles, activo, orden) values (${q(v.id)}, ${q(nombre)}, '{${v.combustibles.join(",")}}', ${v.activo}, ${v.orden});`,
  );

type Rep = { veh: string; fecha: string; combustible: string; coste: number; litros: number; precio: number | null; km: number | null; distancia: number | null; consumo: number | null };
const reps: Rep[] = [];

/** cols = [fecha, coste, litros, €/L, km, distancia, consumo] (distancia/consumo opcionales) */
function readRefuels(ws: XLSX.WorkSheet, sheetYear: string, vehName: string, combustible: string, startRow: number, cols: (string | null)[]) {
  const [cF, cC, cL, cP, cK, cD, cCons] = cols;
  for (let r = startRow; r <= lastRow(ws); r++) {
    const f = num(val(ws, `${cF}${r}`));
    const litros = num(val(ws, `${cL}${r}`));
    if (f == null || litros == null) continue;
    const precio = num(val(ws, `${cP}${r}`));
    const coste = num(val(ws, `${cC}${r}`)) ?? (precio != null ? litros * precio : null);
    if (coste == null) continue;
    let fecha = excelDate(f);
    if (fecha.slice(0, 4) !== sheetYear) {
      // Errata típica: fecha con el año equivocado dentro de la hoja de un año concreto
      console.warn(`⚠ ${vehName} ${cF}${r}: fecha ${fecha} fuera de la hoja ${sheetYear}, se corrige el año`);
      fecha = sheetYear + fecha.slice(4);
    }
    reps.push({
      veh: vehName,
      fecha,
      combustible,
      coste,
      litros,
      precio: precio ?? coste / litros,
      km: num(val(ws, `${cK}${r}`)),
      distancia: cD ? num(val(ws, `${cD}${r}`)) : null,
      consumo: cCons ? num(val(ws, `${cCons}${r}`)) : null,
    });
  }
}

type GV = { veh: string | null; anio: number; categoria: string; concepto: string; coste: number };
const gastos: GV[] = [];
const vehFromText = (t: string) =>
  /exeo/i.test(t) ? "Seat Exeo" : /c[oó]rdoba/i.test(t) ? "Seat Córdoba" : /dacia/i.test(t) ? "Dacia" : /audi/i.test(t) ? "Audi A4" : null;
const catFromText = (t: string) =>
  /diesel|gasolina|glp/i.test(t) ? "Combustible"
  : /seguro|franquicia/i.test(t) ? "Seguro"
  : /impuesto|itv/i.test(t) ? "Impuestos"
  : /cochera/i.test(t) ? "Cochera"
  : /detail|karcher|lavado|obsessed|maesal|wax|c2play|obd|bater[ií]a/i.test(t) ? "Otros"
  : "Mantenimiento";

for (const sheetName of veh.SheetNames) {
  const ws = veh.Sheets[sheetName];
  let m: RegExpMatchArray | null;
  if ((m = sheetName.match(/^(\d{4}) Audi$/))) {
    readRefuels(ws, m[1], "Audi A4", "diesel", 3, ["B", "C", "D", "E", "F", "G", "H"]);
  } else if ((m = sheetName.match(/^(\d{4}) Dacia$/))) {
    readRefuels(ws, m[1], "Dacia", "glp", 4, ["B", "C", "D", "E", "F", "H", "G"]);
    readRefuels(ws, m[1], "Dacia", "gasolina", 4, ["N", "O", "P", "Q", null, null, null]);
  } else if ((m = sheetName.match(/^(?:Gastos totales|Totales) (\d{4})$/))) {
    const anio = Number(m[1]);
    for (let r = 3; r <= lastRow(ws); r++) {
      const concepto = str(val(ws, `B${r}`));
      const c = cell(ws, `C${r}`);
      const coste = num(c?.v);
      if (!concepto || coste == null) continue;
      // Las líneas que enlazan con otra hoja (p.ej. ='2026 Audi'!L3) ya están en los repostajes
      if (c?.f && c.f.includes("!")) continue;
      // Antes de 2026 el único coche con gastos genéricos era el Audi; desde 2026 hay dos y queda sin asignar
      gastos.push({ veh: vehFromText(concepto) ?? (anio < 2026 ? "Audi A4" : null), anio, categoria: catFromText(concepto), concepto, coste });
    }
  }
}

for (let i = 0; i < reps.length; i += 200) {
  const chunk = reps.slice(i, i + 200).map(
    (r) =>
      `(${q(vehiculos.get(r.veh)!.id)}, ${q(r.fecha)}, ${q(r.combustible)}, ${r.coste}, ${r.litros}, ${q(r.precio)}, ${q(r.km)}, ${q(r.distancia)}, ${q(r.consumo)})`,
  );
  sql.push(
    `insert into repostajes (vehiculo_id, fecha, combustible, coste, litros, precio_litro, km_odometro, distancia, consumo) values\n${chunk.join(",\n")};`,
  );
}
for (const g of gastos)
  sql.push(
    `insert into gastos_vehiculo (vehiculo_id, anio, categoria, concepto, coste) values (${g.veh ? q(vehiculos.get(g.veh)!.id) : "null"}, ${g.anio}, ${q(g.categoria)}, ${q(g.concepto)}, ${g.coste});`,
  );

sql.push("commit;");

const out = path.resolve("supabase/seed.local.sql");
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, sql.join("\n") + "\n");

// ───────────── Cuadre ─────────────
const sum = (a: number[]) => round(a.reduce((x, y) => x + y, 0));
const avg = (a: number[]) => (a.length ? round(a.reduce((x, y) => x + y, 0) / a.length) : 0);
const month = (iso: string) => iso.slice(0, 7);
const nov26 = movs.filter((m) => month(m.fecha) === "2026-11");
console.log(`✔ ${movs.length} movimientos, ${cats.size} categorías, ${conceptos.size} conceptos`);
console.log(`  nov-2026 → ingresos ${sum(nov26.filter((m) => m.tipo === "ingreso").map((m) => m.cantidad))} · gastos ${sum(nov26.filter((m) => m.tipo === "gasto").map((m) => m.cantidad))}`);
console.log(`✔ ${reps.length} repostajes, ${gastos.length} gastos de vehículo`);
const years = [...new Set(reps.map((r) => r.fecha.slice(0, 4)))].sort();
for (const y of years)
  for (const [v, comb] of [["Audi A4", "diesel"], ["Dacia", "glp"], ["Dacia", "gasolina"]]) {
    const rs = reps.filter((r) => r.veh === v && r.combustible === comb && r.fecha.startsWith(y));
    if (!rs.length) continue;
    console.log(
      `  ${y} ${v} ${comb}: ${rs.length} rep · ${sum(rs.map((r) => r.coste))} € · ${sum(rs.map((r) => r.distancia ?? 0))} km · ${avg(rs.filter((r) => r.consumo != null).map((r) => r.consumo!))} L/100km`,
    );
  }
for (const y of [...new Set(gastos.map((g) => g.anio))].sort())
  console.log(`  gastos ${y}: ${sum(gastos.filter((g) => g.anio === y).map((g) => g.coste))} €`);
console.log(`→ ${path.relative(process.cwd(), out)}`);
