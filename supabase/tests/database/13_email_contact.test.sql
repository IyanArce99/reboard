-- Reboard · tests: contacto privado por email (migración 20261103090000).
-- contact_channels acotado y editable por su dueño; el registro de mensajes no se lee ni escribe
-- desde el navegador. Todo se deshace al final.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

select has_column('public', 'listings', 'contact_channels', 'listings.contact_channels existe');
select col_default_is('public', 'listings', 'contact_channels', 'phone'::text, 'por defecto, teléfono (anuncios antiguos compatibles)');
select is(
  (select pg_get_constraintdef(oid) from pg_constraint where conname = 'listings_contact_channels_valid'),
  'CHECK ((contact_channels = ANY (ARRAY[''phone''::text, ''email''::text, ''both''::text])))',
  'solo phone, email o both');
select ok(has_column_privilege('authenticated', 'public.listings', 'contact_channels', 'update'), 'el dueño puede cambiar sus canales');
select ok(has_column_privilege('authenticated', 'public.listings', 'contact_channels', 'insert'), 'el dueño puede elegir sus canales al crear');
select ok(not has_column_privilege('anon', 'public.listings', 'contact_channels', 'update'), 'anónimo: no cambia canales');

select ok((select relrowsecurity from pg_class where oid = 'public.email_contact_events'::regclass), 'email_contact_events: RLS activado');
select ok(not has_table_privilege('anon', 'public.email_contact_events', 'select'), 'anónimo: no lee el registro');
select ok(not has_table_privilege('anon', 'public.email_contact_events', 'insert'), 'anónimo: no escribe el registro');
select ok(not has_table_privilege('authenticated', 'public.email_contact_events', 'select'), 'usuario: no lee el registro');
select ok(not has_table_privilege('authenticated', 'public.email_contact_events', 'insert'), 'usuario: no escribe el registro');
select hasnt_column('public', 'email_contact_events', 'message', 'el registro no guarda el texto del mensaje');
select hasnt_column('public', 'email_contact_events', 'email', 'el registro no guarda emails');

select * from finish();
rollback;
