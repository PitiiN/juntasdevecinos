-- ============================================================
-- JJVV Mobile - 019_profile_privacy_minimization.sql
-- Minimize peer profile exposure inside the same JJVV
-- ============================================================

create or replace function public.list_board_members(p_org_id uuid)
returns table (
  user_id uuid,
  full_name text,
  role public.role_t
)
language sql
stable
security definer
set search_path = public, app_private
as $$
  select
    m.user_id,
    coalesce(p.full_name, split_part(u.email::text, '@', 1)) as full_name,
    m.role
  from public.memberships m
  left join public.profiles p on p.user_id = m.user_id
  left join auth.users u on u.id = m.user_id
  where m.organization_id = p_org_id
    and m.is_active = true
    and m.role = any(array['president', 'director', 'secretary', 'treasurer']::public.role_t[])
    and app_private.is_member_of(p_org_id)
  order by app_private.role_rank(m.role) desc, full_name asc;
$$;

revoke execute on function public.list_board_members(uuid) from public, anon, authenticated;
grant execute on function public.list_board_members(uuid) to authenticated;

drop policy if exists "profile_select_member" on public.profiles;
