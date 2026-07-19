-- Multi stitch-alongs: host-created first-class SAL records with scoped joins/submissions.

alter table public.stitch_alongs
  add column if not exists is_public boolean not null default true;

create index if not exists stitch_alongs_public_window_idx
  on public.stitch_alongs (is_public, status, start_date, end_date, updated_at desc);

create index if not exists stitch_alongs_host_updated_idx
  on public.stitch_alongs (host_user_id, updated_at desc);

create index if not exists stitch_along_joins_user_idx
  on public.stitch_along_joins (user_id, joined_at desc);

create index if not exists stitch_along_submissions_user_idx
  on public.stitch_along_submissions (user_id, submitted_at desc);

-- Replace the legacy single/global-SAL policies. Public clients may discover public
-- SALs; private/draft SALs are visible only to their host or service role.
drop policy if exists "Stitch alongs public read" on public.stitch_alongs;
drop policy if exists "Hosts manage stitch alongs" on public.stitch_alongs;
drop policy if exists "stitch_alongs_public_or_host_read" on public.stitch_alongs;
drop policy if exists "stitch_alongs_host_insert" on public.stitch_alongs;
drop policy if exists "stitch_alongs_host_or_service_update" on public.stitch_alongs;
drop policy if exists "stitch_alongs_host_or_service_delete" on public.stitch_alongs;

create policy "stitch_alongs_public_or_host_read" on public.stitch_alongs
  for select
  to anon, authenticated
  using (is_public or host_user_id = (select auth.uid()) or (select auth.role()) = 'service_role');

create policy "stitch_alongs_host_insert" on public.stitch_alongs
  for insert
  to authenticated
  with check (host_user_id = (select auth.uid()));

create policy "stitch_alongs_host_or_service_update" on public.stitch_alongs
  for update
  to authenticated
  using (host_user_id = (select auth.uid()) or (select auth.role()) = 'service_role')
  with check (host_user_id = (select auth.uid()) or (select auth.role()) = 'service_role');

create policy "stitch_alongs_host_or_service_delete" on public.stitch_alongs
  for delete
  to authenticated
  using (host_user_id = (select auth.uid()) or (select auth.role()) = 'service_role');

-- Join rows are public only for public SALs; authenticated users manage only their
-- own join rows and may join public SALs or their own hosted private SALs.
drop policy if exists "Joins public read" on public.stitch_along_joins;
drop policy if exists "Users manage own joins" on public.stitch_along_joins;
drop policy if exists "stitch_along_joins_public_or_own_read" on public.stitch_along_joins;
drop policy if exists "stitch_along_joins_user_insert" on public.stitch_along_joins;
drop policy if exists "stitch_along_joins_user_delete" on public.stitch_along_joins;

create policy "stitch_along_joins_public_or_own_read" on public.stitch_along_joins
  for select
  to anon, authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.stitch_alongs sa where sa.id = stitch_along_id and sa.is_public)
  );

create policy "stitch_along_joins_user_insert" on public.stitch_along_joins
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      exists (select 1 from public.stitch_alongs sa where sa.id = stitch_along_id and sa.is_public)
      or exists (select 1 from public.stitch_alongs sa where sa.id = stitch_along_id and sa.host_user_id = (select auth.uid()))
    )
  );

create policy "stitch_along_joins_user_delete" on public.stitch_along_joins
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Submissions stay scoped to a selected stitch_along_id and an owned public project.
-- Public reads only expose submissions for visible projects on public SALs.
drop policy if exists "Submissions public read" on public.stitch_along_submissions;
drop policy if exists "Users manage own submissions" on public.stitch_along_submissions;
drop policy if exists "stitch_along_submissions_visible_with_project" on public.stitch_along_submissions;
drop policy if exists "Users submit own visible projects" on public.stitch_along_submissions;
drop policy if exists "stitch_along_submissions_public_sal_visible_project_read" on public.stitch_along_submissions;
drop policy if exists "stitch_along_submissions_user_insert" on public.stitch_along_submissions;
drop policy if exists "stitch_along_submissions_user_delete" on public.stitch_along_submissions;

create policy "stitch_along_submissions_public_sal_visible_project_read" on public.stitch_along_submissions
  for select
  to anon, authenticated
  using (
    exists (select 1 from public.stitch_alongs sa where sa.id = stitch_along_id and sa.is_public)
    and exists (
      select 1
      from public.projects p
      where p.id = project_id
        and (p.visibility = 'public' or p.user_id = (select auth.uid()))
    )
  );

create policy "stitch_along_submissions_user_insert" on public.stitch_along_submissions
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      exists (select 1 from public.stitch_alongs sa where sa.id = stitch_along_id and sa.is_public)
      or exists (select 1 from public.stitch_alongs sa where sa.id = stitch_along_id and sa.host_user_id = (select auth.uid()))
    )
    and exists (select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid()) and p.visibility = 'public')
  );

create policy "stitch_along_submissions_user_delete" on public.stitch_along_submissions
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

comment on table public.stitch_alongs is 'First-class multi-event stitch-alongs hosted by authenticated users.';
comment on column public.stitch_alongs.is_public is 'Controls public discovery/detail reads; hosts and service role can still read private rows.';
comment on table public.stitch_along_joins is 'Join rows are scoped by stitch_along_id and user_id for multiple concurrent SALs.';
comment on table public.stitch_along_submissions is 'Project submissions are scoped by stitch_along_id and restricted to public projects owned by the submitting user.';
