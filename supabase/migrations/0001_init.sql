-- Personal Hub: esquema inicial
-- Ejecutar en Supabase > SQL Editor (o con psql) una sola vez.

create extension if not exists pgcrypto;

-- ───────────────────────── Finanzas ─────────────────────────
create table if not exists categorias (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null unique,
  tipo            text not null check (tipo in ('ingreso', 'gasto')),
  presupuesto_pct numeric(6,3),           -- % sobre ingresos del mes (solo gastos)
  orden           int not null default 0,
  created_at      timestamptz not null default now()
);

create table if not exists conceptos (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null,
  categoria_id uuid not null references categorias(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (categoria_id, nombre)
);

create table if not exists movimientos (
  id           uuid primary key default gen_random_uuid(),
  fecha        date not null,
  tipo         text not null check (tipo in ('ingreso', 'gasto')),
  categoria_id uuid not null references categorias(id) on delete restrict,
  concepto_id  uuid not null references conceptos(id) on delete restrict,
  cantidad     numeric(12,4) not null check (cantidad >= 0),
  comentario   text,
  created_at   timestamptz not null default now()
);
create index if not exists movimientos_fecha_idx on movimientos (fecha);

-- ───────────────────────── Vehículos ─────────────────────────
create table if not exists vehiculos (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null unique,
  combustibles text[] not null default '{}',   -- p.ej. {diesel} o {glp,gasolina}
  activo       boolean not null default true,
  orden        int not null default 0,
  created_at   timestamptz not null default now()
);

create table if not exists repostajes (
  id           uuid primary key default gen_random_uuid(),
  vehiculo_id  uuid not null references vehiculos(id) on delete cascade,
  fecha        date not null,
  combustible  text not null check (combustible in ('diesel', 'gasolina', 'glp')),
  coste        numeric(12,4) not null,
  litros       numeric(10,3) not null,
  precio_litro numeric(8,4),
  km_odometro  numeric(10,1),
  distancia    numeric(8,1),                 -- km desde el repostaje anterior
  consumo      numeric(6,3),                 -- L/100km de ese repostaje
  comentario   text,
  created_at   timestamptz not null default now()
);
create index if not exists repostajes_vehiculo_fecha_idx on repostajes (vehiculo_id, fecha);

create table if not exists gastos_vehiculo (
  id          uuid primary key default gen_random_uuid(),
  vehiculo_id uuid references vehiculos(id) on delete set null,  -- null = general
  anio        int not null,
  fecha       date,
  categoria   text not null default 'Mantenimiento'
              check (categoria in ('Combustible', 'Seguro', 'Impuestos', 'Mantenimiento', 'Cochera', 'Otros')),
  concepto    text not null,
  coste       numeric(12,4) not null,
  created_at  timestamptz not null default now()
);
create index if not exists gastos_vehiculo_anio_idx on gastos_vehiculo (anio);

-- ───────────────────────── Vistas ─────────────────────────
create or replace view v_resumen_mes with (security_invoker = true) as
select date_trunc('month', m.fecha)::date as mes,
       m.tipo,
       c.nombre  as categoria,
       co.nombre as concepto,
       sum(m.cantidad)::numeric(12,2) as total,
       count(*)  as n
from movimientos m
join categorias c on c.id = m.categoria_id
join conceptos co on co.id = m.concepto_id
group by 1, 2, 3, 4;

create or replace view v_vehiculo_anual with (security_invoker = true) as
select r.vehiculo_id,
       extract(year from r.fecha)::int as anio,
       r.combustible,
       count(*)                         as repostajes,
       sum(r.coste)::numeric(12,2)      as coste,
       sum(r.litros)::numeric(12,2)     as litros,
       sum(r.distancia)::numeric(12,1)  as distancia,
       avg(r.consumo)::numeric(6,2)     as consumo_medio,
       avg(r.precio_litro)::numeric(8,3) as precio_medio
from repostajes r
group by 1, 2, 3;

-- ───────────────────────── Seguridad (RLS) ─────────────────────────
-- Una única cuenta compartida: cualquier usuario autenticado tiene acceso total;
-- los anónimos no ven nada. Desactiva el registro público en Auth > Providers.
do $$
declare t text;
begin
  foreach t in array array['categorias','conceptos','movimientos','vehiculos','repostajes','gastos_vehiculo'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "auth_all" on %I', t);
    execute format('create policy "auth_all" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Función para el cron que evita que el proyecto gratuito se pause
create or replace function public.keepalive() returns int
language sql security definer set search_path = public as $$ select 1 $$;
grant execute on function public.keepalive() to anon;
