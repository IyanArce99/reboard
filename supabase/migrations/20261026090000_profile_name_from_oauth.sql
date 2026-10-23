-- Al entrar con Google o Apple, el perfil arranca con el NOMBRE de pila que da el proveedor (no el
-- apellido ni el email). Con código por email no hay nombre: se queda el valor por defecto («Surfista»).
-- Apple solo envía el nombre la primera vez; si no llega, también se usa el valor por defecto.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  first text;
begin
  first := nullif(btrim(coalesce(
    meta->>'given_name',
    meta->'name'->>'firstName',
    split_part(btrim(coalesce(meta->>'full_name', meta->>'name', '')), ' ', 1)
  )), '');
  if first is not null and char_length(first) between 2 and 40 then
    insert into public.profiles (id, display_name) values (new.id, first);
  else
    insert into public.profiles (id) values (new.id);
  end if;
  return new;
end $$;
