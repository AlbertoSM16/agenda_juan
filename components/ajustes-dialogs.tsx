"use client";

import { Pencil, Plus } from "lucide-react";
import { saveCategoria, saveConcepto } from "@/app/actions";
import { FormDialog } from "@/components/form-dialog";
import { btn, cx, Field, inputCls } from "@/components/ui";
import type { Categoria, Concepto } from "@/lib/types";

function trig(edit: boolean, label: string) {
  // eslint-disable-next-line react/display-name
  return (open: () => void) =>
  edit ? (
    <button type="button" onClick={open} className={cx(btn.base, btn.icon)} aria-label="Editar" title="Editar"><Pencil size={15} /></button>
  ) : (
    <button type="button" onClick={open} className={cx(btn.base, btn.outline, "py-1.5")}><Plus size={15} /> {label}</button>
  );
}

export function CategoriaDialog({ categoria }: { categoria?: Categoria }) {
  const c = categoria;
  return (
    <FormDialog title={c ? "Editar categoría" : "Nueva categoría"} action={saveCategoria} trigger={trig(!!c, "Categoría")}>
      <input type="hidden" name="id" value={c?.id ?? ""} />
      <Field label="Nombre"><input name="nombre" required defaultValue={c?.nombre ?? ""} className={inputCls} /></Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Tipo">
          <select name="tipo" defaultValue={c?.tipo ?? "gasto"} className={inputCls}>
            <option value="gasto">Gasto</option>
            <option value="ingreso">Ingreso</option>
          </select>
        </Field>
        <Field label="Presupuesto (%)">
          <input name="presupuesto_pct" inputMode="decimal" defaultValue={c?.presupuesto_pct ?? ""} placeholder="—" className={cx(inputCls, "tnum")} />
        </Field>
        <Field label="Orden">
          <input name="orden" type="number" defaultValue={c?.orden ?? 10} className={cx(inputCls, "tnum")} />
        </Field>
      </div>
      <p className="text-xs text-muted">El presupuesto es un % de los ingresos del mes. Déjalo vacío si no aplica.</p>
    </FormDialog>
  );
}

export function ConceptoDialog({ categorias, concepto, categoriaId }: { categorias: Categoria[]; concepto?: Concepto; categoriaId?: string }) {
  const c = concepto;
  return (
    <FormDialog title={c ? "Editar concepto" : "Nuevo concepto"} action={saveConcepto} trigger={trig(!!c, "Concepto")}>
      <input type="hidden" name="id" value={c?.id ?? ""} />
      <Field label="Nombre"><input name="nombre" required defaultValue={c?.nombre ?? ""} className={inputCls} /></Field>
      <Field label="Categoría">
        <select name="categoria_id" defaultValue={c?.categoria_id ?? categoriaId ?? categorias[0]?.id} className={inputCls}>
          {categorias.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
        </select>
      </Field>
    </FormDialog>
  );
}
