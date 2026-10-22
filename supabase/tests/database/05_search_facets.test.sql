-- Reboard · tests: search_listings, count_listings y listing_facets (mismo predicado)
-- Semántica de referencia: matches() de src/lib/search/match.ts (contrato del repositorio).
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (id, instance_id, aud, role, email) values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.invalid'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tienda@test.invalid');
update public.profiles set seller_type = 'tienda' where id = '22222222-2222-2222-2222-222222222222';

-- Catálogo mínimo de prueba (solo dentro de esta transacción)
insert into public.brands (slug, name) values ('marca-test', 'Marca Test');
insert into public.board_models (brand_id, slug, name, shape, construction)
select id, 'modelo-test', 'Modelo Test', 'evolutiva', 'epoxy' from public.brands where slug = 'marca-test';

-- Anuncios de prueba (como postgres: el disparador fija las fechas)
insert into public.listings (seller_id, slug, status, brand_id, model_id, size_label, length_in, shape, construction, condition,
                             price_eur, zone_slug, town, volume_l, volume_source, repairs, accessories, fins)
select '11111111-1111-1111-1111-111111111111', 'gc-evo-47', 'published', b.id, m.id, '7''2"', 86, 'evolutiva', 'epoxy', 'buen-estado',
       190, 'gran-canaria', 'Telde', 47, 'seller', null, 'Funda', 'FCS II · Thruster'
from public.brands b join public.board_models m on m.brand_id = b.id where b.slug = 'marca-test';
insert into public.listings (seller_id, slug, status, size_label, length_in, shape, construction, condition,
                             price_eur, zone_slug, town, volume_l, volume_source, repairs, fins) values
  ('11111111-1111-1111-1111-111111111111', 'tf-fish-sinlitros', 'published', '5''10"', 70, 'fish', 'pu', 'con-reparaciones',
   260, 'tenerife', 'El Médano', null, null, 'Golpe reparado', 'Futures'),
  ('22222222-2222-2222-2222-222222222222', 'as-short-30', 'published', '6''0"', 72, 'shortboard', 'pu', 'como-nueva',
   320, 'asturias', 'Gijón', 30, 'seller', null, null),
  ('11111111-1111-1111-1111-111111111111', 'gc-borrador', 'draft', '7''0"', 84, 'evolutiva', 'pu', 'buen-estado',
   150, 'gran-canaria', 'Telde', 50, 'seller', null, null),
  ('11111111-1111-1111-1111-111111111111', 'gc-vendida', 'published', '7''0"', 84, 'evolutiva', 'pu', 'buen-estado',
   150, 'gran-canaria', 'Telde', 50, 'seller', null, null);
update public.listings set status = 'sold' where slug = 'gc-vendida';   -- se vende tras publicarse
update public.listings set published_at = now() - interval '3 days' where slug = 'as-short-30';
update public.listings set published_at = now() - interval '1 day'  where slug = 'tf-fish-sinlitros';

set local role anon;
set local request.jwt.claims to '{"role":"anon"}';

create function pg_temp.slugs(p jsonb, p_sort text default 'recientes') returns text[] language sql as $$
  select coalesce(array_agg(slug order by ordinality), '{}')
  from public.search_listings(p, p_sort, 24, 0, 'tenerife') with ordinality $$;

select is(pg_temp.slugs('{}'), array['gc-evo-47','tf-fish-sinlitros','as-short-30'], 'solo publicados, más recientes primero');
select is(public.count_listings('{}'), 3::bigint, 'count coincide');
select is(pg_temp.slugs('{"zones":["gran-canaria","tenerife"]}'), array['gc-evo-47','tf-fish-sinlitros'], 'región expandida a zonas');
select is(pg_temp.slugs('{"vol_min":40,"vol_max":60}'), array['gc-evo-47'], 'con litros: los sin litros no coinciden');
select is((select array_agg(slug order by ordinality) from public.search_listings('{"vol_min":40,"vol_max":60}', 'recientes', 24, 0, null, null,
             array['published']::public.listing_status[], true) with ordinality),
  array['tf-fish-sinlitros'], '«litros sin indicar»: mismos filtros, solo sin litros');
select is(pg_temp.slugs('{"brand":"marca-test"}'), array['gc-evo-47'], 'marca de catálogo');
select is(pg_temp.slugs('{"brand":"sin-marca"}'), array['tf-fish-sinlitros','as-short-30'], 'sin marca de catálogo');
select is(pg_temp.slugs('{"model":"modelo-test"}'), array['gc-evo-47'], 'modelo');
select is(pg_temp.slugs('{"sellers":["tienda"]}'), array['as-short-30'], 'tipo de vendedor');
select is(pg_temp.slugs('{"no_repairs":true,"accessories":true}'), array['gc-evo-47'], 'sin reparaciones y con accesorios');
select is(pg_temp.slugs('{"fins":"Futures"}'), array['tf-fish-sinlitros'], 'quillas');
select is(pg_temp.slugs('{"fit_lo":25,"fit_hi":35}'), array['as-short-30'], 'solo para mí');
select is(pg_temp.slugs('{"price_max":200,"len_min":80}'), array['gc-evo-47'], 'precio y longitud');
select is(pg_temp.slugs('{}', 'precio'), array['gc-evo-47','tf-fish-sinlitros','as-short-30'], 'orden por precio');
select is(pg_temp.slugs('{}', 'precio-desc'), array['as-short-30','tf-fish-sinlitros','gc-evo-47'], 'orden por precio desc');
select is(pg_temp.slugs('{}', 'distancia'), array['tf-fish-sinlitros','gc-evo-47','as-short-30'], '«Primero mi zona» (tenerife)');
select is((select array_agg(slug order by ordinality) from public.search_listings('{}', 'recientes', 24, 0, null, null,
             array['sold']::public.listing_status[]) with ordinality), array['gc-vendida'], 'búsqueda por estado (vendidas)');
select is((select count(*) from public.search_listings('{}', 'recientes', 24, 0, null, 'gran-canaria')), 2::bigint, 'excluir zona');

-- Facetas: cada dimensión ignora su propio filtro
select results_eq(
  $$ select dimension, key, n from public.listing_facets('{"zones":["gran-canaria"],"shapes":["evolutiva"]}') order by 1, 2 $$,
  $$ values ('any_zone', null::text, 1::bigint),
            ('brand', 'marca-test', 1::bigint),
            ('shape', 'evolutiva', 1::bigint),
            ('zone', 'gran-canaria', 1::bigint) $$,
  'facetas con zona y forma');
select results_eq(
  $$ select dimension, key, n from public.listing_facets('{}') where dimension in ('zone','brand') order by 1, 2 $$,
  $$ values ('brand', 'marca-test', 1::bigint), ('brand', 'sin-marca', 2::bigint),
            ('zone', 'asturias', 1::bigint), ('zone', 'gran-canaria', 1::bigint), ('zone', 'tenerife', 1::bigint) $$,
  'facetas sin filtros');

-- Retirados por moderación: fuera de búsquedas y recuentos; flagged sigue dentro
reset role;
update public.listings set moderation = 'removed' where slug = 'as-short-30';
update public.listings set moderation = 'flagged' where slug = 'gc-evo-47';
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select is(public.count_listings('{}'), 2::bigint, 'removed fuera; flagged sigue visible');

select * from finish();
rollback;
