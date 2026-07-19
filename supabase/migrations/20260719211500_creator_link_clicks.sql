-- Creator profile external-link click analytics.
-- Public clients can insert user-initiated clicks for first-class profile_links.
-- Raw reads are creator-owned; aggregate counts are exposed through a narrow RPC.

create table if not exists public.creator_link_clicks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  profile_link_id uuid not null references public.profile_links (id) on delete cascade,
  link_url text not null,
  clicked_at timestamptz not null default now(),
  constraint creator_link_clicks_link_url_safe_check
    check (
      link_url ~* '^https?://'
      and char_length(link_url) between 8 and 2048
    )
);

create index if not exists creator_link_clicks_profile_clicked_idx
  on public.creator_link_clicks (profile_id, clicked_at desc);

create index if not exists creator_link_clicks_link_clicked_idx
  on public.creator_link_clicks (profile_link_id, clicked_at desc);

alter table public.creator_link_clicks enable row level security;

-- Anonymous/authenticated click recording is allowed only for public profile
-- links that actually belong to the named creator profile. This prevents a
-- public client from fabricating cross-profile link rows.
drop policy if exists "creator_link_clicks_public_insert" on public.creator_link_clicks;
create policy "creator_link_clicks_public_insert"
  on public.creator_link_clicks
  for insert
  to anon, authenticated
  with check (
    exists (
      select 1
      from public.profile_links pl
      join public.profiles p on p.id = pl.profile_id
      where pl.id = creator_link_clicks.profile_link_id
        and pl.profile_id = creator_link_clicks.profile_id
        and pl.url = creator_link_clicks.link_url
        and p.is_creator = true
    )
  );

-- Creators can inspect their own raw rows for debugging/export. Other creators
-- cannot read them; service_role keeps Supabase's normal RLS bypass.
drop policy if exists "creator_link_clicks_creator_select" on public.creator_link_clicks;
create policy "creator_link_clicks_creator_select"
  on public.creator_link_clicks
  for select
  to authenticated
  using (profile_id = (select auth.uid()));

create or replace function public.creator_link_click_counts(
  p_profile_id uuid default null,
  p_profile_link_id uuid default null,
  p_start_at timestamptz default null,
  p_end_at timestamptz default null
)
returns table (
  profile_id uuid,
  profile_link_id uuid,
  link_url text,
  click_day date,
  click_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_profile_id uuid := coalesce(p_profile_id, (select auth.uid()));
begin
  if v_profile_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  if (select auth.role()) <> 'service_role' and v_profile_id <> (select auth.uid()) then
    raise exception 'Cannot read another creator''s link clicks.' using errcode = '42501';
  end if;

  return query
  select
    clc.profile_id,
    clc.profile_link_id,
    clc.link_url,
    date_trunc('day', clc.clicked_at)::date as click_day,
    count(*)::bigint as click_count
  from public.creator_link_clicks clc
  where clc.profile_id = v_profile_id
    and (p_profile_link_id is null or clc.profile_link_id = p_profile_link_id)
    and (p_start_at is null or clc.clicked_at >= p_start_at)
    and (p_end_at is null or clc.clicked_at < p_end_at)
  group by clc.profile_id, clc.profile_link_id, clc.link_url, click_day
  order by click_day desc, click_count desc;
end;
$$;

comment on table public.creator_link_clicks
  is 'Creator-owned profile external-link click events. Public clients insert verified profile_link clicks; creators can read only their own rows.';
comment on function public.creator_link_click_counts(uuid, uuid, timestamptz, timestamptz)
  is 'Creator-scoped aggregate profile-link click counts grouped by link and day.';

revoke all on public.creator_link_clicks from anon, authenticated;
grant insert on public.creator_link_clicks to anon, authenticated;
grant select on public.creator_link_clicks to authenticated;

revoke all on function public.creator_link_click_counts(uuid, uuid, timestamptz, timestamptz) from public;
grant execute on function public.creator_link_click_counts(uuid, uuid, timestamptz, timestamptz) to authenticated, service_role;
