-- ============================================================
-- JJVV Mobile - 018_phase2_policy_rewrite_and_trigger_fixes.sql
-- Robust policy helper rewrite and trigger fixes after live tests
-- ============================================================

grant usage on schema app_private to anon, authenticated;

grant execute on function app_private.superadmin_email() to anon, authenticated;
grant execute on function app_private.global_superadmin_user_id() to anon, authenticated;
grant execute on function app_private.is_global_superadmin() to anon, authenticated;
grant execute on function app_private.role_rank(public.role_t) to anon, authenticated;
grant execute on function app_private.is_member_of(uuid) to anon, authenticated;
grant execute on function app_private.has_role(uuid, public.role_t[]) to anon, authenticated;
grant execute on function app_private.get_user_role(uuid) to authenticated;
grant execute on function app_private.storage_object_org_id(text) to anon, authenticated;
grant execute on function app_private.storage_object_user_id(text) to anon, authenticated;

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
    v_before := to_jsonb(old);
    v_after := null;
  else
    v_before := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
    v_after := to_jsonb(new);
  end if;

  v_entity_id := coalesce(
    nullif(coalesce(v_after, v_before)->>'id', '')::uuid,
    nullif(coalesce(v_after, v_before)->>'user_id', '')::uuid
  );

  if tg_table_name = 'announcement_replies' then
    v_announcement_id := nullif(coalesce(v_after, v_before)->>'announcement_id', '')::uuid;

    if v_announcement_id is not null then
      select a.organization_id
      into v_org_id
      from public.announcements a
      where a.id = v_announcement_id;
    end if;
  else
    v_org_id := nullif(coalesce(v_after, v_before)->>'organization_id', '')::uuid;
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

create or replace function public.validate_poll_vote()
returns trigger
language plpgsql
set search_path = public, app_private
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

  if not app_private.is_member_of(v_poll.organization_id) then
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

create or replace function public.validate_announcement_reply_media()
returns trigger
language plpgsql
set search_path = public, app_private
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
    if app_private.storage_object_org_id(new.media_path) is distinct from v_org_id then
      raise exception 'Reply media must stay inside the organization scope';
    end if;

    if app_private.storage_object_user_id(new.media_path) is distinct from new.author_id then
      raise exception 'Reply media must stay inside the author scope';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.assign_ticket_defaults()
returns trigger
language plpgsql
set search_path = public, app_private
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
    if app_private.storage_object_org_id(new.attachment_path) is distinct from new.organization_id
       or app_private.storage_object_user_id(new.attachment_path) is distinct from new.created_by then
      raise exception 'Invalid ticket attachment scope';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.guard_ticket_updates()
returns trigger
language plpgsql
set search_path = public, app_private
as $$
declare
  v_is_admin boolean;
