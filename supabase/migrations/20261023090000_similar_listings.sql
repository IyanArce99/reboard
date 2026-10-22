-- Reboard · «Tablas similares» de la ficha (misma regla que mockRepository.similar):
-- activos, sin el propio, misma forma o volumen parecido (±8 L), primero la misma zona y más recientes.
create function public.similar_listings(p_public_id text, p_limit int default 4)
returns setof public.listings
language sql stable set search_path = '' as $$
  select l.*
  from public.listings l
  join public.listings b on b.public_id = p_public_id
  where l.status = 'published' and l.moderation <> 'removed' and l.id <> b.id
    and (l.shape = b.shape
         or (b.volume_l is not null and l.volume_l is not null and abs(l.volume_l - b.volume_l) <= 8))
  order by (l.zone_slug = b.zone_slug) desc, l.published_at desc nulls last, l.id asc
  limit least(greatest(p_limit, 0), 24);
$$;

grant execute on function public.similar_listings(text, int) to anon, authenticated;

-- Desempate estable de la búsqueda: id ascendente (orden de alta), igual que el mock.
create or replace function public.search_listings(
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
    l.id asc
  limit least(greatest(p_limit, 0), 2400) offset greatest(p_offset, 0);
$$;
