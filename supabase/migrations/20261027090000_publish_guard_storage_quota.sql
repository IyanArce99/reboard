-- Reboard · cierre de abusos al publicar (docs/LAUNCH_READINESS_AUDIT.md, S2 y S3).
--
-- Antes, un usuario con sesión podía crear anuncios ya publicados directamente por la API REST
-- (sin fotos, sin teléfono, sin Turnstile y sin límite) y subir archivos sin cuota a Storage.
-- Las reglas viven en la base de datos: valen igual para la web que para la API.
--
-- 1. Un usuario solo crea BORRADORES. Publicar es pasar de borrador a publicado (lo hace la web
--    al terminar de subir las fotos) y exige al menos una foto y el teléfono de contacto.
-- 2. Máximo 15 anuncios nuevos por usuario y 24 h.
-- 3. Storage: máximo 16 archivos por anuncio (8 fotos + margen al sustituirlas al editar) y
--    120 subidas por usuario y 24 h. Un usuario suspendido no puede modificar sus fotos.
-- El servidor (service role) y las funciones del panel de administración no tienen estos límites.

-- ───────────── 1. Solo borradores al crear ─────────────
drop policy listings_insert_own on public.listings;
create policy listings_insert_own on public.listings for insert to authenticated
  with check ((select auth.uid()) = seller_id and status = 'draft' and not public.is_suspended());

-- ───────────── 1 y 2. Requisitos para publicar y límite diario ─────────────
create function public.listings_publish_guard() returns trigger
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
    if not exists (select 1 from public.listing_contacts where listing_id = new.id) then
      raise exception 'listing_needs_contact' using errcode = 'P0001',
        hint = 'Un anuncio publicado necesita un teléfono de contacto.';
    end if;
  end if;
  return new;
end $$;

create trigger t_listings_publish_guard before insert or update on public.listings
  for each row execute function public.listings_publish_guard();

-- ───────────── 3. Cuota de Storage ─────────────
-- security definer: cuenta los objetos sin depender de las políticas de lectura de storage.objects.
create function public.listing_photo_quota_ok(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select
    (select count(*) from storage.objects o
      where o.bucket_id = 'listing-photos'
        and (storage.foldername(o.name))[1] = (storage.foldername(p_name))[1]
        and (storage.foldername(o.name))[2] = (storage.foldername(p_name))[2]) < 16
    and
    (select count(*) from storage.objects o
      where o.bucket_id = 'listing-photos'
        and (storage.foldername(o.name))[1] = (storage.foldername(p_name))[1]
        and o.created_at > now() - interval '24 hours') < 120
$$;
revoke execute on function public.listing_photo_quota_ok(text) from public, anon;
grant execute on function public.listing_photo_quota_ok(text) to authenticated;

drop policy listing_photos_owner_insert on storage.objects;
create policy listing_photos_owner_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (storage.foldername(name))[2] ~ '^[0-9]+$'
    and not public.is_suspended()
    and exists (
      select 1 from public.listings l
      where l.id = ((storage.foldername(name))[2])::bigint and l.seller_id = (select auth.uid()))
    and public.listing_photo_quota_ok(name));

-- Sustituir una foto: misma carpeta que al subir y sin suspensión.
drop policy listing_photos_owner_update on storage.objects;
create policy listing_photos_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
         and not public.is_suspended())
  with check (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (storage.foldername(name))[2] ~ '^[0-9]+$'
    and not public.is_suspended()
    and exists (
      select 1 from public.listings l
      where l.id = ((storage.foldername(name))[2])::bigint and l.seller_id = (select auth.uid())));
