-- Reboard · funciones y disparadores (docs/DATABASE.md, docs/SECURITY.md)

-- ───────────── updated_at ─────────────
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger t_listings_touch before update on public.listings
  for each row execute function public.touch_updated_at();
create trigger t_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger t_contacts_touch before update on public.listing_contacts
  for each row execute function public.touch_updated_at();

-- ───────────── Perfil automático al registrarse ─────────────
-- No deriva el nombre del email para no exponerlo: el vendedor elige su nombre al publicar.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────── Rol de moderación ─────────────
create function public.is_moderator() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role in ('moderator','admin'));
$$;

-- ───────────── Reglas de estado de los anuncios ─────────────
-- Las fechas de estado las fija la base de datos, nunca el cliente. Las reglas del dueño solo
-- aplican cuando escribe un usuario (`authenticated`); el servidor (service role) y las funciones
-- security definer del sistema (caducidad, marca por reportes) no están limitadas.
create function public.listings_guard() returns trigger
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
    new.confirmed_at := now();
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

create trigger t_listings_guard before insert or update on public.listings
  for each row execute function public.listings_guard();

-- ───────────── Máximo 8 fotos por anuncio ─────────────
create function public.photos_limit() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.listing_photos where listing_id = new.listing_id) >= 8 then
    raise exception 'max 8 photos per listing' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger t_photos_limit before insert on public.listing_photos
  for each row execute function public.photos_limit();

-- ───────────── Reportes: 3 abiertos → el anuncio pasa a revisión (flagged) ─────────────
create function public.reports_autoflag() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.reports where listing_id = new.listing_id and status = 'open') >= 3 then
    update public.listings set moderation = 'flagged'
    where id = new.listing_id and moderation = 'visible';
  end if;
  return new;
end $$;

create trigger t_reports_autoflag after insert on public.reports
  for each row execute function public.reports_autoflag();

-- ───────────── Caducidad (la ejecuta el cron con service role) ─────────────
-- Publicada sin confirmar 30 días → expired. «Pendiente de confirmar» (> 14 días) se calcula al leer.
create function public.expire_listings() returns integer
language sql security definer set search_path = '' as $$
  with e as (
    update public.listings set status = 'expired'
    where status = 'published' and confirmed_at < now() - interval '30 days'
    returning 1)
  select count(*)::int from e;
$$;

-- ───────────── Revelar el contacto (solo servidor, con service role) ─────────────
-- El servidor valida antes el CAPTCHA y pasa el HMAC de la IP. Límite: 30 por hora y por IP.
create function public.reveal_contact(p_public_id text, p_user uuid, p_ip_hash text)
returns table (method public.contact_method, phone_e164 text)
language plpgsql security definer set search_path = '' as $$
declare
  l public.listings;
