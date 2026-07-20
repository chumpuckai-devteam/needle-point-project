-- Drop list RPC before changing return shape (capacity registration slice)
drop function if exists public.list_upcoming_stitching_meetups(text, text, integer);

alter table public.stitching_meetup_rsvps
  drop constraint if exists stitching_meetup_rsvps_status_check;

alter table public.stitching_meetup_rsvps
  add constraint stitching_meetup_rsvps_status_check
  check (status in ('going', 'interested', 'registered', 'cancelled'));

update public.stitching_meetup_rsvps
set status = 'registered', updated_at = now()
where status in ('going', 'interested');

create or replace function public.meetup_registered_count(p_meetup_id uuid)
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select count(*)::integer
  from public.stitching_meetup_rsvps r
  where r.meetup_id = p_meetup_id
    and r.status in ('registered', 'going', 'interested');
$$;

create or replace function public.register_for_meetup(p_meetup_id uuid)
returns table (
  meetup_id uuid,
  user_id uuid,
  status text,
  registered_count integer,
  capacity integer,
  spots_left integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_meetup public.stitching_meetups%rowtype;
  v_count integer;
  v_existing text;
begin
  if v_uid is null then
    raise exception 'Sign in to register for a meetup' using errcode = '42501';
  end if;

  select * into v_meetup
  from public.stitching_meetups m
  where m.id = p_meetup_id
  for update;

  if not found then
    raise exception 'Meetup not found' using errcode = 'P0002';
  end if;

  if v_meetup.visibility <> 'public' or v_meetup.status <> 'scheduled' then
    raise exception 'This meetup is not open for registration' using errcode = 'P0001';
  end if;

  if v_meetup.starts_at < now() - interval '30 minutes' then
    raise exception 'Registration is closed for this meetup' using errcode = 'P0001';
  end if;

  select r.status into v_existing
  from public.stitching_meetup_rsvps r
  where r.meetup_id = p_meetup_id and r.user_id = v_uid;

  if v_existing in ('registered', 'going', 'interested') then
    v_count := public.meetup_registered_count(p_meetup_id);
    return query
      select p_meetup_id, v_uid, 'registered'::text, v_count, v_meetup.capacity,
        case when v_meetup.capacity is null then null
             else greatest(v_meetup.capacity - v_count, 0) end;
    return;
  end if;

  v_count := public.meetup_registered_count(p_meetup_id);
  if v_meetup.capacity is not null and v_count >= v_meetup.capacity then
    raise exception 'This meetup is full' using errcode = 'P0001';
  end if;

  insert into public.stitching_meetup_rsvps (meetup_id, user_id, status)
  values (p_meetup_id, v_uid, 'registered')
  on conflict (meetup_id, user_id) do update
    set status = 'registered', updated_at = now();

  v_count := public.meetup_registered_count(p_meetup_id);

  return query
    select p_meetup_id, v_uid, 'registered'::text, v_count, v_meetup.capacity,
      case when v_meetup.capacity is null then null
           else greatest(v_meetup.capacity - v_count, 0) end;
end;
$$;

create or replace function public.cancel_meetup_registration(p_meetup_id uuid)
returns table (
  meetup_id uuid,
  user_id uuid,
  status text,
  registered_count integer,
  capacity integer,
  spots_left integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_meetup public.stitching_meetups%rowtype;
  v_count integer;
begin
  if v_uid is null then
    raise exception 'Sign in to cancel a registration' using errcode = '42501';
  end if;

  select * into v_meetup
  from public.stitching_meetups m
  where m.id = p_meetup_id
  for update;

  if not found then
    raise exception 'Meetup not found' using errcode = 'P0002';
  end if;

  delete from public.stitching_meetup_rsvps r
  where r.meetup_id = p_meetup_id and r.user_id = v_uid;

  v_count := public.meetup_registered_count(p_meetup_id);

  return query
    select p_meetup_id, v_uid, 'cancelled'::text, v_count, v_meetup.capacity,
      case when v_meetup.capacity is null then null
           else greatest(v_meetup.capacity - v_count, 0) end;
end;
$$;

revoke all on function public.meetup_registered_count(uuid) from public;
grant execute on function public.meetup_registered_count(uuid) to anon, authenticated, service_role;
revoke all on function public.register_for_meetup(uuid) from public;
grant execute on function public.register_for_meetup(uuid) to authenticated, service_role;
revoke all on function public.cancel_meetup_registration(uuid) from public;
grant execute on function public.cancel_meetup_registration(uuid) to authenticated, service_role;

create or replace function public.list_upcoming_stitching_meetups(
  p_city text default '',
  p_region text default '',
  p_limit integer default 50
)
returns table (
  id uuid,
  host_user_id uuid,
  host_store_id uuid,
  title text,
  description text,
  cover_image_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  timezone text,
  location_type text,
  venue_name text,
  address text,
  city text,
  region text,
  postal_code text,
  country text,
  latitude double precision,
  longitude double precision,
  capacity integer,
  rsvp_mode text,
  external_rsvp_url text,
  topics text[],
  skill_level text,
  visibility text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  going_count bigint,
  interested_count bigint,
  registered_count bigint,
  spots_left integer
)
language sql
stable
security invoker
set search_path = public
as $$
  with filtered as (
    select m.*
    from public.stitching_meetups m
    where m.visibility = 'public'
      and m.status = 'scheduled'
      and m.starts_at >= (now() - interval '2 hours')
      and (
        btrim(coalesce(p_city, '')) = ''
        or lower(m.city) = lower(btrim(p_city))
        or lower(m.city) like '%' || lower(btrim(p_city)) || '%'
      )
      and (
        btrim(coalesce(p_region, '')) = ''
        or lower(m.region) = lower(btrim(p_region))
      )
    order by m.starts_at asc
    limit greatest(1, least(coalesce(p_limit, 50), 100))
  )
  select
    f.id,
    f.host_user_id,
    f.host_store_id,
    f.title,
    f.description,
    f.cover_image_url,
    f.starts_at,
    f.ends_at,
    f.timezone,
    f.location_type,
    f.venue_name,
    f.address,
    f.city,
    f.region,
    f.postal_code,
    f.country,
    f.latitude,
    f.longitude,
    f.capacity,
    f.rsvp_mode,
    f.external_rsvp_url,
    f.topics,
    f.skill_level,
    f.visibility,
    f.status,
    f.created_at,
    f.updated_at,
    coalesce((
      select count(*) from public.stitching_meetup_rsvps r
      where r.meetup_id = f.id and r.status in ('registered', 'going', 'interested')
    ), 0)::bigint as going_count,
    0::bigint as interested_count,
    coalesce((
      select count(*) from public.stitching_meetup_rsvps r
      where r.meetup_id = f.id and r.status in ('registered', 'going', 'interested')
    ), 0)::bigint as registered_count,
    case
      when f.capacity is null then null
      else greatest(
        f.capacity - coalesce((
          select count(*) from public.stitching_meetup_rsvps r
          where r.meetup_id = f.id and r.status in ('registered', 'going', 'interested')
        ), 0)::integer,
        0
      )
    end as spots_left
  from filtered f
  order by f.starts_at asc;
$$;

revoke all on function public.list_upcoming_stitching_meetups(text, text, integer) from public;
grant execute on function public.list_upcoming_stitching_meetups(text, text, integer) to anon, authenticated, service_role;

comment on function public.register_for_meetup(uuid) is
  'Capacity-aware meetup registration. Fails with P0001 when full. Future: paid tickets + host confirmation.';
comment on function public.cancel_meetup_registration(uuid) is
  'Guest cancels registration and frees a spot for others. Future: waitlist auto-fill + cancel deadline.';
