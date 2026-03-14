-- ============================================================
-- JJVV Mobile - 012_global_superadmin_memberships.sql
-- Robust global superadmin resolution and membership sync
-- ============================================================

create or replace function public.superadmin_email()
returns text
language sql
stable
set search_path = public
as $$
  select 'javier.aravena25@gmail.com'::text;
$$;

create or replace function public.global_superadmin_user_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.id
  from auth.users u
  where lower(u.email::text) = lower(public.superadmin_email())
  order by u.created_at asc
  limit 1;
$$;

create or replace function public.is_global_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select auth.uid() is not null
    and (
      auth.uid() = public.global_superadmin_user_id()
      or lower(coalesce(auth.jwt() ->> 'email', '')) = lower(public.superadmin_email())
      or exists (
        select 1
        from auth.users u
        where u.id = auth.uid()
          and lower(u.email::text) = lower(public.superadmin_email())
      )
    );
$$;

create or replace function public.sync_global_superadmin_memberships(p_org_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_superadmin_id uuid;
  v_inserted_count integer := 0;
begin
  select public.global_superadmin_user_id()
  into v_superadmin_id;

  if v_superadmin_id is null then
    return 0;
  end if;

  insert into public.memberships (
    organization_id,
    user_id,
    role,
    is_active
  )
  select
    o.id,
    v_superadmin_id,
    'superadmin'::public.role_t,
    true
  from public.organizations o
  where (p_org_id is null or o.id = p_org_id)
    and not exists (
      select 1
      from public.memberships m
      where m.organization_id = o.id
        and m.user_id = v_superadmin_id
    );

  get diagnostics v_inserted_count = row_count;

  update public.memberships
  set
    role = 'superadmin'::public.role_t,
    is_active = true
  where user_id = v_superadmin_id
    and (p_org_id is null or organization_id = p_org_id)
    and (
      role <> 'superadmin'::public.role_t
      or is_active <> true
    );

  return v_inserted_count;
end;
$$;

create or replace function public.sync_global_superadmin_after_organization_insert()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  perform public.sync_global_superadmin_memberships(new.id);
  return new;
end;
$$;

drop trigger if exists sync_global_superadmin_after_organization_insert on public.organizations;
create trigger sync_global_superadmin_after_organization_insert
  after insert on public.organizations
  for each row execute function public.sync_global_superadmin_after_organization_insert();

select public.sync_global_superadmin_memberships();
