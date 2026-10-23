-- Lanzamiento solo en Canarias (migración 20261028090000): islas activas y publicar solo en ellas.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- ───────── Territorio ─────────
select set_eq(
  $$ select slug from public.zones where active $$,
  array['gran-canaria','tenerife','lanzarote','fuerteventura','la-palma','la-gomera','el-hierro','la-graciosa'],
  'zonas activas: las 8 islas'
);
select set_eq(
  $$ select slug from public.zones where not active $$,
  array['asturias','cantabria','galicia','pais-vasco','cadiz'],
  'la península se conserva, inactiva (no se borra nada)'
);
select ok((select bool_and(region_slug = 'canarias') from public.zones where active), 'todas las activas son de Canarias');
select is((select column_default from information_schema.columns
           where table_schema = 'public' and table_name = 'zones' and column_name = 'active'),
  'false', 'una zona nueva nace inactiva');

-- ───────── Publicar solo en zonas activas ─────────
insert into auth.users (id, instance_id, aud, role, email) values
  ('91111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'canarias@test.invalid');

set local role authenticated;
set local request.jwt.claims to '{"sub":"91111111-1111-1111-1111-111111111111","role":"authenticated"}';

select lives_ok($$
  insert into public.listings (slug, size_label, length_in, shape, construction, condition, price_eur, zone_slug, town)
  values ('t-la-palma', '7''2"', 86, 'evolutiva', 'pu', 'buen-estado', 200, 'la-palma', 'Los Llanos de Aridane')
$$, 'un usuario crea un anuncio en una isla (también en las nuevas)');
select throws_ok($$
  insert into public.listings (slug, size_label, length_in, shape, construction, condition, price_eur, zone_slug, town)
  values ('t-cadiz', '7''2"', 86, 'evolutiva', 'pu', 'buen-estado', 200, 'cadiz', 'Tarifa')
$$, 'P0001', 'zone_not_active', 'nadie publica fuera de Canarias, ni por la API');
select throws_ok($$ update public.listings set zone_slug = 'asturias' where slug = 't-la-palma' $$,
  'P0001', 'zone_not_active', 'ni mueve un anuncio fuera de Canarias');
select lives_ok($$ update public.listings set zone_slug = 'el-hierro', town = 'Valverde' where slug = 't-la-palma' $$,
  'cambiar de isla, sí');
select lives_ok($$ update public.listings set price_eur = 180 where slug = 't-la-palma' $$,
  'editar sin cambiar de zona, sí');

-- El servidor (importaciones, migraciones) no tiene esta restricción.
reset role;
select lives_ok($$
  insert into public.listings (seller_id, slug, status, size_label, length_in, shape, construction, condition, price_eur, zone_slug, town)
  values ('91111111-1111-1111-1111-111111111111', 't-srv-cadiz', 'draft', '7''2"', 86, 'evolutiva', 'pu', 'buen-estado', 200, 'cadiz', 'Tarifa')
$$, 'el servidor sí puede (no lo hace la app)');

select * from finish();
rollback;
