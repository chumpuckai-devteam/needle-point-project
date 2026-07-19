# E2E / smoke coverage

Playwright UI suite for Needlepoint. Specs run against the Vite dev server started by `playwright.config.ts` in **offline demo mode** (`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` cleared) so seed data and ownership stay deterministic without live credentials.

## Run locally

```bash
npm install
npx playwright install chromium   # once per machine
npm run test:smoke                # full smoke + critical flows
# or
npm run test:e2e:critical         # only tests/critical-flows.spec.ts
```

Optional env:

| Variable | Default | Purpose |
|----------|---------|---------|
| `PW_SMOKE_PORT` | `5191` | Dev server port (avoids collisions when multiple workers share a host) |

Examples:

```bash
PW_SMOKE_PORT=5193 npm run test:smoke
npx playwright test tests/critical-flows.spec.ts --reporter=list
npx playwright test tests/auth-smoke.spec.ts --debug
```

`reuseExistingServer: true` means an already-running dev server on the smoke port is reused. For a clean demo boot, stop other Vite processes on that port first.

## What is covered

| Spec | Focus |
|------|--------|
| `mvp-smoke.spec.ts` | Primary nav + core routes (Discover search, project, shops, journal form, stitch-along) |
| `auth-smoke.spec.ts` | Demo session, restore, Account nav, `/auth/signup` deep link |
| `v3-matrix.spec.ts` | Stores list/detail, Shop the look, follow persistence, journal picker, auth chrome, mobile overflow |
| `owner-crud-smoke.spec.ts` | Owner catalog create → read → update → delete (Canopy) |
| `available-at-flow.spec.ts` | Project chips, shop drill-in, reverse projects, journal store picker |
| `shop-detail-follow-smoke.spec.ts` | Owned vs followable shop chrome; follow/unfollow persistence |
| `critical-flows.spec.ts` | **Net-new:** Studio feed open/like; Discover empty + private filter; journal create + owner edit; progress update + comment; save→collections; stitch-along join; profile follow; missing project + unknown route |

Backend RLS / RPC contracts live in `tests/*-contract.*` and `*.test.mjs` (not Playwright UI). Run those separately when exercising Supabase.

## CI notes

- Prefer `npm run test:smoke` as the PR gate for UI regressions.
- Chromium-only (`playwright.config.ts` projects).
- `workers: 1`, `fullyParallel: false` — suite is intentionally serial to reduce Vite HMR flake.
- Traces: `on-first-retry`. Failures print Playwright actionable errors (selector + timeout); open HTML report with `npx playwright show-report` if configured locally.
- Do **not** point smoke at production Supabase; demo mode is the stable default.

## Deferred high-value gaps (intentional)

- Live Supabase password sign-in / sign-up (requires secrets + mailer; demo path covers offline session).
- Image file upload via OS file picker (needs fixture binary + `setInputFiles`; URL path is covered indirectly).
- Multi-board collections create/rename (only default board toggle is covered).
- Stitch-along host create form + submit-project gallery edge cases beyond join.
- Onboarding interest picker end-to-end.
- Geolocation-ranked shops (browser permission variance).
- Owner shop profile media edit / claim-unowned-shop online path.
- Mobile nav drawer / responsive aside (only overflow check on store+project in V3 matrix).
- Visual regression / screenshot diffs.

When adding specs: await UI state (`toBeVisible`, `toHaveURL`, `expect.poll`), avoid `waitForTimeout`, prefer roles/labels over CSS where stable, and keep unique titles (`Date.now()`) for create flows.
