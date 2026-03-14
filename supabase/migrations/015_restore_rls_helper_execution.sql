-- ============================================================
-- JJVV Mobile - 015_restore_rls_helper_execution.sql
-- Restore execute grants required by RLS/storage policy helpers
-- ============================================================

-- These helpers are used inside RLS and storage policies. Revoking EXECUTE
-- from anon/authenticated breaks policy evaluation and causes 401/403 errors
-- instead of normal filtered results.

grant execute on function public.is_member_of(uuid) to anon, authenticated;
grant execute on function public.has_role(uuid, public.role_t[]) to anon, authenticated;
grant execute on function public.get_user_role(uuid) to authenticated;
grant execute on function public.storage_object_org_id(text) to anon, authenticated;
grant execute on function public.storage_object_user_id(text) to anon, authenticated;
