-- Restrict direct EXECUTE on the auth signup trigger function.
-- The auth.users trigger can still invoke this SECURITY DEFINER function; anon/authenticated
-- clients do not need to call it directly, and broad EXECUTE grants trigger Supabase's
-- function-execute security advisor.
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

-- Keep service_role callable for administrative repair/backfill workflows if needed.
grant execute on function public.handle_new_user() to service_role;
