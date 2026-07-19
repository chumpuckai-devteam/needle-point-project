-- Store follow/connection RPC contract.
-- Keeps direct store_follows rows private while exposing idempotent, auth-aware
-- follow/unfollow/state APIs for UI and analytics consumers.

create or replace function public.store_follow_connection_state(p_store_id uuid, p_follower_id uuid)
returns table (
  store_id uuid,
  is_following boolean,
  followed_at timestamptz,
  follower_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p_store_id as store_id,
    sf.created_at is not null as is_following,
    sf.created_at as followed_at,
    coalesce(counts.follower_count, 0::bigint) as follower_count
  from (select 1) anchor
  left join public.store_follows sf
    on sf.store_id = p_store_id
   and sf.follower_id = p_follower_id
  left join public.store_follow_counts() counts
    on counts.store_id = p_store_id;
$$;

create or replace function public.follow_store(p_store_id uuid)
returns table (
  store_id uuid,
  is_following boolean,
  followed_at timestamptz,
  follower_count bigint
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_follower_id uuid := (select auth.uid());
  v_owner_user_id uuid;
begin
  if v_follower_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  select s.owner_user_id
    into v_owner_user_id
  from public.stores s
  where s.id = p_store_id;

  if not found then
    raise exception 'Shop not found.' using errcode = 'P0002';
  end if;

  if v_owner_user_id = v_follower_id then
    raise exception 'Shop owners cannot follow their own shop.' using errcode = '23514';
  end if;

  insert into public.store_follows (follower_id, store_id)
  values (v_follower_id, p_store_id)
  on conflict (follower_id, store_id) do nothing;

  return query
    select * from public.store_follow_connection_state(p_store_id, v_follower_id);
end;
$$;

create or replace function public.unfollow_store(p_store_id uuid)
returns table (
  store_id uuid,
  is_following boolean,
  followed_at timestamptz,
  follower_count bigint
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_follower_id uuid := (select auth.uid());
begin
  if v_follower_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  if not exists (select 1 from public.stores s where s.id = p_store_id) then
    raise exception 'Shop not found.' using errcode = 'P0002';
  end if;

  delete from public.store_follows
  where follower_id = v_follower_id
    and store_id = p_store_id;

  return query
    select * from public.store_follow_connection_state(p_store_id, v_follower_id);
end;
$$;

create or replace function public.is_following_store(p_store_id uuid)
returns table (
  store_id uuid,
  is_following boolean,
  followed_at timestamptz,
  follower_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_follower_id uuid := (select auth.uid());
begin
  if v_follower_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  if not exists (select 1 from public.stores s where s.id = p_store_id) then
    raise exception 'Shop not found.' using errcode = 'P0002';
  end if;

  return query
    select * from public.store_follow_connection_state(p_store_id, v_follower_id);
end;
$$;

create or replace function public.my_store_following(p_limit int default 50, p_offset int default 0)
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
declare
  v_follower_id uuid := (select auth.uid());
  v_limit int := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
begin
  if v_follower_id is null then
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
  where sf.follower_id = v_follower_id
  order by sf.created_at desc, lower(s.name), s.id
  limit v_limit offset v_offset;
end;
$$;

create or replace function public.store_followers(p_store_id uuid, p_limit int default 50, p_offset int default 0)
returns table (
  profile_id uuid,
  name text,
  handle text,
  avatar_url text,
  followed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_requester_id uuid := (select auth.uid());
  v_owner_user_id uuid;
  v_limit int := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
begin
  if v_requester_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  select s.owner_user_id
    into v_owner_user_id
  from public.stores s
  where s.id = p_store_id;

  if not found then
    raise exception 'Shop not found.' using errcode = 'P0002';
  end if;

  if v_owner_user_id is distinct from v_requester_id then
    raise exception 'Only the shop owner can list shop followers.' using errcode = '42501';
  end if;

  return query
  select
    p.id as profile_id,
    p.name,
    p.handle,
    p.avatar_url,
    sf.created_at as followed_at
  from public.store_follows sf
  join public.profiles p on p.id = sf.follower_id
  where sf.store_id = p_store_id
  order by sf.created_at desc, lower(p.handle), p.id
  limit v_limit offset v_offset;
end;
$$;

comment on function public.follow_store(uuid)
  is 'Authenticated idempotent follow API. Returns {store_id,is_following,followed_at,follower_count}; errors: 401 auth required, 404 shop missing, 409/check violation for owner self-follow.';
comment on function public.unfollow_store(uuid)
  is 'Authenticated idempotent unfollow API. Missing follow rows are treated as success and current connection state is returned.';
comment on function public.is_following_store(uuid)
  is 'Authenticated connection-state API for one shop. Returns current user follow state plus public follower_count.';
comment on function public.my_store_following(int, int)
  is 'Authenticated paginated list of shops followed by current user, newest first. Limit is clamped 1..100.';
comment on function public.store_followers(uuid, int, int)
  is 'Owner-only paginated follower list for a shop; direct follower identity is never public-readable.';

revoke all on function public.store_follow_connection_state(uuid, uuid) from public;
revoke all on function public.follow_store(uuid) from public;
revoke all on function public.unfollow_store(uuid) from public;
revoke all on function public.is_following_store(uuid) from public;
revoke all on function public.my_store_following(int, int) from public;
revoke all on function public.store_followers(uuid, int, int) from public;

grant execute on function public.follow_store(uuid) to authenticated;
grant execute on function public.unfollow_store(uuid) to authenticated;
grant execute on function public.is_following_store(uuid) to authenticated;
grant execute on function public.my_store_following(int, int) to authenticated;
grant execute on function public.store_followers(uuid, int, int) to authenticated;
