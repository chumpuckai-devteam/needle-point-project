# Demo-quality Discover seed content set

Date: 2026-07-19  
Audience: backend-dev, frontend-dev, qa-engineer  
Status: implementation-ready seed spec

## Goal

Make first launch Discover feel like an intentional craft community: a visual feed with varied needlepoint categories, skill levels, statuses, creators, and store connections instead of one placeholder row.

This spec intentionally stays inside the current Needlepoint product scope: project discovery, studio journaling, shop profiles, catalog cards, and link-outs. No marketplace checkout, cart, payment, DMs, or real user PII.

## Current schema / UI fields this fills

Project Discover cards currently consume public `projects` plus relations:

- `profiles`: `name`, `handle`, `avatar_url`, `bio`, `skill_level`, `is_creator`, `location`, interests/links for profile context.
- `projects`: `title`, `description`, `status`, `visibility`, `difficulty`, `category`, `canvas_type`, `pattern_source_name`, `pattern_source_url`, `primary_image_url`, `progress`.
- `project_tags` / `tags`: stitch tags (`category='stitch'`), color/theme tags for filtering and interest ranking.
- `materials`: displayed as project materials.
- `project_updates`: milestone, body, image for detail/feed context.
- Social affordances: seed `reactions` and default saved collections only as lightweight proof of life.
- Shop connections: `stores`, `store_products`, and `project_stores` so Discover can show projects that connect to shop/profile detail routes.

Store discovery cards currently consume:

- `stores`: `name`, `handle`, `store_type`, `description`, `avatar_url`, `cover_image_url`, `website_url`, `location`, `city`, `region`, `postal_code`, `country`, `ships_nationwide`, `specialties`, `latitude`, `longitude`.
- Aggregate-facing values derived from `store_products`, `project_stores`, and `store_follows`: `productCount`, `projectCount`, `followerCount`.

All media below uses existing demo-safe assets under `/assets`. If higher-fidelity assets are commissioned later, replace only the image URLs; the copy and record shape can remain stable.

## Rationale for the set

The demo should communicate four things within the first scroll:

1. Needlepoint is visual and specific: pillows, ornaments, belts, framed canvases, florals, storefronts, holiday, beginner and advanced work all appear.
2. Discover is not just a generic social feed: every project has craft metadata, stitches, materials, progress, updates, and pattern/source context.
3. Shops are useful without checkout: projects can link to pattern sources, available-at stores, thread shops, classes, and finishing services.
4. Privacy works: a private draft exists in the seed for QA, but only the public projects are eligible for Discover.

## Structured seed spec

