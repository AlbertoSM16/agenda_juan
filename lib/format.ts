const eur = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const dec = (d: number) => new Intl.NumberFormat("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d });

export const formatEUR = (n: number | null | undefined) => (n == null ? "—" : eur.format(n));
export const formatNum = (n: number | null | undefined, d = 2) => (n == null ? "—" : dec(d).format(n));
export const formatPct = (n: number | null | undefined, d = 1) => (n == null ? "—" : `${dec(d).format(n)} %`);

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "2026-11" -> "noviembre 2026" */
export function formatMes(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return `${MESES[m - 1]} ${y}`;
}
/** "2026-11-19" -> "19/11/2026" */
export function formatFecha(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
export const currentMonth = () => todayISO().slice(0, 7);

/** Primer día del mes siguiente, para rangos [desde, hasta) */
export function nextMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
