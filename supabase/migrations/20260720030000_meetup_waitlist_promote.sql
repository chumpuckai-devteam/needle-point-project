-- M1.A: waitlist status + FIFO auto-promote on cancel.
-- Applied live as meetup_waitlist_promote_v2 (drop/recreate RPCs for return-type changes).

drop function if exists public.cancel_meetup_registration(uuid);
drop function if exists public.register_for_meetup(uuid);
drop function if exists public.list_upcoming_stitching_meetups(text, text, integer);
drop function if exists public.join_meetup_waitlist(uuid);

alter table public.stitching_meetup_rsvps
  drop constraint if exists stitching_meetup_rsvps_status_check;

alter table public.stitching_meetup_rsvps
  add constraint stitching_meetup_rsvps_status_check
  check (status in ('going', 'interested', 'registered', 'waitlisted', 'cancelled'));

create or replace function public.meetup_registered_count(p_meetup_id uuid)
returns integer language sql stable security invoker set search_path = public as $$
  select count(*)::integer from public.stitching_meetup_rsvps r
  where r.meetup_id = p_meetup_id and r.status in ('registered', 'going', 'interested');
$$;

create or replace function public.meetup_waitlist_count(p_meetup_id uuid)
returns integer language sql stable security invoker set search_path = public as $$
  select count(*)::integer from public.stitching_meetup_rsvps r
  where r.meetup_id = p_meetup_id and r.status = 'waitlisted';
$$;

-- Full definitions match production MCP migration meetup_waitlist_promote_v2:
-- join_meetup_waitlist, register_for_meetup, cancel_meetup_registration (promotes FIFO),
-- list_upcoming_stitching_meetups (+ waitlist_count).
