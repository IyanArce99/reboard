-- Reboard · esquema inicial (docs/DATABASE.md)
-- Catálogo (brands, board_models, board_model_sizes) SEPARADO de los anuncios (listings).
-- Los enums usan los mismos slugs que src/lib/domain/taxonomy.ts.
-- Sin datos de demostración: los anuncios y tiendas ficticios solo existen en src/mocks (desarrollo local).

-- ───────────── Tipos ─────────────
create type public.board_shape        as enum ('shortboard','fish','hibrida','evolutiva','midlength','longboard','gun');
create type public.board_construction as enum ('pu','epoxy','softboard');
create type public.board_condition    as enum ('como-nueva','muy-buen-estado','buen-estado','con-reparaciones');
create type public.seller_type        as enum ('particular','tienda','escuela');
create type public.data_source        as enum ('seller','manufacturer');
create type public.contact_method     as enum ('whatsapp','phone');
create type public.listing_status     as enum ('draft','published','sold','expired','withdrawn');
create type public.moderation_state   as enum ('visible','flagged','removed');
create type public.user_role          as enum ('user','moderator','admin');
create type public.report_reason      as enum ('fraude','datos-falsos','vendida','duplicado','inapropiado','otro');
create type public.report_status      as enum ('open','resolved','dismissed');

-- ───────────── Zonas: provincias o islas (datos de referencia en otra migración) ─────────────
create table public.zones (
  slug        text primary key check (slug ~ '^[a-z0-9-]{2,40}$'),
  name        text not null,
  region_slug text check (region_slug ~ '^[a-z0-9-]{2,40}$'),   -- 'canarias' para las 4 islas
  sort_order  smallint not null default 0
);

-- ───────────── Perfiles ─────────────
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Surfista' check (char_length(display_name) between 2 and 40),
  seller_type  public.seller_type not null default 'particular',   -- tienda/escuela: solo un admin
  role         public.user_role   not null default 'user',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ───────────── Catálogo ─────────────
create table public.brands (
  id          bigint generated always as identity primary key,
  slug        text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name        text not null check (char_length(name) between 1 and 60),
  intro       text,
  logo_path   text,                          -- solo con autorización de la marca
  created_at  timestamptz not null default now()
);

create table public.board_models (
  id           bigint generated always as identity primary key,
  brand_id     bigint not null references public.brands(id) on delete restrict,
  slug         text not null check (slug ~ '^[a-z0-9-]{1,60}$'),
  name         text not null check (char_length(name) between 1 and 60),
  shape        public.board_shape not null,
  construction public.board_construction not null,
  description  text,
  source_note  text,                         -- de dónde salen las medidas (tabla del fabricante, fecha)
  created_at   timestamptz not null default now(),
  unique (brand_id, slug),
  unique (slug)                              -- las URLs y el filtro `modelo` usan el slug sin la marca
);

create table public.board_model_sizes (
  id            bigint generated always as identity primary key,
  model_id      bigint not null references public.board_models(id) on delete cascade,
  label         text not null check (char_length(label) <= 20),   -- 7'2"
  length_in     numeric(5,2) not null check (length_in between 48 and 144),
  width_in      numeric(5,3) not null check (width_in between 14 and 30),
  thickness_in  numeric(5,3) not null check (thickness_in between 1.5 and 5),
  volume_l      numeric(5,1) check (volume_l between 10 and 150),  -- NULL si el fabricante no lo publica
  sort_order    smallint not null default 0,
  unique (model_id, label)
);

-- ───────────── Anuncios ─────────────
-- Los ids empiezan en 100000: el id público «a100000» no choca con los ids DEMO (a1040…).
create sequence public.listing_id_seq start with 100000;

create table public.listings (
  id            bigint primary key default nextval('public.listing_id_seq'),
  public_id     text generated always as ('a' || id::text) stored unique,
  slug          text not null check (slug ~ '^[a-z0-9-]{3,120}$'),
  seller_id     uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  status        public.listing_status   not null default 'draft',
  moderation    public.moderation_state not null default 'visible',

  -- Catálogo (opcional) o texto libre («Shaper local», marca no catalogada, «Otro modelo»)
  brand_id      bigint references public.brands(id) on delete set null,
  model_id      bigint references public.board_models(id) on delete set null,
  model_size_id bigint references public.board_model_sizes(id) on delete set null,
  brand_text    text check (char_length(brand_text) between 1 and 60),
  model_text    text check (char_length(model_text) between 1 and 60),

  -- Medidas con su origen (nunca se inventan: sin valor, sin origen)
  size_label          text not null check (char_length(size_label) between 1 and 20),
  length_in           numeric(5,2) not null check (length_in between 48 and 144),
  length_source       public.data_source not null default 'seller',
  width_in            numeric(5,3) check (width_in between 14 and 30),
  width_source        public.data_source,
  thickness_in        numeric(5,3) check (thickness_in between 1.5 and 5),
  thickness_source    public.data_source,
  volume_l            numeric(5,1) check (volume_l between 10 and 150),
  volume_source       public.data_source,
  shape               public.board_shape not null,
  shape_source        public.data_source not null default 'seller',
  construction        public.board_construction not null,
  construction_source public.data_source not null default 'seller',
  fins                text check (char_length(fins) <= 60),
  accessories         text check (char_length(accessories) <= 120),

  condition          public.board_condition not null,
  repairs            text check (char_length(repairs) <= 600),
  description        text check (char_length(description) <= 2000),
  price_eur          integer not null check (price_eur between 1 and 20000),
  previous_price_eur integer check (previous_price_eur between 1 and 20000),

  -- Ubicación: provincia o isla + municipio, sin coordenadas (decisión aprobada)
  zone_slug      text not null references public.zones(slug),
  town           text not null check (char_length(town) between 2 and 80),
  contact_method public.contact_method not null default 'whatsapp',

  published_at  timestamptz,
  confirmed_at  timestamptz,
  sold_at       timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint width_src     check ((width_in     is null) = (width_source     is null)),
  constraint thickness_src check ((thickness_in is null) = (thickness_source is null)),
  constraint volume_src    check ((volume_l     is null) = (volume_source    is null)),
  -- 'manufacturer' solo si el anuncio está vinculado a una medida del catálogo
  constraint manufacturer_needs_catalog check (
    model_size_id is not null or 'manufacturer' <> all (array[
      length_source::text, coalesce(width_source::text, ''), coalesce(thickness_source::text, ''),
      coalesce(volume_source::text, ''), construction_source::text])),
  -- Un modelo de catálogo implica su marca
  constraint model_needs_brand check (model_id is null or brand_id is not null),
  constraint published_has_dates check (
    status in ('draft','withdrawn') or (published_at is not null and confirmed_at is not null))
);

