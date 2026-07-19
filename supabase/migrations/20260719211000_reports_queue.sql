-- Reports queue + authenticated submit path.
-- Public clients submit through submit_report(); admin/moderator users can review
-- the queue through RLS-gated table reads/updates or service-role admin tooling.

do $$
begin
  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'report_target_type') then
    create type public.report_target_type as enum ('project', 'profile', 'store');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'report_status') then
    create type public.report_status as enum ('queued', 'open', 'reviewed', 'dismissed');
  end if;
end $$;

alter type public.report_status add value if not exists 'queued' before 'open';
alter type public.report_status add value if not exists 'reviewed';
alter type public.report_status add value if not exists 'dismissed';

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type public.report_target_type not null,
  target_id uuid not null,
  reason text not null,
  notes text not null default '',
  target_label text not null default '',
  status public.report_status not null default 'open',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reports_reason_enum check (reason in ('spam', 'harassment', 'hate', 'scam', 'nudity', 'self_harm', 'illegal', 'other')),
  constraint reports_notes_length check (char_length(notes) <= 1000),
  constraint reports_target_label_length check (char_length(target_label) <= 160)
);

alter table public.reports
  add column if not exists notes text not null default '',
  add column if not exists target_label text not null default '',
  add column if not exists reviewed_by uuid references public.profiles (id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.reports
  alter column target_type type public.report_target_type
  using case
    when target_type::text in ('project', 'profile', 'store') then target_type::text::public.report_target_type
    else 'project'::public.report_target_type
  end,
  alter column status set default 'open'::public.report_status,
  alter column reason set not null,
  alter column notes set not null,
  alter column target_label set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reports_reason_enum' and conrelid = 'public.reports'::regclass
  ) then
    alter table public.reports
      add constraint reports_reason_enum check (reason in ('spam', 'harassment', 'hate', 'scam', 'nudity', 'self_harm', 'illegal', 'other'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'reports_notes_length' and conrelid = 'public.reports'::regclass
  ) then
    alter table public.reports
      add constraint reports_notes_length check (char_length(notes) <= 1000);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'reports_target_label_length' and conrelid = 'public.reports'::regclass
  ) then
    alter table public.reports
      add constraint reports_target_label_length check (char_length(target_label) <= 160);
  end if;
end $$;

create index if not exists reports_reporter_created_idx on public.reports (reporter_id, created_at desc);
create index if not exists reports_status_created_idx on public.reports (status, created_at desc);
create index if not exists reports_target_idx on public.reports (target_type, target_id);
create unique index if not exists reports_one_open_per_reporter_target_idx
  on public.reports (reporter_id, target_type, target_id)
  where status = 'open';

drop trigger if exists reports_set_updated_at on public.reports;
create trigger reports_set_updated_at before update on public.reports
for each row execute function public.set_updated_at();

create or replace function public.enforce_report_insert_rules()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if v_actor is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  new.reporter_id := v_actor;
  new.reason := btrim(coalesce(new.reason, ''));
  new.notes := btrim(coalesce(new.notes, ''));
  new.target_label := btrim(coalesce(new.target_label, ''));
  new.status := 'open';
  new.reviewed_by := null;
  new.reviewed_at := null;

  if new.reason not in ('spam', 'harassment', 'hate', 'scam', 'nudity', 'self_harm', 'illegal', 'other') then
    raise exception 'Choose a valid report reason.' using errcode = '22023';
  end if;

  if char_length(new.notes) > 1000 then
    raise exception 'Report notes must be 1000 characters or less.' using errcode = '22023';
  end if;

  if char_length(new.target_label) > 160 then
    raise exception 'Report label must be 160 characters or less.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.reports
    where reporter_id = v_actor
      and target_type = new.target_type
      and target_id = new.target_id
      and status = 'open'
  ) then
    raise exception 'You have already submitted an open report for this item.' using errcode = '23505';
  end if;

  if exists (
    select 1
    from public.reports
    where reporter_id = v_actor
      and created_at > now() - interval '30 seconds'
  ) then
    raise exception 'Please wait before submitting another report.' using errcode = '42900';
  end if;

  if (
    select count(*)
    from public.reports
    where reporter_id = v_actor
      and created_at > now() - interval '10 minutes'
  ) >= 5 then
    raise exception 'Please wait before submitting another report.' using errcode = '42900';
  end if;

  return new;
