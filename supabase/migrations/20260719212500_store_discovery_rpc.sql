-- Epic L / Phase V4: ZIP/city place resolution plus stable store discovery payloads.
-- Public read-only discovery; no private owner/requester data is exposed.

create table if not exists public.store_discovery_places (
  id uuid primary key default gen_random_uuid(),
  country text not null default 'US',
  region text not null default '',
  city text not null default '',
  zip text not null default '',
  latitude double precision not null,
  longitude double precision not null,
  created_at timestamptz not null default now(),
  constraint store_discovery_places_country_check check (country = upper(country) and country <> ''),
  constraint store_discovery_places_zip_check check (zip = '' or zip ~ '^\d{5}$'),
  constraint store_discovery_places_lat_check check (latitude between -90 and 90),
  constraint store_discovery_places_lng_check check (longitude between -180 and 180),
  constraint store_discovery_places_city_or_zip_check check (city <> '' or zip <> '')
);

create unique index if not exists store_discovery_places_zip_country_uidx
  on public.store_discovery_places (country, zip)
  where zip <> '';
create index if not exists store_discovery_places_city_idx
  on public.store_discovery_places (lower(city), lower(region), country)
  where city <> '';

alter table public.store_discovery_places enable row level security;

drop policy if exists "store discovery places are public readable" on public.store_discovery_places;
create policy "store discovery places are public readable" on public.store_discovery_places
  for select to anon, authenticated
  using (true);

grant select on public.store_discovery_places to anon, authenticated;

insert into public.store_discovery_places (country, region, city, zip, latitude, longitude)
values
  ('US', 'TX', 'Austin', '78701', 30.2672, -97.7431),
  ('US', 'OR', 'Portland', '97205', 45.5202, -122.6742),
  ('US', 'ME', 'Portland', '04101', 43.6591, -70.2568),
  ('US', 'SC', 'Charleston', '29401', 32.7765, -79.9311)
on conflict do nothing;

