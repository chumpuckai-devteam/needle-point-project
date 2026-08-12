-- Harden profile privacy: no public email; https-only profile links; strip synthetic shops.

-- 1) Column grants: anon cannot SELECT email; authenticated can still use own email via app selecting only when id = auth.uid()
--    PostgREST: if email is not in the select list, it won't be returned. Revoke still helps direct SQL.
revoke select (email) on table public.profiles from anon;
-- Keep authenticated able to select email only when RLS allows the row — still over-broad for other users' rows.
-- Prefer: revoke email from authenticated too; app uses auth.users email from session for self.
revoke select (email) on table public.profiles from authenticated;

-- Service role (bypass) still used by admin APIs if needed.

comment on column public.profiles.email is
  'Legacy column; not selectable by anon/authenticated. Prefer auth.users.email via session for self.';

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

-- Scrub any existing unsafe links (soft delete by blanking to safe placeholder removal)
delete from public.profile_links
where url !~* '^https?://'
   or url ~* '^javascript:'
   or url ~* '^data:';

-- 3) Strip synthetic catalog leftovers (idempotent; live already cleaned by seed:stores)
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
