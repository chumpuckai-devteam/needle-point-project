-- Followed stores feed rail RPC.
-- Returns only the current authenticated user's followed shops, ordered by most
-- recently followed, without exposing follower_id rows to other users.

create or replace function public.my_followed_stores()
returns table (
  id uuid,
  owner_user_id uuid,
  name text,
  handle text,
  store_type text,
  description text,
  avatar_url text,
  cover_image_url text,
  website_url text,
  location text,
  city text,
  region text,
  country text,
  ships_nationwide boolean,
  specialties text[],
  latitude double precision,
  longitude double precision,
  followed_at timestamptz,
  follower_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  return query
  select
    s.id,
    s.owner_user_id,
    s.name,
    s.handle,
    s.store_type,
    s.description,
    s.avatar_url,
    s.cover_image_url,
    s.website_url,
    s.location,
    s.city,
    s.region,
    s.country,
    s.ships_nationwide,
    s.specialties,
    s.latitude,
    s.longitude,
    sf.created_at as followed_at,
    coalesce(counts.follower_count, 0::bigint) as follower_count
  from public.store_follows sf
  join public.stores s on s.id = sf.store_id
  left join public.store_follow_counts() counts on counts.store_id = s.id
  where sf.follower_id = (select auth.uid())
  order by sf.created_at desc, lower(s.name), s.id;
end;
$$;

comment on function public.my_followed_stores()
  is 'Authenticated-only feed rail API. Shape: store profile fields plus followed_at and follower_count, ordered by newest follow first. Use frontend query key ["stores", "followed", "me"].';

revoke all on function public.my_followed_stores() from public;
grant execute on function public.my_followed_stores() to authenticated;
