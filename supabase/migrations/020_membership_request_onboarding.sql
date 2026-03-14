-- ============================================================
-- JJVV Mobile - 020_membership_request_onboarding.sql
-- Pending membership requests, approval inbox and gated onboarding
-- ============================================================

create table if not exists public.membership_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_email text not null,
  requested_full_name text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  rejection_reason text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists membership_requests_org_status_idx
  on public.membership_requests (organization_id, status, created_at);

create index if not exists membership_requests_user_idx
  on public.membership_requests (user_id);

alter table public.membership_requests enable row level security;
alter table public.membership_requests force row level security;

drop trigger if exists set_updated_at_membership_requests on public.membership_requests;
create trigger set_updated_at_membership_requests
  before update on public.membership_requests
  for each row execute function public.trigger_set_updated_at();

create or replace function public.upsert_membership_request_for_user(
  p_user_id uuid,
  p_org_id uuid,
  p_email text default null,
  p_full_name text default null
)
returns public.membership_requests
language plpgsql
security definer
set search_path = public, app_private, auth
as $$
declare
  v_row public.membership_requests;
begin
  if p_user_id is null or p_org_id is null then
    raise exception 'User and organization are required';
  end if;

  if not exists (
    select 1
    from public.organizations o
    where o.id = p_org_id
  ) then
    raise exception 'Organization not found';
  end if;

  if exists (
    select 1
    from public.memberships m
    where m.user_id = p_user_id
      and m.is_active = true
      and m.role <> 'superadmin'::public.role_t
  ) then
    raise exception 'User already belongs to an active organization';
  end if;

  insert into public.membership_requests (
    organization_id,
    user_id,
    requested_email,
    requested_full_name,
    status,
    rejection_reason,
    reviewed_by,
    reviewed_at
  )
  values (
    p_org_id,
    p_user_id,
    coalesce(nullif(trim(p_email), ''), ''),
    nullif(trim(p_full_name), ''),
    'pending',
    null,
    null,
    null
  )
  on conflict (user_id) do update
  set
    organization_id = excluded.organization_id,
    requested_email = excluded.requested_email,
    requested_full_name = excluded.requested_full_name,
    status = 'pending',
    rejection_reason = null,
    reviewed_by = null,
    reviewed_at = null,
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.list_joinable_organizations()
returns table (
  id uuid,
  name text,
  region text,
  commune text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.id,
    o.name,
    o.region,
    o.commune
  from public.organizations o
  order by o.name asc;
$$;

create or replace function public.get_my_membership_request()
returns table (
  id uuid,
  organization_id uuid,
  organization_name text,
  requested_email text,
  requested_full_name text,
  status text,
  rejection_reason text,
  created_at timestamptz,
  reviewed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    mr.id,
    mr.organization_id,
    o.name,
    mr.requested_email,
    mr.requested_full_name,
    mr.status,
    mr.rejection_reason,
    mr.created_at,
    mr.reviewed_at
  from public.membership_requests mr
  join public.organizations o on o.id = mr.organization_id
  where mr.user_id = auth.uid()
  order by mr.updated_at desc
  limit 1;
$$;

create or replace function public.request_membership(p_org_id uuid)
returns public.membership_requests
language plpgsql
security definer
set search_path = public, app_private, auth
as $$
declare
  v_email text;
  v_full_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select u.email::text
  into v_email
  from auth.users u
  where u.id = auth.uid();

  select p.full_name
  into v_full_name
  from public.profiles p
  where p.user_id = auth.uid();

  return public.upsert_membership_request_for_user(
    auth.uid(),
    p_org_id,
    coalesce(v_email, auth.jwt() ->> 'email'),
    coalesce(v_full_name, auth.jwt() -> 'user_metadata' ->> 'full_name')
  );
end;
$$;

create or replace function public.list_organization_membership_requests(p_org_id uuid)
returns table (
  id uuid,
  user_id uuid,
  requested_email text,
  requested_full_name text,
  status text,
  rejection_reason text,
  created_at timestamptz,
  reviewed_at timestamptz
)
language sql
security definer
set search_path = public, app_private
as $$
  select
    mr.id,
    mr.user_id,
    mr.requested_email,
    mr.requested_full_name,
    mr.status,
    mr.rejection_reason,
    mr.created_at,
    mr.reviewed_at
  from public.membership_requests mr
  where mr.organization_id = p_org_id
    and mr.status = 'pending'
    and app_private.has_role(
      p_org_id,
      array['director', 'secretary', 'treasurer', 'president', 'superadmin']::public.role_t[]
    )
  order by mr.created_at asc;
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
set search_path = public, auth, app_private
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
    and app_private.has_role(
      p_org_id,
      array['director', 'secretary', 'treasurer', 'president', 'superadmin']::public.role_t[]
    )
  order by m.is_active desc, p.full_name nulls last, u.email nulls last;
$$;

create or replace function public.approve_membership_request(p_request_id uuid)
returns public.memberships
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_request public.membership_requests;
  v_membership public.memberships;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_request
  from public.membership_requests
  where id = p_request_id
    and status = 'pending';

  if v_request.id is null then
    raise exception 'Membership request not found or already processed';
  end if;

  if not app_private.has_role(
    v_request.organization_id,
    array['director', 'secretary', 'treasurer', 'president', 'superadmin']::public.role_t[]
  ) then
    raise exception 'Insufficient privileges';
  end if;

  update public.memberships
  set is_active = false
  where user_id = v_request.user_id
    and role <> 'superadmin'::public.role_t
    and organization_id <> v_request.organization_id
    and is_active = true;

  insert into public.memberships (
    organization_id,
    user_id,
    role,
    is_active
  )
  values (
    v_request.organization_id,
    v_request.user_id,
    'member'::public.role_t,
    true
  )
  on conflict (organization_id, user_id) do update
  set
    role = 'member'::public.role_t,
    is_active = true
  returning * into v_membership;

  update public.membership_requests
  set
    status = 'approved',
    rejection_reason = null,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = p_request_id;

  return v_membership;
end;
$$;

create or replace function public.reject_membership_request(
  p_request_id uuid,
  p_reason text default null
)
returns public.membership_requests
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_request public.membership_requests;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_request
  from public.membership_requests
  where id = p_request_id
    and status = 'pending';

  if v_request.id is null then
    raise exception 'Membership request not found or already processed';
  end if;

  if not app_private.has_role(
    v_request.organization_id,
    array['director', 'secretary', 'treasurer', 'president', 'superadmin']::public.role_t[]
  ) then
    raise exception 'Insufficient privileges';
  end if;

  update public.membership_requests
  set
    status = 'rejected',
    rejection_reason = nullif(trim(p_reason), ''),
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = p_request_id
  returning * into v_request;

  return v_request;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_org_id uuid;
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (user_id) do nothing;

  begin
    if nullif(coalesce(new.raw_user_meta_data->>'requested_organization_id', ''), '') is not null then
      v_org_id := (new.raw_user_meta_data->>'requested_organization_id')::uuid;
    end if;
  exception
    when others then
      v_org_id := null;
  end;

  if v_org_id is not null then
    perform public.upsert_membership_request_for_user(
      new.id,
      v_org_id,
      new.email::text,
      coalesce(new.raw_user_meta_data->>'full_name', '')
    );
  end if;

  return new;
end;
$$;

drop policy if exists "membership_request_select_own" on public.membership_requests;
create policy "membership_request_select_own"
  on public.membership_requests for select
  using (user_id = auth.uid());

drop policy if exists "membership_request_select_admin" on public.membership_requests;
create policy "membership_request_select_admin"
  on public.membership_requests for select
  using (
    app_private.has_role(
      organization_id,
      array['director', 'secretary', 'treasurer', 'president', 'superadmin']::public.role_t[]
    )
  );

drop trigger if exists audit_membership_requests on public.membership_requests;
create trigger audit_membership_requests
  after insert or update or delete on public.membership_requests
  for each row execute function public.audit_row_change();

revoke execute on function public.upsert_membership_request_for_user(uuid, uuid, text, text) from public, anon, authenticated;

revoke execute on function public.list_joinable_organizations() from public, anon, authenticated;
grant execute on function public.list_joinable_organizations() to anon, authenticated;

revoke execute on function public.get_my_membership_request() from public, anon, authenticated;
grant execute on function public.get_my_membership_request() to authenticated;

revoke execute on function public.request_membership(uuid) from public, anon, authenticated;
grant execute on function public.request_membership(uuid) to authenticated;

revoke execute on function public.list_organization_membership_requests(uuid) from public, anon, authenticated;
grant execute on function public.list_organization_membership_requests(uuid) to authenticated;

revoke execute on function public.approve_membership_request(uuid) from public, anon, authenticated;
grant execute on function public.approve_membership_request(uuid) to authenticated;

revoke execute on function public.reject_membership_request(uuid, text) from public, anon, authenticated;
grant execute on function public.reject_membership_request(uuid, text) to authenticated;
