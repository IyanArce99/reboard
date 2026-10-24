-- Reboard · tests: perfiles y registro de contactos no se pueden listar ni leer de más (20261029090000)
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (id, instance_id, aud, role, email) values
  ('a1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'vende@test.invalid'),
  ('a2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sin-anuncios@test.invalid'),
  ('a3333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'compra@test.invalid');

insert into public.listings (seller_id, slug, status, size_label, length_in, shape, construction, condition, price_eur, zone_slug, town)
values ('a1111111-1111-1111-1111-111111111111', 't-privacidad', 'published', '7''2"', 86, 'evolutiva', 'epoxy', 'buen-estado', 200, 'gran-canaria', 'Telde');

-- El comprador pide el teléfono (lo registra reveal_contact como servidor; aquí, directamente).
insert into public.contact_events (listing_id, user_id, ip_hash, method)
select id, 'a3333333-3333-3333-3333-333333333333', 'hash-de-prueba', 'whatsapp' from public.listings where slug = 't-privacidad';

-- ───── Anónimo ─────
set local role anon;
select is((select count(*) from public.profiles where id = 'a1111111-1111-1111-1111-111111111111'), 1::bigint,
  'anónimo: ve el perfil de quien tiene un anuncio publicado');
select is((select count(*) from public.profiles where id = 'a2222222-2222-2222-2222-222222222222'), 0::bigint,
  'anónimo: no ve perfiles sin anuncios visibles');
select is((select count(*) from public.profiles where id = 'a3333333-3333-3333-3333-333333333333'), 0::bigint,
  'anónimo: no puede listar a los compradores');
select throws_ok($$ select created_at from public.profiles limit 1 $$, '42501', null, 'anónimo: la fecha de alta no es pública');
select lives_ok($$ select id, display_name, seller_type from public.profiles limit 1 $$, 'anónimo: lee lo que necesita la ficha');
select throws_ok($$ select updated_by from public.app_settings limit 1 $$, '42501', null, 'anónimo: no lee quién editó un ajuste');
select lives_ok($$ select key, value from public.app_settings where is_public limit 1 $$, 'anónimo: sigue leyendo los ajustes públicos');
reset role;

-- ───── Usuario sin anuncios: ve su propio perfil ─────
set local role authenticated;
set local request.jwt.claims to '{"sub":"a2222222-2222-2222-2222-222222222222","role":"authenticated"}';
select is((select count(*) from public.profiles where id = 'a2222222-2222-2222-2222-222222222222'), 1::bigint,
  'usuario: ve su propio perfil aunque no tenga anuncios');
select is((select count(*) from public.profiles where id = 'a3333333-3333-3333-3333-333333333333'), 0::bigint,
  'usuario: no ve el perfil de otro usuario sin anuncios');
reset role;

-- ───── Vendedor: cuenta los contactos, sin saber quién ni desde qué IP ─────
set local role authenticated;
set local request.jwt.claims to '{"sub":"a1111111-1111-1111-1111-111111111111","role":"authenticated"}';
select is((select count(*) from public.contact_events ce join public.listings l on l.id = ce.listing_id where l.slug = 't-privacidad'),
  1::bigint, 'vendedor: cuenta los contactos de su anuncio');
select lives_ok($$ select listing_id, method, created_at from public.contact_events $$, 'vendedor: lee anuncio, canal y fecha');
select throws_ok($$ select ip_hash from public.contact_events $$, '42501', null, 'vendedor: no lee el hash de IP');
select throws_ok($$ select user_id from public.contact_events $$, '42501', null, 'vendedor: no sabe qué usuario le contactó');
reset role;

-- ───── reveal_contact sin teléfono: no devuelve nada y no cuenta un contacto ─────
select is((select count(*) from public.reveal_contact((select public_id from public.listings where slug = 't-privacidad'), null, repeat('b', 64))),
  0::bigint, 'reveal_contact: sin teléfono no devuelve nada');
select is((select count(*) from public.contact_events where ip_hash = repeat('b', 64)), 0::bigint,
  'reveal_contact: sin teléfono no se registra el contacto');

select * from finish();
rollback;
