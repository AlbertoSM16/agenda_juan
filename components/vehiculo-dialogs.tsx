"use client";

import { useState } from "react";
import { Fuel, Pencil, Plus, Wrench } from "lucide-react";
import { saveGastoVehiculo, saveRepostaje, saveVehiculo } from "@/app/actions";
import { FormDialog } from "@/components/form-dialog";
import { btn, cx, Field, inputCls } from "@/components/ui";
import { formatEUR, formatNum, todayISO } from "@/lib/format";
import { CATEGORIAS_VEHICULO, COMBUSTIBLES, type Combustible, type GastoVehiculo, type Repostaje, type Vehiculo } from "@/lib/types";

const n = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));
const editBtn = (open: () => void) => (
  <button type="button" onClick={open} className={cx(btn.base, btn.icon)} aria-label="Editar" title="Editar">
    <Pencil size={15} />
  </button>
);

export function RepostajeDialog({
  vehiculo,
  ultimoKm,
  repostaje,
}: {
  vehiculo: Vehiculo;
  /** último km de odómetro conocido por combustible (para calcular la distancia) */
  ultimoKm: Partial<Record<Combustible, number>>;
  repostaje?: Repostaje;
}) {
  const r = repostaje;
  const [comb, setComb] = useState<Combustible>(r?.combustible ?? vehiculo.combustibles[0] ?? "diesel");
  const [litros, setLitros] = useState(r ? String(r.litros) : "");
  const [precio, setPrecio] = useState(r?.precio_litro != null ? String(r.precio_litro) : "");
  const [coste, setCoste] = useState(r ? String(r.coste) : "");
  const [km, setKm] = useState(r?.km_odometro != null ? String(r.km_odometro) : "");
  const [dist, setDist] = useState(r?.distancia != null ? String(r.distancia) : "");
  const [distManual, setDistManual] = useState(!!r);

  const reset = () => {
    setComb(vehiculo.combustibles[0] ?? "diesel");
    setLitros(""); setPrecio(""); setCoste(""); setKm(""); setDist(""); setDistManual(false);
  };
  const autoDist = (kmVal: string, c: Combustible) => {
    const k = n(kmVal);
    const prev = ultimoKm[c];
    return !distManual && k != null && prev != null && k > prev ? String(Math.round((k - prev) * 10) / 10) : dist;
  };
  const L = n(litros), P = n(precio), C = n(coste), D = n(dist);
  const costeCalc = C ?? (L != null && P != null ? L * P : null);
  const consumo = L != null && D ? (L * 100) / D : null;

  return (
    <FormDialog
      title={r ? "Editar repostaje" : `Repostaje · ${vehiculo.nombre}`}
      action={saveRepostaje}
      trigger={(open) =>
        r ? editBtn(open) : (
          <button type="button" onClick={() => { reset(); open(); }} className={cx(btn.base, btn.primary)}>
            <Fuel size={16} /> Repostaje
          </button>
        )
      }
    >
      <input type="hidden" name="id" value={r?.id ?? ""} />
      <input type="hidden" name="vehiculo_id" value={vehiculo.id} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha">
          <input name="fecha" type="date" required defaultValue={r?.fecha ?? todayISO()} className={inputCls} />
        </Field>
        <Field label="Combustible">
          <select
            name="combustible"
            value={comb}
            onChange={(e) => { const c = e.target.value as Combustible; setComb(c); setDist(autoDist(km, c)); }}
            className={inputCls}
          >
            {(vehiculo.combustibles.length ? vehiculo.combustibles : (Object.keys(COMBUSTIBLES) as Combustible[])).map((c) => (
              <option key={c} value={c}>{COMBUSTIBLES[c]}</option>
            ))}
          </select>
        </Field>
        <Field label="Litros">
          <input name="litros" inputMode="decimal" required value={litros} onChange={(e) => setLitros(e.target.value)} className={cx(inputCls, "tnum")} />
        </Field>
        <Field label="Precio €/L">
          <input name="precio_litro" inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} className={cx(inputCls, "tnum")} />
        </Field>
        <Field label="Coste total (€)">
          <input
            name="coste"
            inputMode="decimal"
            value={coste}
            onChange={(e) => setCoste(e.target.value)}
            placeholder={costeCalc != null ? formatNum(costeCalc) : "litros × €/L"}
            className={cx(inputCls, "tnum")}
          />
        </Field>
        <Field label="Km del cuentakilómetros">
          <input
            name="km_odometro"
            inputMode="decimal"
            value={km}
            onChange={(e) => { setKm(e.target.value); setDist(autoDist(e.target.value, comb)); }}
            placeholder={ultimoKm[comb] != null ? `anterior: ${formatNum(ultimoKm[comb]!, 0)}` : ""}
            className={cx(inputCls, "tnum")}
          />
        </Field>
        <Field label="Distancia recorrida (km)" className="col-span-2 sm:col-span-1">
          <input
            name="distancia"
            inputMode="decimal"
            value={dist}
            onChange={(e) => { setDist(e.target.value); setDistManual(true); }}
            placeholder="se calcula con los km"
            className={cx(inputCls, "tnum")}
          />
        </Field>
        <Field label="Comentario" className="col-span-2 sm:col-span-1">
          <input name="comentario" defaultValue={r?.comentario ?? ""} className={inputCls} />
        </Field>
      </div>
      <div className="flex gap-4 rounded-lg bg-surface-2 px-3 py-2 text-sm">
        <span>Coste: <b className="tnum">{formatEUR(costeCalc)}</b></span>
        <span>Consumo: <b className="tnum">{consumo != null ? `${formatNum(consumo)} L/100km` : "—"}</b></span>
      </div>
    </FormDialog>
  );
}

