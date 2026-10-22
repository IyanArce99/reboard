# Base de datos — Supabase Postgres

Estado: **diseño inicial, sin aplicar**. Irá como migraciones en `supabase/migrations/` (ver [MVP_IMPLEMENTATION.md](MVP_IMPLEMENTATION.md)). Las decisiones de seguridad están en [SECURITY.md](SECURITY.md).

## Principios
- **El catálogo** (`brands`, `board_models`, `board_model_sizes`) **está separado de los anuncios** (`listings`).
  - Un anuncio *puede* apuntar a una medida de catálogo, pero no es obligatorio: «Shaper local», «Sin marca» u «Otro modelo» guardan texto libre.
  - Los usuarios nunca escriben en el catálogo.
- **Cada dato técnico guarda su origen** (`*_source`: `seller` | `manufacturer`). Si el valor es `NULL`, el origen también lo es (CHECK). Nunca se inventan litros.
- **Los enums usan los mismos slugs que `src/lib/domain/taxonomy.ts`.** El mapeo a la UI es directo.
- **Los datos privados (teléfono) van en una tabla aparte** sin acceso público. Solo se revelan mediante una función de servidor que deja registro.
- **Nada se borra físicamente desde la app:** retirar, vender o moderar son cambios de estado.
- **Un único `public_id`** con la forma `a{número}` mantiene las URLs `/anuncio/{slug}-a{id}`.

## Diagrama
```
auth.users 1─1 profiles 1─* listings *─1 zones
                      │        │ 1─* listing_photos
                      │        │ 1─1 listing_contacts   (privada)
                      │        │ 1─* contact_events     (registro)
                      │        │ 1─* reports ─* moderation_actions
                      │        *─1 brands / board_models / board_model_sizes (opcional)
                      └─* favorites *─1 listings
brands 1─* board_models 1─* board_model_sizes
shops (directorio; vinculable a un profile en el futuro)
```

## SQL — migración `0001_init.sql`

