"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { btn, cx, inputCls } from "@/components/ui";

/** Selector de periodo que escribe ?{param}=valor en la URL */
export function PeriodSelect({
  options,
  value,
  param = "mes",
}: {
  options: { value: string; label: string }[];
  value: string;
  param?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const go = (v: string) => {
    const next = new URLSearchParams(sp);
    next.set(param, v);
    router.push(`${pathname}?${next}`);
  };
  const i = options.findIndex((o) => o.value === value);
  // options está ordenado de más reciente a más antiguo
  const prev = options[i + 1];
  const next = options[i - 1];
  return (
    <div className="flex items-center gap-1">
      <button className={cx(btn.base, btn.icon, "border border-border")} disabled={!prev} onClick={() => prev && go(prev.value)} aria-label="Anterior">
        <ChevronLeft size={16} />
      </button>
      <select value={value} onChange={(e) => go(e.target.value)} className={cx(inputCls, "w-auto py-1.5 capitalize")}>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="capitalize">
            {o.label}
          </option>
        ))}
      </select>
      <button className={cx(btn.base, btn.icon, "border border-border")} disabled={!next} onClick={() => next && go(next.value)} aria-label="Siguiente">
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