```yaml
seed_users:
  - key: mara
    email: seed.mara@example.test
    name: Mara Chen
    handle: mara_stitches
    avatar_url: https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=82
    bio: Modern florals, painted canvases, and calm Sunday stitching notes from a Brooklyn apartment.
    skill_level: advanced
    is_creator: true
    location: Brooklyn, NY
    interests: [florals, pillows, canvases]
    links:
      - { label: Pattern shop, url: https://example.com/mara-patterns }
      - { label: Classes, url: https://example.com/mara-classes }

  - key: june
    email: seed.june@example.test
    name: June Mercer
    handle: threadandtonic
    avatar_url: https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=82
    bio: Beginner-friendly ornaments, finishing ideas, and honest notes about thread substitutions.
    skill_level: confident beginner
    is_creator: false
    location: Austin, TX
    interests: [beginner projects, ornaments, holiday]
    links:
      - { label: Project notebook, url: https://example.com/june-notebook }

  - key: canopy
    email: seed.canopy@example.test
    name: Canopy Canvas Co.
    handle: canopycanvas
    avatar_url: https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=400&q=82
    bio: Small-batch canvases inspired by gardens, bookshops, heirloom linens, and weekend markets.
    skill_level: advanced
    is_creator: true
    location: Portland, OR
    interests: [canvases, modern patterns, florals]
    links:
      - { label: Shop canvases, url: https://example.com/canopy }
      - { label: Newsletter, url: https://example.com/canopy-news }

projects:
  - id: 00000000-0000-4000-8000-000000000101
    owner_key: mara
    title: Persimmon Garden Pillow
    description: Testing raised stitches for the fruit and keeping the background matte so the silk can shine.
    status: in_progress
    visibility: public
    difficulty: advanced
    category: pillow
    canvas_type: 18 mesh painted canvas
    pattern_source_name: Canopy Canvas Co.
    pattern_source_url: https://example.com/persimmon-garden
    primary_image_url: /assets/persimmon-garden-pillow.jpg
    media_kind: image
    progress: 62
    discover_message: advanced floral/pillow anchor with high craft specificity
    materials:
      - { type: thread, brand: Planet Earth, color_name: persimmon, notes: silk for raised fruit }
      - { type: thread, brand: DMC, color_name: cream, notes: matte background cotton }
      - { type: thread, brand: Kreinik, color_name: olive, notes: accent braid }
    tags:
      - { name: basketweave, category: stitch }
      - { name: french knots, category: stitch }
      - { name: persimmon, category: color }
      - { name: florals, category: theme }
      - { name: pillow, category: theme }
    updates:
      - id: 00000000-0000-4000-8000-000000000201
        milestone: Border mapped
        body: Swapped the border to a cashmere stitch so the corners feel softer.
        image_url: /assets/persimmon-garden-pillow.jpg
      - id: 00000000-0000-4000-8000-000000000202
        milestone: Fruit texture
        body: French knots in two oranges gave the persimmons a little dimension.
        image_url: /assets/persimmon-garden-pillow.jpg

  - id: 00000000-0000-4000-8000-000000000102
    owner_key: june
    title: Tiny Ski Lodge Ornament
    description: A quick gift stitch with a metallic roof and simple finishing plan.
    status: finished
    visibility: public
    difficulty: beginner
    category: ornament
    canvas_type: 13 mesh canvas
    pattern_source_name: Vintage chart adaptation
    pattern_source_url: https://example.com/ski-lodge
    primary_image_url: /assets/tiny-ski-lodge-ornament.jpg
    media_kind: image
    progress: 100
    discover_message: beginner/holiday proof that Discover is approachable, not only expert work
    materials:
      - { type: thread, brand: DMC, color_name: evergreen, notes: wool }
      - { type: thread, brand: Kreinik, color_name: snow, notes: metallic roof }
    tags:
      - { name: continental, category: stitch }
      - { name: scotch stitch, category: stitch }
      - { name: evergreen, category: color }
      - { name: holiday, category: theme }
      - { name: ornaments, category: theme }
    updates:
      - id: 00000000-0000-4000-8000-000000000203
        milestone: Finished
        body: Blocked and ready for cording. The roof sparkle was worth the extra thread management.
        image_url: /assets/tiny-ski-lodge-ornament.jpg

  - id: 00000000-0000-4000-8000-000000000103
    owner_key: canopy
    title: Bookshop Door Canvas
    description: Queued for the July stitch-along with velvet for the awning.
    status: planned
    visibility: public
    difficulty: intermediate
    category: framed piece
    canvas_type: 18 mesh printed canvas
    pattern_source_name: Canopy Canvas Co.
    pattern_source_url: https://example.com/bookshop-door
    primary_image_url: /assets/bookshop-door-canvas.jpg
    media_kind: image
    progress: 8
    discover_message: creator/shop seed that connects Discover to stitch-alongs and store pages
    materials:
      - { type: thread, brand: Vineyard Silk, color_name: teal, notes: awning }
      - { type: thread, brand: Rainbow Gallery, color_name: rose, notes: velvet accent }
      - { type: thread, brand: DMC, color_name: brass, notes: tiny doorknob highlight }
    tags:
      - { name: tent stitch, category: stitch }
      - { name: brick stitch, category: stitch }
      - { name: modern patterns, category: theme }
      - { name: bookshop, category: theme }
      - { name: teal, category: color }
    updates:
      - id: 00000000-0000-4000-8000-000000000204
        milestone: Kitted
        body: Pulled thread options and chose a warmer brass for the doorknob.
        image_url: /assets/bookshop-door-canvas.jpg

  - id: 00000000-0000-4000-8000-000000000104
    owner_key: mara
    title: Blue Hydrangea Belt
    description: Paused until the background blue arrives. Testing whether mosaic reads too busy at belt scale.
    status: paused
    visibility: public
    difficulty: intermediate
    category: accessory
    canvas_type: 18 mesh belt canvas
    pattern_source_name: Self-drafted from garden photos
    pattern_source_url: https://example.com/hydrangea-belt-notes
    primary_image_url: /assets/blue-hydrangea-belt.jpg
    media_kind: image
    progress: 34
    discover_message: paused/in-progress realism plus accessory category and floral color filtering
    materials:
      - { type: thread, brand: Anchor, color_name: cornflower, notes: floss }
      - { type: thread, brand: Pepper Pot, color_name: navy, notes: silk }
      - { type: thread, brand: DMC, color_name: leaf, notes: greenery test strand }
    tags:
      - { name: basketweave, category: stitch }
      - { name: mosaic stitch, category: stitch }
      - { name: florals, category: theme }
      - { name: hydrangea, category: theme }
      - { name: cornflower, category: color }
      - { name: navy, category: color }
    updates:
      - id: 00000000-0000-4000-8000-000000000205
        milestone: Color test
        body: The middle value needs to be cooler before committing to the full repeat.
        image_url: /assets/blue-hydrangea-belt.jpg

  - id: 00000000-0000-4000-8000-000000000105
    owner_key: june
    title: Midnight Sampler (private draft)
    description: Private journal draft — should never appear in Studio, Discover, or other profiles.
    status: in_progress
    visibility: private
    difficulty: confident_beginner
    category: sampler
    canvas_type: 18 mesh mono canvas
    pattern_source_name: Personal stash
    pattern_source_url: https://example.com/private-draft
    primary_image_url: /assets/tiny-ski-lodge-ornament.jpg
    media_kind: image
    progress: 18
    discover_message: QA fixture only; excluded from Discover because visibility is private
    materials:
      - { type: thread, brand: DMC, color_name: indigo, notes: floss }
      - { type: thread, brand: DMC, color_name: silver, notes: floss }
    tags:
      - { name: continental, category: stitch }
      - { name: private, category: other }
    updates:
      - id: 00000000-0000-4000-8000-000000000206
        milestone: Chart layout
        body: Sketching borders before committing thread. Keep this private until colors settle.
        image_url: /assets/tiny-ski-lodge-ornament.jpg

stores:
  - handle: canopycanvas
    name: Canopy Canvas
    owner_key: canopy
    store_type: both
    description: Local needlepoint shop with painted canvases, threads, and finishing.
    avatar_url: /assets/needlepoint-hero.png
    cover_image_url: /assets/persimmon-garden-pillow.jpg
    website_url: https://example.com/canopy
    location: Portland, OR
    city: Portland
    region: OR
    postal_code: "97205"
    country: US
    ships_nationwide: true
    specialties: [painted canvases, finishing, threads]
    latitude: 45.5202471
    longitude: -122.674194
    expected_discovery_role: local plus online fallback; owned shop profile and primary canvas source

  - handle: threadandtonic
    name: Thread & Tonic
    owner_key: null
    store_type: online
    description: Online specialty threads and silk blends for advanced stitchers.
    avatar_url: /assets/needlepoint-hero.png
    cover_image_url: /assets/blue-hydrangea-belt.jpg
    website_url: https://example.com/threadtonic
    location: Ships nationwide
    city: ""
    region: ""
    postal_code: ""
    country: US
    ships_nationwide: true
    specialties: [silk, metallic, kits]
    latitude: null
    longitude: null
    expected_discovery_role: top online fallback with thread/finishing products

  - handle: bookshopwindows
    name: Bookshop Windows LNS
    owner_key: null
    store_type: local
    description: Neighborhood LNS hosting stitch-alongs and custom finishing.
    avatar_url: /assets/needlepoint-hero.png
    cover_image_url: /assets/bookshop-door-canvas.jpg
    website_url: https://example.com/bookshop
    location: Austin, TX
    city: Austin
    region: TX
    postal_code: "78701"
    country: US
    ships_nationwide: false
    specialties: [local pickup, classes, finishing]
    latitude: 30.2711286
    longitude: -97.7436995
    expected_discovery_role: Austin local result and stitch-along/class context

  - handle: needleneststudio
    name: Needle Nest Studio
    owner_key: null
    store_type: local
    description: Small teaching studio with beginner canvases and monthly finish-it nights.
    avatar_url: /assets/needlepoint-hero.png
    cover_image_url: /assets/tiny-ski-lodge-ornament.jpg
    website_url: https://example.com/needle-nest
    location: Brooklyn, NY
    city: Brooklyn
    region: NY
    postal_code: "11201"
    country: US
    ships_nationwide: false
    specialties: [beginner classes, ornaments, open stitch]
    latitude: 40.6943
    longitude: -73.9866
    expected_discovery_role: beginner-friendly local store for New York/Brooklyn demos

store_products:
  - { store_handle: canopycanvas, name: Persimmon Garden pillow canvas, description: 18 mesh painted canvas for a lush fruit pillow., image_url: /assets/persimmon-garden-pillow.jpg, price_label: from $86, external_url: https://example.com/canopy/persimmon, category: canvas, sort_order: 1 }
  - { store_handle: canopycanvas, name: Bookshop Door printed canvas, description: 18 mesh storefront scene for framed pieces., image_url: /assets/bookshop-door-canvas.jpg, price_label: from $74, external_url: https://example.com/canopy/bookshop-door, category: canvas, sort_order: 2 }
  - { store_handle: canopycanvas, name: Blue Hydrangea belt canvas, description: Narrow belt canvas with botanical repeat., image_url: /assets/blue-hydrangea-belt.jpg, price_label: from $48, external_url: https://example.com/canopy/hydrangea-belt, category: canvas, sort_order: 3 }
  - { store_handle: threadandtonic, name: Silk blend starter pack, description: Assorted silk blends for advanced stitchers., image_url: /assets/blue-hydrangea-belt.jpg, price_label: $42, external_url: https://example.com/threadtonic/silk-pack, category: thread, sort_order: 1 }
  - { store_handle: threadandtonic, name: Metallic accent kit, description: Sparkly accents for roofs, trim, and small ornaments., image_url: /assets/tiny-ski-lodge-ornament.jpg, price_label: $28, external_url: https://example.com/threadtonic/metallic, category: thread, sort_order: 2 }
  - { store_handle: threadandtonic, name: Holiday ornament finishing pack, description: Cording and felt backs for small gifts., image_url: /assets/tiny-ski-lodge-ornament.jpg, price_label: $19, external_url: https://example.com/threadtonic/finishing, category: finishing, sort_order: 3 }
  - { store_handle: bookshopwindows, name: Custom finishing — small pillow, description: Local finishing for pillows under 16 inches., image_url: /assets/persimmon-garden-pillow.jpg, price_label: from $65, external_url: https://example.com/bookshop/finishing, category: finishing, sort_order: 1 }
  - { store_handle: bookshopwindows, name: July stitch-along kit add-on, description: Threads pulled for bookshop-themed stitch-alongs., image_url: /assets/bookshop-door-canvas.jpg, price_label: $36, external_url: https://example.com/bookshop/sal-kit, category: kit, sort_order: 2 }
  - { store_handle: needleneststudio, name: Beginner ornament class seat, description: In-person basketweave class with canvas and thread included., image_url: /assets/tiny-ski-lodge-ornament.jpg, price_label: $55, external_url: https://example.com/needle-nest/classes, category: class, sort_order: 1 }

project_store_links:
  - { project_id: 00000000-0000-4000-8000-000000000101, store_handle: canopycanvas, role: available_at }
  - { project_id: 00000000-0000-4000-8000-000000000101, store_handle: threadandtonic, role: threads_from }
  - { project_id: 00000000-0000-4000-8000-000000000102, store_handle: threadandtonic, role: available_at }
  - { project_id: 00000000-0000-4000-8000-000000000102, store_handle: needleneststudio, role: available_at }
  - { project_id: 00000000-0000-4000-8000-000000000103, store_handle: canopycanvas, role: pattern_from }
  - { project_id: 00000000-0000-4000-8000-000000000103, store_handle: bookshopwindows, role: available_at }
  - { project_id: 00000000-0000-4000-8000-000000000104, store_handle: canopycanvas, role: available_at }
  - { project_id: 00000000-0000-4000-8000-000000000104, store_handle: threadandtonic, role: threads_from }

seed_social_counts:
  reactions:
    - { user_key: june, target_type: project, target_project_id: 00000000-0000-4000-8000-000000000101, reaction_type: like }
    - { user_key: canopy, target_type: project, target_project_id: 00000000-0000-4000-8000-000000000101, reaction_type: like }
    - { user_key: mara, target_type: project, target_project_id: 00000000-0000-4000-8000-000000000102, reaction_type: like }
    - { user_key: june, target_type: project, target_project_id: 00000000-0000-4000-8000-000000000103, reaction_type: like }
    - { user_key: canopy, target_type: project, target_project_id: 00000000-0000-4000-8000-000000000104, reaction_type: like }
  store_follows:
    - { user_key: mara, store_handle: canopycanvas }
    - { user_key: june, store_handle: canopycanvas }
    - { user_key: canopy, store_handle: threadandtonic }
```

