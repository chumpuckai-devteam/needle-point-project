-- Needlepoint Project initial schema (PRD-aligned)
-- Apply via: supabase db push  OR paste into Supabase SQL editor

-- Extensions
create extension if not exists "pgcrypto";

-- Profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  handle text not null unique,
  email text,
  avatar_url text,
  bio text not null default '',
  skill_level text not null default 'confident beginner',
  is_creator boolean not null default false,
  location text not null default '',
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_handle_format check (handle ~ '^[a-z0-9_]{3,32}$')
);

create table if not exists public.profile_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  url text not null,
  sort_order int not null default 0
);

create table if not exists public.profile_interests (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  interest text not null,
  primary key (profile_id, interest)
);

-- Projects
create type public.project_status as enum ('planned', 'in_progress', 'finished', 'paused');
create type public.difficulty as enum ('beginner', 'confident_beginner', 'intermediate', 'advanced');
create type public.visibility as enum ('public', 'private');

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text not null default '',
  status public.project_status not null default 'in_progress',
  visibility public.visibility not null default 'public',
  difficulty public.difficulty not null default 'confident_beginner',
  category text not null default 'journal',
  canvas_type text not null default '18 mesh canvas',
  pattern_source_name text not null default '',
  pattern_source_url text not null default '',
  primary_image_url text not null default '',
  progress int not null default 0 check (progress >= 0 and progress <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on public.projects (user_id);
create index if not exists projects_visibility_idx on public.projects (visibility);
create index if not exists projects_category_idx on public.projects (category);

create table if not exists public.project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  milestone text not null default 'Progress logged',
  image_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_updates_project_id_idx on public.project_updates (project_id);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  type text not null default '',
  brand text not null default '',
  color_name text not null default '',
  color_code text not null default '',
  notes text not null default ''
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null, -- stitch | color | theme | other
  unique (name, category)
);

create table if not exists public.project_tags (
  project_id uuid not null references public.projects (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (project_id, tag_id)
);

-- Collections
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text not null default '',
  visibility public.visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collection_items (
  collection_id uuid not null references public.collections (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (collection_id, project_id)
);

-- Social
create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);

create type public.reaction_target as enum ('project', 'project_update');
create type public.reaction_type as enum ('like');

create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  target_type public.reaction_target not null,
  target_id uuid not null,
  reaction_type public.reaction_type not null default 'like',
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id, reaction_type)
);

create type public.comment_target as enum ('project', 'project_update');

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  target_type public.comment_target not null,
  target_id uuid not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists comments_target_idx on public.comments (target_type, target_id);

-- Stitch-alongs
create type public.stitch_along_status as enum ('draft', 'active', 'ended');

create table if not exists public.stitch_alongs (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text not null default '',
  theme text not null default '',
  rules text[] not null default '{}',
  start_date date,
  end_date date,
  cover_image_url text not null default '',
  status public.stitch_along_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stitch_along_joins (
  stitch_along_id uuid not null references public.stitch_alongs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (stitch_along_id, user_id)
);

create table if not exists public.stitch_along_submissions (
  stitch_along_id uuid not null references public.stitch_alongs (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  submitted_at timestamptz not null default now(),
  primary key (stitch_along_id, project_id)
);

-- Moderation
create type public.report_status as enum ('open', 'reviewed', 'dismissed');

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  status public.report_status not null default 'open',
  created_at timestamptz not null default now()
);

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists project_updates_set_updated_at on public.project_updates;
create trigger project_updates_set_updated_at before update on public.project_updates
for each row execute function public.set_updated_at();

drop trigger if exists collections_set_updated_at on public.collections;
create trigger collections_set_updated_at before update on public.collections
for each row execute function public.set_updated_at();

drop trigger if exists comments_set_updated_at on public.comments;
create trigger comments_set_updated_at before update on public.comments
for each row execute function public.set_updated_at();

drop trigger if exists stitch_alongs_set_updated_at on public.stitch_alongs;
create trigger stitch_alongs_set_updated_at before update on public.stitch_alongs
for each row execute function public.set_updated_at();

-- Auto-create profile on signup
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

  insert into public.collections (user_id, name, description, visibility)
  values (new.id, 'Saved', 'Projects you saved from discovery.', 'private');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.profile_links enable row level security;
alter table public.profile_interests enable row level security;
alter table public.projects enable row level security;
alter table public.project_updates enable row level security;
alter table public.materials enable row level security;
alter table public.tags enable row level security;
alter table public.project_tags enable row level security;
alter table public.collections enable row level security;
alter table public.collection_items enable row level security;
alter table public.follows enable row level security;
alter table public.reactions enable row level security;
alter table public.comments enable row level security;
alter table public.stitch_alongs enable row level security;
alter table public.stitch_along_joins enable row level security;
alter table public.stitch_along_submissions enable row level security;
alter table public.reports enable row level security;

-- Profiles policies
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Profile links public read"
  on public.profile_links for select using (true);

create policy "Users manage own profile links"
  on public.profile_links for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "Interests public read"
  on public.profile_interests for select using (true);

create policy "Users manage own interests"
  on public.profile_interests for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- Projects
create policy "Public projects readable"
  on public.projects for select using (
    visibility = 'public' or user_id = auth.uid()
  );

create policy "Users insert own projects"
  on public.projects for insert with check (auth.uid() = user_id);

create policy "Users update own projects"
  on public.projects for update using (auth.uid() = user_id);

create policy "Users delete own projects"
  on public.projects for delete using (auth.uid() = user_id);

-- Updates (readable if parent project is)
create policy "Updates readable with project"
  on public.project_updates for select using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and (p.visibility = 'public' or p.user_id = auth.uid())
    )
  );

