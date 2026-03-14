-- ============================================================
-- JJVV Mobile - 011_finance_entry_hardening.sql
-- Harden finance entry mutations and audit timestamps
-- ============================================================

alter table public.finance_entries
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists set_updated_at_finance_entries on public.finance_entries;
create trigger set_updated_at_finance_entries
  before update on public.finance_entries
  for each row execute function public.trigger_set_updated_at();

create or replace function public.guard_finance_entry_updates()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.organization_id <> old.organization_id or new.created_by <> old.created_by then
    raise exception 'Immutable finance ownership fields';
  end if;

  if not public.has_role(
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

drop trigger if exists guard_finance_entry_updates on public.finance_entries;
create trigger guard_finance_entry_updates
  before update on public.finance_entries
  for each row execute function public.guard_finance_entry_updates();
