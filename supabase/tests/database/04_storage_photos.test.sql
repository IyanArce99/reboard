-- Reboard · tests: Storage (carpeta propia) y tabla de fotos (límite de 8)
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (id, instance_id, aud, role, email) values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.invalid'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.invalid');

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
insert into public.listings (slug, size_label, length_in, shape, construction, condition, price_eur, zone_slug, town)
values ('t-fotos', '7''2"', 86, 'evolutiva', 'epoxy', 'buen-estado', 200, 'gran-canaria', 'Telde');

-- Rutas: {uid}/{listing_id}/{uuid}.webp
create temporary table _paths on commit drop as
select
  '11111111-1111-1111-1111-111111111111/' || id || '/foto.webp' as own_ok,
  '11111111-1111-1111-1111-111111111111/999999999/foto.webp'    as own_wrong_listing,
  '22222222-2222-2222-2222-222222222222/' || id || '/foto.webp' as other_folder,
  id as listing_id
from public.listings where slug = 't-fotos';
grant select on _paths to authenticated, anon;

-- Storage
select lives_ok($$ insert into storage.objects (bucket_id, name) select 'listing-photos', own_ok from _paths $$,
  'A sube a su carpeta y a su anuncio');
select throws_ok($$ insert into storage.objects (bucket_id, name) select 'listing-photos', own_wrong_listing from _paths $$,
  '42501', null, 'A no sube a un anuncio que no es suyo');
select throws_ok($$ insert into storage.objects (bucket_id, name) select 'listing-photos', other_folder from _paths $$,
  '42501', null, 'A no sube a la carpeta de B');

-- Tabla de fotos
select lives_ok($$ insert into public.listing_photos (listing_id, storage_path, position) select listing_id, own_ok, 0 from _paths $$,
  'A registra la foto');
select throws_ok($$ insert into public.listing_photos (listing_id, storage_path, position) select listing_id, other_folder, 1 from _paths $$,
  '42501', null, 'la ruta debe estar en la carpeta del dueño');
insert into public.listing_photos (listing_id, storage_path, position)
select listing_id, '11111111-1111-1111-1111-111111111111/' || listing_id || '/f' || g || '.webp', g from _paths, generate_series(1, 7) g;
select is((select count(*) from public.listing_photos where listing_id = (select listing_id from _paths)), 8::bigint, '8 fotos registradas');
select throws_ok($$
  insert into public.listing_photos (listing_id, storage_path, position)
  select listing_id, '11111111-1111-1111-1111-111111111111/' || listing_id || '/extra.webp', 7 from _paths
$$, null, null, 'no se admite una novena foto');

-- B no ve los objetos de A por la API; las fotos de un borrador no son públicas.
-- (El borrado solo es posible por la API de Storage: Supabase bloquea el DELETE directo en SQL;
--  la política listing_photos_owner_delete limita el borrado a la carpeta propia.)
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
-- (Los recuentos se limitan a los datos de este test: la base local puede tener otros anuncios.)
select is((select count(*) from storage.objects where bucket_id = 'listing-photos' and name like '11111111-%'), 0::bigint, 'B no lista los objetos de A');
-- Intento de mover el objeto de A: la RLS no deja ver la fila, así que no actualiza nada
-- (se comprueba más abajo, como postgres, que el objeto sigue intacto).
update storage.objects set name = '22222222-2222-2222-2222-222222222222/x.webp' where bucket_id = 'listing-photos' and name like '11111111-%';
select is((select count(*) from public.listing_photos where listing_id = (select listing_id from _paths)), 0::bigint, 'B no ve las fotos de un borrador ajeno');
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select is((select count(*) from storage.objects where bucket_id = 'listing-photos'), 0::bigint, 'anon no lista el bucket');

reset role;
select is((select count(*) from storage.objects where bucket_id = 'listing-photos' and name = (select own_ok from _paths)),
  1::bigint, 'el objeto de A sigue intacto');

-- Al publicar, las fotos pasan a ser visibles
update public.listings set status = 'published' where slug = 't-fotos';
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select is((select count(*) from public.listing_photos where listing_id = (select listing_id from _paths)), 8::bigint, 'anon ve las fotos de un anuncio publicado');

select * from finish();
rollback;