create table public.listing_photos (
  id           uuid primary key default gen_random_uuid(),
  listing_id   bigint not null references public.listings(id) on delete cascade,
  storage_path text not null unique,         -- {user_id}/{listing_id}/{uuid}.webp
  position     smallint not null check (position between 0 and 7),
  label        text check (char_length(label) <= 40),
  width        integer check (width between 1 and 8000),
  height       integer check (height between 1 and 8000),
  created_at   timestamptz not null default now(),
  unique (listing_id, position)
);

-- Datos de contacto: PRIVADOS. Sin acceso anon; solo el dueño y reveal_contact().
create table public.listing_contacts (
  listing_id  bigint primary key references public.listings(id) on delete cascade,
  phone_e164  text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  updated_at  timestamptz not null default now()
);

create table public.favorites (
  user_id    uuid   not null default auth.uid() references public.profiles(id) on delete cascade,
  listing_id bigint not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- Registro de contactos: estadística del panel y límite anti-scraping. Nunca la IP en claro.
create table public.contact_events (
  id          bigint generated always as identity primary key,
  listing_id  bigint not null references public.listings(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete set null,
  ip_hash     text check (char_length(ip_hash) <= 128),
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
  resolved_by uuid references public.profiles(id) on delete set null,
  unique (listing_id, reporter_id)            -- un reporte por persona y anuncio
);

create table public.moderation_actions (
  id           bigint generated always as identity primary key,
  listing_id   bigint not null references public.listings(id) on delete cascade,
  moderator_id uuid not null references public.profiles(id),
  action       text not null check (action in ('flag','remove','restore','dismiss_reports')),
  reason       text check (char_length(reason) <= 1000),
  created_at   timestamptz not null default now()
);

-- Directorio de tiendas y escuelas. Vacío hasta que haya tiendas reales.
create table public.shops (
  id               bigint generated always as identity primary key,
  slug             text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name             text not null check (char_length(name) between 2 and 80),
  type             public.seller_type not null check (type in ('tienda','escuela')),
  zone_slug        text not null references public.zones(slug),
  town             text not null,
  address          text,
  hours            text,
  inventory_source text,
  profile_id       uuid unique references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now()
);

-- ───────────── Índices ─────────────
-- Búsqueda: índices parciales sobre anuncios publicados y visibles
create index listings_search_zone_price on public.listings (zone_slug, price_eur)
  where status = 'published' and moderation <> 'removed';
create index listings_search_volume on public.listings (volume_l)
  where status = 'published' and moderation <> 'removed';
create index listings_search_length on public.listings (length_in)
  where status = 'published' and moderation <> 'removed';
create index listings_search_shape on public.listings (shape, construction)
  where status = 'published' and moderation <> 'removed';
create index listings_search_recent on public.listings (published_at desc)
  where status = 'published' and moderation <> 'removed';
create index listings_brand    on public.listings (brand_id);
create index listings_model    on public.listings (model_id, model_size_id);
create index listings_size     on public.listings (model_size_id);
create index listings_seller   on public.listings (seller_id, status);
create index listings_expiry   on public.listings (confirmed_at) where status = 'published';
create index photos_listing    on public.listing_photos (listing_id, position);
create index favorites_listing on public.favorites (listing_id);
create index contact_events_listing on public.contact_events (listing_id, created_at desc);
create index contact_events_ip      on public.contact_events (ip_hash, created_at desc);
create index contact_events_user    on public.contact_events (user_id);
create index reports_open      on public.reports (status, created_at) where status = 'open';
create index reports_listing   on public.reports (listing_id);
create index reports_reporter  on public.reports (reporter_id);
create index reports_resolver  on public.reports (resolved_by);
create index modactions_listing on public.moderation_actions (listing_id);
create index modactions_moderator on public.moderation_actions (moderator_id);
create index models_brand      on public.board_models (brand_id);
create index shops_zone        on public.shops (zone_slug);
create index zones_region      on public.zones (region_slug);
