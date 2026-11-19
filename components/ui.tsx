import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";

export const cx = clsx;

export function Card({ className, ...p }: ComponentProps<"section">) {
  return <section className={cx("rounded-2xl border border-border bg-surface p-4 sm:p-5", className)} {...p} />;
}

export function CardTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cx("mb-3 flex items-center justify-between gap-2", className)}>
      <h2 className="text-sm font-semibold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "pos" | "neg" | "accent";
}) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p
        className={cx(
          "tnum mt-1 text-2xl font-semibold tracking-tight sm:text-[1.7rem]",
          tone === "pos" && "text-pos",
          tone === "neg" && "text-neg",
          tone === "accent" && "text-accent",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

export const btn = {
  base: "inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer",
  primary: "bg-accent text-white dark:text-black hover:opacity-90 px-3.5 py-2",
  ghost: "hover:bg-surface-2 px-3 py-2 text-text",
  outline: "border border-border bg-surface hover:bg-surface-2 px-3 py-2",
  icon: "h-8 w-8 hover:bg-surface-2 text-muted hover:text-text",
  danger: "text-neg hover:bg-neg-soft px-3 py-2",
};

export const inputCls =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent/25";

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

export function Badge({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium"
      style={color ? { color } : undefined}
    >
      {color && <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />}
      <span className="text-text">{children}</span>
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted">{children}</p>;
}

/** Barra de progreso presupuesto vs real */
export function Meter({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const over = max > 0 && value > max;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: over ? "var(--neg)" : color }} />
    </div>
  );
}

/** Colores fijos por categoría, con reserva por posición */
const FIXED: Record<string, string> = {
  "Gastos Generales": "var(--c1)",
  Lujos: "var(--c2)",
  Ahorro: "var(--c3)",
  Inversión: "var(--c4)",
};
const PALETTE = ["var(--c5)", "var(--c6)", "var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c7)"];
export function catColor(nombre: string, i = 0) {
  return FIXED[nombre] ?? PALETTE[i % PALETTE.length];
}
