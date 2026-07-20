-- Stitching meetups: in-person/hybrid local gatherings (distinct from stitch-alongs).
-- Public browse; auth for create + RSVP. No ticketing / checkout.

create table if not exists public.stitching_meetups (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references public.profiles (id) on delete cascade,
  host_store_id uuid references public.stores (id) on delete set null,
  title text not null,
  description text not null default '',
  cover_image_url text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'America/Los_Angeles',
  location_type text not null default 'in_person'
    check (location_type in ('in_person', 'hybrid', 'online')),
  venue_name text not null default '',
  address text not null default '',
  city text not null default '',
  region text not null default '',
  postal_code text not null default '',
  country text not null default 'US',
  latitude double precision,
  longitude double precision,
  capacity integer,
  rsvp_mode text not null default 'in_app_rsvp'
    check (rsvp_mode in ('interest_only', 'external_link', 'in_app_rsvp')),
  external_rsvp_url text not null default '',
  topics text[] not null default '{}',
  skill_level text not null default '',
  visibility text not null default 'public'
    check (visibility in ('public', 'unlisted')),
  status text not null default 'scheduled'
    check (status in ('draft', 'scheduled', 'cancelled', 'ended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stitching_meetups_title_len check (char_length(btrim(title)) between 1 and 120),
  constraint stitching_meetups_description_len check (char_length(description) <= 4000),
  constraint stitching_meetups_capacity_pos check (capacity is null or capacity > 0),
  constraint stitching_meetups_lat_check check (latitude is null or latitude between -90 and 90),
  constraint stitching_meetups_lng_check check (longitude is null or longitude between -180 and 180),
  constraint stitching_meetups_ends_after_start check (ends_at is null or ends_at >= starts_at)
);

create index if not exists stitching_meetups_upcoming_idx
  on public.stitching_meetups (status, visibility, starts_at)
  where status = 'scheduled' and visibility = 'public';

create index if not exists stitching_meetups_city_idx
  on public.stitching_meetups (lower(city), lower(region), starts_at)
  where city <> '';

create index if not exists stitching_meetups_host_idx
  on public.stitching_meetups (host_user_id, starts_at desc);

create index if not exists stitching_meetups_store_idx
  on public.stitching_meetups (host_store_id, starts_at)
  where host_store_id is not null;

drop trigger if exists stitching_meetups_set_updated_at on public.stitching_meetups;
create trigger stitching_meetups_set_updated_at
  before update on public.stitching_meetups
  for each row execute function public.set_updated_at();

create table if not exists public.stitching_meetup_rsvps (
  meetup_id uuid not null references public.stitching_meetups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'interested'
    check (status in ('going', 'interested', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (meetup_id, user_id)
);

create index if not exists stitching_meetup_rsvps_user_idx
  on public.stitching_meetup_rsvps (user_id, updated_at desc);

create index if not exists stitching_meetup_rsvps_meetup_status_idx
  on public.stitching_meetup_rsvps (meetup_id, status)
  where status in ('going', 'interested');

drop trigger if exists stitching_meetup_rsvps_set_updated_at on public.stitching_meetup_rsvps;
create trigger stitching_meetup_rsvps_set_updated_at
  before update on public.stitching_meetup_rsvps
  for each row execute function public.set_updated_at();

alter table public.stitching_meetups enable row level security;
alter table public.stitching_meetup_rsvps enable row level security;

-- Public scheduled meetups are browsable; hosts see their drafts/cancelled.
drop policy if exists "stitching_meetups_public_or_host_read" on public.stitching_meetups;
create policy "stitching_meetups_public_or_host_read" on public.stitching_meetups
  for select to anon, authenticated
  using (
    (visibility = 'public' and status in ('scheduled', 'ended', 'cancelled'))
    or host_user_id = (select auth.uid())
    or (select auth.role()) = 'service_role'
  );

drop policy if exists "stitching_meetups_host_insert" on public.stitching_meetups;
create policy "stitching_meetups_host_insert" on public.stitching_meetups
  for insert to authenticated
  with check (host_user_id = (select auth.uid()));

drop policy if exists "stitching_meetups_host_update" on public.stitching_meetups;
create policy "stitching_meetups_host_update" on public.stitching_meetups
  for update to authenticated
  using (host_user_id = (select auth.uid()) or (select auth.role()) = 'service_role')
  with check (host_user_id = (select auth.uid()) or (select auth.role()) = 'service_role');

drop policy if exists "stitching_meetups_host_delete" on public.stitching_meetups;
create policy "stitching_meetups_host_delete" on public.stitching_meetups
  for delete to authenticated
  using (host_user_id = (select auth.uid()) or (select auth.role()) = 'service_role');

-- RSVP counts are public for public meetups; users manage only their own rows.
drop policy if exists "stitching_meetup_rsvps_public_or_own_read" on public.stitching_meetup_rsvps;
create policy "stitching_meetup_rsvps_public_or_own_read" on public.stitching_meetup_rsvps
  for select to anon, authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.stitching_meetups m
      where m.id = meetup_id
        and m.visibility = 'public'
        and m.status in ('scheduled', 'ended')
    )
  );

drop policy if exists "stitching_meetup_rsvps_user_insert" on public.stitching_meetup_rsvps;
create policy "stitching_meetup_rsvps_user_insert" on public.stitching_meetup_rsvps
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.stitching_meetups m
      where m.id = meetup_id
        and m.visibility = 'public'
        and m.status = 'scheduled'
    )
  );

drop policy if exists "stitching_meetup_rsvps_user_update" on public.stitching_meetup_rsvps;
create policy "stitching_meetup_rsvps_user_update" on public.stitching_meetup_rsvps
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "stitching_meetup_rsvps_user_delete" on public.stitching_meetup_rsvps;
create policy "stitching_meetup_rsvps_user_delete" on public.stitching_meetup_rsvps
  for delete to authenticated
  using (user_id = (select auth.uid()));

grant select on public.stitching_meetups to anon, authenticated;
grant insert, update, delete on public.stitching_meetups to authenticated;
grant select on public.stitching_meetup_rsvps to anon, authenticated;
grant insert, update, delete on public.stitching_meetup_rsvps to authenticated;

-- Lightweight list helper with RSVP aggregates (security invoker; RLS applies to base tables).
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
  interested_count bigint
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
      where r.meetup_id = f.id and r.status = 'going'
    ), 0)::bigint as going_count,
    coalesce((
      select count(*) from public.stitching_meetup_rsvps r
      where r.meetup_id = f.id and r.status = 'interested'
    ), 0)::bigint as interested_count
  from filtered f
  order by f.starts_at asc;
$$;

revoke all on function public.list_upcoming_stitching_meetups(text, text, integer) from public;
grant execute on function public.list_upcoming_stitching_meetups(text, text, integer) to anon, authenticated, service_role;

comment on table public.stitching_meetups is
  'In-person/hybrid stitching meetups. Distinct from multi-week online stitch-alongs.';
comment on table public.stitching_meetup_rsvps is
  'Lightweight going/interested RSVPs for public scheduled meetups.';