```sql
-- ───────────── Tipos ─────────────
create type public.board_shape        as enum ('shortboard','fish','hibrida','evolutiva','midlength','longboard','gun');
create type public.board_construction as enum ('pu','epoxy','softboard');
create type public.board_condition    as enum ('como-nueva','muy-buen-estado','buen-estado','con-reparaciones');
create type public.seller_type        as enum ('particular','tienda','escuela');
create type public.data_source        as enum ('seller','manufacturer');
create type public.contact_method     as enum ('whatsapp','phone');            -- sin chat propio; email fuera del MVP
create type public.listing_status     as enum ('draft','published','sold','expired','withdrawn');
create type public.moderation_state   as enum ('visible','flagged','removed');
create type public.user_role          as enum ('user','moderator','admin');
create type public.report_reason      as enum ('fraude','datos-falsos','vendida','duplicado','inapropiado','otro');
create type public.report_status      as enum ('open','resolved','dismissed');

-- ───────────── Zonas (seed desde taxonomy.ts) ─────────────
create table public.zones (
  slug        text primary key check (slug ~ '^[a-z0-9-]{2,40}$'),
  name        text not null,
  region_slug text,                       -- 'canarias' para las 4 islas
  sort_order  smallint not null default 0
);

-- ───────────── Perfiles ─────────────
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Surfista' check (char_length(display_name) between 2 and 40),
  seller_type  public.seller_type not null default 'particular',   -- tienda/escuela solo lo cambia un admin
  role         public.user_role   not null default 'user',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ───────────── Catálogo ─────────────
create table public.brands (
  id          bigint generated always as identity primary key,
  slug        text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name        text not null,
  intro       text,
  logo_path   text,                          -- solo con autorización de la marca
  created_at  timestamptz not null default now()
);

create table public.board_models (
  id           bigint generated always as identity primary key,
  brand_id     bigint not null references public.brands(id) on delete restrict,
  slug         text not null check (slug ~ '^[a-z0-9-]{1,60}$'),
  name         text not null,
  shape        public.board_shape not null,
  construction public.board_construction not null,
  description  text,
  source_note  text,                         -- de dónde salen las medidas (tabla del fabricante, fecha)
  created_at   timestamptz not null default now(),
  unique (brand_id, slug)
);

create table public.board_model_sizes (
  id            bigint generated always as identity primary key,
  model_id      bigint not null references public.board_models(id) on delete cascade,
  label         text not null,               -- 7'2"
  length_in     numeric(5,2) not null check (length_in between 48 and 144),
  width_in      numeric(5,3) not null check (width_in between 14 and 30),
  thickness_in  numeric(5,3) not null check (thickness_in between 1.5 and 5),
  volume_l      numeric(5,1)     check (volume_l between 10 and 150),   -- NULL si el fabricante no lo publica
  sort_order    smallint not null default 0,
  unique (model_id, label)
);

-- ───────────── Anuncios ─────────────
create sequence public.listing_id_seq start with 100000;   -- no choca con los ids DEMO (a1040…)

create table public.listings (
  id            bigint primary key default nextval('public.listing_id_seq'),
  public_id     text generated always as ('a' || id::text) stored unique,
  slug          text not null check (slug ~ '^[a-z0-9-]{3,120}$'),
  seller_id     uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  status        public.listing_status   not null default 'draft',
  moderation    public.moderation_state not null default 'visible',

  -- Catálogo (opcional) o texto libre
  brand_id      bigint references public.brands(id) on delete set null,
  model_id      bigint references public.board_models(id) on delete set null,
  model_size_id bigint references public.board_model_sizes(id) on delete set null,
  brand_text    text check (char_length(brand_text) <= 60),   -- «Shaper local», marca no catalogada…
  model_text    text check (char_length(model_text) <= 60),

  -- Medidas con su origen
  size_label        text not null check (char_length(size_label) <= 20),
  length_in         numeric(5,2) not null check (length_in between 48 and 144),
  length_source     public.data_source not null default 'seller',
  width_in          numeric(5,3) check (width_in between 14 and 30),
  width_source      public.data_source,
  thickness_in      numeric(5,3) check (thickness_in between 1.5 and 5),
  thickness_source  public.data_source,
  volume_l          numeric(5,1) check (volume_l between 10 and 150),
  volume_source     public.data_source,
  shape             public.board_shape not null,
  shape_source      public.data_source not null default 'seller',
  construction      public.board_construction not null,
  construction_source public.data_source not null default 'seller',
  fins              text check (char_length(fins) <= 60),
  accessories       text check (char_length(accessories) <= 120),

  condition     public.board_condition not null,
  repairs       text check (char_length(repairs) <= 600),
  description   text check (char_length(description) <= 2000),
  price_eur     integer not null check (price_eur between 1 and 20000),
  previous_price_eur integer check (previous_price_eur between 1 and 20000),

  zone_slug     text not null references public.zones(slug),
  town          text not null check (char_length(town) between 2 and 80),   -- municipio (sin coordenadas)
  contact_method public.contact_method not null default 'whatsapp',

  published_at  timestamptz,
  confirmed_at  timestamptz,
  sold_at       timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  is_demo       boolean not null default false,

  -- Origen obligatorio si hay valor, y NULL si no lo hay
  constraint width_src     check ((width_in     is null) = (width_source     is null)),
  constraint thickness_src check ((thickness_in is null) = (thickness_source is null)),
  constraint volume_src    check ((volume_l     is null) = (volume_source    is null)),
  -- 'manufacturer' solo con una medida de catálogo vinculada
  constraint manufacturer_needs_catalog check (
    model_size_id is not null or 'manufacturer' not in (
      length_source::text, coalesce(width_source::text,''), coalesce(thickness_source::text,''),
      coalesce(volume_source::text,''), construction_source::text)),
  constraint published_has_dates check (status in ('draft','withdrawn') or (published_at is not null and confirmed_at is not null))
);

create table public.listing_photos (
  id           uuid primary key default gen_random_uuid(),
  listing_id   bigint not null references public.listings(id) on delete cascade,
  storage_path text not null unique,         -- {user_id}/{listing_id}/{uuid}.webp
  position     smallint not null check (position between 0 and 7),
  label        text check (char_length(label) <= 40),
  width        integer, height integer,
  created_at   timestamptz not null default now(),
  unique (listing_id, position)
);

-- Datos de contacto: PRIVADOS. Sin acceso anon; solo el dueño y la función reveal_contact.
create table public.listing_contacts (
  listing_id  bigint primary key references public.listings(id) on delete cascade,
  phone_e164  text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  updated_at  timestamptz not null default now()
);

create table public.favorites (
  user_id    uuid   not null references public.profiles(id) on delete cascade,
  listing_id bigint not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- Registro de contactos (estadística del panel + límite anti-scraping)
create table public.contact_events (
  id          bigint generated always as identity primary key,
  listing_id  bigint not null references public.listings(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete set null,
  ip_hash     text,                           -- HMAC(ip, secreto); nunca la IP en claro
  method      public.contact_method not null,
  created_at  timestamptz not null default now()
);

-- ───────────── Moderación ─────────────
create table public.reports (
  id          bigint generated always as identity primary key,
  listing_id  bigint not null references public.listings(id) on delete cascade,
  reporter_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  reason      public.report_reason not null,
  details     text check (char_length(details) <= 1000),
  status      public.report_status not null default 'open',
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id),
  unique (listing_id, reporter_id)           -- un reporte por persona y anuncio
);

create table public.moderation_actions (
  id           bigint generated always as identity primary key,
  listing_id   bigint not null references public.listings(id) on delete cascade,
  moderator_id uuid not null references public.profiles(id),
  action       text not null check (action in ('flag','remove','restore','dismiss_reports')),
  reason       text,
  created_at   timestamptz not null default now()
);

-- Directorio de tiendas (hoy DEMO). profile_id permitirá vincular la cuenta de la tienda.
create table public.shops (
  id          bigint generated always as identity primary key,
  slug        text not null unique,
  name        text not null,
  type        public.seller_type not null check (type in ('tienda','escuela')),
  zone_slug   text not null references public.zones(slug),
  town        text not null,
  address     text,
  hours       text,
  inventory_source text,
  profile_id  uuid unique references public.profiles(id) on delete set null,
  is_demo     boolean not null default false
);
```