create policy "Users insert own updates"
  on public.project_updates for insert with check (auth.uid() = user_id);

create policy "Users update own updates"
  on public.project_updates for update using (auth.uid() = user_id);

create policy "Users delete own updates"
  on public.project_updates for delete using (auth.uid() = user_id);

-- Materials
create policy "Materials readable with project"
  on public.materials for select using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and (p.visibility = 'public' or p.user_id = auth.uid())
    )
  );

create policy "Users manage materials on own projects"
  on public.materials for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

-- Tags
create policy "Tags readable"
  on public.tags for select using (true);

create policy "Authenticated manage tags"
  on public.tags for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Project tags readable"
  on public.project_tags for select using (true);

create policy "Owners manage project tags"
  on public.project_tags for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

-- Collections
create policy "Own collections readable"
  on public.collections for select using (
    user_id = auth.uid() or visibility = 'public'
  );

create policy "Users manage own collections"
  on public.collections for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Collection items with collection access"
  on public.collection_items for select using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and (c.user_id = auth.uid() or c.visibility = 'public')
    )
  );

create policy "Users manage own collection items"
  on public.collection_items for all using (
    exists (select 1 from public.collections c where c.id = collection_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.collections c where c.id = collection_id and c.user_id = auth.uid())
  );

-- Follows / reactions / comments
create policy "Follows public read"
  on public.follows for select using (true);

create policy "Users manage own follows"
  on public.follows for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);

create policy "Reactions public read"
  on public.reactions for select using (true);

create policy "Users manage own reactions"
  on public.reactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Comments public read"
  on public.comments for select using (true);

create policy "Users insert comments"
  on public.comments for insert with check (auth.uid() = user_id);

create policy "Users update own comments"
  on public.comments for update using (auth.uid() = user_id);

create policy "Users delete own comments"
  on public.comments for delete using (auth.uid() = user_id);

-- Stitch-alongs
create policy "Stitch alongs public read"
  on public.stitch_alongs for select using (true);

create policy "Hosts manage stitch alongs"
  on public.stitch_alongs for all using (auth.uid() = host_user_id) with check (auth.uid() = host_user_id);

create policy "Joins public read"
  on public.stitch_along_joins for select using (true);

create policy "Users manage own joins"
  on public.stitch_along_joins for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Submissions public read"
  on public.stitch_along_submissions for select using (true);

create policy "Users manage own submissions"
  on public.stitch_along_submissions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Reports
create policy "Users insert reports"
  on public.reports for insert with check (auth.uid() = reporter_id);

create policy "Users read own reports"
  on public.reports for select using (auth.uid() = reporter_id);

-- Storage bucket (run in dashboard or via storage API; SQL for policies assumes bucket exists)
insert into storage.buckets (id, name, public)
values ('project-images', 'project-images', true)
on conflict (id) do nothing;

create policy "Public read project images"
  on storage.objects for select
  using (bucket_id = 'project-images');

create policy "Auth upload project images"
  on storage.objects for insert
  with check (
    bucket_id = 'project-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Auth update own project images"
  on storage.objects for update
  using (
    bucket_id = 'project-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Auth delete own project images"
  on storage.objects for delete
  using (
    bucket_id = 'project-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
