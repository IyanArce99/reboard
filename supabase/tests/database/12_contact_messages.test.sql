-- Reboard · tests: mensajes del formulario de contacto (migración 20261101090000).
-- Nadie escribe ni lee desde el navegador; solo el administrador los lee y los marca. Todo se deshace al final.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (id, instance_id, aud, role, email) values
  ('aaaaaaaa-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-c@test.invalid'),
  ('bbbbbbbb-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user-c@test.invalid');
alter table public.profiles disable trigger t_profiles_admin_guard;
update public.profiles set role = 'admin' where id = 'aaaaaaaa-0000-0000-0000-0000000000c1';
alter table public.profiles enable trigger t_profiles_admin_guard;

-- El servidor (service role) inserta.
insert into public.contact_messages (topic, email, message) values ('otra', 'alguien@test.invalid', 'Hola, tengo una duda sobre Reboard.');

select ok((select relrowsecurity from pg_class where oid = 'public.contact_messages'::regclass), 'RLS activado');
select ok(not has_table_privilege('anon', 'public.contact_messages', 'insert'), 'anónimo: no puede insertar');
select ok(not has_table_privilege('anon', 'public.contact_messages', 'select'), 'anónimo: no puede leer');
select ok(not has_table_privilege('authenticated', 'public.contact_messages', 'insert'), 'usuario: no puede insertar');
select ok(not has_table_privilege('authenticated', 'public.contact_messages', 'delete'), 'usuario: no puede borrar');
select ok(not has_column_privilege('authenticated', 'public.contact_messages', 'message', 'update'), 'usuario: no puede cambiar el mensaje');

-- Anónimo
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select throws_ok($$ select count(*) from public.contact_messages $$, '42501', null, 'anónimo: lectura denegada');
select throws_ok($$ insert into public.contact_messages (topic, email, message) values ('otra', 'x@test.invalid', 'mensaje de prueba') $$, '42501', null, 'anónimo: inserción denegada');

-- Usuario normal
set local role authenticated;
set local request.jwt.claims to '{"sub":"bbbbbbbb-0000-0000-0000-0000000000c2","role":"authenticated","aal":"aal1"}';
select is((select count(*) from public.contact_messages), 0::bigint, 'usuario normal: no ve ningún mensaje');
select throws_ok($$ insert into public.contact_messages (topic, email, message) values ('otra', 'x@test.invalid', 'mensaje de prueba') $$, '42501', null, 'usuario normal: inserción denegada');

-- Administrador (con segundo factor)
set local request.jwt.claims to '{"sub":"aaaaaaaa-0000-0000-0000-0000000000c1","role":"authenticated","aal":"aal2"}';
select ok((select count(*) from public.contact_messages where email = 'alguien@test.invalid') = 1, 'admin: ve el mensaje');
select lives_ok($$ update public.contact_messages set status = 'done', handled_at = now() where email = 'alguien@test.invalid' $$, 'admin: lo marca como atendido');
select is((select status from public.contact_messages where email = 'alguien@test.invalid'), 'done', 'admin: queda atendido');

select * from finish();
rollback;