## Índices

```sql
-- Búsqueda: solo filas publicadas y visibles (índices parciales pequeños)
create index listings_search_zone_price on public.listings (zone_slug, price_eur)
  where status = 'published' and moderation = 'visible';
create index listings_search_volume     on public.listings (volume_l)
  where status = 'published' and moderation = 'visible';
create index listings_search_length     on public.listings (length_in)
  where status = 'published' and moderation = 'visible';
create index listings_search_shape      on public.listings (shape, construction)
  where status = 'published' and moderation = 'visible';
create index listings_search_recent     on public.listings (published_at desc)
  where status = 'published' and moderation = 'visible';
create index listings_brand    on public.listings (brand_id);
create index listings_model    on public.listings (model_id, model_size_id);
create index listings_seller   on public.listings (seller_id, status);
create index listings_expiry   on public.listings (confirmed_at) where status = 'published';
create index photos_listing    on public.listing_photos (listing_id, position);
create index favorites_listing on public.favorites (listing_id);
create index contact_events_listing on public.contact_events (listing_id, created_at desc);
create index contact_events_ip      on public.contact_events (ip_hash, created_at desc);
create index reports_open      on public.reports (status, created_at) where status = 'open';
create index models_brand      on public.board_models (brand_id);
```
Con miles de anuncios esto basta. El filtro de marca usa `brand_id` (o `brand_text is not null and brand_id is null` para «sin marca»). La búsqueda de texto libre no entra en el MVP.

## Disparadores y funciones

