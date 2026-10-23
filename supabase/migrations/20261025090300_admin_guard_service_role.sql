-- Último admin: la protección evita que un administrador (o el borrado de su cuenta) deje la
-- aplicación sin administradores. La service role (servidor, scripts de recuperación) ya tiene acceso
-- total a la base de datos, así que puede cambiar roles sin esa comprobación: es la vía de recuperación
-- documentada en docs/ADMIN.md y la que usan los tests para limpiar. El borrado de cuentas
-- (supabase_auth_admin) y cualquier otro rol siguen protegidos.
create or replace function public.profiles_admin_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (select auth.role()) = 'service_role' then
    return new;
  end if;
  if old.role = 'admin' and old.suspended_at is null
     and (tg_op = 'DELETE' or new.role <> 'admin' or new.suspended_at is not null)
     and not exists (select 1 from public.profiles p
                     where p.role = 'admin' and p.suspended_at is null and p.id <> old.id) then
    raise exception 'last_admin' using errcode = 'P0001', hint = 'Debe quedar al menos un administrador activo.';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
