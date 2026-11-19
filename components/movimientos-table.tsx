"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { deleteMovimiento } from "@/app/actions";
import { DeleteButton } from "@/components/form-dialog";
import { MovimientoDialog } from "@/components/movimiento-dialog";
import { Badge, btn, catColor, cx, Empty } from "@/components/ui";
import { formatEUR, formatFecha } from "@/lib/format";
import type { Categoria, Concepto, Movimiento } from "@/lib/types";

export function MovimientosTable({
  movimientos,
  categorias,
  conceptos,
}: {
  movimientos: Movimiento[];
  categorias: Categoria[];
  conceptos: Concepto[];
}) {
  // Un único diálogo de edición compartido por todas las filas
  const [editing, setEditing] = useState<{ m: Movimiento; n: number } | null>(null);
  const openRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (editing) openRef.current();
  }, [editing]);

  if (!movimientos.length) return <Empty>No hay movimientos.</Empty>;
  const cat = new Map(categorias.map((c, i) => [c.id, { ...c, color: catColor(c.nombre, i) }]));
  const con = new Map(conceptos.map((c) => [c.id, c.nombre]));
  return (
    <div className="-mx-4 overflow-x-auto sm:-mx-5">
      {editing && (
        <MovimientoDialog
          key={editing.n}
          categorias={categorias}
          conceptos={conceptos}
          movimiento={editing.m}
          registerOpen={(open) => (openRef.current = open)}
        />
      )}
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className="px-4 py-2 font-medium sm:px-5">Fecha</th>
            <th className="px-2 py-2 font-medium">Categoría</th>
            <th className="px-2 py-2 font-medium">Concepto</th>
            <th className="px-2 py-2 font-medium">Comentario</th>
            <th className="px-2 py-2 text-right font-medium">Cantidad</th>
            <th className="w-20 px-4 sm:px-5" />
          </tr>
        </thead>
        <tbody>
          {movimientos.map((m) => {
            const c = cat.get(m.categoria_id);
            return (
              <tr key={m.id} className="border-b border-border/60 last:border-0 hover:bg-surface-2/60">
                <td className="tnum whitespace-nowrap px-4 py-2 text-muted sm:px-5">{formatFecha(m.fecha)}</td>
                <td className="px-2 py-2">{c && <Badge color={c.color}>{c.nombre}</Badge>}</td>
                <td className="px-2 py-2">{con.get(m.concepto_id)}</td>
                <td className="max-w-[220px] truncate px-2 py-2 text-muted">{m.comentario}</td>
                <td className={cx("tnum whitespace-nowrap px-2 py-2 text-right font-medium", m.tipo === "ingreso" ? "text-pos" : "")}>
                  {m.tipo === "ingreso" ? "+" : "−"}
                  {formatEUR(m.cantidad)}
                </td>
                <td className="px-4 py-1 sm:px-5">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setEditing((e) => ({ m, n: (e?.n ?? 0) + 1 }))}
                      className={cx(btn.base, btn.icon)}
                      aria-label="Editar"
                      title="Editar"
                    >
                      <Pencil size={15} />
                    </button>
                    <DeleteButton action={() => deleteMovimiento(m.id)} label="este movimiento" />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
