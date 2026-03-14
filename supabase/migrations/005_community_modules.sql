-- ============================================================
-- JJVV Mobile - 005_community_modules.sql
-- Community modules: polls, favors, document metadata
-- ============================================================

alter table public.documents
  add column if not exists folder text not null default 'General',
  add column if not exists original_file_name text,
  add column if not exists mime_type text,
  add column if not exists file_size_bytes bigint;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'documents_folder_check'
  ) then
    alter table public.documents
      add constraint documents_folder_check
      check (folder in ('Actas', 'Documentos relativos', 'Documentos contables', 'General'));
  end if;
end $$;

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  question text not null check (length(trim(question)) between 5 and 400),
  deadline timestamptz not null,
  allow_multiple boolean not null default false,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  is_deleted boolean not null default false
);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_text text not null check (length(trim(option_text)) between 1 and 160),
  sort_order int not null default 0,
  unique (poll_id, sort_order)
);

create table if not exists public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid not null references public.poll_options(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (poll_id, user_id, option_id)
);

create table if not exists public.favors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) between 3 and 160),
  description text not null check (length(trim(description)) between 5 and 2000),
  author_name text not null,
  user_email text,
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.favor_replies (
  id uuid primary key default gen_random_uuid(),
  favor_id uuid not null references public.favors(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  message text not null check (length(trim(message)) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;
alter table public.favors enable row level security;
alter table public.favor_replies enable row level security;

alter table public.polls force row level security;
alter table public.poll_options force row level security;
alter table public.poll_votes force row level security;
alter table public.favors force row level security;
alter table public.favor_replies force row level security;

create or replace function public.list_polls(p_org_id uuid)
returns table (
  id uuid,
  question text,
  deadline timestamptz,
  allow_multiple boolean,
  created_at timestamptz,
  total_votes int,
  options jsonb,
  my_option_ids uuid[]
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.question,
    p.deadline,
    p.allow_multiple,
    p.created_at,
    coalesce((
      select count(*)::int
      from public.poll_votes pv_count
      where pv_count.poll_id = p.id
    ), 0) as total_votes,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', po.id,
          'text', po.option_text,
          'votes', coalesce(v.vote_count, 0)
        )
        order by po.sort_order
      ) filter (where po.id is not null),
      '[]'::jsonb
    ) as options,
    coalesce(
      array_agg(distinct my_vote.option_id) filter (where my_vote.option_id is not null),
      '{}'::uuid[]
    ) as my_option_ids
  from public.polls p
  left join public.poll_options po on po.poll_id = p.id
  left join lateral (
    select count(*)::int as vote_count
    from public.poll_votes pv_option
    where pv_option.option_id = po.id
  ) v on true
  left join public.poll_votes my_vote
    on my_vote.option_id = po.id
   and my_vote.user_id = auth.uid()
  where p.organization_id = p_org_id
    and p.is_deleted = false
    and public.is_member_of(p.organization_id)
  group by p.id, p.question, p.deadline, p.allow_multiple, p.created_at
  order by p.created_at desc;
$$;

create or replace function public.validate_poll_vote()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_poll public.polls;
  v_option_poll_id uuid;
begin
  select p.*
    into v_poll
  from public.polls p
  where p.id = new.poll_id
    and p.is_deleted = false;

  if v_poll.id is null then
    raise exception 'Poll not found';
  end if;

  select po.poll_id
    into v_option_poll_id
  from public.poll_options po
  where po.id = new.option_id;

  if v_option_poll_id is null or v_option_poll_id <> new.poll_id then
    raise exception 'Option does not belong to poll';
  end if;

  if not public.is_member_of(v_poll.organization_id) then
    raise exception 'Not authorized to vote in this organization';
  end if;

  if not v_poll.allow_multiple and exists (
    select 1
    from public.poll_votes pv
    where pv.poll_id = new.poll_id
      and pv.user_id = new.user_id
      and pv.option_id <> new.option_id
  ) then
    raise exception 'This poll only allows one option';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_poll_vote on public.poll_votes;
create trigger validate_poll_vote
  before insert or update on public.poll_votes
  for each row execute function public.validate_poll_vote();

drop trigger if exists set_updated_at_favors on public.favors;
create trigger set_updated_at_favors
  before update on public.favors
  for each row execute function public.trigger_set_updated_at();

drop policy if exists "poll_select_member" on public.polls;
create policy "poll_select_member"
  on public.polls for select
  using (public.is_member_of(organization_id) and is_deleted = false);

drop policy if exists "poll_insert_admin" on public.polls;
create policy "poll_insert_admin"
  on public.polls for insert
  with check (
    created_by = auth.uid()
    and public.has_role(organization_id, array['secretary', 'president', 'superadmin']::public.role_t[])
  );

drop policy if exists "poll_update_admin" on public.polls;
create policy "poll_update_admin"
  on public.polls for update
  using (public.has_role(organization_id, array['secretary', 'president', 'superadmin']::public.role_t[]))
  with check (public.has_role(organization_id, array['secretary', 'president', 'superadmin']::public.role_t[]));

drop policy if exists "poll_delete_admin" on public.polls;
create policy "poll_delete_admin"
  on public.polls for delete
  using (public.has_role(organization_id, array['president', 'superadmin']::public.role_t[]));

drop policy if exists "poll_option_select_member" on public.poll_options;
create policy "poll_option_select_member"
  on public.poll_options for select
  using (
    exists (
      select 1
      from public.polls p
      where p.id = poll_options.poll_id
        and p.is_deleted = false
        and public.is_member_of(p.organization_id)
    )
  );

drop policy if exists "poll_option_insert_admin" on public.poll_options;
create policy "poll_option_insert_admin"
  on public.poll_options for insert
  with check (
    exists (
      select 1
      from public.polls p
      where p.id = poll_options.poll_id
        and public.has_role(p.organization_id, array['secretary', 'president', 'superadmin']::public.role_t[])
    )
  );

drop policy if exists "poll_option_update_admin" on public.poll_options;
create policy "poll_option_update_admin"
  on public.poll_options for update
  using (
    exists (
      select 1
      from public.polls p
      where p.id = poll_options.poll_id
        and public.has_role(p.organization_id, array['secretary', 'president', 'superadmin']::public.role_t[])
    )
  )
  with check (
    exists (
      select 1
      from public.polls p
      where p.id = poll_options.poll_id
        and public.has_role(p.organization_id, array['secretary', 'president', 'superadmin']::public.role_t[])
    )
  );

drop policy if exists "poll_option_delete_admin" on public.poll_options;
create policy "poll_option_delete_admin"
  on public.poll_options for delete
  using (
    exists (
      select 1
      from public.polls p
      where p.id = poll_options.poll_id
        and public.has_role(p.organization_id, array['president', 'superadmin']::public.role_t[])
    )
  );

drop policy if exists "poll_vote_select_own_or_admin" on public.poll_votes;
create policy "poll_vote_select_own_or_admin"
  on public.poll_votes for select
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.polls p
      where p.id = poll_votes.poll_id
        and public.has_role(p.organization_id, array['secretary', 'president', 'superadmin']::public.role_t[])
    )
  );

