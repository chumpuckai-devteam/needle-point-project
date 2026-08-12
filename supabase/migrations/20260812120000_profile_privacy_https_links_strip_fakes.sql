-- Harden profile privacy: no public email; https-only profile links; strip synthetic shops.
-- Applied live 2026-08-12 after project restore from INACTIVE.

-- 1) Email must not be readable by anon/authenticated.
-- Table-level SELECT includes all columns, so column REVOKE alone is a no-op.
revoke all on table public.profiles from anon, authenticated;

grant select (
  id, name, handle, avatar_url, bio, skill_level, is_creator, location,
  onboarding_complete, created_at, updated_at
) on table public.profiles to anon, authenticated;

grant update (
  name, handle, avatar_url, bio, skill_level, is_creator, location, onboarding_complete, updated_at
) on table public.profiles to authenticated;

grant insert (
  id, name, handle, avatar_url, bio, skill_level, is_creator, location, onboarding_complete, created_at, updated_at
) on table public.profiles to authenticated;

-- Do not grant email to anon/authenticated. Self email comes from auth.users session.
comment on column public.profiles.email is
  'Not granted to anon/authenticated. App uses auth.users.email for self.';

-- 2) HTTPS-only profile links
alter table public.profile_links drop constraint if exists profile_links_url_http_check;
alter table public.profile_links
  add constraint profile_links_url_http_check
  check (
    url ~* '^https?://'
    and url !~* '^javascript:'
    and url !~* '^data:'
    and url !~* '^vbscript:'
  );

delete from public.profile_links
where url !~* '^https?://'
   or url ~* '^javascript:'
   or url ~* '^data:';

-- 3) Strip synthetic catalog leftovers (idempotent)
delete from public.store_products
where store_id in (
  select id from public.stores
  where coalesce(website_url, '') ilike '%example.com%'
     or handle in ('canopycanvas', 'threadandtonic', 'bookshopwindows', 'needleneststudio')
);

delete from public.project_stores
where store_id in (
  select id from public.stores
  where coalesce(website_url, '') ilike '%example.com%'
     or handle in ('canopycanvas', 'threadandtonic', 'bookshopwindows', 'needleneststudio')
);

delete from public.store_follows
where store_id in (
  select id from public.stores
  where coalesce(website_url, '') ilike '%example.com%'
     or handle in ('canopycanvas', 'threadandtonic', 'bookshopwindows', 'needleneststudio')
);

delete from public.stores
where coalesce(website_url, '') ilike '%example.com%'
   or handle in ('canopycanvas', 'threadandtonic', 'bookshopwindows', 'needleneststudio');
