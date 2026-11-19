"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { saveMovimiento } from "@/app/actions";
import { FormDialog } from "@/components/form-dialog";
import { btn, cx, Field, inputCls } from "@/components/ui";
import { todayISO } from "@/lib/format";
import type { Categoria, Concepto, Movimiento, Tipo } from "@/lib/types";

export function MovimientoDialog({
  categorias,
  conceptos,
  movimiento,
  defaultFecha,
  registerOpen,
}: {
  categorias: Categoria[];
  conceptos: Concepto[];
  movimiento?: Movimiento;
  defaultFecha?: string;
  /** Modo controlado: sin botón propio, expone la función de abrir */
  registerOpen?: (open: () => void) => void;
}) {
  const [tipo, setTipo] = useState<Tipo>(movimiento?.tipo ?? "gasto");
  const cats = categorias.filter((c) => c.tipo === tipo);
  return (
    <FormDialog
      title={movimiento ? "Editar movimiento" : "Nuevo movimiento"}
      action={saveMovimiento}
      trigger={(open) =>
        registerOpen ? (registerOpen(open), null) : movimiento ? (
          <button type="button" onClick={open} className={cx(btn.base, btn.icon)} aria-label="Editar" title="Editar">
            <Pencil size={15} />
          </button>
        ) : (
          <button type="button" onClick={() => { setTipo("gasto"); open(); }} className={cx(btn.base, btn.primary)}>
            <Plus size={16} /> Movimiento
          </button>
        )
      }
    >
      <input type="hidden" name="id" value={movimiento?.id ?? ""} />
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1">
        {(["gasto", "ingreso"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTipo(t)}
            className={cx(
              "cursor-pointer rounded-md py-1.5 text-sm font-medium capitalize",
              tipo === t ? "bg-surface shadow-sm" : "text-muted",
              tipo === t && (t === "gasto" ? "text-neg" : "text-pos"),
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha">
          <input name="fecha" type="date" required defaultValue={movimiento?.fecha ?? defaultFecha ?? todayISO()} className={inputCls} />
        </Field>
        <Field label="Cantidad (€)">
          <input
            name="cantidad"
            inputMode="decimal"
            required
            autoFocus={!movimiento}
            defaultValue={movimiento ? String(movimiento.cantidad) : ""}
            placeholder="0,00"
            className={cx(inputCls, "tnum")}
          />
        </Field>
      </div>
      <Field label="Concepto">
        <select name="concepto_id" required defaultValue={movimiento?.concepto_id ?? ""} className={inputCls} key={tipo}>
          <option value="" disabled>
            Elige…
          </option>
          {cats.map((c) => (
            <optgroup key={c.id} label={c.nombre}>
              {conceptos
                .filter((co) => co.categoria_id === c.id)
                .map((co) => (
                  <option key={co.id} value={co.id}>
                    {co.nombre}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </Field>
      <Field label="Comentario">
        <input name="comentario" defaultValue={movimiento?.comentario ?? ""} placeholder="Opcional" className={inputCls} />
      </Field>
    </FormDialog>
  );
}
