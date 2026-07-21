-- M1.B confirmed_at on stitching_meetup_rsvps (applied live as meetup_registration_confirmed_at).
-- register_for_meetup returns confirmed_at; waitlist promote sets confirmed_at = now().
alter table public.stitching_meetup_rsvps
  add column if not exists confirmed_at timestamptz;
