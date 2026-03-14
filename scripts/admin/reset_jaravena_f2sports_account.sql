-- ============================================================
-- JJVV Mobile - reset_jaravena_f2sports_account.sql
-- One-off cleanup so jaravena@f2sports.cl can register again
-- ============================================================

do $$
declare
  v_user_id uuid;
begin
  select u.id
  into v_user_id
  from auth.users u
  where lower(u.email::text) = 'jaravena@f2sports.cl'
  limit 1;

  if v_user_id is null then
    raise notice 'User jaravena@f2sports.cl was not found in auth.users.';
    return;
  end if;

  raise notice 'Removing test account jaravena@f2sports.cl with user id %', v_user_id;
  raise notice 'If this user uploaded files, private Storage cleanup may still be required manually.';

  update public.membership_requests
  set reviewed_by = null
  where reviewed_by = v_user_id;

  update public.notifications
  set created_by = null
  where created_by = v_user_id;

  update public.audit_log
  set actor_id = null
  where actor_id = v_user_id;

  update public.dues_ledger
  set updated_by = null
  where updated_by = v_user_id
    and user_id <> v_user_id;

  update public.finance_entries
  set approved_by = null
  where approved_by = v_user_id
    and created_by <> v_user_id;

  update public.tickets
  set assigned_to = null
  where assigned_to = v_user_id
    and created_by <> v_user_id;

  delete from public.announcement_replies where author_id = v_user_id;
  delete from public.ticket_comments where author_id = v_user_id;
  delete from public.event_registrations where user_id = v_user_id;
  delete from public.membership_requests where user_id = v_user_id;
  delete from public.poll_votes where user_id = v_user_id;
  delete from public.favor_replies where user_id = v_user_id;
  delete from public.favors where user_id = v_user_id;
  delete from public.dues_ledger where user_id = v_user_id;
  delete from public.push_tokens where user_id = v_user_id;
  delete from public.memberships where user_id = v_user_id;
  delete from public.profiles where user_id = v_user_id;

  delete from public.tickets where created_by = v_user_id;
  delete from public.documents where created_by = v_user_id;
  delete from public.finance_entries where created_by = v_user_id;
  delete from public.alerts where created_by = v_user_id;
  delete from public.announcements where created_by = v_user_id;
  delete from public.events where created_by = v_user_id;
  delete from public.pois where created_by = v_user_id;
  delete from public.polls where created_by = v_user_id;

  delete from auth.users
  where id = v_user_id;
end;
$$;
