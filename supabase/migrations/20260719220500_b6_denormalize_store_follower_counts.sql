-- Denormalize follower counts onto stores; store_follow_counts becomes SECURITY INVOKER.

alter table public.stores
  add column if not exists follower_count integer not null default 0;

comment on column public.stores.follower_count is
  'Denormalized count of store_follows rows; maintained by trigger.';

update public.stores s
set follower_count = coalesce((
  select count(*)::integer from public.store_follows sf where sf.store_id = s.id
), 0);

create or replace function public.sync_store_follower_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
begin
  v_store_id := coalesce(new.store_id, old.store_id);
  update public.stores
  set follower_count = (
    select count(*)::integer from public.store_follows sf where sf.store_id = v_store_id
  )
  where id = v_store_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists store_follows_sync_count on public.store_follows;
create trigger store_follows_sync_count
  after insert or delete on public.store_follows
  for each row
  execute function public.sync_store_follower_count();

revoke all on function public.sync_store_follower_count() from public, anon, authenticated;
grant execute on function public.sync_store_follower_count() to postgres, service_role;

create or replace function public.store_follow_counts()
returns table (store_id uuid, follower_count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select s.id as store_id, s.follower_count::bigint as follower_count
  from public.stores s;
$$;

revoke all on function public.store_follow_counts() from public;
grant execute on function public.store_follow_counts() to anon, authenticated, service_role;

comment on function public.store_follow_counts() is
  'Returns denormalized public.stores.follower_count (SECURITY INVOKER). Prefer selecting stores.follower_count directly.';