```sql
-- updated_at
create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger t_listings_touch before update on public.listings for each row execute function public.touch_updated_at();
create trigger t_profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

-- Perfil automático al registrarse (sin derivar el nombre del email, para no exponerlo)
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Rol de moderación
create function public.is_moderator() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p
                 where p.id = (select auth.uid()) and p.role in ('moderator','admin'));
$$;

-- Transiciones de estado y fechas: las fija el servidor, no el cliente
create function public.listings_guard() returns trigger language plpgsql as $$
begin
  -- Sin auth.uid() solo puede ser el servidor (service role, cron, funciones definer):
  -- anon no tiene privilegio de UPDATE. Las reglas del dueño solo aplican a usuarios.
  if tg_op = 'UPDATE' and (select auth.uid()) is not null and not public.is_moderator() then
    -- El dueño no puede tocar la moderación ni reabrir un anuncio retirado por moderación
    if new.moderation is distinct from old.moderation then raise exception 'moderation is read-only'; end if;
    if old.moderation = 'removed' then raise exception 'listing removed by moderation'; end if;
    -- Transiciones permitidas para el dueño
    if new.status is distinct from old.status and not (
         (old.status = 'draft'     and new.status in ('published','withdrawn')) or
         (old.status = 'published' and new.status in ('sold','withdrawn')) or
         (old.status in ('sold','expired','withdrawn') and new.status = 'published')) then
      raise exception 'invalid status transition % -> %', old.status, new.status;
    end if;
  end if;
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.published_at := coalesce(new.published_at, now());
    new.confirmed_at := now();
    new.sold_at := null;
  end if;
  if tg_op = 'UPDATE' and new.confirmed_at is distinct from old.confirmed_at then
    new.confirmed_at := now();                         -- «Sigue disponible»: solo puede ser ahora
  end if;
  if new.status = 'sold' and (tg_op = 'INSERT' or old.status is distinct from 'sold') then
    new.sold_at := now();
  end if;
  if tg_op = 'UPDATE' and new.price_eur < old.price_eur then
    new.previous_price_eur := old.price_eur;           -- «Ha bajado de X a Y»
  end if;
  return new;
end $$;
create trigger t_listings_guard before insert or update on public.listings
  for each row execute function public.listings_guard();

-- Máximo 8 fotos por anuncio
create function public.photos_limit() returns trigger language plpgsql as $$
begin
  if (select count(*) from public.listing_photos where listing_id = new.listing_id) >= 8 then
    raise exception 'max 8 photos';
  end if;
  return new;
end $$;
create trigger t_photos_limit before insert on public.listing_photos
  for each row execute function public.photos_limit();

-- Caducidad: publicada sin confirmar 30 días → expired. «Pendiente de confirmar» (> 14 días)
-- se calcula al leer, no se guarda. La ejecuta el cron con service role.
create function public.expire_listings() returns integer
language sql security definer set search_path = '' as $$
  with e as (
    update public.listings set status = 'expired'
    where status = 'published' and confirmed_at < now() - interval '30 days'
    returning 1)
  select count(*)::int from e;
$$;
revoke execute on function public.expire_listings() from public, anon, authenticated;

-- Revelar el contacto: solo la llama el servidor (service role), que pasa el ip_hash
create function public.reveal_contact(p_public_id text, p_user uuid, p_ip_hash text)
returns table (method public.contact_method, phone_e164 text)
language plpgsql security definer set search_path = '' as $$
declare l public.listings;
begin
  select * into l from public.listings
   where public_id = p_public_id and status = 'published' and moderation = 'visible';
  if not found then return; end if;
  if (select count(*) from public.contact_events
       where ip_hash = p_ip_hash and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'rate_limited';
  end if;
  insert into public.contact_events (listing_id, user_id, ip_hash, method)
  values (l.id, p_user, p_ip_hash, l.contact_method);
  return query select l.contact_method, c.phone_e164
               from public.listing_contacts c where c.listing_id = l.id;
end $$;
revoke execute on function public.reveal_contact(text, uuid, text) from public, anon, authenticated;
```

### Recuentos de facetas (RPC)
El panel de filtros muestra recuentos por zona y por forma, y un total. En lugar de unas 18 consultas sueltas, se usa una función:
- `listing_facets(p jsonb)`, de tipo `security invoker` y `stable`.
- Aplica los mismos filtros que la búsqueda (`zones text[]`, `vol_min`, `vol_max`, `len_min`, `len_max`, `shapes`, `constructions`, `price_min`, `price_max`, `brand`, `model`, `conditions`, `sellers`, `no_repairs`, `fins`, `width_min`, `thick_min`, `fit_lo`, `fit_hi`).
- Para cada dimensión ignora su propio filtro.
- Devuelve filas `(dimension, key, n)`.

