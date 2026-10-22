-- Reboard · rendimiento de la búsqueda (medido en tests/perf con 10.000 anuncios).
-- Antes: listing_matches() se invocaba UNA VEZ POR FILA, decodificando el JSON en cada una
-- (no se puede «inlinear» por su SET search_path). Con 10.000 anuncios: ~600 ms la búsqueda
-- y ~1,8 s las facetas.
-- Ahora: matching_listings() decodifica los parámetros una sola vez y filtra en una única
-- consulta (joins a brands/board_models en vez de subconsultas por fila). La semántica es la
-- misma: la verifican los tests pgTAP (05) y la paridad con el mock (tests/integration).

create function public.matching_listings(
  p jsonb,
  skip text default '',
  p_statuses public.listing_status[] default array['published']::public.listing_status[],
  p_unknown_volume boolean default false,
  p_exclude_zone text default null)
returns setof public.listings
language sql stable set search_path = '' as $$
  with x as (
    select
      array(select jsonb_array_elements_text(coalesce(p->'zones', '[]')))         as zones,
      array(select jsonb_array_elements_text(coalesce(p->'shapes', '[]')))        as shapes,
      array(select jsonb_array_elements_text(coalesce(p->'constructions', '[]'))) as constructions,
      array(select jsonb_array_elements_text(coalesce(p->'conditions', '[]')))    as conditions,
      array(select jsonb_array_elements_text(coalesce(p->'sellers', '[]')))       as sellers,
      (p->>'price_min')::numeric as price_min, (p->>'price_max')::numeric as price_max,
      (p->>'len_min')::numeric   as len_min,   (p->>'len_max')::numeric   as len_max,
      (p->>'vol_min')::numeric   as vol_min,   (p->>'vol_max')::numeric   as vol_max,
      (p->>'width_min')::numeric as width_min, (p->>'thick_min')::numeric as thick_min,
      (p->>'fit_lo')::numeric    as fit_lo,    (p->>'fit_hi')::numeric    as fit_hi,
      nullif(p->>'brand', '') as brand,
      nullif(p->>'model', '') as model,
      nullif(p->>'fins', '')  as fins,
      coalesce((p->>'no_repairs')::boolean, false)  as no_repairs,
      coalesce((p->>'accessories')::boolean, false) as accessories
  )
  select l.*
  from public.listings l
  cross join x
  left join public.brands b on b.id = l.brand_id
  left join public.board_models m on m.id = l.model_id
  where l.moderation <> 'removed'
    and l.status = any (p_statuses)
    and (p_exclude_zone is null or l.zone_slug <> p_exclude_zone)
    and (not p_unknown_volume or l.volume_l is null)
    and (skip = 'zone' or cardinality(x.zones) = 0 or l.zone_slug = any (x.zones))
    and (skip = 'shape' or cardinality(x.shapes) = 0 or l.shape::text = any (x.shapes))
    and (cardinality(x.constructions) = 0 or l.construction::text = any (x.constructions))
    and (x.price_min is null or l.price_eur >= x.price_min)
    and (x.price_max is null or l.price_eur <= x.price_max)
    and (x.len_min is null or l.length_in >= x.len_min)
    and (x.len_max is null or l.length_in <= x.len_max)
    and (skip = 'brand' or x.brand is null
         or (x.brand = 'sin-marca' and l.brand_id is null) or b.slug = x.brand)
    and (skip = 'brand' or x.model is null or m.slug = x.model)
    and (cardinality(x.conditions) = 0 or l.condition::text = any (x.conditions))
    and (cardinality(x.sellers) = 0 or l.seller_id in (
          select pr.id from public.profiles pr where pr.seller_type::text = any (x.sellers)))
    and (not x.no_repairs or coalesce(l.repairs, '') = '')
    and (not x.accessories or coalesce(l.accessories, '') <> '')
    and (x.fins is null or strpos(coalesce(l.fins, ''), x.fins) > 0)
    and (x.width_min is null or (l.width_in is not null and l.width_in >= x.width_min))
    and (x.thick_min is null or (l.thickness_in is not null and l.thickness_in >= x.thick_min))
    and (x.fit_lo is null or (l.volume_l is not null and l.volume_l between x.fit_lo and x.fit_hi))
    and (skip = 'volume' or p_unknown_volume or (x.vol_min is null and x.vol_max is null) or (
          l.volume_l is not null
          and (x.vol_min is null or l.volume_l >= x.vol_min)
          and (x.vol_max is null or l.volume_l <= x.vol_max)));
$$;

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
    case when p_sort = 'litros' then coalesce(l.volume_l, 0) end asc,
    l.published_at desc nulls last,
    l.id asc
  limit least(greatest(p_limit, 0), 2400) offset greatest(p_offset, 0);
$$;

create or replace function public.count_listings(
  p jsonb,
  p_exclude_zone text default null,
  p_statuses public.listing_status[] default array['published']::public.listing_status[],
  p_unknown_volume boolean default false)
returns bigint
language sql stable set search_path = '' as $$
  select count(*) from public.matching_listings(p, '', p_statuses, p_unknown_volume, p_exclude_zone);
$$;

create or replace function public.listing_facets(p jsonb)
returns table (dimension text, key text, n bigint)
language sql stable set search_path = '' as $$
  with by_zone as (select zone_slug from public.matching_listings(p, 'zone'))
  select 'any_zone', null::text, count(*) from by_zone
  union all
  select 'zone', zone_slug, count(*) from by_zone group by zone_slug
  union all
  select 'shape', l.shape::text, count(*) from public.matching_listings(p, 'shape') l group by l.shape
  union all
  select 'brand', coalesce(b.slug, 'sin-marca'), count(*)
  from public.matching_listings(p, 'brand') l left join public.brands b on b.id = l.brand_id
  group by coalesce(b.slug, 'sin-marca');
$$;

-- listing_matches deja de usarse: se elimina para que no haya dos versiones del predicado.
drop function public.listing_matches(public.listings, jsonb, text);

grant execute on function public.matching_listings(jsonb, text, public.listing_status[], boolean, text) to anon, authenticated;
