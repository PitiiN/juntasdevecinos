-- ============================================================
-- JJVV Mobile - 008_dues_review_workflow.sql
-- Review workflow and RPCs for dues proofs
-- ============================================================

alter table public.dues_ledger
  add column if not exists review_status public.approval_status_t not null default 'none',
  add column if not exists rejection_reason text,
  add column if not exists rejection_comment text;

update public.dues_ledger
set review_status = 'approved'
where status = 'paid'
  and review_status = 'none';

create or replace function public.guard_due_self_updates()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.user_id = auth.uid()
     and not public.has_role(old.organization_id, array['treasurer', 'president', 'superadmin']::public.role_t[]) then
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

    if public.storage_object_org_id(new.proof_path) is distinct from old.organization_id
       or public.storage_object_user_id(new.proof_path) is distinct from old.user_id then
      raise exception 'Invalid proof path scope';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.list_organization_dues(p_org_id uuid)
returns table (
  ledger_id uuid,
  user_id uuid,
  full_name text,
  email text,
  year int,
  month int,
  amount_cents int,
  status text,
  review_status public.approval_status_t,
  paid_at timestamptz,
  proof_path text,
  rejection_reason text,
  rejection_comment text
)
language sql
security definer
set search_path = public
as $$
  select
    dl.id,
    dl.user_id,
    p.full_name,
    u.email::text,
    dp.year,
    dp.month,
    dp.amount_cents,
    dl.status,
    dl.review_status,
    dl.paid_at,
    dl.proof_path,
    dl.rejection_reason,
    dl.rejection_comment
  from public.dues_ledger dl
  join public.dues_periods dp on dp.id = dl.period_id
  left join public.profiles p on p.user_id = dl.user_id
  left join auth.users u on u.id = dl.user_id
  where dl.organization_id = p_org_id
    and public.has_role(p_org_id, array['treasurer', 'president', 'superadmin']::public.role_t[])
  order by dp.year desc, dp.month desc, p.full_name nulls last, u.email nulls last;
$$;

create or replace function public.approve_due_payment(p_ledger_id uuid)
returns public.dues_ledger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.dues_ledger;
begin
  select *
  into v_row
  from public.dues_ledger
  where id = p_ledger_id;

  if v_row.id is null then
    raise exception 'Due ledger entry not found';
  end if;

  if not public.has_role(v_row.organization_id, array['treasurer', 'president', 'superadmin']::public.role_t[]) then
    raise exception 'Insufficient privileges';
  end if;

  update public.dues_ledger
  set status = 'paid',
      review_status = 'approved',
      paid_at = coalesce(paid_at, now()),
      rejection_reason = null,
      rejection_comment = null,
      updated_by = auth.uid()
  where id = p_ledger_id
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.reject_due_payment(
  p_ledger_id uuid,
  p_reason text,
  p_comment text default null
)
returns public.dues_ledger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.dues_ledger;
begin
  select *
  into v_row
  from public.dues_ledger
  where id = p_ledger_id;

  if v_row.id is null then
    raise exception 'Due ledger entry not found';
  end if;

  if not public.has_role(v_row.organization_id, array['treasurer', 'president', 'superadmin']::public.role_t[]) then
    raise exception 'Insufficient privileges';
  end if;

  update public.dues_ledger
  set status = 'due',
      review_status = 'rejected',
      paid_at = null,
      rejection_reason = nullif(trim(p_reason), ''),
      rejection_comment = nullif(trim(p_comment), ''),
      updated_by = auth.uid()
  where id = p_ledger_id
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.set_due_status_admin(
  p_ledger_id uuid,
  p_status text
)
returns public.dues_ledger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.dues_ledger;
begin
  if p_status not in ('due', 'paid') then
    raise exception 'Invalid status';
  end if;

  select *
  into v_row
  from public.dues_ledger
  where id = p_ledger_id;

  if v_row.id is null then
    raise exception 'Due ledger entry not found';
  end if;

  if not public.has_role(v_row.organization_id, array['treasurer', 'president', 'superadmin']::public.role_t[]) then
    raise exception 'Insufficient privileges';
  end if;

  update public.dues_ledger
  set status = p_status,
      review_status = case when p_status = 'paid' then 'approved' else 'none' end,
      paid_at = case when p_status = 'paid' then coalesce(paid_at, now()) else null end,
      rejection_reason = null,
      rejection_comment = null,
      updated_by = auth.uid()
  where id = p_ledger_id
  returning * into v_row;

  return v_row;
end;
$$;

create index if not exists dues_ledger_org_review_status_idx
  on public.dues_ledger (organization_id, review_status, status);
