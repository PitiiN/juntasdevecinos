-- ============================================================
-- JJVV Mobile - 004_security_hardening.sql
-- Hardening: force RLS, secure RPCs, storage policies, audit
-- ============================================================

-- Missing columns used by the app
alter table public.organizations add column if not exists logo_url text;
alter table public.organizations add column if not exists directiva_image_url text;
alter table public.profiles add column if not exists address text;

-- Force RLS on all business tables
alter table public.organizations force row level security;
alter table public.memberships force row level security;
alter table public.profiles force row level security;
alter table public.announcements force row level security;
alter table public.alerts force row level security;
alter table public.events force row level security;
alter table public.event_registrations force row level security;
alter table public.tickets force row level security;
alter table public.ticket_comments force row level security;
alter table public.dues_periods force row level security;
alter table public.dues_ledger force row level security;
alter table public.documents force row level security;
alter table public.pois force row level security;
alter table public.finance_entries force row level security;
alter table public.push_tokens force row level security;
alter table public.notifications force row level security;
alter table public.audit_log force row level security;

-- Safer helper functions
create or replace function public.is_member_of(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
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
  select exists (
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
  select m.role
  from public.memberships m
  where m.organization_id = org
    and m.user_id = auth.uid()
    and m.is_active = true
  order by
    case m.role
      when 'superadmin' then 6
      when 'president' then 5
      when 'treasurer' then 4
      when 'secretary' then 3
      when 'moderator' then 2
      when 'member' then 1
      else 0
    end desc
  limit 1;
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
  select
    m.organization_id,
    m.role,
    o.name,
    o.logo_url,
    o.directiva_image_url
  from public.memberships m
  join public.organizations o on o.id = m.organization_id
  where m.user_id = auth.uid()
    and m.is_active = true
  order by
    case m.role
      when 'superadmin' then 6
      when 'president' then 5
      when 'treasurer' then 4
      when 'secretary' then 3
      when 'moderator' then 2
      when 'member' then 1
      else 0
    end desc,
    m.joined_at asc
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
    and public.has_role(p_org_id, array['president', 'superadmin']::public.role_t[])
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
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if auth.uid() = p_user_id then
    raise exception 'Self role changes are not allowed';
  end if;

  if not public.has_role(p_org_id, array['president', 'superadmin']::public.role_t[]) then
    raise exception 'Insufficient privileges';
  end if;

  update public.memberships
  set role = p_role
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

create or replace function public.storage_object_org_id(path text)
returns uuid
language plpgsql
stable
as $$
begin
  return nullif(split_part(path, '/', 1), '')::uuid;
exception
  when others then
    return null;
end;
$$;

create or replace function public.storage_object_user_id(path text)
returns uuid
language plpgsql
stable
as $$
begin
  return nullif(split_part(path, '/', 2), '')::uuid;
exception
  when others then
    return null;
end;
$$;

create or replace function public.insert_audit_log(
  p_org_id uuid,
  p_actor_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid default null,
  p_before jsonb default null,
  p_after jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.audit_log (
    organization_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    before,
    after
  )
  values (
    p_org_id,
    p_actor_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_before,
    p_after
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Guard against non-admin lateral updates
create or replace function public.guard_ticket_updates()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.created_by = auth.uid()
     and not public.has_role(old.organization_id, array['secretary', 'treasurer', 'president', 'superadmin']::public.role_t[]) then
    if new.organization_id <> old.organization_id
       or new.created_by <> old.created_by
       or new.status <> old.status
       or new.assigned_to is distinct from old.assigned_to then
      raise exception 'Only admins can change ticket status or assignment';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_ticket_updates on public.tickets;
create trigger guard_ticket_updates
  before update on public.tickets
  for each row execute function public.guard_ticket_updates();

create or replace function public.guard_due_self_updates()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.user_id = auth.uid()
     and not public.has_role(old.organization_id, array['treasurer', 'president', 'superadmin']::public.role_t[]) then
    if new.organization_id <> old.organization_id
       or new.user_id <> old.user_id
       or new.period_id <> old.period_id
       or new.status <> old.status
       or new.paid_at is distinct from old.paid_at
       or new.updated_by is distinct from old.updated_by then
      raise exception 'Residents can only submit proof_path for their own dues';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_due_self_updates on public.dues_ledger;
create trigger guard_due_self_updates
  before update on public.dues_ledger
  for each row execute function public.guard_due_self_updates();

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_entity_id uuid;
  v_before jsonb;
  v_after jsonb;
begin
  if tg_op = 'DELETE' then
    v_org_id := old.organization_id;
    v_entity_id := coalesce(old.id, old.user_id);
    v_before := to_jsonb(old);
    v_after := null;
  else
    v_org_id := new.organization_id;
    v_entity_id := coalesce(new.id, new.user_id);
    v_before := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
    v_after := to_jsonb(new);
  end if;

  if v_org_id is not null then
    perform public.insert_audit_log(
      v_org_id,
      auth.uid(),
      lower(tg_op),
      tg_table_name,
      v_entity_id,
      v_before,
      v_after
    );
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists audit_memberships on public.memberships;
create trigger audit_memberships
  after insert or update or delete on public.memberships
  for each row execute function public.audit_row_change();

drop trigger if exists audit_announcements on public.announcements;
create trigger audit_announcements
  after insert or update or delete on public.announcements
  for each row execute function public.audit_row_change();

drop trigger if exists audit_documents on public.documents;
create trigger audit_documents
  after insert or update or delete on public.documents
  for each row execute function public.audit_row_change();

drop trigger if exists audit_finance_entries on public.finance_entries;
create trigger audit_finance_entries
  after insert or update or delete on public.finance_entries
  for each row execute function public.audit_row_change();

drop trigger if exists audit_dues_ledger on public.dues_ledger;
create trigger audit_dues_ledger
  after insert or update or delete on public.dues_ledger
  for each row execute function public.audit_row_change();

-- Tighter policies
drop policy if exists "membership_update_admin" on public.memberships;
create policy "membership_update_admin"
  on public.memberships for update
  using (public.has_role(organization_id, array['president', 'superadmin']::public.role_t[]))
  with check (public.has_role(organization_id, array['president', 'superadmin']::public.role_t[]));

drop policy if exists "membership_insert_admin" on public.memberships;
create policy "membership_insert_admin"
  on public.memberships for insert
  with check (public.has_role(organization_id, array['secretary', 'president', 'superadmin']::public.role_t[]));

drop policy if exists "org_update_admin" on public.organizations;
create policy "org_update_admin"
  on public.organizations for update
  using (public.has_role(id, array['president', 'superadmin']::public.role_t[]))
  with check (public.has_role(id, array['president', 'superadmin']::public.role_t[]));

drop policy if exists "announcement_update_admin" on public.announcements;
create policy "announcement_update_admin"
  on public.announcements for update
  using (public.has_role(organization_id, array['secretary', 'president', 'superadmin']::public.role_t[]))
  with check (public.has_role(organization_id, array['secretary', 'president', 'superadmin']::public.role_t[]));

drop policy if exists "alert_update_admin" on public.alerts;
create policy "alert_update_admin"
  on public.alerts for update
  using (public.has_role(organization_id, array['moderator', 'secretary', 'president', 'superadmin']::public.role_t[]))
  with check (public.has_role(organization_id, array['moderator', 'secretary', 'president', 'superadmin']::public.role_t[]));

drop policy if exists "alert_update_own" on public.alerts;
create policy "alert_update_own"
  on public.alerts for update
  using (created_by = auth.uid() and public.is_member_of(organization_id))
  with check (created_by = auth.uid() and public.is_member_of(organization_id));

drop policy if exists "event_update_admin" on public.events;
create policy "event_update_admin"
  on public.events for update
  using (public.has_role(organization_id, array['secretary', 'president', 'superadmin']::public.role_t[]))
  with check (public.has_role(organization_id, array['secretary', 'president', 'superadmin']::public.role_t[]));

drop policy if exists "ticket_update_admin" on public.tickets;
create policy "ticket_update_admin"
  on public.tickets for update
  using (public.has_role(organization_id, array['secretary', 'treasurer', 'president', 'superadmin']::public.role_t[]))
  with check (public.has_role(organization_id, array['secretary', 'treasurer', 'president', 'superadmin']::public.role_t[]));

drop policy if exists "ticket_update_own" on public.tickets;
create policy "ticket_update_own"
  on public.tickets for update
  using (created_by = auth.uid() and public.is_member_of(organization_id))
  with check (created_by = auth.uid() and public.is_member_of(organization_id));

drop policy if exists "dues_ledger_update_admin" on public.dues_ledger;
create policy "dues_ledger_update_admin"
  on public.dues_ledger for update
  using (public.has_role(organization_id, array['treasurer', 'president', 'superadmin']::public.role_t[]))
  with check (public.has_role(organization_id, array['treasurer', 'president', 'superadmin']::public.role_t[]));

drop policy if exists "dues_ledger_update_own" on public.dues_ledger;
create policy "dues_ledger_update_own"
  on public.dues_ledger for update
  using (user_id = auth.uid() and public.is_member_of(organization_id))
  with check (user_id = auth.uid() and public.is_member_of(organization_id));

drop policy if exists "document_update_admin" on public.documents;
create policy "document_update_admin"
  on public.documents for update
  using (public.has_role(organization_id, array['secretary', 'president', 'superadmin']::public.role_t[]))
  with check (public.has_role(organization_id, array['secretary', 'president', 'superadmin']::public.role_t[]));

drop policy if exists "finance_select_member" on public.finance_entries;
create policy "finance_select_member"
  on public.finance_entries for select
  using (
    public.is_member_of(organization_id)
    and (
      approval_status = 'approved'
      or public.has_role(organization_id, array['treasurer', 'president', 'superadmin']::public.role_t[])
    )
  );

drop policy if exists "finance_update_admin" on public.finance_entries;
create policy "finance_update_admin"
  on public.finance_entries for update
  using (public.has_role(organization_id, array['treasurer', 'president', 'superadmin']::public.role_t[]))
  with check (public.has_role(organization_id, array['treasurer', 'president', 'superadmin']::public.role_t[]));

drop policy if exists "push_token_update_own" on public.push_tokens;
create policy "push_token_update_own"
  on public.push_tokens for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Storage buckets
insert into storage.buckets (id, name, public)
select 'jjvv-documents', 'jjvv-documents', false
where not exists (select 1 from storage.buckets where id = 'jjvv-documents');

insert into storage.buckets (id, name, public)
select 'jjvv-dues-proofs', 'jjvv-dues-proofs', false
where not exists (select 1 from storage.buckets where id = 'jjvv-dues-proofs');

insert into storage.buckets (id, name, public)
select 'jjvv-directiva', 'jjvv-directiva', false
where not exists (select 1 from storage.buckets where id = 'jjvv-directiva');

drop policy if exists "jjvv_documents_select" on storage.objects;
create policy "jjvv_documents_select"
  on storage.objects for select
  using (
    bucket_id = 'jjvv-documents'
    and public.is_member_of(public.storage_object_org_id(name))
  );

drop policy if exists "jjvv_documents_write" on storage.objects;
create policy "jjvv_documents_write"
  on storage.objects for all
  using (
    bucket_id = 'jjvv-documents'
    and public.has_role(public.storage_object_org_id(name), array['secretary', 'president', 'superadmin']::public.role_t[])
  )
  with check (
    bucket_id = 'jjvv-documents'
    and public.has_role(public.storage_object_org_id(name), array['secretary', 'president', 'superadmin']::public.role_t[])
  );

drop policy if exists "jjvv_dues_select" on storage.objects;
create policy "jjvv_dues_select"
  on storage.objects for select
  using (
    bucket_id = 'jjvv-dues-proofs'
    and (
      public.storage_object_user_id(name) = auth.uid()
      or public.has_role(public.storage_object_org_id(name), array['treasurer', 'president', 'superadmin']::public.role_t[])
    )
  );

drop policy if exists "jjvv_dues_insert" on storage.objects;
create policy "jjvv_dues_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'jjvv-dues-proofs'
    and public.storage_object_user_id(name) = auth.uid()
    and public.is_member_of(public.storage_object_org_id(name))
  );

drop policy if exists "jjvv_dues_delete" on storage.objects;
create policy "jjvv_dues_delete"
  on storage.objects for delete
  using (
    bucket_id = 'jjvv-dues-proofs'
    and public.has_role(public.storage_object_org_id(name), array['treasurer', 'president', 'superadmin']::public.role_t[])
  );

drop policy if exists "jjvv_directiva_select" on storage.objects;
create policy "jjvv_directiva_select"
  on storage.objects for select
  using (
    bucket_id = 'jjvv-directiva'
    and public.is_member_of(public.storage_object_org_id(name))
  );

drop policy if exists "jjvv_directiva_write" on storage.objects;
create policy "jjvv_directiva_write"
  on storage.objects for all
  using (
    bucket_id = 'jjvv-directiva'
    and public.has_role(public.storage_object_org_id(name), array['president', 'superadmin']::public.role_t[])
  )
  with check (
    bucket_id = 'jjvv-directiva'
    and public.has_role(public.storage_object_org_id(name), array['president', 'superadmin']::public.role_t[])
  );

-- Useful indexes for 100 concurrent users without over-querying
create index if not exists memberships_org_active_user_idx on public.memberships (organization_id, is_active, user_id);
create index if not exists announcements_org_deleted_pub_idx on public.announcements (organization_id, is_deleted, published_at desc);
create index if not exists event_registrations_event_user_idx on public.event_registrations (event_id, user_id);
create index if not exists ticket_comments_ticket_created_idx on public.ticket_comments (ticket_id, created_at);
create index if not exists dues_ledger_org_user_idx on public.dues_ledger (organization_id, user_id);
create index if not exists finance_entries_org_approval_date_idx on public.finance_entries (organization_id, approval_status, entry_date desc);
create index if not exists push_tokens_org_enabled_idx on public.push_tokens (organization_id, enabled);