drop policy if exists "poll_vote_insert_own" on public.poll_votes;
create policy "poll_vote_insert_own"
  on public.poll_votes for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.polls p
      where p.id = poll_votes.poll_id
        and p.is_deleted = false
        and public.is_member_of(p.organization_id)
    )
  );

drop policy if exists "poll_vote_delete_own" on public.poll_votes;
create policy "poll_vote_delete_own"
  on public.poll_votes for delete
  using (user_id = auth.uid());

drop policy if exists "favor_select_member" on public.favors;
create policy "favor_select_member"
  on public.favors for select
  using (public.is_member_of(organization_id));

drop policy if exists "favor_insert_member" on public.favors;
create policy "favor_insert_member"
  on public.favors for insert
  with check (user_id = auth.uid() and public.is_member_of(organization_id));

drop policy if exists "favor_update_owner_or_admin" on public.favors;
create policy "favor_update_owner_or_admin"
  on public.favors for update
  using (
    user_id = auth.uid()
    or public.has_role(organization_id, array['moderator', 'secretary', 'president', 'superadmin']::public.role_t[])
  )
  with check (
    user_id = auth.uid()
    or public.has_role(organization_id, array['moderator', 'secretary', 'president', 'superadmin']::public.role_t[])
  );

drop policy if exists "favor_delete_owner_or_admin" on public.favors;
create policy "favor_delete_owner_or_admin"
  on public.favors for delete
  using (
    user_id = auth.uid()
    or public.has_role(organization_id, array['moderator', 'secretary', 'president', 'superadmin']::public.role_t[])
  );

drop policy if exists "favor_reply_select_member" on public.favor_replies;
create policy "favor_reply_select_member"
  on public.favor_replies for select
  using (
    exists (
      select 1
      from public.favors f
      where f.id = favor_replies.favor_id
        and public.is_member_of(f.organization_id)
    )
  );

drop policy if exists "favor_reply_insert_member" on public.favor_replies;
create policy "favor_reply_insert_member"
  on public.favor_replies for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.favors f
      where f.id = favor_replies.favor_id
        and public.is_member_of(f.organization_id)
    )
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
        and public.has_role(f.organization_id, array['moderator', 'secretary', 'president', 'superadmin']::public.role_t[])
    )
  );

drop trigger if exists audit_polls on public.polls;
create trigger audit_polls
  after insert or update or delete on public.polls
  for each row execute function public.audit_row_change();

drop trigger if exists audit_favors on public.favors;
create trigger audit_favors
  after insert or update or delete on public.favors
  for each row execute function public.audit_row_change();

create index if not exists documents_org_folder_created_idx on public.documents (organization_id, folder, created_at desc);
create index if not exists polls_org_deadline_idx on public.polls (organization_id, deadline desc) where is_deleted = false;
create index if not exists poll_options_poll_sort_idx on public.poll_options (poll_id, sort_order);
create index if not exists poll_votes_poll_user_idx on public.poll_votes (poll_id, user_id);
create index if not exists favors_org_resolved_created_idx on public.favors (organization_id, resolved, created_at desc);
create index if not exists favor_replies_favor_created_idx on public.favor_replies (favor_id, created_at);
