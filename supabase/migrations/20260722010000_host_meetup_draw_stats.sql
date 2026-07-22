-- Phase C: creator / host meetup draw stats.
-- Aggregate registration + attendance counts for the authenticated host only.
-- No guest PII; no raw RSVP rows.

create or replace function public.host_meetup_draw_stats(
  p_start_at timestamptz default null,
  p_end_at timestamptz default null
)
returns table (
  meetups_hosted bigint,
  registrations bigint,
  checked_in bigint,
  waitlisted bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_host_id uuid := (select auth.uid());
begin
  if v_host_id is null and (select auth.role()) <> 'service_role' then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  -- service_role without a JWT uid sees empty aggregates (callers should pass auth).
  if v_host_id is null then
    return query
    select 0::bigint, 0::bigint, 0::bigint, 0::bigint;
    return;
  end if;

  return query
  with host_meetups as (
    select m.id
    from public.stitching_meetups m
    where m.host_user_id = v_host_id
      and m.status in ('scheduled', 'ended', 'cancelled')
      and (p_start_at is null or m.starts_at >= p_start_at)
      and (p_end_at is null or m.starts_at < p_end_at)
  )
  select
    (select count(*)::bigint from host_meetups) as meetups_hosted,
    (
      select count(*)::bigint
      from public.stitching_meetup_rsvps r
      where r.meetup_id in (select id from host_meetups)
        and r.status in ('registered', 'going', 'interested')
    ) as registrations,
    (
      select count(*)::bigint
      from public.stitching_meetup_rsvps r
      where r.meetup_id in (select id from host_meetups)
        and r.status in ('registered', 'going', 'interested')
        and r.checked_in_at is not null
    ) as checked_in,
    (
      select count(*)::bigint
      from public.stitching_meetup_rsvps r
      where r.meetup_id in (select id from host_meetups)
        and r.status = 'waitlisted'
    ) as waitlisted;
end;
$$;

comment on function public.host_meetup_draw_stats(timestamptz, timestamptz)
  is 'Host-only aggregate meetup draw: hosted count, seat registrations, door check-ins, and waitlist depth over an optional starts_at window. No guest PII.';

revoke all on function public.host_meetup_draw_stats(timestamptz, timestamptz) from public;
grant execute on function public.host_meetup_draw_stats(timestamptz, timestamptz) to authenticated, service_role;
