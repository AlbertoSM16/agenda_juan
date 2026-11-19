import { deleteGastoVehiculo } from "@/app/actions";
import { DeleteButton } from "@/components/form-dialog";
import { Badge, Empty } from "@/components/ui";
import { GastoVehiculoDialog } from "@/components/vehiculo-dialogs";
import { formatEUR, formatFecha } from "@/lib/format";
import type { GastoVehiculo, Vehiculo } from "@/lib/types";

export function GastosVehiculoList({ gastos, vehiculos, showVehiculo }: { gastos: GastoVehiculo[]; vehiculos: Vehiculo[]; showVehiculo?: boolean }) {
  if (!gastos.length) return <Empty>No hay gastos.</Empty>;
  const nombre = new Map(vehiculos.map((v) => [v.id, v.nombre]));
  return (
    <ul className="divide-y divide-border/60 text-sm">
      {gastos.map((g) => (
        <li key={g.id} className="flex items-center gap-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate">{g.concepto}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
              <Badge>{g.categoria}</Badge>
              {showVehiculo && <span>{g.vehiculo_id ? nombre.get(g.vehiculo_id) : "Sin asignar"}</span>}
              {g.fecha && <span className="tnum">{formatFecha(g.fecha)}</span>}
            </div>
          </div>
          <span className="tnum shrink-0 font-medium">{formatEUR(g.coste)}</span>
          <div className="flex shrink-0">
            <GastoVehiculoDialog vehiculos={vehiculos} anio={g.anio} gasto={g} />
            <DeleteButton action={deleteGastoVehiculo.bind(null, g.id)} label="este gasto" />
          </div>
        </li>
      ))}
    </ul>
  );
}
