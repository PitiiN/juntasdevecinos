-- ============================================================
-- JJVV Mobile - 014_phase2_runtime_security_hardening.sql
-- Runtime hardening after live authorization validation
-- ============================================================

-- Push tokens must stay scoped to active memberships.
delete from public.push_tokens pt
where not exists (
  select 1
  from public.memberships m
  where m.organization_id = pt.organization_id
    and m.user_id = pt.user_id
    and m.is_active = true
);

drop policy if exists "push_token_select_own" on public.push_tokens;
create policy "push_token_select_own"
  on public.push_tokens for select
  using (
    user_id = auth.uid()
    and public.is_member_of(organization_id)
  );

drop policy if exists "push_token_insert_own" on public.push_tokens;
create policy "push_token_insert_own"
  on public.push_tokens for insert
  with check (
    user_id = auth.uid()
    and public.is_member_of(organization_id)
  );

drop policy if exists "push_token_update_own" on public.push_tokens;
create policy "push_token_update_own"
  on public.push_tokens for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and public.is_member_of(organization_id)
  );

create or replace function public.approve_due_payment(p_ledger_id uuid)
returns public.dues_ledger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.dues_ledger;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_row
  from public.dues_ledger
  where id = p_ledger_id
    and public.has_role(
      organization_id,
      array['treasurer', 'president', 'superadmin']::public.role_t[]
    );

  if v_row.id is null then
    raise exception 'Due ledger entry not found or access denied';
  end if;

  update public.dues_ledger
  set status = 'paid',
      review_status = 'approved',
      paid_at = coalesce(paid_at, now()),
      rejection_reason = null,
      rejection_comment = null,
      updated_by = auth.uid()
  where id = p_ledger_id
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.reject_due_payment(
  p_ledger_id uuid,
  p_reason text,
  p_comment text default null
)
returns public.dues_ledger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.dues_ledger;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_row
  from public.dues_ledger
  where id = p_ledger_id
    and public.has_role(
      organization_id,
      array['treasurer', 'president', 'superadmin']::public.role_t[]
    );

  if v_row.id is null then
    raise exception 'Due ledger entry not found or access denied';
  end if;

  update public.dues_ledger
  set status = 'due',
      review_status = 'rejected',
      paid_at = null,
      rejection_reason = nullif(trim(p_reason), ''),
      rejection_comment = nullif(trim(p_comment), ''),
      updated_by = auth.uid()
  where id = p_ledger_id
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.set_due_status_admin(
  p_ledger_id uuid,
  p_status text
)
returns public.dues_ledger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.dues_ledger;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_status not in ('due', 'paid') then
    raise exception 'Invalid status';
  end if;

  select *
  into v_row
  from public.dues_ledger
  where id = p_ledger_id
    and public.has_role(
      organization_id,
      array['treasurer', 'president', 'superadmin']::public.role_t[]
    );

  if v_row.id is null then
    raise exception 'Due ledger entry not found or access denied';
  end if;

  update public.dues_ledger
  set status = p_status,
      review_status = case when p_status = 'paid' then 'approved' else 'none' end,
      paid_at = case when p_status = 'paid' then coalesce(paid_at, now()) else null end,
      rejection_reason = null,
      rejection_comment = null,
      updated_by = auth.uid()
  where id = p_ledger_id
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.add_ticket_comment(
  p_ticket_id uuid,
  p_body text
)
returns public.ticket_comments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.tickets;
  v_row public.ticket_comments;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if nullif(trim(p_body), '') is null then
    raise exception 'Comment body is required';
  end if;

  select *
  into v_ticket
  from public.tickets
  where id = p_ticket_id
    and (
      created_by = auth.uid()
      or public.has_role(
        organization_id,
        array['director', 'secretary', 'treasurer', 'president', 'superadmin']::public.role_t[]
      )
    );

  if v_ticket.id is null then
    raise exception 'Ticket not found or access denied';
  end if;

  insert into public.ticket_comments (
    ticket_id,
    author_id,
    body
  )
  values (
    p_ticket_id,
    auth.uid(),
    trim(p_body)
  )
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.mark_ticket_seen(
  p_ticket_id uuid,
  p_viewer text
)
returns public.tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.tickets;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_viewer = 'user' then
    select *
    into v_ticket
    from public.tickets
    where id = p_ticket_id
      and created_by = auth.uid();

    if v_ticket.id is null then
      raise exception 'Ticket not found or access denied';
    end if;

    update public.tickets
    set last_user_viewed_at = now()
    where id = p_ticket_id
    returning * into v_ticket;

    return v_ticket;
  end if;

  if p_viewer = 'admin' then
    select *
    into v_ticket
    from public.tickets
    where id = p_ticket_id
      and public.has_role(
        organization_id,
        array['director', 'secretary', 'treasurer', 'president', 'superadmin']::public.role_t[]
      );

    if v_ticket.id is null then
      raise exception 'Ticket not found or access denied';
    end if;

    update public.tickets
    set last_admin_viewed_at = now()
    where id = p_ticket_id
    returning * into v_ticket;

    return v_ticket;
  end if;

  raise exception 'Invalid viewer';
