-- ============================================================
-- JJVV Mobile - 017_private_helpers_and_context_rpc_fix.sql
-- Complete private helper grants and restore org context RPCs
-- ============================================================

grant usage on schema app_private to anon, authenticated;

grant execute on function app_private.superadmin_email() to anon, authenticated;
grant execute on function app_private.global_superadmin_user_id() to anon, authenticated;
grant execute on function app_private.is_global_superadmin() to anon, authenticated;
grant execute on function app_private.role_rank(public.role_t) to anon, authenticated;
grant execute on function app_private.is_member_of(uuid) to anon, authenticated;
grant execute on function app_private.has_role(uuid, public.role_t[]) to anon, authenticated;
grant execute on function app_private.get_user_role(uuid) to authenticated;
grant execute on function app_private.storage_object_org_id(text) to anon, authenticated;
grant execute on function app_private.storage_object_user_id(text) to anon, authenticated;

create or replace function public.list_accessible_organizations()
returns table (
  organization_id uuid,
  role public.role_t,
  organization_name text,
  organization_logo_url text,
  organization_directiva_image_url text
)
language sql
stable
security definer
set search_path = public, app_private
as $$
  select *
  from (
    select
      o.id as organization_id,
      'superadmin'::public.role_t as role,
      o.name as organization_name,
      o.logo_url as organization_logo_url,
      o.directiva_image_url as organization_directiva_image_url
    from public.organizations o
    where app_private.is_global_superadmin()

    union all

    select
      m.organization_id,
      m.role,
      o.name as organization_name,
      o.logo_url as organization_logo_url,
      o.directiva_image_url as organization_directiva_image_url
    from public.memberships m
    join public.organizations o on o.id = m.organization_id
    where not app_private.is_global_superadmin()
      and m.user_id = auth.uid()
      and m.is_active = true
  ) accessible_organizations
  order by
    app_private.role_rank(accessible_organizations.role) desc,
    accessible_organizations.organization_name asc;
$$;

create or replace function public.get_my_membership_context()
returns table (
  organization_id uuid,
  role public.role_t,
  organization_name text,
  organization_logo_url text,
  organization_directiva_image_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.list_accessible_organizations()
  limit 1;
$$;

revoke execute on function public.list_accessible_organizations() from public, anon, authenticated;
grant execute on function public.list_accessible_organizations() to authenticated;

revoke execute on function public.get_my_membership_context() from public, anon, authenticated;
grant execute on function public.get_my_membership_context() to authenticated;
