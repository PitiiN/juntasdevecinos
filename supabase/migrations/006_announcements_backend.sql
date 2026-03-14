-- ============================================================
-- JJVV Mobile - 006_announcements_backend.sql
-- Announcements metadata and threaded replies
-- ============================================================

alter table public.announcements
  add column if not exists location text,
  add column if not exists schedule text,
  add column if not exists expires_at timestamptz;

create table if not exists public.announcement_replies (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  body text not null check (length(trim(body)) between 1 and 2000),
  media_type text,
  media_path text,
  created_at timestamptz not null default now(),
  check (media_type in ('image', 'video', 'audio') or media_type is null)
);

alter table public.announcement_replies enable row level security;
alter table public.announcement_replies force row level security;

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
  v_announcement_id uuid;
begin
  if tg_op = 'DELETE' then
    v_entity_id := coalesce(old.id, old.user_id);
    v_before := to_jsonb(old);
    v_after := null;
  else
    v_entity_id := coalesce(new.id, new.user_id);
    v_before := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
    v_after := to_jsonb(new);
  end if;

  if tg_table_name = 'announcement_replies' then
    v_announcement_id := coalesce(new.announcement_id, old.announcement_id);
    select a.organization_id into v_org_id
    from public.announcements a
    where a.id = v_announcement_id;
  else
    v_org_id := coalesce(new.organization_id, old.organization_id);
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

drop policy if exists "announcement_update_admin" on public.announcements;
create policy "announcement_update_admin"
  on public.announcements for update
  using (public.has_role(organization_id, array['secretary', 'president', 'superadmin']::public.role_t[]))
  with check (public.has_role(organization_id, array['secretary', 'president', 'superadmin']::public.role_t[]));

drop policy if exists "announcement_reply_select_member" on public.announcement_replies;
create policy "announcement_reply_select_member"
  on public.announcement_replies for select
  using (
    exists (
      select 1
      from public.announcements a
      where a.id = announcement_replies.announcement_id
        and a.is_deleted = false
        and public.is_member_of(a.organization_id)
    )
  );

drop policy if exists "announcement_reply_insert_member" on public.announcement_replies;
create policy "announcement_reply_insert_member"
  on public.announcement_replies for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1
      from public.announcements a
      where a.id = announcement_replies.announcement_id
        and a.is_deleted = false
        and public.is_member_of(a.organization_id)
    )
  );

drop policy if exists "announcement_reply_delete_owner_or_admin" on public.announcement_replies;
create policy "announcement_reply_delete_owner_or_admin"
  on public.announcement_replies for delete
  using (
    author_id = auth.uid()
    or exists (
      select 1
      from public.announcements a
      where a.id = announcement_replies.announcement_id
        and public.has_role(a.organization_id, array['secretary', 'president', 'superadmin']::public.role_t[])
    )
  );

drop trigger if exists audit_announcement_replies on public.announcement_replies;
create trigger audit_announcement_replies
  after insert or update or delete on public.announcement_replies
  for each row execute function public.audit_row_change();

create index if not exists announcements_org_expiry_idx on public.announcements (organization_id, expires_at, published_at desc);
create index if not exists announcement_replies_announcement_created_idx on public.announcement_replies (announcement_id, created_at);
