-- Harden private project boundaries for nested social/project resources.
-- Non-owners should receive zero rows for private projects and related rows
-- (tags, collection items, comments, reactions, updates, submissions).

-- Project tag links exposed private project ids via a legacy public-read policy.
drop policy if exists "Project tags readable" on public.project_tags;
drop policy if exists "project_tags_visible_with_project" on public.project_tags;
create policy "project_tags_visible_with_project"
  on public.project_tags
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.projects p
      where p.id = project_id
        and (p.visibility = 'public' or p.user_id = (select auth.uid()))
    )
  );

-- Public collections must not reveal project ids for private projects they contain.
drop policy if exists "Collection items with collection access" on public.collection_items;
drop policy if exists "collection_items_visible_with_collection_and_project" on public.collection_items;
create policy "collection_items_visible_with_collection_and_project"
  on public.collection_items
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.collections c
      join public.projects p on p.id = project_id
      where c.id = collection_id
        and (c.user_id = (select auth.uid()) or c.visibility = 'public')
        and (p.visibility = 'public' or p.user_id = (select auth.uid()))
    )
  );

-- Keep collection writes owner-only and require the saved project to be visible to
-- the owner/session, so private projects cannot be smuggled into public lists for leaks.
drop policy if exists "Users manage own collection items" on public.collection_items;
drop policy if exists "collection_items_owner_manage_visible_projects" on public.collection_items;
create policy "collection_items_owner_manage_visible_projects"
  on public.collection_items
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.collections c
      join public.projects p on p.id = project_id
      where c.id = collection_id
        and c.user_id = (select auth.uid())
        and (p.visibility = 'public' or p.user_id = (select auth.uid()))
    )
  )
  with check (
    exists (
      select 1
      from public.collections c
      join public.projects p on p.id = project_id
      where c.id = collection_id
        and c.user_id = (select auth.uid())
        and (p.visibility = 'public' or p.user_id = (select auth.uid()))
    )
  );

-- Updates remain readable with visible parent project, but inserts/edits are now
-- constrained to the project owner instead of any authenticated user's own id.
drop policy if exists "Users insert own updates" on public.project_updates;
drop policy if exists "Users update own updates" on public.project_updates;
drop policy if exists "Users delete own updates" on public.project_updates;
drop policy if exists "Users insert own updates on own projects" on public.project_updates;
drop policy if exists "Users update own updates on own projects" on public.project_updates;
drop policy if exists "Users delete own updates on own projects" on public.project_updates;
create policy "Users insert own updates on own projects"
  on public.project_updates
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.projects p
      where p.id = project_id
        and p.user_id = (select auth.uid())
    )
  );

create policy "Users update own updates on own projects"
  on public.project_updates
  for update
  to authenticated
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.projects p
      where p.id = project_id
        and p.user_id = (select auth.uid())
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.projects p
      where p.id = project_id
        and p.user_id = (select auth.uid())
    )
  );

create policy "Users delete own updates on own projects"
  on public.project_updates
  for delete
  to authenticated
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.projects p
      where p.id = project_id
        and p.user_id = (select auth.uid())
    )
  );

-- Reactions on private projects/updates should be invisible to non-owners, and
-- writes should only target content visible to the current user.
drop policy if exists "Reactions public read" on public.reactions;
drop policy if exists "Users manage own reactions" on public.reactions;
drop policy if exists "reactions_visible_with_target" on public.reactions;
drop policy if exists "Users manage own visible reactions" on public.reactions;
create policy "reactions_visible_with_target"
  on public.reactions
  for select
  to anon, authenticated
  using (
    (
      target_type = 'project'
      and exists (
        select 1
        from public.projects p
        where p.id = target_id
          and (p.visibility = 'public' or p.user_id = (select auth.uid()))
      )
    )
    or (
      target_type = 'project_update'
      and exists (
        select 1
        from public.project_updates pu
        join public.projects p on p.id = pu.project_id
        where pu.id = target_id
          and (p.visibility = 'public' or p.user_id = (select auth.uid()))
      )
    )
  );

create policy "Users manage own visible reactions"
  on public.reactions
  for all
  to authenticated
  using (
    auth.uid() = user_id
    and (
      (
        target_type = 'project'
        and exists (
          select 1
          from public.projects p
          where p.id = target_id
            and (p.visibility = 'public' or p.user_id = (select auth.uid()))
        )
      )
      or (
        target_type = 'project_update'
        and exists (
          select 1
          from public.project_updates pu
          join public.projects p on p.id = pu.project_id
          where pu.id = target_id
            and (p.visibility = 'public' or p.user_id = (select auth.uid()))
        )
      )
    )
  )
  with check (
    auth.uid() = user_id
    and (
      (
        target_type = 'project'
        and exists (
          select 1
          from public.projects p
          where p.id = target_id
            and (p.visibility = 'public' or p.user_id = (select auth.uid()))
        )
      )
      or (
        target_type = 'project_update'
        and exists (
          select 1
          from public.project_updates pu
          join public.projects p on p.id = pu.project_id
          where pu.id = target_id
            and (p.visibility = 'public' or p.user_id = (select auth.uid()))
        )
      )
    )
  );