create or replace function public.search_store_discovery(
  p_mode text default 'browse',
  p_zip text default '',
  p_city text default '',
  p_region text default '',
  p_country text default 'US',
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_miles integer default 60,
  p_bounds jsonb default null,
  p_limit integer default 50
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_mode text := lower(btrim(coalesce(p_mode, 'browse')));
  v_zip text := substring(btrim(coalesce(p_zip, '')) from '^\d{5}');
  v_city text := btrim(coalesce(p_city, ''));
  v_city_norm text := lower(btrim(coalesce(p_city, '')));
  v_region text := upper(btrim(coalesce(p_region, '')));
  v_region_norm text := lower(btrim(coalesce(p_region, '')));
  v_country text := upper(btrim(coalesce(p_country, 'US')));
  v_radius integer := case
    when coalesce(p_radius_miles, 60) <= 60 then 60
    when coalesce(p_radius_miles, 60) <= 100 then 100
    else 150
  end;
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
  v_center_lat double precision := null;
  v_center_lng double precision := null;
  v_display_label text := '';
  v_status text := 'ok';
  v_message text := null;
  v_candidates jsonb := null;
  v_candidate_count integer := 0;
  v_local_within integer := 0;
  v_local_outside integer := 0;
  v_list jsonb := '[]'::jsonb;
  v_pins jsonb := '[]'::jsonb;
  v_online jsonb := '[]'::jsonb;
  v_bounds_north double precision := null;
  v_bounds_south double precision := null;
  v_bounds_east double precision := null;
  v_bounds_west double precision := null;
begin
  if v_mode not in ('zip', 'city', 'point', 'browse') then
    return jsonb_build_object(
      'query', jsonb_build_object('mode', 'browse', 'displayLabel', '', 'radiusMiles', v_radius),
      'status', 'invalid-input',
      'message', 'Choose a valid store search mode.',
      'list', '[]'::jsonb,
      'mapPins', '[]'::jsonb,
      'onlineFallback', '[]'::jsonb,
      'counts', jsonb_build_object('totalList', 0, 'localWithinRadius', 0, 'localOutsideRadius', 0, 'onlineFallback', 0, 'mapPins', 0)
    );
  end if;

  if v_mode = 'zip' then
    if v_zip = '' then
      return jsonb_build_object(
        'query', jsonb_build_object('mode', 'zip', 'displayLabel', '', 'radiusMiles', v_radius),
        'status', 'invalid-input',
        'message', 'Enter a 5-digit ZIP code.',
        'list', '[]'::jsonb,
        'mapPins', '[]'::jsonb,
        'onlineFallback', '[]'::jsonb,
        'counts', jsonb_build_object('totalList', 0, 'localWithinRadius', 0, 'localOutsideRadius', 0, 'onlineFallback', 0, 'mapPins', 0)
      );
    end if;

    select latitude, longitude, coalesce(nullif(city, ''), v_zip)
      into v_center_lat, v_center_lng, v_display_label
    from public.store_discovery_places
    where country = v_country and zip = v_zip
    limit 1;

    v_display_label := v_zip;
    if v_center_lat is null then
      return jsonb_build_object(
        'query', jsonb_build_object('mode', 'zip', 'displayLabel', v_zip, 'zip', v_zip, 'radiusMiles', v_radius),
        'status', 'geocode-unavailable',
        'message', 'We could not resolve that ZIP code yet.',
        'list', '[]'::jsonb,
        'mapPins', '[]'::jsonb,
        'onlineFallback', '[]'::jsonb,
        'counts', jsonb_build_object('totalList', 0, 'localWithinRadius', 0, 'localOutsideRadius', 0, 'onlineFallback', 0, 'mapPins', 0)
      );
    end if;
  elsif v_mode = 'city' then
    if v_city_norm = '' then
      return jsonb_build_object(
        'query', jsonb_build_object('mode', 'city', 'displayLabel', '', 'radiusMiles', v_radius),
        'status', 'invalid-input',
        'message', 'Enter a ZIP or city to search.',
        'list', '[]'::jsonb,
        'mapPins', '[]'::jsonb,
        'onlineFallback', '[]'::jsonb,
        'counts', jsonb_build_object('totalList', 0, 'localWithinRadius', 0, 'localOutsideRadius', 0, 'onlineFallback', 0, 'mapPins', 0)
      );
    end if;

    select count(*) into v_candidate_count
    from public.store_discovery_places
    where country = v_country
      and lower(city) = v_city_norm
      and (v_region_norm = '' or lower(region) = v_region_norm);

    if v_candidate_count > 1 and v_region_norm = '' then
      select jsonb_agg(jsonb_build_object(
        'city', p.city,
        'region', p.region,
        'country', p.country,
        'displayLabel', concat_ws(', ', p.city, nullif(p.region, '')),
        'center', jsonb_build_object('lat', p.latitude, 'lng', p.longitude),
        'shopCount', coalesce(s.shop_count, 0)
      ) order by p.region)
      into v_candidates
      from public.store_discovery_places p
      left join (
        select lower(city) as city_key, lower(region) as region_key, country, count(*)::integer as shop_count
        from public.stores
        where store_type in ('local', 'both')
        group by lower(city), lower(region), country
      ) s on s.city_key = lower(p.city) and s.region_key = lower(p.region) and s.country = p.country
      where p.country = v_country and lower(p.city) = v_city_norm;

      return jsonb_build_object(
        'query', jsonb_build_object('mode', 'city', 'displayLabel', v_city, 'city', v_city, 'country', v_country, 'radiusMiles', v_radius),
        'status', 'ambiguous-city',
        'message', concat('Which ', v_city, ' did you mean?'),
        'cityCandidates', coalesce(v_candidates, '[]'::jsonb),
        'list', '[]'::jsonb,
        'mapPins', '[]'::jsonb,
        'onlineFallback', '[]'::jsonb,
        'counts', jsonb_build_object('totalList', 0, 'localWithinRadius', 0, 'localOutsideRadius', 0, 'onlineFallback', 0, 'mapPins', 0)
      );
    end if;

    select latitude, longitude, concat_ws(', ', city, nullif(region, ''))
      into v_center_lat, v_center_lng, v_display_label
    from public.store_discovery_places
    where country = v_country
      and lower(city) = v_city_norm
      and (v_region_norm = '' or lower(region) = v_region_norm)
    order by case when lower(region) = v_region_norm then 0 else 1 end
    limit 1;

    if v_center_lat is null then
      return jsonb_build_object(
        'query', jsonb_build_object('mode', 'city', 'displayLabel', v_city, 'city', v_city, 'region', v_region, 'country', v_country, 'radiusMiles', v_radius),
        'status', 'geocode-unavailable',
        'message', 'We could not resolve that city yet.',
        'list', '[]'::jsonb,
        'mapPins', '[]'::jsonb,
        'onlineFallback', '[]'::jsonb,
        'counts', jsonb_build_object('totalList', 0, 'localWithinRadius', 0, 'localOutsideRadius', 0, 'onlineFallback', 0, 'mapPins', 0)
      );
    end if;
  elsif v_mode = 'point' then
    if p_lat is null or p_lng is null or p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180 then
      return jsonb_build_object(
        'query', jsonb_build_object('mode', 'point', 'displayLabel', '', 'radiusMiles', v_radius),
        'status', 'invalid-input',
        'message', 'Choose a valid map location.',
        'list', '[]'::jsonb,
        'mapPins', '[]'::jsonb,
        'onlineFallback', '[]'::jsonb,
        'counts', jsonb_build_object('totalList', 0, 'localWithinRadius', 0, 'localOutsideRadius', 0, 'onlineFallback', 0, 'mapPins', 0)
      );
    end if;
    v_center_lat := p_lat;
    v_center_lng := p_lng;
    v_display_label := 'your location';
  else
    v_display_label := 'Browse shops';
    if p_bounds is not null then
      v_bounds_north := nullif(p_bounds->>'north', '')::double precision;
      v_bounds_south := nullif(p_bounds->>'south', '')::double precision;
      v_bounds_east := nullif(p_bounds->>'east', '')::double precision;
      v_bounds_west := nullif(p_bounds->>'west', '')::double precision;
    end if;
  end if;

  with project_counts as (
    select ps.store_id, count(*)::integer as project_count
    from public.project_stores ps
    group by ps.store_id
  ), product_counts as (
    select sp.store_id, count(*)::integer as product_count
    from public.store_products sp
    group by sp.store_id
  ), follow_counts as (
    select sf.store_id, count(*)::integer as follower_count
    from public.store_follows sf
    group by sf.store_id
  ), store_base as (
    select
      s.id,
      s.name,
      s.handle,
      s.store_type,
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
      coalesce(pc.project_count, 0) as project_count,
      coalesce(pr.product_count, 0) as product_count,
      coalesce(fc.follower_count, 0) as follower_count,
      case
        when v_center_lat is not null and s.latitude is not null and s.longitude is not null and s.store_type in ('local', 'both') then
          3958.8 * 2 * asin(least(1, sqrt(
            power(sin(radians(s.latitude - v_center_lat) / 2), 2) +
            cos(radians(v_center_lat)) * cos(radians(s.latitude)) * power(sin(radians(s.longitude - v_center_lng) / 2), 2)
          )))
        else null
      end as distance_miles
    from public.stores s
    left join project_counts pc on pc.store_id = s.id
    left join product_counts pr on pr.store_id = s.id
    left join follow_counts fc on fc.store_id = s.id
  ), filtered as (
    select * from store_base sb
    where v_mode <> 'browse'
      or v_bounds_north is null
      or (
        sb.latitude is not null and sb.longitude is not null
        and sb.latitude <= v_bounds_north and sb.latitude >= v_bounds_south
        and sb.longitude <= v_bounds_east and sb.longitude >= v_bounds_west
      )
  ), ranked as (
    select
      *,
      case
        when v_center_lat is not null and store_type in ('local', 'both') and distance_miles <= v_radius then 'nearby'
        when v_center_lat is null and store_type in ('local', 'both') then 'nearby'
        when store_type in ('online', 'both') or ships_nationwide then 'online'
        else 'far'
      end as proximity_rank,
      (project_count * 10 + case when ships_nationwide then 5 else 0 end + product_count) as online_score
    from filtered
  ), list_rows as (
    select * from ranked
    where (v_center_lat is not null and proximity_rank = 'nearby')
       or (v_center_lat is null and store_type in ('local', 'both'))
    order by
      case when v_center_lat is not null then distance_miles end asc nulls last,
      name asc
    limit v_limit
  ), online_rows as (
    select * from ranked r
    where (r.store_type in ('online', 'both') or r.ships_nationwide)
      and not exists (select 1 from list_rows lr where lr.id = r.id)
    order by online_score desc, name asc
    limit v_limit
  ), pin_rows as (
    select * from ranked
    where latitude is not null and longitude is not null and store_type in ('local', 'both')
    order by case when distance_miles is null then 1 else 0 end, distance_miles asc nulls last, name asc
    limit v_limit
  ), totals as (
    select
      count(*) filter (where proximity_rank = 'nearby' and store_type in ('local', 'both'))::integer as local_within,
      count(*) filter (where store_type in ('local', 'both') and (proximity_rank <> 'nearby' or distance_miles is null))::integer as local_outside
    from ranked
  )
  select
    coalesce((select jsonb_agg(jsonb_build_object(
      'id', id,
      'handle', handle,
      'name', name,
      'storeType', store_type,
      'avatarUrl', coalesce(nullif(avatar_url, ''), '/assets/needlepoint-hero.png'),
      'coverImageUrl', coalesce(nullif(cover_image_url, ''), '/assets/needlepoint-hero.png'),
      'location', coalesce(location, ''),
      'city', coalesce(city, ''),
      'region', coalesce(region, ''),
      'country', coalesce(country, ''),
      'shipsNationwide', ships_nationwide,
      'specialties', coalesce(to_jsonb(specialties), '[]'::jsonb),
      'projectCount', project_count,
      'followerCount', follower_count,
      'websiteUrl', website_url,
      'distanceMiles', distance_miles,
      'proximityRank', proximity_rank,
      'detailUrl', '/stores/' || handle
    ) order by case when distance_miles is null then 1 else 0 end, distance_miles asc nulls last, name asc) from list_rows), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object(
      'storeId', id,
      'handle', handle,
      'name', name,
      'lat', latitude,
      'lng', longitude,
      'proximityRank', case when proximity_rank = 'nearby' then 'nearby' else 'far' end,
      'distanceMiles', distance_miles,
      'detailUrl', '/stores/' || handle
    ) order by case when distance_miles is null then 1 else 0 end, distance_miles asc nulls last, name asc) from pin_rows), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object(
      'id', id,
      'handle', handle,
      'name', name,
      'storeType', store_type,
      'avatarUrl', coalesce(nullif(avatar_url, ''), '/assets/needlepoint-hero.png'),
      'coverImageUrl', coalesce(nullif(cover_image_url, ''), '/assets/needlepoint-hero.png'),
      'location', coalesce(location, ''),
      'city', coalesce(city, ''),
      'region', coalesce(region, ''),
      'country', coalesce(country, ''),
      'shipsNationwide', ships_nationwide,
      'specialties', coalesce(to_jsonb(specialties), '[]'::jsonb),
      'projectCount', project_count,
      'followerCount', follower_count,
      'websiteUrl', website_url,
      'distanceMiles', null,
      'proximityRank', 'online',
      'detailUrl', '/stores/' || handle
    ) order by online_score desc, name asc) from online_rows), '[]'::jsonb),
    coalesce((select local_within from totals), 0),
    coalesce((select local_outside from totals), 0)
  into v_list, v_pins, v_online, v_local_within, v_local_outside;

  if v_center_lat is not null and v_local_within = 0 then
    v_status := 'zero-local';
    v_message := concat('No local shops within ', v_radius, ' miles of ', v_display_label);
  end if;

  return jsonb_build_object('list', v_list)
    || jsonb_build_object(
      'query', jsonb_strip_nulls(jsonb_build_object(
        'mode', v_mode,
        'displayLabel', v_display_label,
        'zip', case when v_mode = 'zip' then v_zip else null end,
        'city', case when v_mode = 'city' then v_city else null end,
        'region', case when v_mode = 'city' then v_region else null end,
        'country', case when v_mode = 'city' then v_country else null end,
        'center', case when v_center_lat is not null then jsonb_build_object('lat', v_center_lat, 'lng', v_center_lng) else null end,
        'radiusMiles', v_radius
      )),
      'status', v_status,
      'message', v_message,
      'mapPins', v_pins,
      'onlineFallback', v_online,
      'counts', jsonb_build_object(
        'totalList', jsonb_array_length(v_list),
        'localWithinRadius', v_local_within,
        'localOutsideRadius', v_local_outside,
        'onlineFallback', jsonb_array_length(v_online),
        'mapPins', jsonb_array_length(v_pins)
      )
    );
end;
$$;

comment on function public.search_store_discovery(text, text, text, text, text, double precision, double precision, integer, jsonb, integer)
  is 'Public store discovery RPC: resolves zip/city/point/map bounds and returns stable list card, map pin, count, zero-local, invalid-input, ambiguous-city, and online fallback payloads for Epic L.';

grant execute on function public.search_store_discovery(text, text, text, text, text, double precision, double precision, integer, jsonb, integer) to anon, authenticated;
