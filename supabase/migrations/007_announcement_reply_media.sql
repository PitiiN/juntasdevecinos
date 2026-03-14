-- ============================================================
-- JJVV Mobile - 007_announcement_reply_media.sql
-- Private storage and integrity checks for announcement replies
-- ============================================================

insert into storage.buckets (id, name, public)
select 'jjvv-announcement-replies', 'jjvv-announcement-replies', false
where not exists (
  select 1
  from storage.buckets
  where id = 'jjvv-announcement-replies'
);

drop policy if exists "jjvv_announcement_reply_media_select" on storage.objects;
create policy "jjvv_announcement_reply_media_select"
  on storage.objects for select
  using (
    bucket_id = 'jjvv-announcement-replies'
    and public.is_member_of(public.storage_object_org_id(name))
  );

drop policy if exists "jjvv_announcement_reply_media_insert" on storage.objects;
create policy "jjvv_announcement_reply_media_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'jjvv-announcement-replies'
    and public.storage_object_user_id(name) = auth.uid()
    and public.is_member_of(public.storage_object_org_id(name))
  );

drop policy if exists "jjvv_announcement_reply_media_delete" on storage.objects;
create policy "jjvv_announcement_reply_media_delete"
  on storage.objects for delete
  using (
    bucket_id = 'jjvv-announcement-replies'
    and (
      public.storage_object_user_id(name) = auth.uid()
      or public.has_role(
        public.storage_object_org_id(name),
        array['secretary', 'president', 'superadmin']::public.role_t[]
      )
    )
  );

create or replace function public.validate_announcement_reply_media()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  select a.organization_id
  into v_org_id
  from public.announcements a
  where a.id = new.announcement_id
    and a.is_deleted = false;

  if v_org_id is null then
    raise exception 'Announcement not found or unavailable';
  end if;

  if (new.media_path is null) <> (new.media_type is null) then
    raise exception 'media_type and media_path must be provided together';
  end if;

  if new.media_path is not null then
    if public.storage_object_org_id(new.media_path) is distinct from v_org_id then
      raise exception 'Reply media must stay inside the organization scope';
    end if;

    if public.storage_object_user_id(new.media_path) is distinct from new.author_id then
      raise exception 'Reply media must stay inside the author scope';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_announcement_reply_media on public.announcement_replies;
create trigger validate_announcement_reply_media
  before insert or update on public.announcement_replies
  for each row execute function public.validate_announcement_reply_media();

create index if not exists announcement_replies_author_created_idx
  on public.announcement_replies (author_id, created_at desc);
