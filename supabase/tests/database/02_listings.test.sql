-- Reboard · tests: anuncios (RLS, columnas protegidas, transiciones y origen de los datos)
-- Los usuarios y anuncios de este archivo existen solo dentro de la transacción (rollback al final).
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- ───────── Usuarios de prueba (el disparador crea sus perfiles) ─────────
insert into auth.users (id, instance_id, aud, role, email) values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.invalid'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.invalid');

select is((select count(*) from public.profiles where id in ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222')),
  2::bigint, 'el registro crea el perfil');
select is((select display_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'Surfista', 'el nombre por defecto no deriva del email');

-- ───────── A publica un anuncio y guarda un borrador ─────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

-- Publicar = borrador → foto y teléfono → publicado (20261027090000_publish_guard_storage_quota).
select throws_ok($$
  insert into public.listings (slug, status, size_label, length_in, shape, construction, condition, price_eur, zone_slug, town)
  values ('t-directo', 'published', '7''2"', 86, 'evolutiva', 'epoxy', 'buen-estado', 200, 'gran-canaria', 'Telde')
$$, '42501', null, 'A no puede crear un anuncio ya publicado (solo borradores)');
select lives_ok($$
  insert into public.listings (slug, size_label, length_in, shape, construction, condition, price_eur, zone_slug, town,
                               volume_l, volume_source)
  values ('t-publicado', '7''2"', 86, 'evolutiva', 'epoxy', 'buen-estado', 200, 'gran-canaria', 'Telde', 47, 'seller')
$$, 'A crea el borrador');
select throws_ok($$ update public.listings set status = 'published' where slug = 't-publicado' $$,
  'P0001', 'listing_needs_photos', 'sin fotos no se publica');
select lives_ok($$
  insert into public.listing_photos (listing_id, storage_path, position, width, height)
  select id, '11111111-1111-1111-1111-111111111111/' || id || '/00000000-0000-0000-0000-000000000001.webp', 0, 1200, 1600
  from public.listings where slug = 't-publicado'
$$, 'A añade una foto');
select throws_ok($$ update public.listings set status = 'published' where slug = 't-publicado' $$,
  'P0001', 'listing_needs_contact', 'sin teléfono no se publica');
select lives_ok($$
  insert into public.listing_contacts (listing_id, phone_e164) select id, '+34600000000' from public.listings where slug = 't-publicado'
$$, 'A añade el teléfono');
select lives_ok($$ update public.listings set status = 'published' where slug = 't-publicado' $$,
  'A publica un anuncio');
select lives_ok($$
  insert into public.listings (slug, size_label, length_in, shape, construction, condition, price_eur, zone_slug, town)
  values ('t-borrador', '6''0"', 72, 'shortboard', 'pu', 'como-nueva', 300, 'la-palma', 'Los Llanos de Aridane')
$$, 'A guarda un borrador');

select is((select seller_id from public.listings where slug = 't-publicado'),
  '11111111-1111-1111-1111-111111111111'::uuid, 'seller_id = auth.uid() por defecto');
select ok((select published_at is not null and confirmed_at is not null from public.listings where slug = 't-publicado'),
  'publicar fija published_at y confirmed_at');
select ok((select public_id ~ '^a[0-9]{6,}$' from public.listings where slug = 't-publicado'),
  'public_id con formato a + número (>= 100000)');

-- Columnas protegidas
select throws_ok($$ update public.listings set moderation = 'visible' where slug = 't-publicado' $$,
  '42501', null, 'A no puede tocar moderation');
select throws_ok($$ update public.listings set seller_id = '22222222-2222-2222-2222-222222222222' where slug = 't-publicado' $$,
  '42501', null, 'A no puede cambiar seller_id');
select throws_ok($$ update public.listings set published_at = now() - interval '1 year' where slug = 't-publicado' $$,
  '42501', null, 'A no puede cambiar published_at');
select throws_ok($$
  insert into public.listings (slug, size_label, length_in, shape, construction, condition, price_eur, zone_slug, town, seller_id)
  values ('t-ajeno', '6''0"', 72, 'fish', 'pu', 'como-nueva', 300, 'la-palma', 'Los Llanos de Aridane', '22222222-2222-2222-2222-222222222222')
$$, '42501', null, 'A no puede crear anuncios a nombre de B');
-- Eliminar: permitido al dueño sin moderación desde 20261024100000 (comprobado al final del archivo).

-- Origen de los datos: nunca valor sin origen ni origen sin valor
select throws_ok($$ update public.listings set width_in = 21.5 where slug = 't-publicado' $$,
  '23514', null, 'anchura sin origen: rechazada');
select throws_ok($$ update public.listings set volume_source = 'manufacturer' where slug = 't-publicado' $$,
  '23514', null, '«según fabricante» sin medida de catálogo: rechazado');
select throws_ok($$ update public.listings set price_eur = 0 where slug = 't-publicado' $$,
  '23514', null, 'precio fuera de rango: rechazado');

-- Transiciones de estado
select throws_ok($$ update public.listings set status = 'sold' where slug = 't-borrador' $$,
  'P0001', null, 'un borrador no pasa a vendido');
select throws_ok($$ update public.listings set status = 'expired' where slug = 't-publicado' $$,
  'P0001', null, 'el dueño no puede caducar a mano');

-- «Sigue disponible»: confirmed_at solo puede ser ahora
update public.listings set confirmed_at = '2000-01-01' where slug = 't-publicado';
select ok((select confirmed_at > now() - interval '1 minute' from public.listings where slug = 't-publicado'),
  'confirmed_at enviado por el cliente se fija a now()');

-- Bajar precio guarda el anterior; vender fija sold_at
update public.listings set price_eur = 180 where slug = 't-publicado';
select is((select previous_price_eur from public.listings where slug = 't-publicado'), 200, 'bajar precio guarda el anterior');
update public.listings set status = 'sold' where slug = 't-publicado';
select ok((select sold_at is not null from public.listings where slug = 't-publicado'), 'vender fija sold_at');
update public.listings set status = 'published' where slug = 't-publicado';
select ok((select sold_at is null and status = 'published' from public.listings where slug = 't-publicado'),
  'volver a publicar limpia sold_at');

-- ───────── B: no ve borradores ajenos ni puede editar lo de A ─────────
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select is((select count(*) from public.listings where slug = 't-borrador'), 0::bigint, 'B no ve el borrador de A');
select is((select count(*) from public.listings where slug = 't-publicado'), 1::bigint, 'B ve el anuncio publicado de A');
update public.listings set price_eur = 1 where slug = 't-publicado';
update public.listings set status = 'withdrawn' where slug = 't-publicado';

-- ───────── anon ─────────
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select is((select count(*) from public.listings where slug in ('t-publicado','t-borrador')), 1::bigint,
  'anon solo ve el anuncio publicado');
select throws_ok($$
  insert into public.listings (slug, size_label, length_in, shape, construction, condition, price_eur, zone_slug, town)
  values ('t-anon', '6''0"', 72, 'fish', 'pu', 'como-nueva', 300, 'la-palma', 'Los Llanos de Aridane')
$$, '42501', null, 'anon no puede publicar');

-- ───────── Comprobaciones como postgres ─────────
reset role;
select is((select price_eur from public.listings where slug = 't-publicado'), 180, 'B no ha podido cambiar el precio de A');
select is((select status::text from public.listings where slug = 't-publicado'), 'published', 'B no ha podido retirar el anuncio de A');

-- Retirado por moderación: el dueño no puede reabrirlo; deja de ser visible
update public.listings set moderation = 'removed' where slug = 't-publicado';
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select throws_ok($$ update public.listings set price_eur = 150 where slug = 't-publicado' $$,
  'P0001', null, 'un anuncio retirado por moderación no se puede editar');
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select is((select count(*) from public.listings where slug = 't-publicado'), 0::bigint, 'anon no ve anuncios retirados por moderación');

-- Caducidad (cron con service role)
reset role;
update public.listings set moderation = 'visible', confirmed_at = now() - interval '31 days' where slug = 't-publicado';
set local role service_role;
select is(public.expire_listings(), 1, 'expire_listings caduca los no confirmados en 30 días');
reset role;
select is((select status::text from public.listings where slug = 't-publicado'), 'expired', 'el anuncio queda caducado');

-- Eliminar (migración 20261024100000): solo el dueño y solo sin moderación
set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
delete from public.listings where slug = 't-publicado';
reset role;
select is((select count(*) from public.listings where slug = 't-publicado'), 1::bigint, 'B no puede eliminar el anuncio de A');

update public.listings set moderation = 'flagged' where slug = 't-publicado';
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
delete from public.listings where slug = 't-publicado';
reset role;
select is((select count(*) from public.listings where slug = 't-publicado'), 1::bigint, 'un anuncio con moderación no se puede eliminar (se conserva el registro)');

update public.listings set moderation = 'visible' where slug = 't-publicado';
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
delete from public.listings where slug = 't-publicado';
reset role;
select is((select count(*) from public.listings where slug = 't-publicado'), 0::bigint, 'el dueño elimina su anuncio sin moderación');

-- Límite de anuncios nuevos por usuario y día (15; A ya ha creado algunos en este archivo)
set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select throws_ok($$
  insert into public.listings (slug, size_label, length_in, shape, construction, condition, price_eur, zone_slug, town)
  select 't-lote-' || g, '6''0"', 72, 'fish', 'pu', 'buen-estado', 200, 'la-palma', 'Los Llanos de Aridane' from generate_series(1, 16) g
$$, 'P0001', 'listing_daily_limit', 'máximo 15 anuncios nuevos al día por usuario');
select lives_ok($$
  insert into public.listings (slug, size_label, length_in, shape, construction, condition, price_eur, zone_slug, town)
  select 't-lote-' || g, '6''0"', 72, 'fish', 'pu', 'buen-estado', 200, 'la-palma', 'Los Llanos de Aridane' from generate_series(1, 15) g
$$, 'hasta 15 sí');
reset role;

select * from finish();
rollback;
