-- ============================================================
-- JJVV Mobile - 010_tickets_secure_workflow.sql
-- Tickets/Solicitudes secure workflow, RPCs and private storage
-- ============================================================

alter table public.tickets
  add column if not exists tracking_code text,
  add column if not exists attachment_path text,
  add column if not exists last_user_viewed_at timestamptz,
  add column if not exists last_admin_viewed_at timestamptz,
  add column if not exists closed_at timestamptz;

create sequence if not exists public.ticket_tracking_seq;

create unique index if not exists tickets_tracking_code_idx
  on public.tickets (tracking_code)
  where tracking_code is not null;

create index if not exists tickets_org_user_updated_idx
  on public.tickets (organization_id, created_by, updated_at desc);

create or replace function public.assign_ticket_defaults()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.tracking_code is null then
    new.tracking_code := format(
      'SOL-%s-%s',
      to_char(coalesce(new.created_at, now()), 'YYYYMM'),
      lpad(nextval('public.ticket_tracking_seq')::text, 6, '0')
    );
  end if;

  if new.last_user_viewed_at is null and new.created_by = auth.uid() then
    new.last_user_viewed_at := coalesce(new.created_at, now());
  end if;

  if new.attachment_path is not null then
    if public.storage_object_org_id(new.attachment_path) is distinct from new.organization_id
       or public.storage_object_user_id(new.attachment_path) is distinct from new.created_by then
      raise exception 'Invalid ticket attachment scope';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists assign_ticket_defaults on public.tickets;
create trigger assign_ticket_defaults
  before insert on public.tickets
  for each row execute function public.assign_ticket_defaults();

create or replace function public.guard_ticket_updates()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_is_admin boolean;
begin
  v_is_admin := public.has_role(
    old.organization_id,
    array['director', 'secretary', 'treasurer', 'president', 'superadmin']::public.role_t[]
  );

  if new.organization_id <> old.organization_id or new.created_by <> old.created_by then
    raise exception 'Immutable ticket ownership fields';
  end if;

  if not v_is_admin then
    if old.created_by <> auth.uid() then
      raise exception 'Only the creator can update this ticket';
    end if;

    if coalesce(new.title, '') <> coalesce(old.title, '')
       or coalesce(new.description, '') <> coalesce(old.description, '')
       or coalesce(new.category, '') <> coalesce(old.category, '')
       or new.status <> old.status
       or new.assigned_to is distinct from old.assigned_to
       or new.attachment_path is distinct from old.attachment_path
       or new.last_admin_viewed_at is distinct from old.last_admin_viewed_at
       or new.closed_at is distinct from old.closed_at then
      raise exception 'Members can only mark their own ticket as seen';
    end if;
  else
    if new.attachment_path is distinct from old.attachment_path then
      raise exception 'Ticket attachment cannot be replaced after creation';
    end if;

    if old.status is distinct from new.status then
      if new.status in ('resolved', 'rejected') then
        new.closed_at := now();
      else
        new.closed_at := null;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_ticket_updates on public.tickets;
create trigger guard_ticket_updates
  before update on public.tickets
  for each row execute function public.guard_ticket_updates();

create or replace function public.touch_ticket_after_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.tickets;
begin
  select *
  into v_ticket
  from public.tickets
  where id = new.ticket_id;

  if v_ticket.id is null then
    return new;
  end if;

  update public.tickets
  set
    last_user_viewed_at = case
      when new.author_id = v_ticket.created_by then now()
      else last_user_viewed_at
    end,
    last_admin_viewed_at = case
      when new.author_id <> v_ticket.created_by then now()
      else last_admin_viewed_at
    end
  where id = new.ticket_id;

  return new;
end;
$$;

drop trigger if exists touch_ticket_after_comment on public.ticket_comments;
create trigger touch_ticket_after_comment
  after insert on public.ticket_comments
  for each row execute function public.touch_ticket_after_comment();

drop trigger if exists audit_tickets on public.tickets;
create trigger audit_tickets
  after insert or update or delete on public.tickets
  for each row execute function public.audit_row_change();

