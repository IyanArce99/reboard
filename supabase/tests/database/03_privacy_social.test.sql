-- Reboard · tests: contacto privado, reveal_contact, perfiles, favoritos y reportes
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (id, instance_id, aud, role, email) values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.invalid'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.invalid'),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@test.invalid'),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'd@test.invalid');

-- Anuncio publicado de A (creado por el servidor; el recorrido de publicar se prueba en 02_listings)
insert into public.listings (seller_id, slug, status, size_label, length_in, shape, construction, condition, price_eur, zone_slug, town)
values ('11111111-1111-1111-1111-111111111111', 't-contacto', 'published', '7''2"', 86, 'evolutiva', 'epoxy', 'buen-estado', 200, 'gran-canaria', 'Telde');

-- A guarda su teléfono de contacto
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select lives_ok($$
  insert into public.listing_contacts (listing_id, phone_e164)
  select id, '+34600000000' from public.listings where slug = 't-contacto'
$$, 'A guarda el teléfono de su anuncio');
select throws_ok($$
  update public.listing_contacts set phone_e164 = '600000000'
  where listing_id = (select id from public.listings where slug = 't-contacto')
$$, '23514', null, 'el teléfono debe ir en formato E.164');
select is((select count(*) from public.listing_contacts), 1::bigint, 'A ve su propio teléfono');
select lives_ok($$ update public.profiles set display_name = 'Daniel' where id = '11111111-1111-1111-1111-111111111111' $$,
  'A cambia su nombre visible');
select throws_ok($$ update public.profiles set role = 'admin' where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501', null, 'A no puede hacerse admin');

-- B no ve el teléfono ni puede inventarlo
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select is((select count(*) from public.listing_contacts), 0::bigint, 'B no ve el teléfono de A');
select throws_ok($$
  insert into public.listing_contacts (listing_id, phone_e164)
  select id, '+34611111111' from public.listings where slug = 't-contacto'
$$, '42501', null, 'B no puede poner un teléfono en el anuncio de A');
update public.profiles set display_name = 'Hackeado' where id = '11111111-1111-1111-1111-111111111111';
select is((select display_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'), 'Daniel',
  'B no puede cambiar el perfil de A');

-- anon: perfiles públicos sin columnas privadas; nada de contactos
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select is((select display_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'), 'Daniel',
  'anon ve el nombre visible');
select throws_ok($$ select role from public.profiles $$, '42501', null, 'anon no puede leer el rol');
select throws_ok($$ select * from public.listing_contacts $$, '42501', null, 'anon no puede leer contactos');
select throws_ok($$ select * from public.reveal_contact('a100000', null, repeat('x', 32)) $$,
  '42501', null, 'anon no puede ejecutar reveal_contact');

-- Servidor (service role): revela el contacto y lo registra; límite de 30 por hora y por IP
reset role;
set local role service_role;
select results_eq(
  format($$ select method::text, phone_e164 from public.reveal_contact(%L, null, %L) $$,
         (select public_id from public.listings where slug = 't-contacto'), repeat('a', 64)),
  $$ values ('whatsapp', '+34600000000') $$,
  'reveal_contact devuelve método y teléfono');
select is((select count(*) from public.contact_events where listing_id = (select id from public.listings where slug = 't-contacto')),
  1::bigint, 'el contacto queda registrado');
select is_empty($$ select * from public.reveal_contact('a999999999', null, repeat('a', 64)) $$,
  'anuncio inexistente: sin datos');
select throws_ok($$ select * from public.reveal_contact((select public_id from public.listings limit 1), null, null) $$,
  'P0001', null, 'sin ip_hash no se revela');
insert into public.contact_events (listing_id, ip_hash, method)
select (select id from public.listings where slug = 't-contacto'), repeat('b', 64), 'whatsapp' from generate_series(1, 30);
select throws_ok(
  format($$ select * from public.reveal_contact(%L, null, %L) $$,
         (select public_id from public.listings where slug = 't-contacto'), repeat('b', 64)),
  'P0001', 'rate_limited', 'límite de 30 contactos por hora y por IP');

-- A ve el registro de contactos de su anuncio; B no
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select is((select count(*) from public.contact_events), 31::bigint, 'A ve los contactos de su anuncio');
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select is((select count(*) from public.contact_events), 0::bigint, 'B no ve los contactos de A');

-- Favoritos: cada uno los suyos
select lives_ok($$ insert into public.favorites (listing_id) select id from public.listings where slug = 't-contacto' $$,
  'B guarda el anuncio');
select throws_ok($$
  insert into public.favorites (user_id, listing_id)
  select '33333333-3333-3333-3333-333333333333', id from public.listings where slug = 't-contacto'
$$, '42501', null, 'B no puede guardar favoritos a nombre de C');
set local request.jwt.claims to '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
select is((select count(*) from public.favorites), 0::bigint, 'C no ve los favoritos de B');

-- Reportes: requieren sesión; uno por persona; 3 abiertos → flagged (sigue visible)
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select throws_ok($$ insert into public.reports (listing_id, reason) select id, 'fraude' from public.listings where slug = 't-contacto' $$,
  '42501', null, 'anon no puede reportar');
set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select lives_ok($$ insert into public.reports (listing_id, reason) select id, 'fraude' from public.listings where slug = 't-contacto' $$,
  'B reporta');
select throws_ok($$ insert into public.reports (listing_id, reason) select id, 'fraude' from public.listings where slug = 't-contacto' $$,
  '23505', null, 'B no puede reportar dos veces');
select throws_ok($$ insert into public.reports (listing_id, reason, status) select id, 'fraude', 'resolved' from public.listings where slug = 't-contacto' $$,
  '42501', null, 'el estado del reporte no lo fija quien reporta');
set local request.jwt.claims to '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
insert into public.reports (listing_id, reason) select id, 'datos-falsos' from public.listings where slug = 't-contacto';
select is((select count(*) from public.reports), 1::bigint, 'C solo ve su propio reporte');
set local request.jwt.claims to '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';
insert into public.reports (listing_id, reason) select id, 'otro' from public.listings where slug = 't-contacto';
reset role;
select is((select moderation::text from public.listings where slug = 't-contacto'), 'flagged', '3 reportes abiertos → flagged');
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select is((select count(*) from public.listings where slug = 't-contacto'), 1::bigint, 'un anuncio flagged sigue visible');

select * from finish();
rollback;
