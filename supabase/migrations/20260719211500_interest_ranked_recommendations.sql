-- Interest-ranked Discover/Studio recommendations + surface-specific skips

create table if not exists public.recommendation_dismissals (
  user_id uuid not null references public.profiles (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  surface text not null,
  dismissed_at timestamptz not null default now(),
  constraint recommendation_dismissals_surface_check check (surface in ('discover', 'studio')),
  primary key (user_id, project_id, surface)
);

create index if not exists recommendation_dismissals_project_idx
  on public.recommendation_dismissals (project_id);
create index if not exists recommendation_dismissals_user_surface_idx
  on public.recommendation_dismissals (user_id, surface, dismissed_at desc);

alter table public.recommendation_dismissals enable row level security;

drop policy if exists "recommendation_dismissals_select_own" on public.recommendation_dismissals;
create policy "recommendation_dismissals_select_own" on public.recommendation_dismissals
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "recommendation_dismissals_insert_own" on public.recommendation_dismissals;
create policy "recommendation_dismissals_insert_own" on public.recommendation_dismissals
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "recommendation_dismissals_delete_own" on public.recommendation_dismissals;
create policy "recommendation_dismissals_delete_own" on public.recommendation_dismissals
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.get_recommended_projects(
  p_surface text default 'discover',
  p_limit int default 50,
  p_cursor text default null
)
returns table (
  id uuid,
  user_id uuid,
  title text,
  description text,
  status public.project_status,
  visibility public.visibility,
  difficulty public.difficulty,
  category text,
  canvas_type text,
  pattern_source_name text,
  pattern_source_url text,
  primary_image_url text,
  progress int,
  created_at timestamptz,
  updated_at timestamptz,
  recommendation_score numeric,
  matched_interests text[]
)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit int := greatest(1, least(coalesce(p_limit, 50), 100));
begin
  if p_surface not in ('discover', 'studio') then
    raise exception 'Unsupported recommendation surface: %', p_surface;
  end if;

  return query
  with user_profile as (
    select
      p.id,
      replace(lower(p.skill_level), '_', ' ') as skill_level
    from public.profiles p
    where p.id = v_user_id
  ), user_interests as (
    select lower(pi.interest) as interest
    from public.profile_interests pi
    where pi.profile_id = v_user_id
  ), project_signal_text as (
    select
      p.id as project_id,
      lower(concat_ws(' ',
        p.title,
        p.description,
        p.category,
        p.canvas_type,
        p.pattern_source_name,
        coalesce(string_agg(t.name, ' '), '')
      )) as haystack
    from public.projects p
    left join public.project_tags pt on pt.project_id = p.id
    left join public.tags t on t.id = pt.tag_id
    group by p.id, p.title, p.description, p.category, p.canvas_type, p.pattern_source_name
  ), interest_matches as (
    select
      p.id as project_id,
      ui.interest,
      case
        when ui.interest = 'beginner projects'
          and p.difficulty in ('beginner', 'confident_beginner') then 1.00
        when ui.interest = 'beginner projects'
          and pst.haystack ~ '(starter|beginner|new stitcher)' then 0.50
        when ui.interest = 'ornaments'
          and (lower(p.category) = 'ornament' or lower(p.canvas_type) like '%ornament%') then 1.00
        when ui.interest = 'ornaments'
          and pst.haystack like '%ornament%' then 0.50
        when ui.interest = 'canvases'
          and (lower(p.category) = 'canvas' or lower(p.canvas_type) like '%canvas%') then 1.00
        when ui.interest = 'canvases'
          and pst.haystack like '%canvas%' then 0.50
        when ui.interest = 'pillows'
          and lower(p.category) = 'pillow' then 1.00
        when ui.interest = 'pillows'
          and pst.haystack like '%pillow%' then 0.50
        when ui.interest = 'holiday'
          and (lower(p.category) = 'holiday' or pst.haystack ~ '(holiday|christmas|hanukkah|halloween|easter|valentine|seasonal)') then 1.00
        when ui.interest = 'florals'
          and (lower(p.category) = 'floral' or pst.haystack ~ '(floral|flower|garden|rose|hydrangea|botanical)') then 1.00
        when ui.interest = 'animals'
          and (lower(p.category) = 'animal' or pst.haystack ~ '(animal|dog|cat|bird|horse|bunny|fox|pet|wildlife)') then 1.00
        when ui.interest = 'modern patterns'
          and (lower(p.category) = 'modern' or pst.haystack ~ '(modern|geometric|abstract|contemporary|colorblock|minimalist)') then 1.00
        else 0.00
      end as boost
    from public.projects p
    join public.project_signal_text pst on pst.project_id = p.id
    join user_interests ui on true
    where p.visibility = 'public'
  ), project_interest_scores as (
    select
      im.project_id,
      least(sum(im.boost), 2.50)::numeric as interest_boost,
      coalesce(array_agg(im.interest order by im.interest) filter (where im.boost > 0), '{}'::text[]) as matched_interests
    from interest_matches im
    where im.boost > 0
    group by im.project_id
  ), reaction_counts as (
    select r.target_id as project_id, count(*)::numeric as like_count
    from public.reactions r
    where r.target_type = 'project'
    group by r.target_id
  ), ranked as (
    select
      p.id,
      p.user_id,
      p.title,
      p.description,
      p.status,
      p.visibility,
      p.difficulty,
      p.category,
      p.canvas_type,
      p.pattern_source_name,
      p.pattern_source_url,
      p.primary_image_url,
      p.progress,
      p.created_at,
      p.updated_at,
      (
        case
          when p.updated_at >= now() - interval '14 days' then 0.35
          when p.updated_at >= now() - interval '60 days' then 0.20
          else 0.05
        end
        + least(coalesce(rc.like_count, 0), 25) / 25.0 * 0.20
        + case when nullif(p.primary_image_url, '') is not null then 0.10 else 0 end
        + coalesce(pis.interest_boost, 0)
        + case
            when (select skill_level from user_profile limit 1) = replace(p.difficulty::text, '_', ' ') then 0.60
            when (select skill_level from user_profile limit 1) = 'beginner' and p.difficulty = 'confident_beginner' then 0.35
            when (select skill_level from user_profile limit 1) = 'confident beginner' and p.difficulty in ('beginner', 'intermediate') then 0.35
            when (select skill_level from user_profile limit 1) = 'intermediate' and p.difficulty in ('confident_beginner', 'advanced') then 0.35
            when (select skill_level from user_profile limit 1) = 'advanced' and p.difficulty = 'intermediate' then 0.35
            else 0
          end
        + case
            when p_surface = 'studio'
              and exists (
                select 1 from public.follows f
                where f.follower_id = v_user_id
                  and f.following_id = p.user_id
              ) then 3.00
            else 0
          end
      )::numeric as recommendation_score,
      coalesce(pis.matched_interests, '{}'::text[]) as matched_interests
    from public.projects p
    left join project_interest_scores pis on pis.project_id = p.id
    left join reaction_counts rc on rc.project_id = p.id
    where p.visibility = 'public'
      and (
        v_user_id is null
        or not exists (
          select 1
          from public.recommendation_dismissals rd
          where rd.user_id = v_user_id
            and rd.project_id = p.id
            and rd.surface = p_surface
        )
      )
  )
  select
    r.id,
    r.user_id,
    r.title,
    r.description,
    r.status,
    r.visibility,
    r.difficulty,
    r.category,
    r.canvas_type,
    r.pattern_source_name,
    r.pattern_source_url,
    r.primary_image_url,
    r.progress,
    r.created_at,
    r.updated_at,
    r.recommendation_score,
    r.matched_interests
  from ranked r
  order by r.recommendation_score desc, r.updated_at desc, r.id asc
  limit v_limit;
end;
$$;

comment on table public.recommendation_dismissals
  is 'User-specific dismissed recommendation projects by surface. Used only to exclude future Discover/Studio recommendations.';
comment on function public.get_recommended_projects(text, int, text)
  is 'Returns public projects ranked by default quality plus authenticated profile interests and skill level, excluding surface-specific dismissals.';

revoke all on public.recommendation_dismissals from anon, authenticated;
grant select, insert, delete on public.recommendation_dismissals to authenticated;

revoke all on function public.get_recommended_projects(text, int, text) from public;
grant execute on function public.get_recommended_projects(text, int, text) to anon, authenticated;
