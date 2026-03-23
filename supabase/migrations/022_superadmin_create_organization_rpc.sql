-- ============================================================
-- JJVV Mobile - 022_superadmin_create_organization_rpc.sql
-- Secure RPC to create organizations (global superadmin only)
-- ============================================================

create or replace function public.create_organization(
  p_name text,
  p_region text default null,
  p_commune text default null,
  p_address text default null,
  p_phone text default null,
  p_email text default null,
  p_logo_url text default null,
  p_directiva_image_url text default null,
  p_emergency_numbers jsonb default '{}'::jsonb
)
returns public.organizations
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_row public.organizations;
  v_name text;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not app_private.is_global_superadmin() then
    raise exception 'Only global superadmin can create organizations';
  end if;

  v_name := nullif(trim(p_name), '');
  if v_name is null then
    raise exception 'Organization name is required';
  end if;

  v_email := nullif(lower(trim(coalesce(p_email, ''))), '');
  if v_email is not null and v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$' then
    raise exception 'Invalid organization email';
  end if;

  insert into public.organizations (
    name,
    region,
    commune,
    address,
    phone,
    email,
    logo_url,
    directiva_image_url,
    emergency_numbers
  )
  values (
    v_name,
    nullif(trim(coalesce(p_region, '')), ''),
    nullif(trim(coalesce(p_commune, '')), ''),
    nullif(trim(coalesce(p_address, '')), ''),
    nullif(trim(coalesce(p_phone, '')), ''),
    v_email,
    nullif(trim(coalesce(p_logo_url, '')), ''),
    nullif(trim(coalesce(p_directiva_image_url, '')), ''),
    coalesce(p_emergency_numbers, '{}'::jsonb)
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke execute on function public.create_organization(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
) from public, anon, authenticated;

grant execute on function public.create_organization(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
) to authenticated;