begin
  v_is_admin := app_private.has_role(
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

create or replace function public.guard_due_self_updates()
returns trigger
language plpgsql
set search_path = public, app_private
as $$
begin
  if old.user_id = auth.uid()
     and not app_private.has_role(old.organization_id, array['treasurer', 'president', 'superadmin']::public.role_t[]) then
    if old.status = 'paid' then
      raise exception 'Paid dues cannot be changed by residents';
    end if;

    if new.organization_id <> old.organization_id
       or new.user_id <> old.user_id
       or new.period_id <> old.period_id
       or new.status <> old.status
       or new.paid_at is distinct from old.paid_at
       or new.updated_by is distinct from old.updated_by
       or new.review_status <> 'pending'
       or new.rejection_reason is not null
       or new.rejection_comment is not null then
      raise exception 'Residents can only submit a proof for their own dues';
    end if;

    if new.proof_path is null then
      raise exception 'Proof path is required';
    end if;

    if app_private.storage_object_org_id(new.proof_path) is distinct from old.organization_id
       or app_private.storage_object_user_id(new.proof_path) is distinct from old.user_id then
      raise exception 'Invalid proof path scope';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.guard_finance_entry_updates()
returns trigger
language plpgsql
set search_path = public, app_private
as $$
begin
  if new.organization_id <> old.organization_id or new.created_by <> old.created_by then
    raise exception 'Immutable finance ownership fields';
  end if;

  if not app_private.has_role(
    old.organization_id,
    array['president', 'superadmin']::public.role_t[]
  ) then
    if new.approval_status <> old.approval_status
       or new.approved_by is distinct from old.approved_by
       or new.approved_at is distinct from old.approved_at then
      raise exception 'Only presidency can approve finance entries';
    end if;
  end if;

  return new;
end;
$$;

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
    where position('is_member_of(' in coalesce(qual, '')) > 0
       or position('has_role(' in coalesce(qual, '')) > 0
       or position('storage_object_org_id(' in coalesce(qual, '')) > 0
       or position('storage_object_user_id(' in coalesce(qual, '')) > 0
       or position('is_member_of(' in coalesce(with_check, '')) > 0
       or position('has_role(' in coalesce(with_check, '')) > 0
       or position('storage_object_org_id(' in coalesce(with_check, '')) > 0
       or position('storage_object_user_id(' in coalesce(with_check, '')) > 0
  loop
    v_qual := r.qual;
    v_with_check := r.with_check;

    if v_qual is not null then
      v_qual := replace(v_qual, 'app_private.is_member_of(', '__JJVV_APP_PRIVATE_IS_MEMBER_OF__(');
      v_qual := replace(v_qual, 'app_private.has_role(', '__JJVV_APP_PRIVATE_HAS_ROLE__(');
      v_qual := replace(v_qual, 'app_private.storage_object_org_id(', '__JJVV_APP_PRIVATE_STORAGE_ORG__(');
      v_qual := replace(v_qual, 'app_private.storage_object_user_id(', '__JJVV_APP_PRIVATE_STORAGE_USER__(');

      v_qual := replace(v_qual, 'public.is_member_of(', '__JJVV_APP_PRIVATE_IS_MEMBER_OF__(');
      v_qual := replace(v_qual, 'public.has_role(', '__JJVV_APP_PRIVATE_HAS_ROLE__(');
      v_qual := replace(v_qual, 'public.storage_object_org_id(', '__JJVV_APP_PRIVATE_STORAGE_ORG__(');
      v_qual := replace(v_qual, 'public.storage_object_user_id(', '__JJVV_APP_PRIVATE_STORAGE_USER__(');

      v_qual := replace(v_qual, 'is_member_of(', '__JJVV_APP_PRIVATE_IS_MEMBER_OF__(');
      v_qual := replace(v_qual, 'has_role(', '__JJVV_APP_PRIVATE_HAS_ROLE__(');
      v_qual := replace(v_qual, 'storage_object_org_id(', '__JJVV_APP_PRIVATE_STORAGE_ORG__(');
      v_qual := replace(v_qual, 'storage_object_user_id(', '__JJVV_APP_PRIVATE_STORAGE_USER__(');

      v_qual := replace(v_qual, '__JJVV_APP_PRIVATE_IS_MEMBER_OF__(', 'app_private.is_member_of(');
      v_qual := replace(v_qual, '__JJVV_APP_PRIVATE_HAS_ROLE__(', 'app_private.has_role(');
      v_qual := replace(v_qual, '__JJVV_APP_PRIVATE_STORAGE_ORG__(', 'app_private.storage_object_org_id(');
      v_qual := replace(v_qual, '__JJVV_APP_PRIVATE_STORAGE_USER__(', 'app_private.storage_object_user_id(');
    end if;

    if v_with_check is not null then
      v_with_check := replace(v_with_check, 'app_private.is_member_of(', '__JJVV_APP_PRIVATE_IS_MEMBER_OF__(');
      v_with_check := replace(v_with_check, 'app_private.has_role(', '__JJVV_APP_PRIVATE_HAS_ROLE__(');
      v_with_check := replace(v_with_check, 'app_private.storage_object_org_id(', '__JJVV_APP_PRIVATE_STORAGE_ORG__(');
      v_with_check := replace(v_with_check, 'app_private.storage_object_user_id(', '__JJVV_APP_PRIVATE_STORAGE_USER__(');

      v_with_check := replace(v_with_check, 'public.is_member_of(', '__JJVV_APP_PRIVATE_IS_MEMBER_OF__(');
      v_with_check := replace(v_with_check, 'public.has_role(', '__JJVV_APP_PRIVATE_HAS_ROLE__(');
      v_with_check := replace(v_with_check, 'public.storage_object_org_id(', '__JJVV_APP_PRIVATE_STORAGE_ORG__(');
      v_with_check := replace(v_with_check, 'public.storage_object_user_id(', '__JJVV_APP_PRIVATE_STORAGE_USER__(');

      v_with_check := replace(v_with_check, 'is_member_of(', '__JJVV_APP_PRIVATE_IS_MEMBER_OF__(');
      v_with_check := replace(v_with_check, 'has_role(', '__JJVV_APP_PRIVATE_HAS_ROLE__(');
      v_with_check := replace(v_with_check, 'storage_object_org_id(', '__JJVV_APP_PRIVATE_STORAGE_ORG__(');
      v_with_check := replace(v_with_check, 'storage_object_user_id(', '__JJVV_APP_PRIVATE_STORAGE_USER__(');

      v_with_check := replace(v_with_check, '__JJVV_APP_PRIVATE_IS_MEMBER_OF__(', 'app_private.is_member_of(');
      v_with_check := replace(v_with_check, '__JJVV_APP_PRIVATE_HAS_ROLE__(', 'app_private.has_role(');
      v_with_check := replace(v_with_check, '__JJVV_APP_PRIVATE_STORAGE_ORG__(', 'app_private.storage_object_org_id(');
      v_with_check := replace(v_with_check, '__JJVV_APP_PRIVATE_STORAGE_USER__(', 'app_private.storage_object_user_id(');
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
