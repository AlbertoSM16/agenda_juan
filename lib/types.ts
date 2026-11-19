export type Tipo = "ingreso" | "gasto";

export type Categoria = {
  id: string;
  nombre: string;
  tipo: Tipo;
  presupuesto_pct: number | null;
  orden: number;
};

export type Concepto = { id: string; nombre: string; categoria_id: string };

export type Movimiento = {
  id: string;
  fecha: string;
  tipo: Tipo;
  categoria_id: string;
  concepto_id: string;
  cantidad: number;
  comentario: string | null;
};

export type Combustible = "diesel" | "gasolina" | "glp";
export const COMBUSTIBLES: Record<Combustible, string> = { diesel: "Diésel", gasolina: "Gasolina", glp: "GLP" };

export type Vehiculo = { id: string; nombre: string; combustibles: Combustible[]; activo: boolean; orden: number };

export type Repostaje = {
  id: string;
  vehiculo_id: string;
  fecha: string;
  combustible: Combustible;
  coste: number;
  litros: number;
  precio_litro: number | null;
  km_odometro: number | null;
  distancia: number | null;
  consumo: number | null;
  comentario: string | null;
};

export const CATEGORIAS_VEHICULO = ["Combustible", "Seguro", "Impuestos", "Mantenimiento", "Cochera", "Otros"] as const;
export type GastoVehiculo = {
  id: string;
  vehiculo_id: string | null;
  anio: number;
  fecha: string | null;
  categoria: (typeof CATEGORIAS_VEHICULO)[number];
  concepto: string;
  coste: number;
};
