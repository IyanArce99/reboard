-- Reboard · tests: fechas al importar (servidor) frente a usuarios, y similar_listings
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (id, instance_id, aud, role, email) values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.invalid');

-- El servidor (postgres/service role) puede importar con sus fechas
insert into public.listings (seller_id, slug, status, size_label, length_in, shape, construction, condition, price_eur,
                             zone_slug, town, published_at, confirmed_at, volume_l, volume_source)
values ('11111111-1111-1111-1111-111111111111', 'imp-gc-evo', 'published', '7''2"', 86, 'evolutiva', 'epoxy', 'buen-estado', 190,
        'gran-canaria', 'Telde', '2026-01-01', '2026-01-10', 47, 'seller');
select is((select confirmed_at from public.listings where slug = 'imp-gc-evo'), '2026-01-10'::timestamptz,
  'el servidor conserva confirmed_at al importar');
select is((select published_at from public.listings where slug = 'imp-gc-evo'), '2026-01-01'::timestamptz,
  'el servidor conserva published_at al importar');

-- Un usuario no puede publicar con fechas antiguas (no tiene privilegio sobre esas columnas)
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select throws_ok($$
  insert into public.listings (slug, status, size_label, length_in, shape, construction, condition, price_eur, zone_slug, town, published_at)
  values ('u-antiguo', 'published', '6''0"', 72, 'fish', 'pu', 'buen-estado', 200, 'tenerife', 'El Médano', '2020-01-01')
$$, '42501', null, 'un usuario no fija published_at');
insert into public.listings (slug, status, size_label, length_in, shape, construction, condition, price_eur, zone_slug, town, volume_l, volume_source)
values ('u-fish', 'published', '6''0"', 72, 'fish', 'pu', 'buen-estado', 200, 'tenerife', 'El Médano', 45, 'seller'),
       ('u-evo-tf', 'published', '7''0"', 84, 'evolutiva', 'pu', 'buen-estado', 210, 'tenerife', 'El Médano', 50, 'seller'),
       ('u-long-gc', 'published', '9''0"', 108, 'longboard', 'epoxy', 'buen-estado', 400, 'gran-canaria', 'Telde', 80, 'seller');
select ok((select confirmed_at > now() - interval '1 minute' from public.listings where slug = 'u-fish'),
  'un usuario que publica confirma «ahora»');
reset role;

-- Similares: misma forma o ±8 L, activos, sin el propio, primero la misma zona
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select is(
  (select array_agg(slug order by ordinality) from public.similar_listings(
     (select public_id from public.listings where slug = 'imp-gc-evo'), 4) with ordinality),
  array['u-fish', 'u-evo-tf'],   -- misma fecha (misma transacción): desempate por id
  'similares de una evolutiva de 47 L: la otra evolutiva y la fish de 45 L (no el longboard)');
select is_empty($$ select * from public.similar_listings('a999999999', 4) $$, 'anuncio inexistente: sin similares');

select * from finish();
rollback;
