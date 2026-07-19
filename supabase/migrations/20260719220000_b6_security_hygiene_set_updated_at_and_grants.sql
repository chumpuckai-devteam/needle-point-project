-- B6: pin search_path on set_updated_at; lock down handle_new_user EXECUTE;
-- reassert store_follow_counts DEFINER + search_path (intentional public aggregates).

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to postgres, service_role;

create or replace function public.store_follow_counts()
returns table (store_id uuid, follower_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select sf.store_id, count(*)::bigint as follower_count
  from public.store_follows sf
  group by sf.store_id;
$$;

revoke all on function public.store_follow_counts() from public;
grant execute on function public.store_follow_counts() to anon, authenticated, service_role;

comment on function public.store_follow_counts() is
  'Public follower counts only. SECURITY DEFINER intentional: store_follows rows are private; this RPC exposes aggregates without listing followers.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'store-product-images',
  'store-product-images',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
