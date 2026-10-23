-- Emails de varios usuarios en una sola consulta (auditoría, reportes): evita una consulta por fila.
-- Solo admin; devuelve únicamente id y email (ningún otro dato personal).
create function public.admin_user_emails(p_ids uuid[])
returns table (id uuid, email text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return query select u.id, u.email::text from auth.users u where u.id = any (p_ids[1:500]);
end $$;

revoke execute on function public.admin_user_emails(uuid[]) from public, anon;
grant execute on function public.admin_user_emails(uuid[]) to authenticated;
