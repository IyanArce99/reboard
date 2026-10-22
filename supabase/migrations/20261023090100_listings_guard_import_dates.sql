-- Reboard · reglas de estado: el servidor conserva las fechas que aporta (importaciones).
-- Antes, publicar fijaba siempre confirmed_at = now(), también al importar con service role.
-- Los usuarios (authenticated) siguen sin poder fijar fechas: confirmar = ahora.
create or replace function public.listings_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and current_user = 'authenticated' and not public.is_moderator() then
    if old.moderation = 'removed' then
      raise exception 'listing % removed by moderation', old.public_id using errcode = 'P0001';
    end if;
    if new.status is distinct from old.status and not (
         (old.status = 'draft'     and new.status in ('published','withdrawn')) or
         (old.status = 'published' and new.status in ('sold','withdrawn')) or
         (old.status in ('sold','expired','withdrawn') and new.status = 'published')) then
      raise exception 'invalid status transition % -> %', old.status, new.status using errcode = 'P0001';
    end if;
  end if;

  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.published_at := coalesce(new.published_at, now());
    -- Un usuario siempre confirma «ahora». El servidor (importaciones, migraciones) conserva sus fechas.
    new.confirmed_at := case when current_user = 'authenticated' or new.confirmed_at is null
                             then now() else new.confirmed_at end;
    new.sold_at := null;
  elsif tg_op = 'UPDATE' and current_user = 'authenticated' and new.confirmed_at is distinct from old.confirmed_at then
    new.confirmed_at := now();                    -- «Sigue disponible»: un usuario solo puede confirmar «ahora»
  end if;

  if new.status = 'sold' and (tg_op = 'INSERT' or old.status is distinct from 'sold') then
    new.sold_at := now();
  end if;

  if tg_op = 'UPDATE' and new.price_eur < old.price_eur then
    new.previous_price_eur := old.price_eur;      -- «Ha bajado de X a Y»
  end if;
  return new;
end $$;
