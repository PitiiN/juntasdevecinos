-- ============================================================
-- JJVV Mobile — 002_rls.sql
-- Row Level Security: Enable + Complete Policies
-- ============================================================

-- ========================
-- ENABLE RLS ON ALL TABLES
-- ========================
alter table organizations enable row level security;
alter table memberships enable row level security;
alter table profiles enable row level security;
alter table announcements enable row level security;
alter table alerts enable row level security;
alter table events enable row level security;
alter table event_registrations enable row level security;
alter table tickets enable row level security;
alter table ticket_comments enable row level security;
alter table dues_periods enable row level security;
alter table dues_ledger enable row level security;
alter table documents enable row level security;
alter table pois enable row level security;
alter table finance_entries enable row level security;
alter table push_tokens enable row level security;
alter table notifications enable row level security;
alter table audit_log enable row level security;

-- ========================================
-- ORGANIZATIONS
-- ========================================
-- Members can see their own organization
create policy "org_select_member"
  on organizations for select
  using (is_member_of(id));

-- President/superadmin can update org settings
create policy "org_update_admin"
  on organizations for update
  using (has_role(id, array['president','superadmin']::role_t[]));

-- ========================================
-- MEMBERSHIPS
-- ========================================
-- Members can see members of their own org
create policy "membership_select_member"
  on memberships for select
  using (is_member_of(organization_id));

-- President/superadmin can insert memberships (add members)
create policy "membership_insert_admin"
  on memberships for insert
  with check (has_role(organization_id, array['secretary','president','superadmin']::role_t[]));

-- President/superadmin can update memberships (change roles, deactivate)
create policy "membership_update_admin"
  on memberships for update
  using (has_role(organization_id, array['president','superadmin']::role_t[]));

-- President/superadmin can delete memberships
create policy "membership_delete_admin"
  on memberships for delete
  using (has_role(organization_id, array['president','superadmin']::role_t[]));

-- ========================================
-- PROFILES
-- ========================================
-- Users can read their own profile
create policy "profile_select_own"
  on profiles for select
  using (user_id = auth.uid());

-- Any org member can see profiles of fellow members (for names, contacts)
create policy "profile_select_member"
  on profiles for select
  using (
    exists (
      select 1 from memberships m1
      join memberships m2 on m1.organization_id = m2.organization_id
      where m1.user_id = auth.uid() and m1.is_active = true
        and m2.user_id = profiles.user_id and m2.is_active = true
    )
  );

-- Users can insert their own profile
create policy "profile_insert_own"
  on profiles for insert
  with check (user_id = auth.uid());

-- Users can update their own profile
create policy "profile_update_own"
  on profiles for update
  using (user_id = auth.uid());

-- ========================================
-- ANNOUNCEMENTS
-- ========================================
-- Members can read (non-deleted) announcements of their org
create policy "announcement_select_member"
  on announcements for select
  using (is_member_of(organization_id) and is_deleted = false);

-- Secretary/President can create announcements
create policy "announcement_insert_admin"
  on announcements for insert
  with check (has_role(organization_id, array['secretary','president','superadmin']::role_t[]));

-- Secretary/President can update announcements
create policy "announcement_update_admin"
  on announcements for update
  using (has_role(organization_id, array['secretary','president','superadmin']::role_t[]));

-- Secretary/President can soft-delete (update is_deleted)
create policy "announcement_delete_admin"
  on announcements for delete
  using (has_role(organization_id, array['president','superadmin']::role_t[]));

-- ========================================
-- ALERTS
-- ========================================
-- Members can see published alerts in their org
create policy "alert_select_member"
  on alerts for select
  using (is_member_of(organization_id) and (status = 'published' or created_by = auth.uid()));

-- Moderators/admins can see all alerts (including pending/discarded)
create policy "alert_select_admin"
  on alerts for select
  using (has_role(organization_id, array['moderator','secretary','president','superadmin']::role_t[]));

-- Any member can create an alert
create policy "alert_insert_member"
  on alerts for insert
  with check (is_member_of(organization_id));

-- Moderator/admin can update alerts (moderate)
create policy "alert_update_admin"
  on alerts for update
  using (has_role(organization_id, array['moderator','secretary','president','superadmin']::role_t[]));