La región «canarias» se expande a sus zonas en la app (`filters.ts` → `zones[]`). Se implementa en la tarea DB-6 del ROADMAP, con tests de paridad contra `matches()`.

## Políticas RLS

```sql
alter table public.zones              enable row level security;
alter table public.profiles           enable row level security;
alter table public.brands             enable row level security;
alter table public.board_models       enable row level security;
alter table public.board_model_sizes  enable row level security;
alter table public.listings           enable row level security;
alter table public.listing_photos     enable row level security;
alter table public.listing_contacts   enable row level security;
alter table public.favorites          enable row level security;
alter table public.contact_events     enable row level security;
alter table public.reports            enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.shops              enable row level security;

-- Lectura pública: zonas, catálogo y tiendas
create policy zones_read  on public.zones             for select using (true);
create policy brands_read on public.brands            for select using (true);
create policy models_read on public.board_models      for select using (true);
create policy sizes_read  on public.board_model_sizes for select using (true);
create policy shops_read  on public.shops             for select using (true);
-- (sin políticas de escritura: solo service role o migraciones)

-- Perfiles: lectura pública de columnas limitadas (ver GRANTs), edición propia
create policy profiles_read   on public.profiles for select using (true);
create policy profiles_update on public.profiles for update
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Anuncios
create policy listings_public_read on public.listings for select
  using (status in ('published','sold','expired') and moderation = 'visible');
create policy listings_owner_read  on public.listings for select
  using ((select auth.uid()) = seller_id);
create policy listings_mod_read    on public.listings for select using (public.is_moderator());
create policy listings_insert      on public.listings for insert to authenticated
  with check ((select auth.uid()) = seller_id and moderation = 'visible' and is_demo = false
              and status in ('draft','published'));
create policy listings_owner_update on public.listings for update to authenticated
  using ((select auth.uid()) = seller_id) with check ((select auth.uid()) = seller_id);
create policy listings_mod_update  on public.listings for update to authenticated
  using (public.is_moderator()) with check (public.is_moderator());
-- Sin DELETE: retirar = status 'withdrawn'.

-- Fotos: visibles si el anuncio lo es; escritura solo del dueño y dentro de su carpeta
create policy photos_read on public.listing_photos for select using (
  exists (select 1 from public.listings l where l.id = listing_id
          and ((l.status in ('published','sold','expired') and l.moderation = 'visible')
               or l.seller_id = (select auth.uid()) or public.is_moderator())));
create policy photos_write on public.listing_photos for insert to authenticated with check (
  storage_path like ((select auth.uid())::text || '/%') and
  exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = (select auth.uid())));
create policy photos_update on public.listing_photos for update to authenticated using (
  exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = (select auth.uid())));
create policy photos_delete on public.listing_photos for delete to authenticated using (
  exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = (select auth.uid())));

-- Contacto: solo el dueño (lectura y escritura). El comprador lo obtiene vía reveal_contact.
create policy contacts_owner on public.listing_contacts for all to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = (select auth.uid())))
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = (select auth.uid())));

-- Favoritos: solo los propios
create policy favorites_own on public.favorites for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Contactos registrados: el vendedor ve los de sus anuncios (estadística del panel)
create policy contact_events_owner on public.contact_events for select to authenticated using (
  exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = (select auth.uid())));

-- Reportes: crea quien tiene sesión; ve los suyos; moderación ve y resuelve todos
create policy reports_insert on public.reports for insert to authenticated
  with check ((select auth.uid()) = reporter_id and status = 'open');
create policy reports_own_read on public.reports for select to authenticated
  using ((select auth.uid()) = reporter_id or public.is_moderator());
create policy reports_mod_update on public.reports for update to authenticated
  using (public.is_moderator()) with check (public.is_moderator());
create policy modactions_mod on public.moderation_actions for all to authenticated
  using (public.is_moderator()) with check (public.is_moderator() and moderator_id = (select auth.uid()));
```

