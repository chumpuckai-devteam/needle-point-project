# Needlepoint Project

Needlepoint Project is a Vite + React + TypeScript MVP for a craft-specific social app: Studio feed, project journals, discovery, collections, stitch-alongs, and shop connections for needlepoint.

Start with [PRD.md](./PRD.md) for product scope and MVP acceptance criteria. Marketplace checkout, carts, direct messages, and native mobile apps are intentionally out of scope.

## Run locally

Requirements:

- Node.js 20+
- npm

Install dependencies and start Vite:

```bash
npm install
npm run dev
```

By default the app runs in offline demo mode. No Supabase env vars are required for local review; the demo session uses seeded creators/projects/stores and persists changes in `localStorage`.

Optional live Supabase mode:

```bash
cp .env.example .env.local
# Fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
npm run dev
```

Useful checks:

```bash
npm run lint
npm run build
npm run test:smoke
npm run preview
```

`npm run test:smoke` covers the core router path plus auth, Available at / Shop the look, store detail/follow, and owner product CRUD smoke tests.

## App routes

- `/` — Studio feed
- `/discover` — project search and craft filters
- `/journal` — create project entries and review your journal
- `/projects/:id` — project detail, owner edits, progress updates, Available at tags, Shop the look
- `/u/:handle` — creator profile
- `/collections` — saved-project collections
- `/stitch-along` and `/stitch-along/:id` — public stitch-along list/detail, join, submit public projects
- `/stores` — shop discovery by ZIP, city, city browse, or browser location
- `/stores/:handle` — public shop profile, catalog, follow/claim/owner tools
- `/auth`, `/auth/signup`, `/onboarding` — account and onboarding surfaces

## UI state primitives

Shared loading skeletons, empty states, and error states live in `src/components/ui.tsx` (Moss & Flax tokens in `src/styles.css`). Use them for feed, shops, journal, project, and auth so loading → content swaps keep stable height.

| Export | Role |
|--------|------|
| `Skeleton`, `SkeletonText` | Shimmer bones |
| `FeedListSkeleton`, `FeedPostSkeleton` | Studio / list loading |
| `CardGridSkeleton`, `CardSkeleton` | Grid / tile loading |
| `DetailSkeleton`, `PageLoading` | Detail + auth hydrate |
| `EmptyState`, `ErrorState` | Title / body / CTA (`action`+`onAction` or `cta` slot); variants `panel` · `inline` · `compact` · `detail` |

Usage guide + list/detail examples: [docs/ui-state-primitives.md](./docs/ui-state-primitives.md). Copy-paste patterns also in `src/components/uiState.examples.tsx` (not routed).

## Current product behavior

### Studio and Discover

- Studio is the home feed. It shows active stitch-alongs, a followed-shops rail, nearby shop chips, and public project posts.
- Discover searches public projects by title, notes, creator, materials, stitches, colors, category, and pattern source.
- Discover filters support category, difficulty, stitch, color, and status.
- Private projects are hidden from Studio, Discover, shop tags, profiles for other viewers, and stitch-along galleries.

### Projects and journal CRUD

- Create a project from `/journal` with title, photo or image URL, optional video URL, status, difficulty, category, canvas type, materials, stitches, colors, pattern source/link, visibility, notes, and `Available at` shop tags.
- Owners can edit project details from `/projects/:id`, including visibility, progress, media, and `Available at` shops.
- Owners can add progress updates with milestone text, notes, and optional images. Other users can comment on the latest update.
- Project create/update persists to Supabase when env vars are configured and to `localStorage` in demo mode.

### Shops and stores

- `/stores` is the shop discovery surface. It supports ZIP search, city search, city browse cards, and optional browser geolocation.
- Local/hybrid shops are ranked within about 60 miles by default, with expand-to-100/150-mile coaching and an online-shops fallback.
- Shop cards link to `/stores/:handle`; the app links out to each shop website for buying. Needlepoint does not process checkout.
- Store detail pages show public profile fields, catalog cards, follower count, tagged projects, and website links.
- Users can follow shops. In live Supabase mode, guests are sent to auth before following; demo mode toggles locally.
- Store profile media uses the `store-profile-images` bucket in live mode; product photos use `store-product-images`.

### Owner and catalog CRUD

- Demo mode treats the seeded Canopy Canvas shop as owned by the demo user, so owner tools are immediately visible at `/stores/canopycanvas`.
- Owners can edit shop profile fields: name, description, website, location/city, specialties, avatar, and cover image.
- Owners can create, edit, and delete catalog products with name, description, price label, category, external shop link, and optional image.
- Live Supabase shop ownership is hardened: public clients cannot directly write `stores.owner_user_id`; unowned shop claims go through `request_store_claim(...)` and require approval before owner product writes are allowed.

### Seed/demo content

Offline demo seed data is defined in `src/data.ts` and the `DEMO_STORES` constant in `src/App.tsx`.
Live Supabase seed data is loaded by `scripts/seed.mjs`:

- 3 creator profiles (`mara_stitches`, `threadandtonic`, `canopycanvas`)
- 4 public projects plus 1 private demo draft
- 4 shops: Canopy Canvas, Thread & Tonic, Bookshop Windows LNS, and Needle Nest Studio
- catalog products across canvases, threads, finishing, classes, online-only, local, and hybrid shops
- Project↔shop tags used by `Available at`, store project grids, and `Shop the look`
- Multi stitch-alongs, joins/submissions, collections/saves, creator follows, store follows, interests, likes, and one private project for RLS/empty-state checks

For live Supabase seeding:

```bash
cp .env.example .env.local
# Fill VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.
npm run seed
```

`npm run seed` is idempotent for the seed rows it manages. `npm run seed:reset` deletes and recreates only the seed auth users (`seed.*@example.test`) before reseeding; it does not drop schema or remove real users.

## Supabase live mode

Greenfield setup notes live in [docs/supabase-setup.md](./docs/supabase-setup.md). Schema, RLS, RPCs, and storage buckets are under `supabase/migrations/`.

When `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set:

- Email/password sign-up and sign-in are enabled.
- Profiles are auto-created by the database trigger.
- Project create/list/update, progress updates, reactions, comments, saves, collections, stitch-alongs, stores, store follows, catalog products, and project↔store tags use Supabase.
- Project images use the `project-images` bucket.
- Store profile and product images use the store-specific buckets above.

Without those vars the app stays in demo mode with local seed data and browser storage.