end;
$$;

drop trigger if exists reports_enforce_insert_rules on public.reports;
create trigger reports_enforce_insert_rules before insert on public.reports
for each row execute function public.enforce_report_insert_rules();

create or replace function public.is_admin_or_moderator()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(auth.role(), '') = 'service_role'
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'moderator')
    or exists (
      select 1
      from jsonb_array_elements_text(coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb)) as role_name(role)
      where role_name.role in ('admin', 'moderator')
    );
$$;

comment on function public.is_admin_or_moderator() is 'True for service role or JWT app_metadata role/roles containing admin or moderator.';

alter table public.reports enable row level security;

drop policy if exists "Users insert reports" on public.reports;
drop policy if exists "Users read own reports" on public.reports;
drop policy if exists "reports_insert_own_via_rpc" on public.reports;
drop policy if exists "reports_select_own_or_admin" on public.reports;
drop policy if exists "reports_admin_update" on public.reports;

create policy "reports_insert_own_via_rpc" on public.reports
  for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and status = 'open'
    and reviewed_by is null
    and reviewed_at is null
  );

create policy "reports_select_own_or_admin" on public.reports
  for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_admin_or_moderator());

create policy "reports_admin_update" on public.reports
  for update to authenticated
  using (public.is_admin_or_moderator())
  with check (public.is_admin_or_moderator());

create or replace function public.submit_report(
  p_target_type public.report_target_type,
  p_target_id uuid,
  p_reason text,
  p_notes text default '',
  p_target_label text default ''
)
returns public.reports
language plpgsql
set search_path = public
as $$
declare
  v_actor uuid := (select auth.uid());
  v_reason text := btrim(coalesce(p_reason, ''));
  v_notes text := btrim(coalesce(p_notes, ''));
  v_label text := btrim(coalesce(p_target_label, ''));
  v_report public.reports;
begin
  if v_actor is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  if v_reason not in ('spam', 'harassment', 'hate', 'scam', 'nudity', 'self_harm', 'illegal', 'other') then
    raise exception 'Choose a valid report reason.' using errcode = '22023';
  end if;

  if char_length(v_notes) > 1000 then
    raise exception 'Report notes must be 1000 characters or less.' using errcode = '22023';
  end if;

  if char_length(v_label) > 160 then
    raise exception 'Report label must be 160 characters or less.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.reports
    where reporter_id = v_actor
      and target_type = p_target_type
      and target_id = p_target_id
      and status = 'open'
  ) then
    raise exception 'You have already submitted an open report for this item.' using errcode = '23505';
  end if;

  if exists (
    select 1
    from public.reports
    where reporter_id = v_actor
      and created_at > now() - interval '30 seconds'
  ) then
    raise exception 'Please wait before submitting another report.' using errcode = '42900';
  end if;

  if (
    select count(*)
    from public.reports
    where reporter_id = v_actor
      and created_at > now() - interval '10 minutes'
  ) >= 5 then
    raise exception 'Please wait before submitting another report.' using errcode = '42900';
  end if;

  insert into public.reports (reporter_id, target_type, target_id, reason, notes, target_label, status)
  values (v_actor, p_target_type, p_target_id, v_reason, v_notes, v_label, 'open')
  returning * into v_report;

  return v_report;
end;
$$;

comment on table public.reports is 'Authenticated user-submitted moderation reports for project/profile/store targets. Duplicate open reports by the same user on the same target are rejected.';
comment on function public.submit_report(public.report_target_type, uuid, text, text, text) is 'Authenticated report submit API. Sets reporter from auth.uid(), validates reason/lengths, blocks duplicate open reports and rapid repeats.';

revoke all on public.reports from anon;
grant select, insert, update on public.reports to authenticated;
grant select, insert, update on public.reports to service_role;
grant execute on function public.submit_report(public.report_target_type, uuid, text, text, text) to authenticated;
grant execute on function public.is_admin_or_moderator() to authenticated, service_role;
