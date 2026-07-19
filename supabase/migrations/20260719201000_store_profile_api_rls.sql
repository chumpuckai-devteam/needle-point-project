-- Store profile API + RLS hardening.
-- Public clients can continue to read store profile fields from public.stores.
-- Authenticated owners update the editable profile fields through update_store_profile();
-- direct table UPDATE is also column-limited and protected by owner RLS.

create or replace function public.valid_store_asset_url(value text)
returns boolean
language sql
immutable
as $$
  select coalesce(value, '') = ''
    or value ~ '^/[^\s]*$'
    or value ~* '^https?://[^\s]+$';
$$;

create or replace function public.valid_store_specialties(value text[])
returns boolean
language sql
immutable
as $$
  select cardinality(coalesce(value, '{}'::text[])) <= 10
    and not exists (
      select 1
      from unnest(coalesce(value, '{}'::text[])) as specialty(item)
      where btrim(item) = '' or char_length(btrim(item)) > 40
    );
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'stores_name_profile_length' and conrelid = 'public.stores'::regclass
  ) then
    alter table public.stores
      add constraint stores_name_profile_length check (char_length(btrim(name)) between 1 and 80);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'stores_description_profile_length' and conrelid = 'public.stores'::regclass
  ) then
    alter table public.stores
      add constraint stores_description_profile_length check (char_length(description) <= 1000);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'stores_website_url_format' and conrelid = 'public.stores'::regclass
  ) then
    alter table public.stores
      add constraint stores_website_url_format check (website_url = '' or website_url ~* '^https?://[^\s]+$');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'stores_location_profile_length' and conrelid = 'public.stores'::regclass
  ) then
    alter table public.stores
      add constraint stores_location_profile_length check (char_length(location) <= 120 and char_length(city) <= 80);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'stores_profile_image_url_format' and conrelid = 'public.stores'::regclass
  ) then
    alter table public.stores
      add constraint stores_profile_image_url_format check (
        public.valid_store_asset_url(avatar_url) and public.valid_store_asset_url(cover_image_url)
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'stores_specialties_profile_limits' and conrelid = 'public.stores'::regclass
  ) then
    alter table public.stores
      add constraint stores_specialties_profile_limits check (public.valid_store_specialties(specialties));
  end if;
end $$;

create or replace function public.update_store_profile(
  p_store_id uuid,
  p_name text,
  p_description text default '',
  p_website_url text default '',
  p_location text default '',
  p_city text default '',
  p_avatar_url text default '',
  p_cover_image_url text default '',
  p_specialties text[] default '{}'::text[]
)
returns public.stores
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store public.stores;
  v_name text := btrim(coalesce(p_name, ''));
  v_description text := btrim(coalesce(p_description, ''));
  v_website_url text := btrim(coalesce(p_website_url, ''));
  v_location text := btrim(coalesce(p_location, ''));
  v_city text := btrim(coalesce(p_city, ''));
  v_avatar_url text := btrim(coalesce(p_avatar_url, ''));
  v_cover_image_url text := btrim(coalesce(p_cover_image_url, ''));
  v_specialties text[];
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  select coalesce(array_agg(item), '{}'::text[])
  into v_specialties
  from (
    select btrim(specialty) as item
    from unnest(coalesce(p_specialties, '{}'::text[])) as specialty
    where btrim(specialty) <> ''
  ) normalized;

  if char_length(v_name) = 0 then
    raise exception 'Shop name is required.' using errcode = '22023';
  end if;

  if char_length(v_name) > 80 then
    raise exception 'Shop name must be 80 characters or less.' using errcode = '22023';
  end if;

  if char_length(v_description) > 1000 then
    raise exception 'Description must be 1000 characters or less.' using errcode = '22023';
  end if;

  if v_website_url <> '' and v_website_url !~* '^https?://[^\s]+$' then
    raise exception 'Website URL must start with http:// or https://.' using errcode = '22023';
  end if;

  if char_length(v_location) > 120 or char_length(v_city) > 80 then
    raise exception 'Location is too long.' using errcode = '22023';
  end if;

  if not public.valid_store_asset_url(v_avatar_url) or not public.valid_store_asset_url(v_cover_image_url) then
    raise exception 'Image URLs must be relative paths or http(s) URLs.' using errcode = '22023';
  end if;

  if cardinality(v_specialties) > 10 then
    raise exception 'Choose up to 10 specialties.' using errcode = '22023';
  end if;

  if exists (select 1 from unnest(v_specialties) as specialty where char_length(specialty) > 40) then
    raise exception 'Specialties must be 40 characters or less.' using errcode = '22023';
  end if;

  update public.stores
  set name = v_name,
      description = v_description,
      website_url = v_website_url,
      location = v_location,
      city = v_city,
      avatar_url = v_avatar_url,
      cover_image_url = v_cover_image_url,
      specialties = v_specialties,
      updated_at = now()
  where id = p_store_id
    and owner_user_id = (select auth.uid())
  returning * into v_store;

  if v_store.id is null then
    raise exception 'Store not found or not owned by current user.' using errcode = '42501';
  end if;

  return v_store;
end;
$$;

comment on function public.update_store_profile(uuid, text, text, text, text, text, text, text, text[])
  is 'Owner-only validated update path for public store profile fields (name, description, website, location/city, avatar, cover, specialties).';

drop policy if exists "stores_owner_write" on public.stores;
drop policy if exists "stores_owner_update" on public.stores;
create policy "stores_owner_update" on public.stores
  for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

-- Remove the early broad product write policy; later owner-specific product policies remain.
drop policy if exists "store_products_auth_write" on public.store_products;

revoke update on public.stores from authenticated;
grant update (name, description, website_url, location, city, avatar_url, cover_image_url, specialties, updated_at)
  on public.stores to authenticated;
grant execute on function public.update_store_profile(uuid, text, text, text, text, text, text, text, text[])
  to authenticated;
