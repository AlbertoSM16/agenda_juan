"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatEUR, formatNum } from "@/lib/format";

const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  fontSize: 12,
  color: "var(--text)",
};
const axis = { stroke: "var(--muted)", fontSize: 11, tickLine: false, axisLine: false } as const;

export function Donut({ data, height = 180 }: { data: { name: string; value: number; color: string }[]; height?: number }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  if (!total) return null;
  return (
    <div style={{ height }} className="relative">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none" isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatEUR(Number(v))} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <span className="tnum text-sm font-semibold">{formatEUR(total)}</span>
      </div>
    </div>
  );
}

export type Series = { key: string; label: string; color: string; stack?: string };

export function Bars({
  data,
  xKey,
  series,
  height = 260,
  unit = "€",
}: {
  data: Record<string, string | number | null>[];
  xKey: string;
  series: Series[];
  height?: number;
  unit?: "€" | "km" | "L";
}) {
  const fmt = (v: number) => (unit === "€" ? formatEUR(v) : `${formatNum(v, 0)} ${unit}`);
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey={xKey} {...axis} />
          <YAxis {...axis} width={48} tickFormatter={(v: number) => formatNum(v, 0)} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--surface-2)" }} formatter={(v) => fmt(Number(v))} />
          {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />}
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={s.color}
              stackId={s.stack}
              radius={s.stack && i < series.length - 1 ? 0 : [4, 4, 0, 0]}
              maxBarSize={36}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Lines({
  data,
  xKey,
  series,
  height = 220,
  decimals = 2,
}: {
  data: Record<string, string | number | null>[];
  xKey: string;
  series: Series[];
  height?: number;
  decimals?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey={xKey} {...axis} minTickGap={24} />
          <YAxis {...axis} width={48} domain={["auto", "auto"]} tickFormatter={(v: number) => formatNum(v, decimals)} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatNum(Number(v), decimals + 1)} />
          {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />}
          {series.map((s) => (
            <Line key={s.key} dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={{ r: 2.5 }} connectNulls type="monotone" />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
