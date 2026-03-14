-- ============================================================
-- JJVV Mobile - phase2_matrix_seed.sql
-- Seed for live authorization matrix validation
-- ============================================================
--
-- Prerequisite:
-- 1. Run `node scripts/security/live-matrix-validation.mjs --provision-users`
--    or manually create these users in Auth:
--      - jjvv.audit.member.a@example.com
--      - jjvv.audit.president.a@example.com
--      - jjvv.audit.member.b@example.com
--      - jjvv.audit.secretary.b@example.com
--      - jjvv.audit.outsider@example.com
--
-- This script is intended for the Supabase SQL editor on the JJVV project.
-- After finishing the validation, run scripts/security/phase2_matrix_cleanup.sql
-- or the migration supabase/migrations/021_cleanup_security_audit_fixtures.sql
-- to remove the temporary audit organizations from production data.

do $$
declare
  v_member_a uuid;
  v_president_a uuid;
  v_member_b uuid;
  v_secretary_b uuid;
  v_outsider uuid;
  v_org_a uuid;
  v_org_b uuid;
begin
  select id into v_member_a
  from auth.users
  where lower(email::text) = 'jjvv.audit.member.a@example.com';

  select id into v_president_a
  from auth.users
  where lower(email::text) = 'jjvv.audit.president.a@example.com';

  select id into v_member_b
  from auth.users
  where lower(email::text) = 'jjvv.audit.member.b@example.com';

  select id into v_secretary_b
  from auth.users
  where lower(email::text) = 'jjvv.audit.secretary.b@example.com';

  select id into v_outsider
  from auth.users
  where lower(email::text) = 'jjvv.audit.outsider@example.com';

  if v_member_a is null or v_president_a is null or v_member_b is null or v_secretary_b is null or v_outsider is null then
    raise exception 'Missing audit users. Provision them first with scripts/security/live-matrix-validation.mjs --provision-users';
  end if;

  select id into v_org_a
  from public.organizations
  where name = 'Security Audit JJVV A'
  order by created_at asc
  limit 1;

  if v_org_a is null then
    insert into public.organizations (name, region, commune, address, email)
    values ('Security Audit JJVV A', 'Metropolitana', 'Santiago', 'Audit 100', 'audit-a@example.com')
    returning id into v_org_a;
  end if;

  select id into v_org_b
  from public.organizations
  where name = 'Security Audit JJVV B'
  order by created_at asc
  limit 1;

  if v_org_b is null then
    insert into public.organizations (name, region, commune, address, email)
    values ('Security Audit JJVV B', 'Metropolitana', 'Providencia', 'Audit 200', 'audit-b@example.com')
    returning id into v_org_b;
  end if;

  insert into public.memberships (organization_id, user_id, role, is_active)
  values
    (v_org_a, v_member_a, 'member', true),
    (v_org_a, v_president_a, 'president', true),
    (v_org_b, v_member_b, 'member', true),
    (v_org_b, v_secretary_b, 'secretary', true)
  on conflict (organization_id, user_id)
  do update set
    role = excluded.role,
    is_active = true;

  update public.memberships
  set is_active = false
  where user_id = v_outsider
    and organization_id in (v_org_a, v_org_b);
end;
$$;

select
  o.id as organization_id,
  o.name as organization_name,
  m.role,
  u.email::text as user_email
from public.organizations o
join public.memberships m on m.organization_id = o.id
join auth.users u on u.id = m.user_id
where o.name in ('Security Audit JJVV A', 'Security Audit JJVV B')
order by o.name, m.role, u.email;
