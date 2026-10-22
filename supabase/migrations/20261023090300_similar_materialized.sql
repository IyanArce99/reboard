-- Reboard · similar_listings robusto ante estadísticas desactualizadas (p. ej. tras una carga masiva):
-- el anuncio de referencia se lee una sola vez (CTE materializada) en vez de unirlo fila a fila.
create or replace function public.similar_listings(p_public_id text, p_limit int default 4)
returns setof public.listings
language sql stable set search_path = '' as $$
  with b as materialized (
    select id, shape, volume_l, zone_slug from public.listings where public_id = p_public_id
  )
  select l.*
  from b, public.listings l
  where l.status = 'published' and l.moderation <> 'removed' and l.id <> b.id
    and (l.shape = b.shape
         or (b.volume_l is not null and l.volume_l is not null and abs(l.volume_l - b.volume_l) <= 8))
  order by (l.zone_slug = b.zone_slug) desc, l.published_at desc nulls last, l.id asc
  limit least(greatest(p_limit, 0), 24);
$$;
