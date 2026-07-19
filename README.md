# Needlepoint Project

Needlepoint Project is an MVP concept for a niche social platform built around needlepoint project journals, discovery, collections, creator profiles, and stitch-alongs.

Start with [PRD.md](./PRD.md) for product scope, user flows, data model, launch strategy, and MVP acceptance criteria.

## Run Locally

Requirements:

- Node.js 20+
- npm

Install dependencies:

```bash
npm install
```

Configure Supabase auth (optional for local/demo mode):

```bash
cp .env.example .env.local
# Fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY when you want live Supabase auth.
```

When those variables are missing, the app stays fully usable offline with a demo session (`demo-user`, `@threadandtonic`) and persists projects, collections, follows, and stitch-along state in `localStorage`.

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Run the MVP smoke test:

```bash
npm run test:smoke
```

Preview the production build:

```bash
npm run preview
```

## MVP Direction

- Build a working web app, not a landing page.
- Prioritize project journals, discovery, saves, follows, comments, and one stitch-along flow.
- Defer payments, marketplace checkout, direct messages, and native mobile.
- Keep the product craft-specific instead of cloning a generic social feed.

## Current MVP Slice

This repo contains a Vite + React + TypeScript web app (demo localStorage **or** live Supabase). It includes:

- **Craft Studio** home feed (photo-first, unique craft UI — Moss & Flax palette).
- React Router routes for `/`, `/discover`, `/journal`, `/projects/:id`, `/u/:handle`, `/collections`, `/stitch-along`, `/stores`, `/stores/:handle`, `/auth`, `/auth/signup`, and `/onboarding`.
- Separate sign-in and create-account screens (footer switch between them).
- Search and craft-specific filters for category, difficulty, stitch, color, and status.
- Project journal create/edit, progress photos, likes, saves, comments, creator follows.
- **Stores**: local/online shop profiles, proximity ranking (~60 mi) with top-online fallback.
- Store **catalog** cards (link-out only — no checkout), **Available at** project tags, **Shop the look** on project detail, **Follow store** (auth required online).
- **Owner product CRUD**: claim an unowned shop, then add/edit/delete catalog items (demo mode can manage all demo shops).
- Saved project collections and a join-and-submit stitch-along flow.
- Dual-mode: Supabase when env is set; offline demo otherwise.
- Playwright smoke test for the core MVP path.

Payments, marketplace checkout, cart, direct messages, and native mobile apps are out of scope.

## Supabase (multi-user)

Greenfield setup steps: [docs/supabase-setup.md](./docs/supabase-setup.md)

Schema + RLS migrations under `supabase/migrations/` (init, stores, lat/lng, store follows + catalog seed).

When `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are set:

- Password sign-up / sign-in
- Profile auto-created via DB trigger
- Project create + list hydrate from Postgres
- Image uploads use the `project-images` storage bucket
- Stores, products, project↔store tags, store follows

Without those vars the app stays in demo mode (localStorage).
