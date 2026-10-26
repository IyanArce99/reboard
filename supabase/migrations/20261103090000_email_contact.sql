-- Contacto privado por email entre compradores y vendedores.
--
-- 1. listings.contact_channels: cómo acepta contactos el vendedor. Es un dato PÚBLICO (la ficha
--    necesita saber qué botones enseñar), nunca el email:
--    - 'phone': teléfono (WhatsApp o llamada, según contact_method) — lo que había hasta ahora;
--    - 'email': solo mensajes por email a través de Reboard;
--    - 'both': las dos cosas.
--    Los anuncios existentes quedan en 'phone' (compatibles, sin cambios).
-- 2. El email del vendedor NO se guarda en ninguna tabla nueva: es el de su cuenta (verificado al
--    entrar con el código) y solo lo lee el servidor (service role) en el momento de enviar.
-- 3. El control de publicación exige teléfono solo si el anuncio lo usa.
-- 4. email_contact_events: registro mínimo de cada intento (anuncio, código derivado de la IP,
--    resultado y fecha) para limitar abusos. Sin nombre, email ni texto del mensaje. Nadie lo lee
--    desde el navegador. Se borra a los 12 meses (dailyMaintenance).

alter table public.listings
  add column contact_channels text not null default 'phone'
  constraint listings_contact_channels_valid check (contact_channels in ('phone', 'email', 'both'));

grant insert (contact_channels) on public.listings to authenticated;
grant update (contact_channels) on public.listings to authenticated;

create or replace function public.listings_publish_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if (select count(*) from public.listings
        where seller_id = new.seller_id and created_at > now() - interval '24 hours') >= 15 then
      raise exception 'listing_daily_limit' using errcode = 'P0001',
        hint = 'Máximo 15 anuncios nuevos al día.';
    end if;
    return new;
  end if;

  if new.status = 'published' and old.status is distinct from 'published' then
    if not exists (select 1 from public.listing_photos where listing_id = new.id) then
      raise exception 'listing_needs_photos' using errcode = 'P0001',
        hint = 'Un anuncio publicado necesita al menos una foto.';
    end if;
    -- El teléfono solo es obligatorio si el anuncio se contacta por teléfono.
    if new.contact_channels <> 'email'
       and not exists (select 1 from public.listing_contacts where listing_id = new.id) then
      raise exception 'listing_needs_contact' using errcode = 'P0001',
        hint = 'Un anuncio publicado necesita un teléfono de contacto.';
    end if;
  end if;
  return new;
end $$;

create table public.email_contact_events (
  id          bigint generated always as identity primary key,
  listing_id  bigint not null references public.listings(id) on delete cascade,
  ip_hash     text not null check (char_length(ip_hash) <= 128),
  status      text not null check (status in ('sent', 'failed')),
  created_at  timestamptz not null default now()
);
create index email_contact_events_ip      on public.email_contact_events (ip_hash, created_at desc);
create index email_contact_events_listing on public.email_contact_events (listing_id, created_at desc);

alter table public.email_contact_events enable row level security;
revoke all on public.email_contact_events from anon, authenticated;
