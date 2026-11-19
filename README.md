# Personal Hub

Cuentas de casa y banco + combustible y mantenimiento de los coches.
Next.js 15 + Supabase (Postgres + login) desplegado en Vercel, todo con capa gratuita.

| Página | Qué hace |
|---|---|
| **Mes** (`/`) | Réplica de la hoja *Dashboard*: ingresos, gastos, saldo, presupuesto por categoría (% de ingresos), desglose por subcategoría y registros del mes. |
| **Movimientos** | Todos los registros con filtros por fechas, tipo, categoría y texto. |
| **Anual** | Hoja *Gastos_global*: ingresos vs gastos por mes y matriz concepto × mes. |
| **Vehículos** | Coste anual por coche (combustible + mantenimiento), €/km, consumo medio, histórico por años. |
| **Vehículo** | Repostajes con cálculo automático de distancia, €/L y L/100 km; gráficas de consumo y precio; gastos de taller. |
| **Ajustes** | Categorías, conceptos, % de presupuesto y vehículos. |

## Puesta en marcha (una vez)

### 1. Supabase (base de datos + login, gratis)
1. Crea una cuenta en <https://supabase.com> → **New project** (región *West EU*). Guarda la contraseña de la BD.
2. **SQL Editor** → pega y ejecuta `supabase/migrations/0001_init.sql`.
3. **Authentication → Sign In / Providers**: desactiva *Allow new users to sign up*.
4. **Authentication → Users → Add user → Create new user**: tu email y contraseña (marca *Auto Confirm User*). Esa es la cuenta compartida.
5. **Project Settings → API**: copia *Project URL* y la clave *anon public*.

### 2. Importar los Excel
```bash
npm install
npm run import -- "~/Descargas/Finanzas_personales.xlsx" "~/Descargas/Gastos anuales vehículos .xlsx"
```
Genera `supabase/seed.local.sql` (está en `.gitignore`, contiene tus datos) e imprime un cuadre con los totales para compararlos con el Excel.
Ábrelo y ejecútalo en el **SQL Editor** de Supabase (o con `psql "<connection string>" -f supabase/seed.local.sql`).
El seed vacía las tablas antes de insertar: puedes repetirlo, pero **borra lo que hayas metido desde la app**.

Notas de la importación:
- Las fechas de repostaje fuera del año de su hoja se corrigen (había un `31/12/2026` en *2025 Audi*).
- Las líneas de *Gastos totales* que enlazan a las hojas de repostajes (Diesel Audi, GLP Dacia…) no se importan para no duplicar.
- Gastos de taller sin coche identificable: hasta 2025 se asignan al Audi; los de 2026 quedan *sin asignar* (asígnalos en **Vehículos**).

### 3. Probar en local
Contra tu proyecto de supabase.com:
```bash
cp .env.example .env.local   # rellena URL y anon key REALES (no dejes los xxxxxxxx)
npm run dev                  # http://localhost:3000
```

O con un Supabase local en Docker (sin cuenta):
```bash
npx supabase start -x studio,imgproxy,storage-api,realtime,edge-runtime,logflare,vector,supavisor,postgres-meta,mailpit
npx supabase status -o env   # copia API_URL y ANON_KEY a .env.local
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/seed.local.sql
npm run dev
```
El usuario se crea en Auth (con el Studio o con la admin API). Si el login da "fetch failed", `.env.local` apunta a una URL que no existe.

### 4. Publicar en Vercel (gratis)
1. Sube el repo a GitHub (privado).
2. <https://vercel.com/new> → importa el repo.
3. *Environment Variables*: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `CRON_SECRET` (cualquier cadena aleatoria).
4. Deploy. Cada `git push` vuelve a desplegar.

`vercel.json` programa un cron diario a `/api/keepalive` para que Supabase no pause el proyecto gratuito por inactividad (se pausa tras 7 días sin uso).

## Seguridad
- Todas las tablas tienen RLS: solo un usuario autenticado puede leer o escribir; con la clave anónima no se ve nada.
- El middleware redirige a `/login` cualquier ruta sin sesión.
- Nunca subas `.env.local` ni `supabase/seed.local.sql`.

## Estructura
```
app/(app)/…            páginas (Server Components)
app/actions.ts         escrituras (Server Actions + zod)
lib/data.ts            lecturas de Supabase
lib/finanzas.ts        cálculos del dashboard mensual
lib/vehiculos.ts       cálculos de consumo / coste
components/            UI, diálogos y gráficas (Recharts)
supabase/migrations/   esquema SQL
scripts/import-excel.ts importador de los Excel
```
