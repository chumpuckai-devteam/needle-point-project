# Needlepoint Project

Needlepoint Project is a Vite + React + TypeScript private-beta app for needlepoint makers: **Studio** feed, project journals, Discover, collections, stitch-alongs, **stitching meetups**, and **shop connections** (catalog link-outs, follow, owner tools).

Start with [PRD.md](./PRD.md) for product scope and **Post-MVP Roadmap** (Phase B = stitching meetups). Business money path: [docs/monetization-strategies.md](./docs/monetization-strategies.md). **Out of scope for now:** marketplace checkout, carts, DMs, native mobile apps, Algolia; full event ticketing is out of the first meetup slice.

**Prod:** https://needle-point-project.vercel.app

## Run locally

Requirements: Node.js 20+, npm.

```bash
npm install
npm run dev
```

By default the app runs in **offline demo mode**. No Supabase env vars required. Seeded creators/projects/shops persist in `localStorage`. The demo session is the Canopy-owning stitcher (`c2` / @threadandtonic) so owner CRUD is immediately available.

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

`npm run test:smoke` runs Playwright critical paths: MVP routes, V3 matrix, auth demo, Available at / Shop the look, shop follow, owner product CRUD, guest/claim surface, outbound click contract, local discovery, product density, meetups, and critical-flows.

## Architecture

```
src/
  App.tsx                 # providers + AppShell only
  app/
    AppShell.tsx          # state, auth gates, online boot
    AppRoutes.tsx         # route table
    AppLayout.tsx         # chrome + sidebar
    navigation.ts         # path ↔ view
    demoData.ts           # DEMO_STORES, storage keys
  pages/                  # route bodies (Home, Discover, Store, Project, …)
  components/             # Sidebar, feed, UI primitives
  api/                    # Supabase clients (stores, projects, clickEvents, …)
supabase/migrations/      # schema, RLS, RPCs, storage
```

## App routes

| Path | Surface |
|------|---------|
| `/` | Studio feed (SAL rail, followed shops, posts) |
| `/discover` | Project search + craft filters |
| `/journal` | Create project (auth-gated online) |
| `/projects/:id` | Detail, progress, Available at, Shop the look |
| `/u/:handle` | Creator profile |
| `/collections` | Saved boards |
| `/stitch-along`, `/stitch-along/:id` | Multi-SAL list/detail |
| `/stores` | ZIP / city / near-you discovery |
| `/stores/:handle` | Shop profile, catalog, follow/claim/owner |
| `/auth`, `/auth/signup`, `/onboarding` | Account + interests |

### Mobile bottom nav (max 5)

- **Signed-in / demo:** Studio · Discover · Shops · New post · Account  
- **Online guest:** Studio · Discover · Shops · Saved · Account (no New post, no Onboarding)

## Guest vs signed-in

| Action | Guest (online) | Signed-in / demo |
|--------|----------------|------------------|
| Browse Studio, Discover, shops, projects, SAL | ✅ | ✅ |
| Like, save, comment, follow, dismiss, join, claim | → `/auth` | ✅ |
| Create post / onboarding | → `/auth` | ✅ |
| Interest “Because you picked…” hints | Hidden | When interests set |
| Shop claim | Request CTA → auth | Moderated request (demo: instant own) |

## Current product behavior

### Studio and Discover

- Studio shows active stitch-alongs, followed-shops rail, nearby shop chips, and public posts.
- Discover searches public projects and supports category, difficulty, stitch, color, status filters.
- Private projects never appear on public surfaces.
- Online boot soft-fails optional RPCs so one missing table cannot blank Studio; feed shows a skeleton until the first hydrate settles.

### Projects and journal

- Create from `/journal` with media, craft metadata, visibility, notes, and **Available at** shop tags.
- Owners edit on `/projects/:id` and add progress updates; others can comment when signed in.
- Images upload to `project-images` in live mode.

### Shops

- Discovery: ZIP, city, city browse, optional geolocation (~60 mi default, expand coaching).
- Public profile: description, specialties, follower count, catalog, tagged projects, website.
- **Follow store** (auth online). **Shop the look** on projects tagged with stores.
- Product **Shop** links and store **Visit website** record no-PII outbound click analytics (host only).
- Profile media: `store-profile-images`. Product photos: `store-product-images`.

### Owner catalog & profile

- Demo: Canopy Canvas is owned — **Edit shop profile** + **Add product** at `/stores/canopycanvas`.
- Owners edit name, description, website, location/city, specialties, avatar, cover.
- Product CRUD: name, description, price label, category, external URL, optional photo (Storage online).
- **Claims (live):** unowned shops use **Request to claim shop** → `request_store_claim`. Ownership is assigned only via approve/establish (service role / owner). Demo still instant-owns for dogfood.
- Product writes require `owner_user_id = auth.uid()`.

### Seed / demo content

Offline seed:

- Creators + projects: `src/data.ts` (`initialProjects`, including private **Midnight Sampler** for access checks)
- Shops + catalog: `src/app/demoData.ts` (`DEMO_STORES` — Canopy owned, Thread & Tonic + Bookshop unowned)

Live seed (`scripts/seed.mjs`):

```bash
# Needs SUPABASE_SERVICE_ROLE_KEY in .env.local
npm run seed          # idempotent seed rows
npm run seed:reset    # recreate seed.*@example.test users only
```

Includes multiple public projects, shops with catalog, project↔store tags, multi-SAL, follows, and private RLS fixtures so Discover/Studio are never empty cold-start after seed.

## Supabase live mode

Setup: [docs/supabase-setup.md](./docs/supabase-setup.md). Migrations under `supabase/migrations/`.

When `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are set:

- Email/password auth; profiles via trigger
- Projects, social, SAL, stores, follows, products, tags → Supabase
- Storage: `project-images`, `store-profile-images`, `store-product-images`
- Analytics: write-only `outbound_click_events` + `outbound_click_event_counts` RPC

Without those vars → demo mode (local seed + browser storage).

## UI state primitives

Shared skeletons / empty / error in `src/components/ui.tsx` (Moss & Flax in `src/styles.css`). Guide: [docs/ui-state-primitives.md](./docs/ui-state-primitives.md).

## Kanban / shipping

Board: `needlepoint` (Hermes). Prefer Program → Epic → Story. `kanban.auto_decompose` stays off — Tech Lead promotes slices only.

**Next major product theme (roadmap):** [PRD Post-MVP Phase B — Stitching meetups](./PRD.md#phase-b--stitching-meetups-local-community).
