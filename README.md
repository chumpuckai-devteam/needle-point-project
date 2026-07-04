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
- Search and craft-specific filters for category, difficulty, stitch, color, and status.
- Project detail pages with metadata, progress history, likes, saves, comments, follows, and local progress updates.
- Project journal creation backed by local React state.
- Creator/stitcher profile pages with external links.
- Saved project collections.
- A join-and-submit stitch-along flow.
- A Playwright smoke test for the core MVP path.

Persistence is intentionally local-state only in this first runnable slice. Payments, marketplace checkout, direct messages, auth, and native mobile are out of scope.
