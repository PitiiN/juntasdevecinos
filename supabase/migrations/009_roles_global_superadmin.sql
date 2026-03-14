-- ============================================================
-- JJVV Mobile - 009_roles_global_superadmin.sql
-- Role model alignment: member/director/admin/global superadmin
-- ============================================================

do $$
begin
  alter type public.role_t add value 'director';
exception
  when duplicate_object then null;
end;
$$;

update public.memberships
set role = 'member'
where role::text = 'resident';

update public.memberships
set role = 'director'
where role::text = 'moderator';

alter table public.memberships
  alter column role set default 'member';

create or replace function public.superadmin_email()
returns text
language sql
stable
as $$
  select 'javier.aravena25@gmail.com'::text;
$$;

create or replace function public.is_global_superadmin()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = lower(public.superadmin_email());
$$;

create or replace function public.role_rank(p_role public.role_t)
returns integer
language sql
stable
as $$
  select case p_role
    when 'superadmin' then 6
    when 'president' then 5
    when 'treasurer' then 4
    when 'secretary' then 3
    when 'director' then 2
    when 'member' then 1
    else 0
  end;
$$;

create or replace function public.normalize_membership_role()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_email text;
begin
  if new.role::text = 'resident' then
    new.role := 'member';
  elsif new.role::text = 'moderator' then
    new.role := 'director';
  end if;

  if new.role = 'superadmin' then
    select lower(u.email::text)
    into v_email
    from auth.users u
    where u.id = new.user_id;

    if v_email is distinct from lower(public.superadmin_email()) then
      raise exception 'Superadmin role is reserved';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists normalize_membership_role on public.memberships;
create trigger normalize_membership_role
  before insert or update on public.memberships
  for each row execute function public.normalize_membership_role();

create or replace function public.is_member_of(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_global_superadmin()
    or exists (
      select 1
      from public.memberships m
      where m.organization_id = org
        and m.user_id = auth.uid()
        and m.is_active = true
    );
$$;

create or replace function public.has_role(org uuid, roles public.role_t[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
      public.is_global_superadmin()
      and 'superadmin'::public.role_t = any(roles)
    )
    or exists (
      select 1
      from public.memberships m
      where m.organization_id = org
        and m.user_id = auth.uid()
        and m.is_active = true
        and m.role = any(roles)
    );
$$;

create or replace function public.get_user_role(org uuid)
returns public.role_t
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_global_superadmin() then 'superadmin'::public.role_t
    else (
      select m.role
      from public.memberships m
      where m.organization_id = org
        and m.user_id = auth.uid()
        and m.is_active = true
      order by public.role_rank(m.role) desc
      limit 1
    )
  end;
$$;

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
set search_path = public
as $$
  select
    o.id,
    'superadmin'::public.role_t,
    o.name,
    o.logo_url,
    o.directiva_image_url
  from public.organizations o
  where public.is_global_superadmin()

  union all

  select
    m.organization_id,
    m.role,
    o.name,
    o.logo_url,
    o.directiva_image_url
  from public.memberships m
  join public.organizations o on o.id = m.organization_id
  where not public.is_global_superadmin()
    and m.user_id = auth.uid()
    and m.is_active = true
  order by public.role_rank(role) desc, organization_name asc;
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

create or replace function public.list_organization_members(p_org_id uuid)
returns table (
  user_id uuid,
  full_name text,
  email text,
  role public.role_t,
  is_active boolean,
  joined_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    m.user_id,
    p.full_name,
    u.email::text,
    m.role,
    m.is_active,
    m.joined_at
  from public.memberships m
  left join public.profiles p on p.user_id = m.user_id
  left join auth.users u on u.id = m.user_id
  where m.organization_id = p_org_id
    and public.has_role(
      p_org_id,
      array['director', 'secretary', 'treasurer', 'president', 'superadmin']::public.role_t[]
    )
  order by m.is_active desc, p.full_name nulls last, u.email nulls last;
$$;

create or replace function public.update_membership_role(
  p_org_id uuid,
  p_user_id uuid,
  p_role public.role_t
)
returns public.memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.memberships;
  v_role public.role_t;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if auth.uid() = p_user_id then
    raise exception 'Self role changes are not allowed';
  end if;

  v_role := case p_role::text
    when 'resident' then 'member'::public.role_t
    when 'moderator' then 'director'::public.role_t
    else p_role
  end;

  if v_role = 'superadmin' then
    raise exception 'Superadmin role is reserved';
  end if;

  if not public.has_role(p_org_id, array['president', 'superadmin']::public.role_t[]) then
    raise exception 'Insufficient privileges';
  end if;

  update public.memberships
  set role = v_role
  where organization_id = p_org_id
    and user_id = p_user_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Membership not found';
  end if;

  return v_row;
end;
$$;

drop policy if exists "membership_update_admin" on public.memberships;
create policy "membership_update_admin"
  on public.memberships for update
  using (public.has_role(organization_id, array['president', 'superadmin']::public.role_t[]))
  with check (
    public.has_role(organization_id, array['president', 'superadmin']::public.role_t[])
    and role <> 'superadmin'
  );

drop policy if exists "membership_insert_admin" on public.memberships;
create policy "membership_insert_admin"
  on public.memberships for insert
  with check (
    public.has_role(organization_id, array['secretary', 'president', 'superadmin']::public.role_t[])
    and role <> 'superadmin'
  );

drop policy if exists "alert_update_admin" on public.alerts;
create policy "alert_update_admin"
  on public.alerts for update
  using (public.has_role(organization_id, array['director', 'secretary', 'president', 'superadmin']::public.role_t[]))
  with check (public.has_role(organization_id, array['director', 'secretary', 'president', 'superadmin']::public.role_t[]));

drop policy if exists "jjvv_directiva_write" on storage.objects;
create policy "jjvv_directiva_write"
  on storage.objects for all
  using (
    bucket_id = 'jjvv-directiva'
    and public.has_role(public.storage_object_org_id(name), array['director', 'president', 'superadmin']::public.role_t[])
  )
  with check (
    bucket_id = 'jjvv-directiva'
    and public.has_role(public.storage_object_org_id(name), array['director', 'president', 'superadmin']::public.role_t[])
  );

drop policy if exists "favor_update_owner_or_admin" on public.favors;
create policy "favor_update_owner_or_admin"
  on public.favors for update
  using (
    user_id = auth.uid()
    or public.has_role(organization_id, array['director', 'secretary', 'president', 'superadmin']::public.role_t[])
  )
  with check (
    user_id = auth.uid()
    or public.has_role(organization_id, array['director', 'secretary', 'president', 'superadmin']::public.role_t[])
  );

drop policy if exists "favor_delete_owner_or_admin" on public.favors;
create policy "favor_delete_owner_or_admin"
  on public.favors for delete
  using (
    user_id = auth.uid()
    or public.has_role(organization_id, array['director', 'secretary', 'president', 'superadmin']::public.role_t[])
  );

drop policy if exists "favor_reply_delete_owner_or_admin" on public.favor_replies;
create policy "favor_reply_delete_owner_or_admin"
  on public.favor_replies for delete
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.favors f
      where f.id = favor_replies.favor_id
        and public.has_role(f.organization_id, array['director', 'secretary', 'president', 'superadmin']::public.role_t[])
    )
  );