create or replace function public.create_ticket(
  p_org_id uuid,
  p_title text,
  p_description text default null,
  p_category text default 'general',
  p_attachment_path text default null
)
returns public.tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.tickets;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_member_of(p_org_id) then
    raise exception 'Membership required';
  end if;

  if nullif(trim(p_title), '') is null then
    raise exception 'Title is required';
  end if;

  if p_attachment_path is not null then
    if public.storage_object_org_id(p_attachment_path) is distinct from p_org_id
       or public.storage_object_user_id(p_attachment_path) is distinct from auth.uid() then
      raise exception 'Invalid ticket attachment scope';
    end if;
  end if;

  insert into public.tickets (
    organization_id,
    created_by,
    title,
    description,
    category,
    attachment_path
  )
  values (
    p_org_id,
    auth.uid(),
    trim(p_title),
    nullif(trim(p_description), ''),
    coalesce(nullif(trim(p_category), ''), 'general'),
    p_attachment_path
  )
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.list_my_tickets(p_org_id uuid)
returns table (
  id uuid,
  organization_id uuid,
  created_by uuid,
  reporter_name text,
  reporter_email text,
  title text,
  description text,
  category text,
  status public.ticket_status_t,
  tracking_code text,
  attachment_path text,
  created_at timestamptz,
  updated_at timestamptz,
  last_user_viewed_at timestamptz,
  last_admin_viewed_at timestamptz,
  reply_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    t.id,
    t.organization_id,
    t.created_by,
    coalesce(p.full_name, split_part(u.email::text, '@', 1)) as reporter_name,
    u.email::text as reporter_email,
    t.title,
    coalesce(t.description, '') as description,
    t.category,
    t.status,
    t.tracking_code,
    t.attachment_path,
    t.created_at,
    t.updated_at,
    t.last_user_viewed_at,
    t.last_admin_viewed_at,
    (
      select count(*)
      from public.ticket_comments tc
      where tc.ticket_id = t.id
    ) as reply_count
  from public.tickets t
  left join public.profiles p on p.user_id = t.created_by
  left join auth.users u on u.id = t.created_by
  where t.organization_id = p_org_id
    and t.created_by = auth.uid()
    and public.is_member_of(p_org_id)
  order by t.updated_at desc;
$$;

create or replace function public.list_organization_tickets(p_org_id uuid)
returns table (
  id uuid,
  organization_id uuid,
  created_by uuid,
  reporter_name text,
  reporter_email text,
  title text,
  description text,
  category text,
  status public.ticket_status_t,
  tracking_code text,
  attachment_path text,
  created_at timestamptz,
  updated_at timestamptz,
  last_user_viewed_at timestamptz,
  last_admin_viewed_at timestamptz,
  reply_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    t.id,
    t.organization_id,
    t.created_by,
    coalesce(p.full_name, split_part(u.email::text, '@', 1)) as reporter_name,
    u.email::text as reporter_email,
    t.title,
    coalesce(t.description, '') as description,
    t.category,
    t.status,
    t.tracking_code,
    t.attachment_path,
    t.created_at,
    t.updated_at,
    t.last_user_viewed_at,
    t.last_admin_viewed_at,
    (
      select count(*)
      from public.ticket_comments tc
      where tc.ticket_id = t.id
    ) as reply_count
  from public.tickets t
  left join public.profiles p on p.user_id = t.created_by
  left join auth.users u on u.id = t.created_by
  where t.organization_id = p_org_id
    and public.has_role(
      p_org_id,
      array['director', 'secretary', 'treasurer', 'president', 'superadmin']::public.role_t[]
    )
  order by t.updated_at desc;
$$;

create or replace function public.list_ticket_comments(p_ticket_id uuid)
returns table (
  id uuid,
  ticket_id uuid,
  author_id uuid,
  author_name text,
  author_kind text,
  body text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    c.id,
    c.ticket_id,
    c.author_id,
    coalesce(p.full_name, split_part(u.email::text, '@', 1)) as author_name,
    case when c.author_id = t.created_by then 'user' else 'admin' end as author_kind,
    c.body,
    c.created_at
  from public.ticket_comments c
  join public.tickets t on t.id = c.ticket_id
  left join public.profiles p on p.user_id = c.author_id
  left join auth.users u on u.id = c.author_id
  where c.ticket_id = p_ticket_id
    and (
      t.created_by = auth.uid()
      or public.has_role(
        t.organization_id,
        array['director', 'secretary', 'treasurer', 'president', 'superadmin']::public.role_t[]
      )
    )
  order by c.created_at asc;
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
  where id = p_ticket_id;

  if v_ticket.id is null then
    raise exception 'Ticket not found';
  end if;

  if not (
    v_ticket.created_by = auth.uid()
    or public.has_role(
      v_ticket.organization_id,
      array['director', 'secretary', 'treasurer', 'president', 'superadmin']::public.role_t[]
    )
  ) then
    raise exception 'Insufficient privileges';
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
  select *
  into v_ticket
  from public.tickets
  where id = p_ticket_id;

  if v_ticket.id is null then
    raise exception 'Ticket not found';
  end if;

  if p_viewer = 'user' then
    if v_ticket.created_by <> auth.uid() then
      raise exception 'Only the creator can mark this ticket as seen';
    end if;

    update public.tickets
    set last_user_viewed_at = now()
    where id = p_ticket_id
    returning * into v_ticket;

    return v_ticket;
  end if;

  if p_viewer = 'admin' then
    if not public.has_role(
      v_ticket.organization_id,
      array['director', 'secretary', 'treasurer', 'president', 'superadmin']::public.role_t[]
    ) then
      raise exception 'Insufficient privileges';
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
  select *
  into v_ticket
  from public.tickets
  where id = p_ticket_id;

  if v_ticket.id is null then
    raise exception 'Ticket not found';
  end if;

  if not public.has_role(
    v_ticket.organization_id,
    array['director', 'secretary', 'treasurer', 'president', 'superadmin']::public.role_t[]
  ) then
    raise exception 'Insufficient privileges';
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

create or replace function public.get_ticket_counters(p_org_id uuid)
returns table (
  my_unread_count bigint,
  admin_unread_count bigint,
  open_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    (
      select count(*)
      from public.tickets t
      where t.organization_id = p_org_id
        and t.created_by = auth.uid()
        and t.updated_at > coalesce(t.last_user_viewed_at, '-infinity'::timestamptz)
    ) as my_unread_count,
    (
      select count(*)
      from public.tickets t
      where t.organization_id = p_org_id
        and public.has_role(
          p_org_id,
          array['director', 'secretary', 'treasurer', 'president', 'superadmin']::public.role_t[]
        )
        and t.updated_at > coalesce(t.last_admin_viewed_at, '-infinity'::timestamptz)
    ) as admin_unread_count,
    (
      select count(*)
      from public.tickets t
      where t.organization_id = p_org_id
        and t.status = 'open'
        and public.is_member_of(p_org_id)
    ) as open_count;
$$;

drop policy if exists "ticket_select_admin" on public.tickets;
create policy "ticket_select_admin"
  on public.tickets for select
  using (
    public.has_role(
      organization_id,
      array['director', 'secretary', 'treasurer', 'president', 'superadmin']::public.role_t[]
    )
  );

drop policy if exists "ticket_update_admin" on public.tickets;
create policy "ticket_update_admin"
  on public.tickets for update
  using (
    public.has_role(
      organization_id,
      array['director', 'secretary', 'treasurer', 'president', 'superadmin']::public.role_t[]
    )
  )
  with check (
    public.has_role(
      organization_id,
      array['director', 'secretary', 'treasurer', 'president', 'superadmin']::public.role_t[]
    )
  );

drop policy if exists "ticket_update_own" on public.tickets;
create policy "ticket_update_own"
  on public.tickets for update
  using (created_by = auth.uid() and public.is_member_of(organization_id))
  with check (created_by = auth.uid() and public.is_member_of(organization_id));

drop policy if exists "ticket_comment_select" on public.ticket_comments;
create policy "ticket_comment_select"
  on public.ticket_comments for select
  using (
    exists (
      select 1
      from public.tickets t
      where t.id = ticket_comments.ticket_id
        and (
          t.created_by = auth.uid()
          or public.has_role(
            t.organization_id,
            array['director', 'secretary', 'treasurer', 'president', 'superadmin']::public.role_t[]
          )
        )
    )
  );

drop policy if exists "ticket_comment_insert" on public.ticket_comments;
create policy "ticket_comment_insert"
  on public.ticket_comments for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1
      from public.tickets t
      where t.id = ticket_comments.ticket_id
        and (
          t.created_by = auth.uid()
          or public.has_role(
            t.organization_id,
            array['director', 'secretary', 'treasurer', 'president', 'superadmin']::public.role_t[]
          )
        )
    )
  );

insert into storage.buckets (id, name, public)
select 'jjvv-ticket-attachments', 'jjvv-ticket-attachments', false
where not exists (
  select 1
  from storage.buckets
  where id = 'jjvv-ticket-attachments'
);

drop policy if exists "jjvv_ticket_attachments_select" on storage.objects;
create policy "jjvv_ticket_attachments_select"
  on storage.objects for select
  using (
    bucket_id = 'jjvv-ticket-attachments'
    and (
      (
        public.storage_object_user_id(name) = auth.uid()
        and public.is_member_of(public.storage_object_org_id(name))
      )
      or public.has_role(
        public.storage_object_org_id(name),
        array['director', 'secretary', 'treasurer', 'president', 'superadmin']::public.role_t[]
      )
    )
  );

drop policy if exists "jjvv_ticket_attachments_insert" on storage.objects;
create policy "jjvv_ticket_attachments_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'jjvv-ticket-attachments'
    and public.storage_object_user_id(name) = auth.uid()
    and public.is_member_of(public.storage_object_org_id(name))
  );

drop policy if exists "jjvv_ticket_attachments_delete" on storage.objects;
create policy "jjvv_ticket_attachments_delete"
  on storage.objects for delete
  using (
    bucket_id = 'jjvv-ticket-attachments'
    and (
      public.storage_object_user_id(name) = auth.uid()
      or public.has_role(
        public.storage_object_org_id(name),
        array['director', 'secretary', 'treasurer', 'president', 'superadmin']::public.role_t[]
      )
    )
  );
