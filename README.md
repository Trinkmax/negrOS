# nos · negrOS

Registro de comprobantes de pago para negocios multi-sucursal. PWA mobile para staff + dashboard admin + panel público para financiera.

## Stack

- Next.js 16 App Router · React 19 · TypeScript
- Tailwind v4 + componentes propios (estilo monocromo)
- Supabase: Postgres + Storage + Auth admin
- Auth staff: PIN + JWT propio (`jose`) en cookie httpOnly
- Vercel (Fluid Compute · 300s para descargas ZIP)

## Variables de entorno

Las cuatro son obligatorias en producción:

| Var | Dónde |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publishable / anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role (server-only — **nunca** al cliente) |
| `STAFF_JWT_SECRET` | secreto random ≥ 32 bytes para firmar JWT del staff |

`.env.example` está en el repo. `.env.local` queda fuera de git.

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # editar con tus credenciales
npm run dev                  # → http://localhost:3000
```

Primera vez:

1. Abrí `http://localhost:3000/admin/setup` y creá el primer admin.
2. Cargá una sucursal en `/admin/sucursales`.
3. Cargá cuentas en `/admin/cuentas`.
4. Cargá staff en `/admin/staff` (anotá el PIN cuando se muestra).
5. Probá el flujo: `/login` con el PIN → home → "Sacar foto".

## Deploy a Vercel

### Opción A — desde el dashboard

1. Subí el repo a GitHub/GitLab.
2. En Vercel: **Add New → Project → Import**.
3. Framework auto-detectado (Next.js). Build/install commands por default.
4. **Environment Variables** → agregá las 4 vars de arriba para Production y Preview.
5. Deploy.

### Opción B — Vercel CLI

```bash
npm i -g vercel@latest
vercel login
vercel link              # primera vez
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add STAFF_JWT_SECRET production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel deploy --prod
```

Para sincronizar envs a local:

```bash
vercel env pull .env.local
```

### Configuración de la plataforma (`vercel.json`)

- `/api/download` y `/api/share-download/[token]` corren con `maxDuration: 300` y 1 GB de RAM (descarga ZIP de hasta 1000 comprobantes).
- Region default `sfo1` (cercana a Supabase Oregon).
- Headers de cache para `/sw.js`, `/manifest.webmanifest` e iconos.

## Supabase

El proyecto comparte la base con un POS preexistente. Todo lo de negrOS vive con prefijo `negros_*` y el bucket privado `negros-receipts`.

Migrations aplicadas (en orden):

| Migration | Qué hace |
|---|---|
| `006_negros_schema` | Tablas `negros_branches/accounts/staff/admins/receipts` + indexes + trigger updated_at |
| `007_negros_storage_and_hardening` | Bucket privado `negros-receipts` (10 MB, mimes de imagen) + fix `search_path` |
| `008_negros_share_and_payment` | Estados `paid_to_owner_*` y `owner_confirmed_*` en receipts + tabla `negros_share_links` |

RLS está habilitada en todas las tablas, sin policies para `anon`/`authenticated`. Todo el acceso pasa por **Server Actions** que usan `service_role` después de validar la sesión.

## Logo / PWA

- `public/logo.png` — original (transparent PNG)
- `app/icon.tsx`, `apple-icon.tsx`, `icon0.tsx` (192), `icon1.tsx` (512), `icon2.tsx` (maskable) — generan PNGs cuadrados con el logo sobre fondo negro vía `next/og`
- `app/manifest.ts` — manifest PWA (`display: standalone`, theme negro)

## Rutas

| Ruta | Quién | Qué |
|---|---|---|
| `/` | público | splash con dos botones (redirige si hay sesión) |
| `/login` | público | login staff: lista staff → PIN |
| `/staff` | staff | home: KPI hoy + botón "Sacar foto" |
| `/staff/capture` | staff | cámara → preview → elegir cuenta → upload |
| `/staff/history` | staff | mis comprobantes (read-only) |
| `/admin/setup` | público (1×) | crear primer admin |
| `/admin/login` | público | login email + password |
| `/admin` | admin | overview KPIs |
| `/admin/comprobantes` | admin | tabla filtrable + edit/soft-delete + descarga ZIP + compartir con financiera |
| `/admin/sucursales` `/cuentas` `/staff` | admin | CRUDs |
| `/share/[token]` | público (token) | panel financiera: ver, descargar ZIP, marcar pago |
| `/api/download` | admin | ZIP + CSV de los filtros actuales |
| `/api/share-download/[token]` | público (token) | ZIP + CSV del rango del share link |
