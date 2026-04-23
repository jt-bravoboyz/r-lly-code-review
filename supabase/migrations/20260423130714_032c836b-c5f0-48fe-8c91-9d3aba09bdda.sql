create or replace function public.admin_user_directory()
returns table (
  profile_id uuid,
  user_id uuid,
  display_name text,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  founding_member boolean
)
language sql
security definer
set search_path = public, auth
as $$
  select
    p.id as profile_id,
    p.user_id,
    p.display_name,
    u.email::text,
    p.created_at,
    u.last_sign_in_at,
    p.founding_member
  from public.profiles p
  join auth.users u on u.id = p.user_id
  where public.has_role(auth.uid(), 'admin'::app_role);
$$;

revoke all on function public.admin_user_directory() from public;
grant execute on function public.admin_user_directory() to authenticated;