-- Collections: durable user boards, default Saved board, and owner-only membership.

alter table public.collections add column if not exists is_default boolean not null default false;

create index if not exists collections_user_created_at_idx
  on public.collections (user_id, created_at);

create index if not exists collection_items_project_id_idx
  on public.collection_items (project_id);

-- Backfill one default collection per existing profile. Prefer an existing Saved
-- collection, otherwise the user's oldest collection; users with no collection get
-- a new Saved board.
with ranked as (
  select
    c.id,
    row_number() over (
      partition by c.user_id
      order by (lower(c.name) = 'saved') desc, c.created_at asc, c.id asc
    ) as rn
  from public.collections c
)
update public.collections c
set is_default = (ranked.rn = 1),
    name = case when ranked.rn = 1 and btrim(c.name) = '' then 'Saved' else c.name end
from ranked
where c.id = ranked.id;

insert into public.collections (user_id, name, description, visibility, is_default)
select p.id, 'Saved', 'Projects you saved from discovery.', 'private', true
from public.profiles p
where not exists (
  select 1 from public.collections c where c.user_id = p.id and c.is_default
);

create unique index if not exists collections_one_default_per_user_idx
  on public.collections (user_id)
  where is_default;

create or replace function public.ensure_default_collection()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_collection_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  select id into v_collection_id
  from public.collections
  where user_id = v_user_id
    and is_default
  order by created_at asc, id asc
  limit 1;

  if v_collection_id is null then
    insert into public.collections (user_id, name, description, visibility, is_default)
    values (v_user_id, 'Saved', 'Projects you saved from discovery.', 'private', true)
    returning id into v_collection_id;
  end if;

  return v_collection_id;
end;
$$;

create or replace function public.prevent_default_collection_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.is_default then
    raise exception 'Default Saved collection cannot be deleted.' using errcode = '23514';
  end if;
  return old;
end;
$$;

drop trigger if exists collections_prevent_default_delete on public.collections;
create trigger collections_prevent_default_delete
before delete on public.collections
for each row execute function public.prevent_default_collection_delete();

create or replace function public.prevent_default_collection_flag_changes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.is_default is distinct from new.is_default then
    raise exception 'Default collection flag is system-managed.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists collections_prevent_default_flag_changes on public.collections;
create trigger collections_prevent_default_flag_changes
before update of is_default on public.collections
for each row execute function public.prevent_default_collection_flag_changes();

create or replace function public.move_collection_item(
  p_project_id uuid,
  p_from_collection_id uuid,
  p_to_collection_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  if p_to_collection_id is null then
    raise exception 'Destination collection is required.' using errcode = '22004';
  end if;

  if not exists (
    select 1 from public.collections c
    where c.id = p_to_collection_id and c.user_id = v_user_id
  ) then
    raise exception 'Destination collection not found.' using errcode = '42501';
  end if;

  if p_from_collection_id is not null and not exists (
    select 1 from public.collections c
    where c.id = p_from_collection_id and c.user_id = v_user_id
  ) then
    raise exception 'Source collection not found.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.projects p
    where p.id = p_project_id
      and (p.visibility = 'public' or p.user_id = v_user_id)
  ) then
    raise exception 'Project not found or not visible.' using errcode = '42501';
  end if;

  if p_from_collection_id is not null and p_from_collection_id <> p_to_collection_id then
    delete from public.collection_items
    where collection_id = p_from_collection_id
      and project_id = p_project_id;
  end if;

  insert into public.collection_items (collection_id, project_id)
  values (p_to_collection_id, p_project_id)
  on conflict (collection_id, project_id) do nothing;
end;
$$;

-- Keep future signups on the same default-board contract.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_handle text;
  final_handle text;
  suffix int := 0;
begin
  base_handle := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'handle', split_part(new.email, '@', 1), 'stitcher'), '[^a-z0-9_]', '', 'g'));
  if length(base_handle) < 3 then
    base_handle := 'stitcher';
  end if;
  base_handle := left(base_handle, 24);
  final_handle := base_handle;

  while exists (select 1 from public.profiles where handle = final_handle) loop
    suffix := suffix + 1;
    final_handle := base_handle || suffix::text;
  end loop;

  insert into public.profiles (id, name, handle, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'Stitcher'),
    final_handle,
    new.email,
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );

  insert into public.collections (user_id, name, description, visibility, is_default)
  values (new.id, 'Saved', 'Projects you saved from discovery.', 'private', true);

  return new;
end;
$$;

-- Replace broad/legacy collection policies. Collections are private user boards;
-- the default Saved board may be renamed but not deleted, and is_default is
-- system-managed by triggers/RPC.
drop policy if exists "Own collections readable" on public.collections;
drop policy if exists "Users manage own collections" on public.collections;
drop policy if exists "collections_select_own" on public.collections;
drop policy if exists "collections_insert_own" on public.collections;
drop policy if exists "collections_update_own" on public.collections;
drop policy if exists "collections_delete_own_non_default" on public.collections;

create policy "collections_select_own" on public.collections
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "collections_insert_own" on public.collections
  for insert to authenticated
  with check ((select auth.uid()) = user_id and not is_default);

create policy "collections_update_own" on public.collections
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "collections_delete_own_non_default" on public.collections
  for delete to authenticated
  using ((select auth.uid()) = user_id and not is_default);

drop policy if exists "Collection items with collection access" on public.collection_items;
drop policy if exists "Users manage own collection items" on public.collection_items;
drop policy if exists "collection_items_select_own_collection" on public.collection_items;
drop policy if exists "collection_items_insert_own_collection" on public.collection_items;
drop policy if exists "collection_items_delete_own_collection" on public.collection_items;

create policy "collection_items_select_own_collection" on public.collection_items
  for select to authenticated
  using (
    exists (
      select 1
      from public.collections c
      where c.id = collection_id and c.user_id = (select auth.uid())
    )
  );

create policy "collection_items_insert_own_collection" on public.collection_items
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.collections c
      where c.id = collection_id and c.user_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.projects p
      where p.id = project_id
        and (p.visibility = 'public' or p.user_id = (select auth.uid()))
    )
  );

create policy "collection_items_delete_own_collection" on public.collection_items
  for delete to authenticated
  using (
    exists (
      select 1
      from public.collections c
      where c.id = collection_id and c.user_id = (select auth.uid())
    )
  );

comment on column public.collections.is_default is 'Exactly one system-managed Saved collection per user. Users may rename it, but it cannot be deleted or have is_default changed directly.';
comment on function public.ensure_default_collection() is 'Authenticated client-safe helper that returns the caller default Saved collection id, creating it on demand if missing.';
comment on function public.move_collection_item(uuid, uuid, uuid) is 'Authenticated atomic move/add helper for a visible project between two caller-owned collections.';

revoke all on function public.ensure_default_collection() from public;
grant execute on function public.ensure_default_collection() to authenticated;
revoke all on function public.move_collection_item(uuid, uuid, uuid) from public;
grant execute on function public.move_collection_item(uuid, uuid, uuid) to authenticated;
revoke execute on function public.prevent_default_collection_delete() from public;
revoke execute on function public.prevent_default_collection_flag_changes() from public;
