-- ============================================================
-- JJVV Mobile - 021_cleanup_security_audit_fixtures.sql
-- Remove phase 2 security audit organizations from production
-- ============================================================

do $$
declare
  v_org_id uuid;
begin
  for v_org_id in
    select o.id
    from public.organizations o
    where o.name in ('Security Audit JJVV A', 'Security Audit JJVV B')
  loop
    raise notice 'Storage cleanup required via Storage API/Dashboard for org prefix % in private buckets.', v_org_id;

    delete from public.ticket_comments
    where ticket_id in (
      select t.id
      from public.tickets t
      where t.organization_id = v_org_id
    );

    delete from public.announcement_replies
    where announcement_id in (
      select a.id
      from public.announcements a
      where a.organization_id = v_org_id
    );

    delete from public.poll_votes
    where poll_id in (
      select p.id
      from public.polls p
      where p.organization_id = v_org_id
    );

    delete from public.poll_options
    where poll_id in (
      select p.id
      from public.polls p
      where p.organization_id = v_org_id
    );

    delete from public.favor_replies
    where favor_id in (
      select f.id
      from public.favors f
      where f.organization_id = v_org_id
    );

    delete from public.event_registrations
    where event_id in (
      select e.id
      from public.events e
      where e.organization_id = v_org_id
    );

    delete from public.membership_requests where organization_id = v_org_id;
    delete from public.push_tokens where organization_id = v_org_id;
    delete from public.notifications where organization_id = v_org_id;
    delete from public.audit_log where organization_id = v_org_id;
    delete from public.finance_entries where organization_id = v_org_id;
    delete from public.dues_ledger where organization_id = v_org_id;
    delete from public.dues_periods where organization_id = v_org_id;
    delete from public.documents where organization_id = v_org_id;
    delete from public.pois where organization_id = v_org_id;
    delete from public.alerts where organization_id = v_org_id;
    delete from public.tickets where organization_id = v_org_id;
    delete from public.announcements where organization_id = v_org_id;
    delete from public.polls where organization_id = v_org_id;
    delete from public.favors where organization_id = v_org_id;
    delete from public.events where organization_id = v_org_id;
    delete from public.memberships where organization_id = v_org_id;
    delete from public.organizations where id = v_org_id;
  end loop;
end;
$$;
