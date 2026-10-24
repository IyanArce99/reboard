-- Reboard · listing_facets en una sola pasada.
-- Antes (20261023090200): llamaba 3 veces a matching_listings() (skip zone / shape / brand).
-- Como matching_listings tiene SET search_path no se «inlinea»: cada llamada se planifica
-- y ejecuta por separado y materializa todas las filas de listings (l.*). Con la base fría y
-- muchas peticiones a la vez (prerender de `next build`) era la RPC que antes pasaba de los
-- 3 s de statement_timeout de anon ("SQL function matching_listings during startup").
-- Ahora: UNA llamada a matching_listings con los filtros de las tres dimensiones de faceta
-- quitados (zones, shapes, brand, model) y, por fila, tres banderas con esos predicados.
-- Cada faceta cuenta las filas que cumplen las otras dos banderas: misma semántica que
-- «todos los filtros salvo el de esta dimensión», y el resto del predicado sigue viviendo
-- solo en matching_listings. Firma, columnas y resultados idénticos (pgTAP 05).

create or replace function public.listing_facets(p jsonb)
returns table (dimension text, key text, n bigint)
language sql stable set search_path = '' as $$
  with x as (
    select
      array(select jsonb_array_elements_text(coalesce(p->'zones', '[]')))  as zones,
      array(select jsonb_array_elements_text(coalesce(p->'shapes', '[]'))) as shapes,
      nullif(p->>'brand', '') as brand,
      nullif(p->>'model', '') as model
  ),
  base as materialized (
    select
      l.zone_slug,
      l.shape::text as shape,
      coalesce(b.slug, 'sin-marca') as brand_key,
      -- Mismos predicados que matching_listings para las dimensiones que se omiten.
      (cardinality(x.zones) = 0 or l.zone_slug = any (x.zones)) as zone_ok,
      (cardinality(x.shapes) = 0 or l.shape::text = any (x.shapes)) as shape_ok,
      ((x.brand is null or (x.brand = 'sin-marca' and l.brand_id is null) or b.slug = x.brand)
        and (x.model is null or m.slug = x.model)) as brand_ok
    from public.matching_listings(p - 'zones' - 'shapes' - 'brand' - 'model', '') l
    cross join x
    left join public.brands b on b.id = l.brand_id
    left join public.board_models m on m.id = l.model_id
  )
  select 'any_zone', null::text, count(*) from base where shape_ok and brand_ok
  union all
  select d.dimension, d.key, count(*)
  from base
  cross join lateral (values
    ('zone',  base.zone_slug, base.shape_ok and base.brand_ok),
    ('shape', base.shape,     base.zone_ok  and base.brand_ok),
    ('brand', base.brand_key, base.zone_ok  and base.shape_ok)
  ) as d(dimension, key, ok)
  where d.ok
  group by d.dimension, d.key;
$$;
