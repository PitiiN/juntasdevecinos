-- ============================================================
-- JJVV Mobile — 001_init.sql
-- Extensions, Enums, Tables, Indexes
-- ============================================================

-- 1. Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. Enums
do $$ begin
  create type role_t as enum ('resident','member','moderator','secretary','treasurer','president','superadmin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ticket_status_t as enum ('open','in_progress','resolved','rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type announcement_priority_t as enum ('normal','important');
exception when duplicate_object then null; end $$;

do $$ begin
  create type alert_status_t as enum ('pending','published','discarded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type finance_type_t as enum ('income','expense');
exception when duplicate_object then null; end $$;

do $$ begin
  create type approval_status_t as enum ('none','pending','approved','rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_channel_t as enum ('push');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_type_t as enum ('announcement','alert','event','ticket','dues','finance');
exception when duplicate_object then null; end $$;

-- 3. Organizations
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region text,
  commune text,
  address text,
  phone text,
  email text,
  emergency_numbers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists organizations_commune_idx on organizations (commune);

-- 4. Memberships
create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role role_t not null default 'resident',
  is_active boolean not null default true,
  joined_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists memberships_org_idx on memberships (organization_id);
create index if not exists memberships_user_idx on memberships (user_id);
create index if not exists memberships_role_idx on memberships (role);

-- 5. Profiles
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  rut text,
  phone text,
  avatar_url text,
  preferred_font_scale numeric not null default 1.0,
  high_contrast_mode boolean not null default false,
  accessibility_mode boolean not null default true,
  push_announcements boolean not null default true,
  push_alerts boolean not null default true,
  push_events boolean not null default true,
  push_tickets boolean not null default true,
  push_dues boolean not null default true,
  push_finance boolean not null default false,
  silent_start time default '22:00',
  silent_end time default '08:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. Announcements
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  body text not null,
  priority announcement_priority_t not null default 'normal',
  created_by uuid not null references auth.users(id),
  published_at timestamptz not null default now(),
  is_deleted boolean not null default false
);

create index if not exists announcements_org_pub_idx on announcements (organization_id, published_at desc);

-- 7. Alerts
create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  category text not null,
  message text not null,
  photo_path text,
  location jsonb,
  status alert_status_t not null default 'published',
  reported_count int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists alerts_org_created_idx on alerts (organization_id, created_at desc);

-- 8. Events
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location_name text,
  location jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists events_org_starts_idx on events (organization_id, starts_at);

-- 9. Event Registrations
create table if not exists event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

-- 10. Tickets
create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  title text not null,
  description text,
  category text default 'general',
  status ticket_status_t not null default 'open',
  assigned_to uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tickets_org_status_idx on tickets (organization_id, status);
create index if not exists tickets_created_by_idx on tickets (created_by);

-- 11. Ticket Comments
create table if not exists ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  body text not null,
  created_at timestamptz not null default now()
);

-- 12. Dues Periods
create table if not exists dues_periods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  year int not null,
  month int not null check (month between 1 and 12),
  amount_cents int not null check (amount_cents >= 0),
  created_at timestamptz not null default now(),
  unique (organization_id, year, month)
);

-- 13. Dues Ledger
create table if not exists dues_ledger (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  period_id uuid not null references dues_periods(id) on delete cascade,
  status text not null default 'due' check (status in ('due','paid')),
  paid_at timestamptz,
  proof_path text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  unique (user_id, period_id)
);

-- 14. Documents
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  doc_type text not null,
  file_path text not null,
  description text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  is_public boolean not null default true
);

create index if not exists documents_org_idx on documents (organization_id);

-- 15. POIs
create table if not exists pois (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  category text not null,
  name text not null,
  description text,
  location jsonb not null,
  phone text,
  hours text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists pois_org_cat_idx on pois (organization_id, category);

-- 16. Finance Entries
create table if not exists finance_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  entry_type finance_type_t not null,
  category text not null,
  description text,
  amount_cents int not null check (amount_cents >= 0),
  entry_date date not null,
  attachment_path text,
  created_by uuid not null references auth.users(id),
  approval_status approval_status_t not null default 'none',
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists finance_org_date_idx on finance_entries (organization_id, entry_date desc);

-- 17. Push Tokens
create table if not exists push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  platform text not null check (platform in ('ios','android')),
  token text not null,
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (platform, token)
);

create index if not exists push_tokens_org_idx on push_tokens (organization_id);
create index if not exists push_tokens_user_idx on push_tokens (user_id);

-- 18. Notifications
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  type notification_type_t not null,
  channel notification_channel_t not null default 'push',
  title text not null,
  body text not null,
  deep_link text,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists notifications_org_created_idx on notifications (organization_id, created_at desc);

-- 19. Audit Log
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_org_created_idx on audit_log (organization_id, created_at desc);
create index if not exists audit_log_entity_idx on audit_log (entity_type, entity_id);
