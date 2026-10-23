-- Reboard · tests: RLS activa y privilegios mínimos (docs/SECURITY.md §3 y §9)
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

-- RLS activa en todas las tablas del esquema public
select is(
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  0::bigint, 'RLS activa en todas las tablas de public');

-- anon no puede escribir en ninguna tabla ni columna
select is(
  (select count(*) from information_schema.role_table_grants
   where grantee = 'anon' and table_schema = 'public' and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE')),
  0::bigint, 'anon sin privilegios de escritura por tabla');
select is(
  (select count(*) from information_schema.column_privileges
   where grantee = 'anon' and table_schema = 'public' and privilege_type in ('INSERT','UPDATE')),
  0::bigint, 'anon sin privilegios de escritura por columna');

-- Tablas privadas: ni anon ni authenticated pueden leer el teléfono sin pasar por RLS
select ok(not has_table_privilege('anon', 'public.listing_contacts', 'select'), 'anon no puede leer listing_contacts');
select ok(not has_table_privilege('anon', 'public.contact_events', 'select'), 'anon no puede leer contact_events');
select ok(not has_table_privilege('anon', 'public.reports', 'select'), 'anon no puede leer reports');
select ok(not has_column_privilege('anon', 'public.profiles', 'role', 'select'), 'anon no puede leer profiles.role');
select ok(not has_column_privilege('authenticated', 'public.profiles', 'role', 'update'), 'authenticated no puede cambiar profiles.role');
select ok(not has_column_privilege('authenticated', 'public.profiles', 'seller_type', 'update'), 'authenticated no puede cambiar seller_type');

-- Columnas de anuncios que el cliente nunca escribe
select ok(not has_column_privilege('authenticated', 'public.listings', 'seller_id', 'update'), 'seller_id no editable');
select ok(not has_column_privilege('authenticated', 'public.listings', 'seller_id', 'insert'), 'seller_id no insertable (default auth.uid())');
select ok(not has_column_privilege('authenticated', 'public.listings', 'moderation', 'update'), 'moderation no editable');
select ok(not has_column_privilege('authenticated', 'public.listings', 'published_at', 'update'), 'published_at no editable');
select ok(not has_column_privilege('authenticated', 'public.listings', 'previous_price_eur', 'update'), 'previous_price_eur no editable');

-- Funciones solo de servidor
select ok(not has_function_privilege('anon', 'public.reveal_contact(text, uuid, text)', 'execute'), 'anon no ejecuta reveal_contact');
select ok(not has_function_privilege('authenticated', 'public.reveal_contact(text, uuid, text)', 'execute'), 'authenticated no ejecuta reveal_contact');
select ok(has_function_privilege('service_role', 'public.reveal_contact(text, uuid, text)', 'execute'), 'service_role ejecuta reveal_contact');
select ok(not has_function_privilege('anon', 'public.expire_listings()', 'execute'), 'anon no ejecuta expire_listings');
select ok(not has_function_privilege('authenticated', 'public.expire_listings()', 'execute'), 'authenticated no ejecuta expire_listings');
-- Funciones públicas de búsqueda
select ok(has_function_privilege('anon', 'public.listing_facets(jsonb)', 'execute'), 'anon ejecuta listing_facets');

-- Las funciones security definer fijan search_path (evita secuestro de funciones)
select is(
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prosecdef
     and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')),
  0::bigint, 'todas las funciones security definer fijan search_path');

-- Bucket de fotos: público, 5 MB, solo WebP y JPEG
select results_eq(
  $$ select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'listing-photos' $$,
  $$ values (true, 5242880::bigint, array['image/webp','image/jpeg']::text[]) $$,
  'bucket listing-photos configurado');

-- Datos de referencia: 9 zonas, sin anuncios ni tiendas ni catálogo cargados
select is((select count(*) from public.zones), 9::bigint, '9 zonas de referencia');
select is((select count(*) from public.zones where region_slug = 'canarias'), 4::bigint, '4 zonas en Canarias');
select is((select count(*) from public.listings), 0::bigint, 'sin anuncios precargados');
select is((select count(*) from public.shops), 0::bigint, 'sin tiendas precargadas');
-- Marcas: solo nombres de referencia (migración 20261024090000). Modelos y medidas, ninguno: exigen
-- la tabla del fabricante y no se inventan.
select ok((select count(*) from public.brands) >= 30, 'marcas de referencia cargadas');
select is((select count(*) from public.board_models), 0::bigint, 'sin modelos de catálogo precargados');
select is((select count(*) from public.board_model_sizes), 0::bigint, 'sin medidas de catálogo precargadas');

select * from finish();
rollback;
