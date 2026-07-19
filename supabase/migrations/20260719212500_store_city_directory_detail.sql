-- Public city-directory and stable shop-detail APIs for no-GPS LNS browse.

create or replace function public.store_city_directory(p_limit integer default 100)
returns table (
  city text,
  region text,
  country text,
  city_slug text,
  region_slug text,
  country_slug text,
  shop_count integer,
  specialty_preview text[],
  example_shop_names text[],
  example_shop_handles text[]
)
language sql
stable
security invoker
set search_path = public
as $$
  with grouped as (
    select
      s.city,
      s.region,
      s.country,
      count(*)::integer as shop_count
    from public.stores s
    where s.city <> ''
      and s.store_type in ('local', 'both')
    group by s.city, s.region, s.country
  )
  select
    g.city,
    g.region,
    g.country,
    btrim(regexp_replace(lower(g.city), '[^a-z0-9]+', '-', 'g'), '-') as city_slug,
    btrim(regexp_replace(lower(g.region), '[^a-z0-9]+', '-', 'g'), '-') as region_slug,
    btrim(regexp_replace(lower(g.country), '[^a-z0-9]+', '-', 'g'), '-') as country_slug,
    g.shop_count,
    coalesce(
      array(
        select distinct specialty
        from public.stores sx
        cross join unnest(sx.specialties) as specialty
        where sx.city = g.city
          and sx.region = g.region
          and sx.country = g.country
          and sx.store_type in ('local', 'both')
          and specialty <> ''
        order by specialty
        limit 3
      ),
      '{}'::text[]
    ) as specialty_preview,
    coalesce(
      array(
        select sx.name
        from public.stores sx
        where sx.city = g.city
          and sx.region = g.region
          and sx.country = g.country
          and sx.store_type in ('local', 'both')
        order by lower(sx.name), sx.id
        limit 2
      ),
      '{}'::text[]
    ) as example_shop_names,
    coalesce(
      array(
        select sx.handle
        from public.stores sx
        where sx.city = g.city
          and sx.region = g.region
          and sx.country = g.country
          and sx.store_type in ('local', 'both')
        order by lower(sx.name), sx.id
        limit 2
      ),
      '{}'::text[]
    ) as example_shop_handles
  from grouped g
  order by shop_count desc, lower(city), lower(region), lower(country)
  limit greatest(1, least(coalesce(p_limit, 100), 250));
$$;

comment on function public.store_city_directory(integer)
  is 'Public city browse API for no-GPS shop discovery. Shape: city/region/country slugs, local-or-hybrid shop count, up to three specialty previews, and up to two example shop names/handles. Ordered by shop count, then city label.';

grant execute on function public.store_city_directory(integer) to anon, authenticated;

create or replace function public.store_detail(p_identifier text)
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
  postal_code text,
  country text,
  ships_nationwide boolean,
  specialties text[],
  created_at timestamptz,
  updated_at timestamptz,
  latitude double precision,
  longitude double precision,
  project_count integer,
  follower_count bigint
)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_identifier text := lower(btrim(coalesce(p_identifier, '')));
begin
  if v_identifier = '' then
    return;
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
    s.postal_code,
    s.country,
    s.ships_nationwide,
    s.specialties,
    s.created_at,
    s.updated_at,
    s.latitude,
    s.longitude,
    coalesce(projects.project_count, 0)::integer as project_count,
    coalesce(follows.follower_count, 0::bigint) as follower_count
  from public.stores s
  left join lateral (
    select count(*)::integer as project_count
    from public.project_stores ps
    where ps.store_id = s.id
  ) projects on true
  left join public.store_follow_counts() follows on follows.store_id = s.id
  where lower(s.handle) = v_identifier
     or s.id::text = v_identifier
  order by lower(s.handle) = v_identifier desc
  limit 1;
end;
$$;

comment on function public.store_detail(text)
  is 'Public stable shop detail API. Accepts a store handle/slug or UUID and returns store profile fields plus project_count and follower_count for /stores/:handle deep links.';

grant execute on function public.store_detail(text) to anon, authenticated;
