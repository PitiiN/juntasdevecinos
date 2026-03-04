-- ============================================================
-- JJVV Mobile — 003_functions.sql
-- Helper Functions & Triggers
-- ============================================================

-- 1. Check if auth user is active member of an organization
create or replace function is_member_of(org uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from memberships m
    where m.organization_id = org
      and m.user_id = auth.uid()
      and m.is_active = true
  );
$$;

-- 2. Check if auth user has specific role(s) in an organization
create or replace function has_role(org uuid, roles role_t[])
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from memberships m
    where m.organization_id = org
      and m.user_id = auth.uid()
      and m.is_active = true
      and m.role = any(roles)
  );
$$;

-- 3. Get user's role in an organization
create or replace function get_user_role(org uuid)
returns role_t language sql stable security definer as $$
  select m.role from memberships m
  where m.organization_id = org
    and m.user_id = auth.uid()
    and m.is_active = true
  limit 1;
$$;

-- 4. Auto-update updated_at trigger function
create or replace function trigger_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply updated_at trigger on relevant tables
create trigger set_updated_at_profiles
  before update on profiles
  for each row execute function trigger_set_updated_at();

create trigger set_updated_at_tickets
  before update on tickets
  for each row execute function trigger_set_updated_at();

create trigger set_updated_at_dues_ledger
  before update on dues_ledger
  for each row execute function trigger_set_updated_at();

-- 5. Auto-create profile on user signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (user_id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

-- Trigger for new user signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 6. Audit log insert helper (can be called from Edge Functions)
create or replace function insert_audit_log(
  p_org_id uuid,
  p_actor_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid default null,
  p_before jsonb default null,
  p_after jsonb default null
)
returns uuid language plpgsql security definer as $$
declare
  v_id uuid;
begin
  insert into audit_log (organization_id, actor_id, action, entity_type, entity_id, before, after)
  values (p_org_id, p_actor_id, p_action, p_entity_type, p_entity_id, p_before, p_after)
  returning id into v_id;
  return v_id;
end;
$$;
