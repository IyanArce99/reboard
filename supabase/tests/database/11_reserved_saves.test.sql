-- Reboard · tests: «Reservada» y número de guardados (20261030090000)
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (id, instance_id, aud, role, email) values
  ('b1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'vende-r@test.invalid'),
  ('b2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'guarda1@test.invalid'),
  ('b3333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'guarda2@test.invalid');

insert into public.listings (seller_id, slug, status, size_label, length_in, shape, construction, condition, price_eur, zone_slug, town)
values ('b1111111-1111-1111-1111-111111111111', 't-reserva', 'published', '7''2"', 86, 'evolutiva', 'epoxy', 'buen-estado', 200, 'gran-canaria', 'Telde');

-- ───── El vendedor reserva y quita la reserva ─────
set local role authenticated;
set local request.jwt.claims to '{"sub":"b1111111-1111-1111-1111-111111111111","role":"authenticated"}';
select lives_ok($$ update public.listings set reserved_at = now() where slug = 't-reserva' $$, 'el vendedor marca su anuncio como reservado');
select isnt((select reserved_at from public.listings where slug = 't-reserva'), null, 'queda reservado');
reset role;

-- Otro usuario no puede reservar un anuncio ajeno (la RLS no le deja ver la fila para actualizarla).
set local role authenticated;
set local request.jwt.claims to '{"sub":"b2222222-2222-2222-2222-222222222222","role":"authenticated"}';
update public.listings set reserved_at = null where slug = 't-reserva';
reset role;
select isnt((select reserved_at from public.listings where slug = 't-reserva'), null, 'otro usuario no quita la reserva ajena');

-- Al vender, la reserva se quita sola; y no se puede reservar algo que no está publicado.
update public.listings set status = 'sold' where slug = 't-reserva';
select is((select reserved_at from public.listings where slug = 't-reserva'), null, 'vendida: la reserva desaparece');
select throws_ok($$ update public.listings set reserved_at = now() where slug = 't-reserva' $$, '23514', null,
  'solo se reserva un anuncio publicado');
update public.listings set status = 'published' where slug = 't-reserva';

-- ───── Guardados: solo el número, nunca quién ─────
-- Cada usuario guarda la tabla desde su sesión (como en la web).
set local role authenticated;
set local request.jwt.claims to '{"sub":"b2222222-2222-2222-2222-222222222222","role":"authenticated"}';
insert into public.favorites (listing_id) select id from public.listings where slug = 't-reserva';
set local request.jwt.claims to '{"sub":"b3333333-3333-3333-3333-333333333333","role":"authenticated"}';
insert into public.favorites (listing_id) select id from public.listings where slug = 't-reserva';
reset role;

set local role anon;
select is(public.listing_save_count((select public_id from public.listings where slug = 't-reserva')), 2, 'anónimo: ve que 2 cuentas la han guardado');
select throws_ok($$ select user_id from public.favorites $$, '42501', null, 'anónimo: no puede ver quién la ha guardado');
select throws_ok($$ select * from public.my_listing_save_counts() $$, '42501', null, 'anónimo: no llama a la función del panel');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub":"b1111111-1111-1111-1111-111111111111","role":"authenticated"}';
select is((select n from public.my_listing_save_counts() where public_id = (select public_id from public.listings where slug = 't-reserva')), 2,
  'vendedor: ve los guardados de su anuncio en el panel');
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"b2222222-2222-2222-2222-222222222222","role":"authenticated"}';
select is((select count(*) from public.my_listing_save_counts()), 0::bigint, 'otro usuario: no ve recuentos de anuncios ajenos');
reset role;

-- Retirado: el recuento público ya no lo cuenta.
update public.listings set status = 'withdrawn' where slug = 't-reserva';
set local role anon;
select is(public.listing_save_count((select public_id from public.listings where slug = 't-reserva')), 0, 'anuncio retirado: recuento 0');
reset role;

select * from finish();
rollback;
