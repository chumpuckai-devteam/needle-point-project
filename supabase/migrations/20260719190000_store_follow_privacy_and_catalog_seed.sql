-- V3 follow privacy + idempotent store catalog seed for fresh and existing databases

-- Direct follow rows are only visible to the owning follower. Public aggregate counts
-- are exposed through the store_follow_counts() RPC below so follower_id never leaks.
drop policy if exists "store_follows_public_read" on public.store_follows;
drop policy if exists "store_follows_select_own" on public.store_follows;
create policy "store_follows_select_own" on public.store_follows
  for select to authenticated
  using ((select auth.uid()) = follower_id);

-- Project-store links are visible when the linked project is public, or to the
-- project owner for private drafts. This avoids exposing private project ids.
drop policy if exists "project_stores_public_read" on public.project_stores;
drop policy if exists "project_stores_visible_for_public_or_owner" on public.project_stores;
create policy "project_stores_visible_for_public_or_owner" on public.project_stores
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.projects p
      where p.id = project_id
        and (p.visibility = 'public' or p.user_id = (select auth.uid()))
    )
  );

-- Aggregate counts are intentionally public; only store_id + count are returned.
create or replace function public.store_follow_counts()
returns table (store_id uuid, follower_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select sf.store_id, count(*)::bigint as follower_count
  from public.store_follows sf
  group by sf.store_id
$$;

grant execute on function public.store_follow_counts() to anon, authenticated;

-- Seed the approved read-only catalog stores. owner_user_id remains untouched on
-- existing claimed stores; null-owner seed rows are service-role/migration managed.
insert into public.stores (
  name,
  handle,
  store_type,
  description,
  avatar_url,
  cover_image_url,
  website_url,
  location,
  city,
  region,
  country,
  ships_nationwide,
  specialties,
  latitude,
  longitude
)
values
  (
    'Canopy Canvas',
    'canopycanvas',
    'both',
    'Local needlepoint shop with painted canvases, threads, and finishing.',
    '/assets/needlepoint-hero.png',
    '/assets/persimmon-garden-pillow.jpg',
    'https://example.com/canopy',
    'Portland, OR',
    'Portland',
    'OR',
    'US',
    true,
    array['painted canvases', 'finishing', 'threads'],
    45.5202471,
    -122.674194
  ),
  (
    'Thread & Tonic',
    'threadandtonic',
    'online',
    'Online specialty threads and silk blends for advanced stitchers.',
    '/assets/needlepoint-hero.png',
    '/assets/blue-hydrangea-belt.jpg',
    'https://example.com/threadtonic',
    'Ships nationwide',
    '',
    '',
    'US',
    true,
    array['silk', 'metallic', 'kits'],
    null,
    null
  ),
  (
    'Bookshop Windows LNS',
    'bookshopwindows',
    'local',
    'Neighborhood LNS hosting stitch-alongs and custom finishing.',
    '/assets/needlepoint-hero.png',
    '/assets/bookshop-door-canvas.jpg',
    'https://example.com/bookshop',
    'Austin, TX',
    'Austin',
    'TX',
    'US',
    false,
    array['local pickup', 'classes', 'finishing'],
    30.2711286,
    -97.7436995
  )
on conflict (handle) do update
set
  name = excluded.name,
  store_type = excluded.store_type,
  description = excluded.description,
  avatar_url = excluded.avatar_url,
  cover_image_url = excluded.cover_image_url,
  website_url = excluded.website_url,
  location = excluded.location,
  city = excluded.city,
  region = excluded.region,
  country = excluded.country,
  ships_nationwide = excluded.ships_nationwide,
  specialties = excluded.specialties,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  updated_at = now();

-- Backfill/repair approved catalog products. Idempotent by store + product name.
insert into public.store_products (store_id, name, description, image_url, price_label, external_url, category, sort_order)
select s.id, v.name, v.description, v.image_url, v.price_label, v.external_url, v.category, v.sort_order
from public.stores s
join (
  values
    ('canopycanvas', 'Persimmon Garden pillow canvas', '18 mesh painted canvas for a lush fruit pillow.', '/assets/persimmon-garden-pillow.jpg', 'from $86', 'https://example.com/canopy/persimmon', 'canvas', 1),
    ('canopycanvas', 'Bookshop Door printed canvas', '18 mesh storefront scene for framed pieces.', '/assets/bookshop-door-canvas.jpg', 'from $74', 'https://example.com/canopy/bookshop-door', 'canvas', 2),
    ('canopycanvas', 'Blue Hydrangea belt canvas', 'Narrow belt canvas with botanical repeat.', '/assets/blue-hydrangea-belt.jpg', 'from $48', 'https://example.com/canopy/hydrangea-belt', 'canvas', 3),
    ('threadandtonic', 'Silk blend starter pack', 'Assorted silk blends for advanced stitchers.', '/assets/blue-hydrangea-belt.jpg', '$42', 'https://example.com/threadtonic/silk-pack', 'thread', 1),
    ('threadandtonic', 'Metallic accent kit', 'Kreinik-style accents for roofs and trims.', '/assets/tiny-ski-lodge-ornament.jpg', '$28', 'https://example.com/threadtonic/metallic', 'thread', 2),
    ('threadandtonic', 'Holiday ornament finishing pack', 'Cording and felt backs for small gifts.', '/assets/tiny-ski-lodge-ornament.jpg', '$19', 'https://example.com/threadtonic/finishing', 'finishing', 3),
    ('bookshopwindows', 'Custom finishing — small pillow', 'Local finishing for pillows under 16".', '/assets/persimmon-garden-pillow.jpg', 'from $65', 'https://example.com/bookshop/finishing', 'finishing', 1),
    ('bookshopwindows', 'July stitch-along kit add-on', 'Threads pulled for bookshop-themed SAL.', '/assets/bookshop-door-canvas.jpg', '$36', 'https://example.com/bookshop/sal-kit', 'kit', 2),
    ('bookshopwindows', 'Neighborhood class voucher', 'In-store beginner basketweave session.', '/assets/needlepoint-hero.png', '$45', 'https://example.com/bookshop/class', 'class', 3)
) as v(handle, name, description, image_url, price_label, external_url, category, sort_order)
  on s.handle = v.handle
where not exists (
  select 1
  from public.store_products sp
  where sp.store_id = s.id and sp.name = v.name
);

-- Seed available-at tags for existing public demo projects when present.
insert into public.project_stores (project_id, store_id, role)
select p.id, s.id, 'available_at'
from public.projects p
join public.stores s on true
where p.visibility = 'public'
  and (p.title, s.handle) in (
    ('Persimmon Garden Pillow', 'canopycanvas'),
    ('Persimmon Garden Pillow', 'threadandtonic'),
    ('Tiny Ski Lodge Ornament', 'threadandtonic'),
    ('Bookshop Door Canvas', 'canopycanvas'),
    ('Bookshop Door Canvas', 'bookshopwindows'),
    ('Blue Hydrangea Belt', 'canopycanvas'),
    ('Blue Hydrangea Belt', 'threadandtonic')
  )
on conflict do nothing;
