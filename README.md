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

This repo now contains a Vite + React + TypeScript web app with seeded local content. It includes:

- Home/discovery feed with creator updates and a featured stitch-along.
- React Router routes for `/`, `/discover`, `/journal`, `/projects/:id`, `/u/:handle`, `/collections`, `/stitch-along`, `/auth`, and `/onboarding`.
- Search and craft-specific filters for category, difficulty, stitch, color, and status.
- Project detail pages with metadata, progress history, likes, saves, comments, follows, and local progress updates.
- Project journal creation backed by local React state with offline persistence.
- Creator/stitcher profile pages with external links.
- Saved project collections.
- A join-and-submit stitch-along flow.
- Optional Supabase password auth with safe demo fallback when env variables are absent.
- A Playwright smoke test for the core MVP path.

Payments, marketplace checkout, direct messages, and native mobile are out of scope.

## Supabase (multi-user)

Greenfield setup steps: [docs/supabase-setup.md](./docs/supabase-setup.md)

Schema + RLS: `supabase/migrations/20260715120000_init.sql`

When `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are set:

- Password sign-up / sign-in
- Profile auto-created via DB trigger
- Project create + list hydrate from Postgres
- Image uploads use the `project-images` storage bucket

Without those vars the app stays in demo mode (localStorage).
