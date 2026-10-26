-- Reboard · tests: nombre del vendedor por anuncio (migración 20261104090000).
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

select has_column('public', 'listings', 'seller_name', 'listings.seller_name existe');
select col_is_null('public', 'listings', 'seller_name', 'opcional: los anuncios anteriores usan el nombre de la cuenta');
select ok(has_column_privilege('authenticated', 'public.listings', 'seller_name', 'update'), 'el dueño puede cambiar el nombre de su anuncio');
select ok(not has_column_privilege('anon', 'public.listings', 'seller_name', 'update'), 'anónimo: no lo cambia');
select is(
  (select pg_get_constraintdef(oid) from pg_constraint where conname = 'listings_seller_name_len'),
  'CHECK (((seller_name IS NULL) OR ((char_length(seller_name) >= 2) AND (char_length(seller_name) <= 40))))',
  'entre 2 y 40 caracteres');

select * from finish();
rollback;
