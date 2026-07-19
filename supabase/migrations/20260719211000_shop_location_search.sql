-- Public shop search by ZIP/city with online/catalog fallback ranking.

alter table public.stores
  add column if not exists postal_code text not null default '';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'stores_postal_code_format' and conrelid = 'public.stores'::regclass
  ) then
    alter table public.stores
      add constraint stores_postal_code_format check (postal_code = '' or postal_code ~ '^\d{5}$');
  end if;
end $$;

create index if not exists stores_postal_code_idx on public.stores (postal_code)
  where postal_code <> '';
create index if not exists stores_city_region_lower_idx on public.stores (lower(city), lower(region))
  where city <> '';

update public.stores
set postal_code = '97205'
where handle = 'canopycanvas' and postal_code = '';

update public.stores
set postal_code = '78701'
where handle = 'bookshopwindows' and postal_code = '';

create or replace function public.search_stores(
  p_zip text default '',
  p_city text default '',
  p_region text default '',
  p_limit integer default 50
)
returns table (
  id uuid,
  owner_user_id uuid,
  name text,
  handle text,
  store_type text,
  description text,
  avatar_url text,
  cover_image_url text,
  website_url text,
  location text,
  city text,
  region text,
  postal_code text,
  country text,
  ships_nationwide boolean,
  specialties text[],
  created_at timestamptz,
  updated_at timestamptz,
  latitude double precision,
  longitude double precision,
  search_rank integer
)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_zip text := substring(btrim(coalesce(p_zip, '')) from '^\d{5}');
  v_city text := lower(btrim(coalesce(p_city, '')));
  v_region text := lower(btrim(coalesce(p_region, '')));
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
begin
  return query
  with project_counts as (
    select ps.store_id, count(*)::integer as project_count
    from public.project_stores ps
    group by ps.store_id
  ),
  product_counts as (
    select sp.store_id, count(*)::integer as product_count
    from public.store_products sp
    group by sp.store_id
  ),
  scored as (
    select
      s.*,
      case
        when v_zip <> '' and s.postal_code = v_zip then 100
        when v_city <> '' and lower(s.city) = v_city and (v_region = '' or lower(s.region) = v_region) then 80
        when v_city <> '' and lower(s.city) = v_city then 70
        when v_region <> '' and lower(s.region) = v_region then 40
        when s.store_type in ('online', 'both') or s.ships_nationwide then 10
        else 0
      end as search_rank,
      coalesce(pc.project_count, 0) as project_count,
      coalesce(pr.product_count, 0) as product_count
    from public.stores s
    left join project_counts pc on pc.store_id = s.id
    left join product_counts pr on pr.store_id = s.id
  )
  select
    scored.id,
    scored.owner_user_id,
    scored.name,
    scored.handle,
    scored.store_type,
    scored.description,
    scored.avatar_url,
    scored.cover_image_url,
    scored.website_url,
    scored.location,
    scored.city,
    scored.region,
    scored.postal_code,
    scored.country,
    scored.ships_nationwide,
    scored.specialties,
    scored.created_at,
    scored.updated_at,
    scored.latitude,
    scored.longitude,
    scored.search_rank
  from scored
  order by
    scored.search_rank desc,
    case when scored.store_type in ('online', 'both') or scored.ships_nationwide then 1 else 0 end desc,
    scored.project_count desc,
    scored.product_count desc,
    scored.name asc
  limit v_limit;
end;
$$;

comment on function public.search_stores(text, text, text, integer)
  is 'Public shop discovery RPC: accepts normalized zip, city, optional region, and limit; returns every public shop ordered by location relevance first, then online/catalog fallback strength, so unknown locations do not hard-fail.';

grant execute on function public.search_stores(text, text, text, integer) to anon, authenticated;
