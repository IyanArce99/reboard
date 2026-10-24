-- Reboard · «Reservada» y número de guardados (mejoras de producto, 24-10-2026).
--
-- 1. Reservada: una marca del vendedor sobre un anuncio PUBLICADO (no es un estado nuevo: sigue en las
--    búsquedas, se puede contactar y caduca igual). Se quita sola al vender, retirar o caducar.
-- 2. Guardados: cuántas cuentas tienen guardado un anuncio. Solo el número, nunca quién.
--    (Las tablas guardadas sin cuenta se quedan en el dispositivo y no cuentan.)

-- ───────────── 1. Reservada ─────────────
alter table public.listings add column reserved_at timestamptz;
alter table public.listings add constraint listings_reserved_only_published
  check (reserved_at is null or status = 'published');
grant update (reserved_at) on public.listings to authenticated;

-- Al salir de «publicado» (vendida, retirada, caducada, borrador), la reserva deja de tener sentido.
create function public.listings_clear_reserved() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status <> 'published' then
    new.reserved_at := null;
  end if;
  return new;
end $$;
create trigger t_listings_clear_reserved before update of status on public.listings
  for each row execute function public.listings_clear_reserved();

-- ───────────── 2. Guardados ─────────────
-- Público (ficha): solo de anuncios visibles.
create function public.listing_save_count(p_public_id text) returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int
  from public.favorites f
  join public.listings l on l.id = f.listing_id
  where l.public_id = p_public_id
    and l.status in ('published', 'sold', 'expired')
    and l.moderation <> 'removed';
$$;
revoke execute on function public.listing_save_count(text) from public;
grant execute on function public.listing_save_count(text) to anon, authenticated;

-- Panel del vendedor: guardados de cada uno de SUS anuncios.
create function public.my_listing_save_counts() returns table (public_id text, n int)
language sql stable security definer set search_path = '' as $$
  select l.public_id, count(f.user_id)::int
  from public.listings l
  join public.favorites f on f.listing_id = l.id
  where l.seller_id = (select auth.uid())
  group by l.public_id;
$$;
revoke execute on function public.my_listing_save_counts() from public, anon;
grant execute on function public.my_listing_save_counts() to authenticated;
