-- Perfil al registrarse: nombre de pila del proveedor (Google/Apple) o «Surfista» por defecto.
begin;
select plan(5);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data) values
  ('81111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'g@test.invalid', '{"full_name":"Laura Pérez Gómez","given_name":"Laura"}'),
  ('82222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'f@test.invalid', '{"full_name":"Iker Etxeberria"}'),
  ('83333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'e@test.invalid', '{}'),
  ('84444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'x@test.invalid', '{"given_name":"J"}'),
  ('85555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'n@test.invalid', null);

select is((select display_name from public.profiles where id = '81111111-1111-1111-1111-111111111111'), 'Laura', 'Google: nombre de pila, sin apellidos');
select is((select display_name from public.profiles where id = '82222222-2222-2222-2222-222222222222'), 'Iker', 'solo full_name: primera palabra');
select is((select display_name from public.profiles where id = '83333333-3333-3333-3333-333333333333'), 'Surfista', 'email sin nombre: valor por defecto');
select is((select display_name from public.profiles where id = '84444444-4444-4444-4444-444444444444'), 'Surfista', 'nombre demasiado corto: valor por defecto');
select is((select display_name from public.profiles where id = '85555555-5555-5555-5555-555555555555'), 'Surfista', 'sin metadatos: valor por defecto');

select * from finish();
rollback;
