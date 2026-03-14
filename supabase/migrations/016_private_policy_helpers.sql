-- ============================================================
-- JJVV Mobile - 016_private_policy_helpers.sql
-- Move policy helper execution to a private schema not exposed as RPC
-- ============================================================

create schema if not exists app_private;

grant usage on schema app_private to anon, authenticated;

create or replace function app_private.superadmin_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select 'javier.aravena25@gmail.com'::text;
$$;

create or replace function app_private.global_superadmin_user_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.id
  from auth.users u
  where lower(u.email::text) = lower(app_private.superadmin_email())
  order by u.created_at asc
  limit 1;
$$;

create or replace function app_private.is_global_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public, auth, app_private
as $$
  select auth.uid() is not null
    and (
      auth.uid() = app_private.global_superadmin_user_id()
      or lower(coalesce(auth.jwt() ->> 'email', '')) = lower(app_private.superadmin_email())
      or exists (
        select 1
        from auth.users u
        where u.id = auth.uid()
          and lower(u.email::text) = lower(app_private.superadmin_email())
      )
    );
$$;

create or replace function app_private.role_rank(p_role public.role_t)
returns integer
language sql
stable
security definer
set search_path = public
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

create or replace function app_private.is_member_of(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, app_private
as $$
  select app_private.is_global_superadmin()
    or exists (
      select 1
      from public.memberships m
      where m.organization_id = org
        and m.user_id = auth.uid()
        and m.is_active = true
    );
$$;

create or replace function app_private.has_role(org uuid, roles public.role_t[])
returns boolean
language sql
stable
security definer
set search_path = public, auth, app_private
as $$
  select (
      app_private.is_global_superadmin()
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

create or replace function app_private.get_user_role(org uuid)
returns public.role_t
language sql
stable
security definer
set search_path = public, auth, app_private
as $$
  select case
    when app_private.is_global_superadmin() then 'superadmin'::public.role_t
    else (
      select m.role
      from public.memberships m
      where m.organization_id = org
        and m.user_id = auth.uid()
        and m.is_active = true
      order by app_private.role_rank(m.role) desc
      limit 1
    )
  end;
$$;

create or replace function app_private.storage_object_org_id(path text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return nullif(split_part(path, '/', 1), '')::uuid;
exception
  when others then
    return null;
end;
$$;

create or replace function app_private.storage_object_user_id(path text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return nullif(split_part(path, '/', 2), '')::uuid;
exception
  when others then
    return null;
end;
$$;

grant execute on function app_private.is_member_of(uuid) to anon, authenticated;
grant execute on function app_private.has_role(uuid, public.role_t[]) to anon, authenticated;
grant execute on function app_private.storage_object_org_id(text) to anon, authenticated;
grant execute on function app_private.storage_object_user_id(text) to anon, authenticated;

do $$
declare
  r record;
  v_qual text;
  v_with_check text;
  v_sql text;
begin
  for r in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where coalesce(qual, '') like '%public.is_member_of(%'
       or coalesce(qual, '') like '%public.has_role(%'
       or coalesce(qual, '') like '%public.storage_object_org_id(%'
       or coalesce(qual, '') like '%public.storage_object_user_id(%'
       or coalesce(with_check, '') like '%public.is_member_of(%'
       or coalesce(with_check, '') like '%public.has_role(%'
       or coalesce(with_check, '') like '%public.storage_object_org_id(%'
       or coalesce(with_check, '') like '%public.storage_object_user_id(%'
  loop
    v_qual := r.qual;
    v_with_check := r.with_check;

    if v_qual is not null then
      v_qual := replace(v_qual, 'public.is_member_of(', 'app_private.is_member_of(');
      v_qual := replace(v_qual, 'public.has_role(', 'app_private.has_role(');
      v_qual := replace(v_qual, 'public.storage_object_org_id(', 'app_private.storage_object_org_id(');
      v_qual := replace(v_qual, 'public.storage_object_user_id(', 'app_private.storage_object_user_id(');
    end if;

    if v_with_check is not null then
      v_with_check := replace(v_with_check, 'public.is_member_of(', 'app_private.is_member_of(');
      v_with_check := replace(v_with_check, 'public.has_role(', 'app_private.has_role(');
      v_with_check := replace(v_with_check, 'public.storage_object_org_id(', 'app_private.storage_object_org_id(');
      v_with_check := replace(v_with_check, 'public.storage_object_user_id(', 'app_private.storage_object_user_id(');
    end if;

    v_sql := format('alter policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);

    if v_qual is not null then
      v_sql := v_sql || format(' using (%s)', v_qual);
    end if;

    if v_with_check is not null then
      v_sql := v_sql || format(' with check (%s)', v_with_check);
    end if;

    execute v_sql;
  end loop;
end;
$$;

revoke execute on function public.is_member_of(uuid) from public, anon, authenticated;
revoke execute on function public.has_role(uuid, public.role_t[]) from public, anon, authenticated;
revoke execute on function public.get_user_role(uuid) from public, anon, authenticated;
revoke execute on function public.storage_object_org_id(text) from public, anon, authenticated;
revoke execute on function public.storage_object_user_id(text) from public, anon, authenticated;