-- Creator can update own alert
create policy "alert_update_own"
  on alerts for update
  using (created_by = auth.uid() and is_member_of(organization_id));

-- ========================================
-- EVENTS
-- ========================================
-- Members can see events in their org
create policy "event_select_member"
  on events for select
  using (is_member_of(organization_id));

-- Secretary/President can create events
create policy "event_insert_admin"
  on events for insert
  with check (has_role(organization_id, array['secretary','president','superadmin']::role_t[]));

-- Secretary/President can update events
create policy "event_update_admin"
  on events for update
  using (has_role(organization_id, array['secretary','president','superadmin']::role_t[]));

-- Secretary/President can delete events
create policy "event_delete_admin"
  on events for delete
  using (has_role(organization_id, array['secretary','president','superadmin']::role_t[]));

-- ========================================
-- EVENT REGISTRATIONS
-- ========================================
-- Members can see registrations for events in their org
create policy "event_reg_select_member"
  on event_registrations for select
  using (
    exists (
      select 1 from events e
      where e.id = event_registrations.event_id
        and is_member_of(e.organization_id)
    )
  );

-- Members can register themselves
create policy "event_reg_insert_member"
  on event_registrations for insert
  with check (
    user_id = auth.uid() and
    exists (
      select 1 from events e
      where e.id = event_registrations.event_id
        and is_member_of(e.organization_id)
    )
  );

-- Members can unregister themselves
create policy "event_reg_delete_own"
  on event_registrations for delete
  using (user_id = auth.uid());

-- ========================================
-- TICKETS
-- ========================================
-- Members can see their own tickets
create policy "ticket_select_own"
  on tickets for select
  using (created_by = auth.uid() and is_member_of(organization_id));

-- Directiva can see all tickets in their org
create policy "ticket_select_admin"
  on tickets for select
  using (has_role(organization_id, array['secretary','treasurer','president','superadmin']::role_t[]));

-- Members can create tickets
create policy "ticket_insert_member"
  on tickets for insert
  with check (is_member_of(organization_id) and created_by = auth.uid());

-- Directiva can update tickets (assign, change status)
create policy "ticket_update_admin"
  on tickets for update
  using (has_role(organization_id, array['secretary','treasurer','president','superadmin']::role_t[]));

-- Creator can update own ticket
create policy "ticket_update_own"
  on tickets for update
  using (created_by = auth.uid() and is_member_of(organization_id));

-- ========================================
-- TICKET COMMENTS
-- ========================================
-- Can read comments on tickets you can see
create policy "ticket_comment_select"
  on ticket_comments for select
  using (
    exists (
      select 1 from tickets t
      where t.id = ticket_comments.ticket_id
        and (t.created_by = auth.uid() or has_role(t.organization_id, array['secretary','treasurer','president','superadmin']::role_t[]))
    )
  );

-- Members can add comments to their own tickets; admins to any
create policy "ticket_comment_insert"
  on ticket_comments for insert
  with check (
    author_id = auth.uid() and
    exists (
      select 1 from tickets t
      where t.id = ticket_comments.ticket_id
        and (t.created_by = auth.uid() or has_role(t.organization_id, array['secretary','treasurer','president','superadmin']::role_t[]))
    )
  );

-- ========================================
-- DUES PERIODS
-- ========================================
-- Members can see dues periods for their org
create policy "dues_period_select_member"
  on dues_periods for select
  using (is_member_of(organization_id));

-- Treasurer/President can manage dues periods
create policy "dues_period_insert_admin"
  on dues_periods for insert
  with check (has_role(organization_id, array['treasurer','president','superadmin']::role_t[]));

create policy "dues_period_update_admin"
  on dues_periods for update
  using (has_role(organization_id, array['treasurer','president','superadmin']::role_t[]));

create policy "dues_period_delete_admin"
  on dues_periods for delete
  using (has_role(organization_id, array['treasurer','president','superadmin']::role_t[]));

-- ========================================
-- DUES LEDGER
-- ========================================
-- Members can see their own dues status
create policy "dues_ledger_select_own"
  on dues_ledger for select
  using (user_id = auth.uid() and is_member_of(organization_id));

-- Treasurer/admin can see all dues
create policy "dues_ledger_select_admin"
  on dues_ledger for select
  using (has_role(organization_id, array['treasurer','president','superadmin']::role_t[]));