export function GastoVehiculoDialog({
  vehiculos,
  vehiculoId,
  anio,
  gasto,
}: {
  vehiculos: Vehiculo[];
  vehiculoId?: string | null;
  anio: number;
  gasto?: GastoVehiculo;
}) {
  const g = gasto;
  return (
    <FormDialog
      title={g ? "Editar gasto" : "Nuevo gasto de vehículo"}
      action={saveGastoVehiculo}
      trigger={(open) =>
        g ? editBtn(open) : (
          <button type="button" onClick={open} className={cx(btn.base, btn.outline)}>
            <Wrench size={15} /> Gasto
          </button>
        )
      }
    >
      <input type="hidden" name="id" value={g?.id ?? ""} />
      <Field label="Concepto">
        <input name="concepto" required defaultValue={g?.concepto ?? ""} placeholder="Ej.: Cambio de aceite y filtros" className={inputCls} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Vehículo">
          <select name="vehiculo_id" defaultValue={g ? (g.vehiculo_id ?? "") : (vehiculoId ?? "")} className={inputCls}>
            <option value="">Sin asignar</option>
            {vehiculos.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
          </select>
        </Field>
        <Field label="Categoría">
          <select name="categoria" defaultValue={g?.categoria ?? "Mantenimiento"} className={inputCls}>
            {CATEGORIAS_VEHICULO.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Coste (€)">
          <input name="coste" inputMode="decimal" required defaultValue={g ? String(g.coste) : ""} className={cx(inputCls, "tnum")} />
        </Field>
        <Field label="Año">
          <input name="anio" type="number" required defaultValue={g?.anio ?? anio} className={cx(inputCls, "tnum")} />
        </Field>
        <Field label="Fecha (opcional)" className="col-span-2">
          <input name="fecha" type="date" defaultValue={g?.fecha ?? ""} className={inputCls} />
        </Field>
      </div>
    </FormDialog>
  );
}

export function VehiculoDialog({ vehiculo }: { vehiculo?: Vehiculo }) {
  const v = vehiculo;
  return (
    <FormDialog
      title={v ? "Editar vehículo" : "Nuevo vehículo"}
      action={saveVehiculo}
      trigger={(open) =>
        v ? editBtn(open) : (
          <button type="button" onClick={open} className={cx(btn.base, btn.outline)}>
            <Plus size={15} /> Vehículo
          </button>
        )
      }
    >
      <input type="hidden" name="id" value={v?.id ?? ""} />
      <Field label="Nombre">
        <input name="nombre" required defaultValue={v?.nombre ?? ""} className={inputCls} />
      </Field>
      <fieldset>
        <legend className="mb-1 text-xs font-medium text-muted">Combustibles</legend>
        <div className="flex gap-4 text-sm">
          {(Object.keys(COMBUSTIBLES) as Combustible[]).map((c) => (
            <label key={c} className="flex items-center gap-1.5">
              <input type="checkbox" name="combustibles" value={c} defaultChecked={v?.combustibles.includes(c)} /> {COMBUSTIBLES[c]}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="activo" defaultChecked={v?.activo ?? true} /> En uso
      </label>
    </FormDialog>
  );
}