end;
$$;

create or replace function public.set_ticket_status(
  p_ticket_id uuid,
  p_status public.ticket_status_t
)
returns public.tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.tickets;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_ticket
  from public.tickets
  where id = p_ticket_id
    and public.has_role(
      organization_id,
      array['director', 'secretary', 'treasurer', 'president', 'superadmin']::public.role_t[]
    );

  if v_ticket.id is null then
    raise exception 'Ticket not found or access denied';
  end if;

  update public.tickets
  set
    status = p_status,
    last_admin_viewed_at = now()
  where id = p_ticket_id
  returning * into v_ticket;

  return v_ticket;
end;
$$;

-- Internal helpers should not be callable as public RPCs.
do $$
declare
  v_signature text;
  v_sql text;
begin
  for v_signature, v_sql in
    values
      (
        'public.superadmin_email()',
        'revoke execute on function public.superadmin_email() from public, anon, authenticated'
      ),
      (
        'public.global_superadmin_user_id()',
        'revoke execute on function public.global_superadmin_user_id() from public, anon, authenticated'
      ),
      (
        'public.is_global_superadmin()',
        'revoke execute on function public.is_global_superadmin() from public, anon, authenticated'
      ),
      (
        'public.role_rank(public.role_t)',
        'revoke execute on function public.role_rank(public.role_t) from public, anon, authenticated'
      ),
      (
        'public.is_member_of(uuid)',
        'revoke execute on function public.is_member_of(uuid) from public, anon, authenticated'
      ),
      (
        'public.has_role(uuid, public.role_t[])',
        'revoke execute on function public.has_role(uuid, public.role_t[]) from public, anon, authenticated'
      ),
      (
        'public.get_user_role(uuid)',
        'revoke execute on function public.get_user_role(uuid) from public, anon, authenticated'
      ),
      (
        'public.storage_object_org_id(text)',
        'revoke execute on function public.storage_object_org_id(text) from public, anon, authenticated'
      ),
      (
        'public.storage_object_user_id(text)',
        'revoke execute on function public.storage_object_user_id(text) from public, anon, authenticated'
      ),
      (
        'public.insert_audit_log(uuid, uuid, text, text, uuid, jsonb, jsonb)',
        'revoke execute on function public.insert_audit_log(uuid, uuid, text, text, uuid, jsonb, jsonb) from public, anon, authenticated'
      ),
      (
        'public.sync_global_superadmin_memberships(uuid)',
        'revoke execute on function public.sync_global_superadmin_memberships(uuid) from public, anon, authenticated'
      )
  loop
    if to_regprocedure(v_signature) is not null then
      execute v_sql;
    end if;
  end loop;
end;
$$;

-- Client-safe RPCs stay available only to authenticated sessions.
do $$
declare
  v_signature text;
  v_revoke_sql text;
  v_grant_sql text;