-- Treasurer can manage dues ledger
create policy "dues_ledger_insert_admin"
  on dues_ledger for insert
  with check (has_role(organization_id, array['treasurer','president','superadmin']::role_t[]));

create policy "dues_ledger_update_admin"
  on dues_ledger for update
  using (has_role(organization_id, array['treasurer','president','superadmin']::role_t[]));

-- Members can upload proof for own dues
create policy "dues_ledger_update_own"
  on dues_ledger for update
  using (user_id = auth.uid() and is_member_of(organization_id));

-- ========================================
-- DOCUMENTS
-- ========================================
-- Members can read public documents
create policy "document_select_member"
  on documents for select
  using (is_member_of(organization_id) and (is_public = true or has_role(organization_id, array['secretary','president','superadmin']::role_t[])));

-- Secretary/President can manage documents
create policy "document_insert_admin"
  on documents for insert
  with check (has_role(organization_id, array['secretary','president','superadmin']::role_t[]));

create policy "document_update_admin"
  on documents for update
  using (has_role(organization_id, array['secretary','president','superadmin']::role_t[]));

create policy "document_delete_admin"
  on documents for delete
  using (has_role(organization_id, array['secretary','president','superadmin']::role_t[]));

-- ========================================
-- POIs
-- ========================================
-- Members can see POIs in their org
create policy "poi_select_member"
  on pois for select
  using (is_member_of(organization_id));

-- Secretary/President can manage POIs
create policy "poi_insert_admin"
  on pois for insert
  with check (has_role(organization_id, array['secretary','president','superadmin']::role_t[]));

create policy "poi_update_admin"
  on pois for update
  using (has_role(organization_id, array['secretary','president','superadmin']::role_t[]));

create policy "poi_delete_admin"
  on pois for delete
  using (has_role(organization_id, array['secretary','president','superadmin']::role_t[]));

-- ========================================
-- FINANCE ENTRIES
-- ========================================
-- Members can see approved finance entries (transparency)
create policy "finance_select_member"
  on finance_entries for select
  using (
    is_member_of(organization_id) and
    (approval_status in ('approved', 'none') or has_role(organization_id, array['treasurer','president','superadmin']::role_t[]))
  );

-- Treasurer can create finance entries
create policy "finance_insert_treasurer"
  on finance_entries for insert
  with check (has_role(organization_id, array['treasurer','president','superadmin']::role_t[]));

-- Treasurer can update entries; President can approve
create policy "finance_update_admin"
  on finance_entries for update
  using (has_role(organization_id, array['treasurer','president','superadmin']::role_t[]));

create policy "finance_delete_admin"
  on finance_entries for delete
  using (has_role(organization_id, array['president','superadmin']::role_t[]));

-- ========================================
-- PUSH TOKENS
-- ========================================
-- Users can see their own tokens
create policy "push_token_select_own"
  on push_tokens for select
  using (user_id = auth.uid());

-- Users can insert their own tokens
create policy "push_token_insert_own"
  on push_tokens for insert
  with check (user_id = auth.uid());

-- Users can update their own tokens
create policy "push_token_update_own"
  on push_tokens for update
  using (user_id = auth.uid());

-- Users can delete their own tokens
create policy "push_token_delete_own"
  on push_tokens for delete
  using (user_id = auth.uid());

-- Service role (Edge Functions) needs to read all tokens for push
-- This is handled by using service_role key in Edge Functions

-- ========================================
-- NOTIFICATIONS
-- ========================================
-- Members can see notifications for their org
create policy "notification_select_member"
  on notifications for select
  using (is_member_of(organization_id));

-- Admins and edge functions can insert notifications
create policy "notification_insert_admin"
  on notifications for insert
  with check (has_role(organization_id, array['secretary','treasurer','president','superadmin']::role_t[]));

-- ========================================
-- AUDIT LOG
-- ========================================
-- Only president/superadmin can read audit log
create policy "audit_select_admin"
  on audit_log for select
  using (has_role(organization_id, array['president','superadmin']::role_t[]));

-- Admins can insert audit entries (also done via service role in Edge Functions)
create policy "audit_insert_admin"
  on audit_log for insert
  with check (has_role(organization_id, array['secretary','treasurer','president','superadmin']::role_t[]));