-- Comments follow the same target visibility rules as reactions.
drop policy if exists "Comments public read" on public.comments;
drop policy if exists "Users insert comments" on public.comments;
drop policy if exists "Users update own comments" on public.comments;
drop policy if exists "Users delete own comments" on public.comments;
drop policy if exists "comments_visible_with_target" on public.comments;
drop policy if exists "Users insert visible comments" on public.comments;
drop policy if exists "Users update own visible comments" on public.comments;
drop policy if exists "Users delete own visible comments" on public.comments;
create policy "comments_visible_with_target"
  on public.comments
  for select
  to anon, authenticated
  using (
    (
      target_type = 'project'
      and exists (
        select 1
        from public.projects p
        where p.id = target_id
          and (p.visibility = 'public' or p.user_id = (select auth.uid()))
      )
    )
    or (
      target_type = 'project_update'
      and exists (
        select 1
        from public.project_updates pu
        join public.projects p on p.id = pu.project_id
        where pu.id = target_id
          and (p.visibility = 'public' or p.user_id = (select auth.uid()))
      )
    )
  );

create policy "Users insert visible comments"
  on public.comments
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and (
      (
        target_type = 'project'
        and exists (
          select 1
          from public.projects p
          where p.id = target_id
            and (p.visibility = 'public' or p.user_id = (select auth.uid()))
        )
      )
      or (
        target_type = 'project_update'
        and exists (
          select 1
          from public.project_updates pu
          join public.projects p on p.id = pu.project_id
          where pu.id = target_id
            and (p.visibility = 'public' or p.user_id = (select auth.uid()))
        )
      )
    )
  );

create policy "Users update own visible comments"
  on public.comments
  for update
  to authenticated
  using (
    auth.uid() = user_id
    and (
      (
        target_type = 'project'
        and exists (
          select 1
          from public.projects p
          where p.id = target_id
            and (p.visibility = 'public' or p.user_id = (select auth.uid()))
        )
      )
      or (
        target_type = 'project_update'
        and exists (
          select 1
          from public.project_updates pu
          join public.projects p on p.id = pu.project_id
          where pu.id = target_id
            and (p.visibility = 'public' or p.user_id = (select auth.uid()))
        )
      )
    )
  )
  with check (
    auth.uid() = user_id
    and (
      (
        target_type = 'project'
        and exists (
          select 1
          from public.projects p
          where p.id = target_id
            and (p.visibility = 'public' or p.user_id = (select auth.uid()))
        )
      )
      or (
        target_type = 'project_update'
        and exists (
          select 1
          from public.project_updates pu
          join public.projects p on p.id = pu.project_id
          where pu.id = target_id
            and (p.visibility = 'public' or p.user_id = (select auth.uid()))
        )
      )
    )
  );

create policy "Users delete own visible comments"
  on public.comments
  for delete
  to authenticated
  using (
    auth.uid() = user_id
    and (
      (
        target_type = 'project'
        and exists (
          select 1
          from public.projects p
          where p.id = target_id
            and (p.visibility = 'public' or p.user_id = (select auth.uid()))
        )
      )
      or (
        target_type = 'project_update'
        and exists (
          select 1
          from public.project_updates pu
          join public.projects p on p.id = pu.project_id
          where pu.id = target_id
            and (p.visibility = 'public' or p.user_id = (select auth.uid()))
        )
      )
    )
  );

-- Stitch-along rows stay public, but project submissions no longer expose private
-- project ids to non-owners.
drop policy if exists "Submissions public read" on public.stitch_along_submissions;
drop policy if exists "Users manage own submissions" on public.stitch_along_submissions;
drop policy if exists "stitch_along_submissions_visible_with_project" on public.stitch_along_submissions;
drop policy if exists "Users submit own visible projects" on public.stitch_along_submissions;
create policy "stitch_along_submissions_visible_with_project"
  on public.stitch_along_submissions
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.projects p
      where p.id = project_id
        and (p.visibility = 'public' or p.user_id = (select auth.uid()))
    )
  );

create policy "Users submit own visible projects"
  on public.stitch_along_submissions
  for all
  to authenticated
  using (
    auth.uid() = user_id
    and exists (
      select 1
      from public.projects p
      where p.id = project_id
        and (p.visibility = 'public' or p.user_id = (select auth.uid()))
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.projects p
      where p.id = project_id
        and (p.visibility = 'public' or p.user_id = (select auth.uid()))
    )
  );

comment on table public.project_tags is 'Project tag links are visible only with a public project or the project owner; tags themselves remain public vocabulary.';
comment on table public.collection_items is 'Collection membership is visible only when both collection access and project visibility permit it.';
comment on table public.reactions is 'Reactions are visible/manageable only when their project or project update target is visible to the current user.';
comment on table public.comments is 'Comments are visible/manageable only when their project or project update target is visible to the current user.';
comment on table public.stitch_along_submissions is 'Stitch-along submission rows expose project ids only for public projects or their owner.';