begin
  for v_signature, v_revoke_sql, v_grant_sql in
    values
      (
        'public.list_accessible_organizations()',
        'revoke execute on function public.list_accessible_organizations() from public, anon, authenticated',
        'grant execute on function public.list_accessible_organizations() to authenticated'
      ),
      (
        'public.get_my_membership_context()',
        'revoke execute on function public.get_my_membership_context() from public, anon, authenticated',
        'grant execute on function public.get_my_membership_context() to authenticated'
      ),
      (
        'public.list_organization_members(uuid)',
        'revoke execute on function public.list_organization_members(uuid) from public, anon, authenticated',
        'grant execute on function public.list_organization_members(uuid) to authenticated'
      ),
      (
        'public.update_membership_role(uuid, uuid, public.role_t)',
        'revoke execute on function public.update_membership_role(uuid, uuid, public.role_t) from public, anon, authenticated',
        'grant execute on function public.update_membership_role(uuid, uuid, public.role_t) to authenticated'
      ),
      (
        'public.set_membership_active(uuid, uuid, boolean)',
        'revoke execute on function public.set_membership_active(uuid, uuid, boolean) from public, anon, authenticated',
        'grant execute on function public.set_membership_active(uuid, uuid, boolean) to authenticated'
      ),
      (
        'public.list_polls(uuid)',
        'revoke execute on function public.list_polls(uuid) from public, anon, authenticated',
        'grant execute on function public.list_polls(uuid) to authenticated'
      ),
      (
        'public.list_organization_dues(uuid)',
        'revoke execute on function public.list_organization_dues(uuid) from public, anon, authenticated',
        'grant execute on function public.list_organization_dues(uuid) to authenticated'
      ),
      (
        'public.approve_due_payment(uuid)',
        'revoke execute on function public.approve_due_payment(uuid) from public, anon, authenticated',
        'grant execute on function public.approve_due_payment(uuid) to authenticated'
      ),
      (
        'public.reject_due_payment(uuid, text, text)',
        'revoke execute on function public.reject_due_payment(uuid, text, text) from public, anon, authenticated',
        'grant execute on function public.reject_due_payment(uuid, text, text) to authenticated'
      ),
      (
        'public.set_due_status_admin(uuid, text)',
        'revoke execute on function public.set_due_status_admin(uuid, text) from public, anon, authenticated',
        'grant execute on function public.set_due_status_admin(uuid, text) to authenticated'
      ),
      (
        'public.create_ticket(uuid, text, text, text, text)',
        'revoke execute on function public.create_ticket(uuid, text, text, text, text) from public, anon, authenticated',
        'grant execute on function public.create_ticket(uuid, text, text, text, text) to authenticated'
      ),
      (
        'public.list_my_tickets(uuid)',
        'revoke execute on function public.list_my_tickets(uuid) from public, anon, authenticated',
        'grant execute on function public.list_my_tickets(uuid) to authenticated'
      ),
      (
        'public.list_organization_tickets(uuid)',
        'revoke execute on function public.list_organization_tickets(uuid) from public, anon, authenticated',
        'grant execute on function public.list_organization_tickets(uuid) to authenticated'
      ),
      (
        'public.list_ticket_comments(uuid)',
        'revoke execute on function public.list_ticket_comments(uuid) from public, anon, authenticated',
        'grant execute on function public.list_ticket_comments(uuid) to authenticated'
      ),
      (
        'public.add_ticket_comment(uuid, text)',
        'revoke execute on function public.add_ticket_comment(uuid, text) from public, anon, authenticated',
        'grant execute on function public.add_ticket_comment(uuid, text) to authenticated'
      ),
      (
        'public.mark_ticket_seen(uuid, text)',
        'revoke execute on function public.mark_ticket_seen(uuid, text) from public, anon, authenticated',
        'grant execute on function public.mark_ticket_seen(uuid, text) to authenticated'
      ),
      (
        'public.set_ticket_status(uuid, public.ticket_status_t)',
        'revoke execute on function public.set_ticket_status(uuid, public.ticket_status_t) from public, anon, authenticated',
        'grant execute on function public.set_ticket_status(uuid, public.ticket_status_t) to authenticated'
      ),
      (
        'public.get_ticket_counters(uuid)',
        'revoke execute on function public.get_ticket_counters(uuid) from public, anon, authenticated',
        'grant execute on function public.get_ticket_counters(uuid) to authenticated'
      )
  loop
    if to_regprocedure(v_signature) is not null then
      execute v_revoke_sql;
      execute v_grant_sql;
    end if;
  end loop;
end;
$$;
