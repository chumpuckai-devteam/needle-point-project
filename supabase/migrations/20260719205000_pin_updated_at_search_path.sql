-- Pin trigger helper search_path so Supabase's mutable search_path advisor no longer flags it.
-- Behavior remains identical: triggers still set NEW.updated_at to now() before updates.
alter function public.set_updated_at() set search_path = public;