### Privilegios por columna (complemento de RLS)
RLS filtra filas, no columnas. Supabase concede por defecto todo a `anon` y `authenticated`, así que se restringe:
```sql
revoke all on public.listings, public.profiles, public.listing_contacts, public.contact_events
  from anon, authenticated;

grant select on public.listings to anon, authenticated;
grant insert (slug, status, brand_id, model_id, model_size_id, brand_text, model_text, size_label,
              length_in, length_source, width_in, width_source, thickness_in, thickness_source,
              volume_l, volume_source, shape, shape_source, construction, construction_source,
              fins, accessories, condition, repairs, description, price_eur, zone_slug, town,
              contact_method)
  on public.listings to authenticated;
grant update (slug, status, brand_id, model_id, model_size_id, brand_text, model_text, size_label,
              length_in, length_source, width_in, width_source, thickness_in, thickness_source,
              volume_l, volume_source, shape, shape_source, construction, construction_source,
              fins, accessories, condition, repairs, description, price_eur, zone_slug, town,
              contact_method, confirmed_at)
  on public.listings to authenticated;
-- seller_id, moderation, is_demo, published_at, sold_at, previous_price_eur: no se conceden.
-- Los moderadores cambian `moderation` vía Server Action con service role tras comprobar is_moderator().

grant select (id, display_name, seller_type, created_at) on public.profiles to anon, authenticated;
grant update (display_name) on public.profiles to authenticated;      -- role y seller_type: solo admin

grant select, insert, update, delete on public.listing_contacts to authenticated;   -- RLS: solo dueño
grant select on public.contact_events to authenticated;                              -- RLS: solo dueño
```

## Storage
- **Bucket `listing-photos`:** público en lectura, con límite de 5 MB por archivo y tipos `image/webp` e `image/jpeg`.
- **Ruta:** `{user_id}/{listing_id}/{uuid}.webp`.
- **Políticas sobre `storage.objects`:**
  - Insertar, actualizar y borrar solo si `bucket_id = 'listing-photos'` y `(storage.foldername(name))[1] = auth.uid()::text`.
  - La lectura es pública por URL: los nombres son UUID imposibles de adivinar.
- **Moderación:** al retirar un anuncio por moderación se **borran sus archivos** con service role, porque una URL pública seguiría funcionando.
- **Decisión documentada:** un bucket privado con URLs firmadas impediría cachear las imágenes en la CDN y complicaría `next/image`. Para fotos de anuncios públicos no compensa.

## Mapeo base de datos → tipo `Listing` (UI)
| `Listing` | Base de datos |
|---|---|
| `id` | `public_id` |
| `slug` | `slug` |
| `brand` / `model` | `brands.name` o `brand_text` / `board_models.name` o `model_text` |
| `modelSlug` | `board_models.slug` |
| `length` / `width` / `thickness` / `volume` | `{x}_in` o `volume_l`, con `{x}_source` |
| `fins` / `accessories` | Texto con `source = 'seller'` si hay valor |
| `distanceKm` | `null` (sin coordenadas en el MVP) |
| `status` | `published` → `disponible`, o `pendiente` si `confirmed_at < now() - 14 días`. `sold` → `vendida`, `expired` → `caducada`, `withdrawn` → `retirada` |
| `seller` | `profiles.display_name`, `profiles.seller_type` y `shops.slug` |
| `contact` | `{ method: contact_method, phone: null }`: **el teléfono nunca viaja en el listado** |
| `photos` | `listing_photos` ordenadas por `position`, con URL pública de Storage |
| `isDemo` | `is_demo` |

## Seeds
- `supabase/seed/zones.sql`: las 9 zonas (provincias o islas) y la región `canarias` (todos los entornos).
- Municipios: si se crea una tabla `towns` para validar `town`, sus datos tienen que venir del INE. No se generan a mano.
- `supabase/seed/catalog.sql`: marcas, modelos y medidas. **En producción, solo con datos verificados contra la tabla del fabricante** (`source_note`). Hoy son DEMO.
- `supabase/seed/demo.sql`: tiendas y anuncios DEMO (`is_demo = true`), **solo en staging**. Necesitan perfiles DEMO creados con service role.