## Implementation notes for backend seed work

1. Keep the project UUIDs stable so localStorage reset/debug screenshots and SQL seed diffs remain deterministic.
2. Upsert seed users by `email` and profiles by auth user id; do not use real emails or user photos beyond generic demo image URLs.
3. Upsert stores by `handle`; preserve existing `owner_user_id` on claimed real stores unless the seed row is the approved demo-owned Canopy shop and it is currently unowned.
4. Insert/update products idempotently by `(store_id, name)`.
5. Clear and rebuild relation rows for this fixed seed project id list: `materials`, `project_updates`, `project_tags`, `project_stores`, and demo reactions. This avoids duplicate relation rows on repeated `npm run seed`.
6. The private `Midnight Sampler` is an intentional QA fixture. It must be excluded from `get_recommended_projects`, public project reads, shop discovery links, stitch-along submissions, and other users' profile/project views.
7. If new assets are added later, prefer one image per visual theme: floral pillow, ornament, storefront/framed piece, belt/accessory, hero/shop avatar. Until then, the existing five assets are sufficient.

## Acceptance checks

- `/discover` with no filters shows at least the four public projects: floral pillow, holiday ornament, bookshop canvas, hydrangea belt.
- Discover category/status/difficulty filters have visible variety: `pillow`, `ornament`, `framed piece`, `accessory`; `planned`, `in_progress`, `finished`, `paused`; `beginner`, `intermediate`, `advanced`.
- Interest-ranked scenarios have obvious inventory: `florals` matches Persimmon/Hydrangea, `ornaments` and `holiday` match Tiny Ski Lodge, `modern patterns` matches Bookshop Door.
- Store discovery browse has at least three local/hybrid map pins and one online fallback store.
- ZIP/city demos resolve: `78701`/Austin finds Bookshop Windows LNS; `97205`/Portland finds Canopy Canvas; Brooklyn/`11201` can find Needle Nest Studio once its place seed exists.
- The private sampler exists for owner/QA paths but never appears in Discover for anon or another user.
