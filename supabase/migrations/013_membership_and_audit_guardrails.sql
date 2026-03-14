-- ============================================================
-- JJVV Mobile - 013_membership_and_audit_guardrails.sql
-- Protect global superadmin memberships and audit integrity
-- ============================================================

drop policy if exists "audit_insert_admin" on public.audit_log;

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

  if p_user_id = public.global_superadmin_user_id() then
    raise exception 'Global superadmin membership is protected';
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

create or replace function public.set_membership_active(
  p_org_id uuid,
  p_user_id uuid,
  p_is_active boolean
)
returns public.memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.memberships;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if auth.uid() = p_user_id then
    raise exception 'Self deactivation is not allowed';
  end if;

  if p_user_id = public.global_superadmin_user_id() then
    raise exception 'Global superadmin membership is protected';
  end if;

  if not public.has_role(p_org_id, array['president', 'superadmin']::public.role_t[]) then
    raise exception 'Insufficient privileges';
  end if;

  update public.memberships
  set is_active = p_is_active
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
  using (
    public.has_role(organization_id, array['president', 'superadmin']::public.role_t[])
    and role <> 'superadmin'
    and user_id is distinct from public.global_superadmin_user_id()
  )
  with check (
    public.has_role(organization_id, array['president', 'superadmin']::public.role_t[])
    and role <> 'superadmin'
    and user_id is distinct from public.global_superadmin_user_id()
  );

drop policy if exists "membership_delete_admin" on public.memberships;
create policy "membership_delete_admin"
  on public.memberships for delete
  using (
    public.has_role(organization_id, array['president', 'superadmin']::public.role_t[])
    and role <> 'superadmin'
    and user_id is distinct from public.global_superadmin_user_id()
  );