begin
  select * into l from public.listings
  where public_id = p_public_id and status = 'published' and moderation <> 'removed';
  if not found then
    return;
  end if;
  if p_ip_hash is null or char_length(p_ip_hash) < 16 then
    raise exception 'ip_hash required' using errcode = 'P0001';
  end if;
  if (select count(*) from public.contact_events
      where ip_hash = p_ip_hash and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into public.contact_events (listing_id, user_id, ip_hash, method)
  values (l.id, p_user, p_ip_hash, l.contact_method);
  return query
    select l.contact_method, c.phone_e164 from public.listing_contacts c where c.listing_id = l.id;
end $$;

-- ───────────── Búsqueda: un único predicado para búsqueda, recuentos y facetas ─────────────
-- `p` es la traducción de `Filters` (src/lib/search/filters.ts):
--   zones text[] (la región ya expandida a sus zonas), vol_min, vol_max, len_min, len_max,
--   shapes text[], constructions text[], price_min, price_max, brand ('' | slug | 'sin-marca'),
--   model (slug), conditions text[], sellers text[], no_repairs bool, accessories bool,
--   fins (texto: 'FCS II'…), width_min, thick_min, fit_lo, fit_hi.
-- La distancia no existe: la ubicación es provincia o isla + municipio, sin coordenadas.
-- `skip` ignora una dimensión: 'zone' | 'shape' | 'brand' (marca y modelo) | 'volume'.
create function public.listing_matches(l public.listings, p jsonb, skip text default '')
returns boolean
language sql stable set search_path = '' as $$
  select
        (skip = 'zone' or jsonb_array_length(coalesce(p->'zones', '[]')) = 0
          or l.zone_slug in (select jsonb_array_elements_text(p->'zones')))
    and (skip = 'shape' or jsonb_array_length(coalesce(p->'shapes', '[]')) = 0
          or l.shape::text in (select jsonb_array_elements_text(p->'shapes')))
    and (jsonb_array_length(coalesce(p->'constructions', '[]')) = 0
          or l.construction::text in (select jsonb_array_elements_text(p->'constructions')))
    and (p->>'price_min' is null or l.price_eur >= (p->>'price_min')::numeric)
    and (p->>'price_max' is null or l.price_eur <= (p->>'price_max')::numeric)
    and (p->>'len_min' is null or l.length_in >= (p->>'len_min')::numeric)
    and (p->>'len_max' is null or l.length_in <= (p->>'len_max')::numeric)
    and (skip = 'brand' or coalesce(p->>'brand', '') = ''
          or (p->>'brand' = 'sin-marca' and l.brand_id is null)
          or exists (select 1 from public.brands b where b.id = l.brand_id and b.slug = p->>'brand'))
    and (skip = 'brand' or coalesce(p->>'model', '') = ''
          or exists (select 1 from public.board_models m where m.id = l.model_id and m.slug = p->>'model'))
    and (jsonb_array_length(coalesce(p->'conditions', '[]')) = 0
          or l.condition::text in (select jsonb_array_elements_text(p->'conditions')))
    and (jsonb_array_length(coalesce(p->'sellers', '[]')) = 0
          or exists (select 1 from public.profiles pr where pr.id = l.seller_id
                     and pr.seller_type::text in (select jsonb_array_elements_text(p->'sellers'))))
    and (coalesce((p->>'no_repairs')::boolean, false) = false or coalesce(l.repairs, '') = '')
    and (coalesce((p->>'accessories')::boolean, false) = false or coalesce(l.accessories, '') <> '')
    and (coalesce(p->>'fins', '') = '' or strpos(coalesce(l.fins, ''), p->>'fins') > 0)
    and (p->>'width_min' is null or (l.width_in is not null and l.width_in >= (p->>'width_min')::numeric))
    and (p->>'thick_min' is null or (l.thickness_in is not null and l.thickness_in >= (p->>'thick_min')::numeric))
    and (p->>'fit_lo' is null or (l.volume_l is not null
          and l.volume_l between (p->>'fit_lo')::numeric and (p->>'fit_hi')::numeric))
    and (skip = 'volume' or (p->>'vol_min' is null and p->>'vol_max' is null) or (
          l.volume_l is not null
          and (p->>'vol_min' is null or l.volume_l >= (p->>'vol_min')::numeric)
          and (p->>'vol_max' is null or l.volume_l <= (p->>'vol_max')::numeric)));
$$;

-- Búsqueda paginada. Solo anuncios visibles; por defecto, publicados.
-- p_sort: recientes | precio | precio-desc | litros | distancia («Primero mi zona», sin km).
-- p_unknown_volume: «litros sin indicar» (mismos filtros salvo los litros, solo sin litros).
create function public.search_listings(
  p jsonb,
  p_sort text default 'recientes',
  p_limit int default 24,
  p_offset int default 0,
  p_here text default null,
  p_exclude_zone text default null,
  p_statuses public.listing_status[] default array['published']::public.listing_status[],
  p_unknown_volume boolean default false)
returns setof public.listings
language sql stable set search_path = '' as $$
  select l.* from public.listings l
  where l.moderation <> 'removed'
    and l.status = any (p_statuses)
    and (p_exclude_zone is null or l.zone_slug <> p_exclude_zone)
    and (not p_unknown_volume or l.volume_l is null)
    and public.listing_matches(l, p, case when p_unknown_volume then 'volume' else '' end)
  order by
    case when p_sort = 'distancia' then (l.zone_slug is distinct from p_here) end,
    case when p_sort = 'precio' then l.price_eur end asc,
    case when p_sort = 'precio-desc' then l.price_eur end desc,
    case when p_sort = 'litros' then coalesce(l.volume_l, 0) end asc,
    l.published_at desc nulls last,
    l.id desc
  limit least(greatest(p_limit, 0), 2400) offset greatest(p_offset, 0);
$$;

create function public.count_listings(
  p jsonb,
  p_exclude_zone text default null,
  p_statuses public.listing_status[] default array['published']::public.listing_status[],
  p_unknown_volume boolean default false)
returns bigint
language sql stable set search_path = '' as $$
  select count(*) from public.listings l
  where l.moderation <> 'removed'
    and l.status = any (p_statuses)
    and (p_exclude_zone is null or l.zone_slug <> p_exclude_zone)
    and (not p_unknown_volume or l.volume_l is null)
    and public.listing_matches(l, p, case when p_unknown_volume then 'volume' else '' end);
$$;

-- Recuentos de facetas: cada dimensión ignora su propio filtro (contrato Facets del repositorio).
-- Las regiones (canarias) se suman en la app a partir de sus zonas.
create function public.listing_facets(p jsonb)
returns table (dimension text, key text, n bigint)
language sql stable set search_path = '' as $$
  select 'any_zone', null::text, count(*)
  from public.listings l
  where l.status = 'published' and l.moderation <> 'removed' and public.listing_matches(l, p, 'zone')
  union all
  select 'zone', l.zone_slug, count(*)
  from public.listings l
  where l.status = 'published' and l.moderation <> 'removed' and public.listing_matches(l, p, 'zone')
  group by l.zone_slug
  union all
  select 'shape', l.shape::text, count(*)
  from public.listings l
  where l.status = 'published' and l.moderation <> 'removed' and public.listing_matches(l, p, 'shape')
  group by l.shape
  union all
  select 'brand', coalesce(b.slug, 'sin-marca'), count(*)
  from public.listings l left join public.brands b on b.id = l.brand_id
  where l.status = 'published' and l.moderation <> 'removed' and public.listing_matches(l, p, 'brand')
  group by coalesce(b.slug, 'sin-marca');
$$;
