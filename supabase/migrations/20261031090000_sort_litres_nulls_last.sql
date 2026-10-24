-- «Menos litros» y «Más litros» (nuevo): las tablas sin litros indicados van al final, no al principio
-- (antes contaban como 0 L y encabezaban la lista). Mismo cuerpo que en
-- 20261023090200_search_performance.sql salvo esa línea; create or replace conserva los permisos.
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
  select l.* from public.matching_listings(p, '', p_statuses, p_unknown_volume, p_exclude_zone) l
  order by
    case when p_sort = 'distancia' then (l.zone_slug is distinct from p_here) end,
    case when p_sort = 'precio' then l.price_eur end asc,
    case when p_sort = 'precio-desc' then l.price_eur end desc,
    case when p_sort = 'litros' then l.volume_l end asc nulls last,
    case when p_sort = 'litros-desc' then l.volume_l end desc nulls last,
    l.published_at desc nulls last,
    l.id asc
  limit least(greatest(p_limit, 0), 2400) offset greatest(p_offset, 0);
$$;
