# Needlepoint Project — Further Development Plan

> **For Hermes:** Use subagent-driven-development (or sequential tasks in this session) after Samir approves. Do **not** implement until approval. Prefer small commits; keep craft-specific UX (not a generic social clone).

**Goal:** Turn the local-state Vite demo into a multi-user, persistent MVP that satisfies the PRD’s core flows (auth/profile, project journal + updates, discovery/search, collections, follows/likes/comments, stitch-along, creator profiles), then harden for a small private beta.

**Architecture:** Keep the current **Vite + React + TypeScript** SPA for speed (already live UI + Vercel-friendly). Add a **BaaS backend** rather than rewriting to Next.js immediately:

| Layer | Choice | Why |
|--------|--------|-----|
| UI | Vite + React 19 + TS (existing) | Already implements screens/flows; avoids full rewrite |
| Routing | `react-router-dom` | Shareable URLs (`/projects/:id`, `/u/:handle`, `/stitch-alongs/:id`) |
| Backend | **Supabase** (Postgres + Auth + Storage + RLS) | Fastest path to PRD data model, auth, images; maps cleanly to PRD entities |
| Client data | Supabase JS + thin repository layer | Replace `useState` seed data; keep UI components |
| Search (MVP) | Postgres filters + `ilike` / simple FTS | Enough for seeded + small user base |
| Analytics (later) | PostHog | PRD success metrics |
| Deploy | Vercel (SPA) + Supabase cloud | Matches existing “Trigger Vercel redeploy” history |

**Defer (YAGNI / PRD non-goals):** marketplace checkout, payments, DMs, native mobile, multi-craft expansion, automated moderation, Algolia-class search.

**Tech stack (implementation):** React 19, Vite 6, TypeScript, lucide-react, react-router-dom, `@supabase/supabase-js`, Playwright, ESLint.

---

## Current context / assumptions

### Repo snapshot (`chumpuckai-devteam/needle-point-project`, private)

| Item | Status |
|------|--------|
| PRD | `PRD.md` — full product thesis, flows, data model, metrics |
| UI | `src/App.tsx` (~872 lines) monolithic SPA: Home, Discover, Journal, Project detail, Profile, Collections, Stitch-along |
| Data | `src/data.ts` — 3 creators, 4 projects, 2 collections, 1 stitch-along (local only) |
| Types | `src/types.ts` — client-shaped models (not full PRD schema) |
| Tests | `tests/mvp-smoke.spec.ts` — one Playwright path |
| Deploy signal | Commit `17f5146` “Trigger Vercel redeploy” |
| Missing | Auth, real multi-user identity, DB persistence, image upload, URL routing, onboarding, reporting, analytics, admin |

### What already works (preserve)

- Craft-specific metadata: canvas, materials, stitches, colors, difficulty, pattern source
- Project journal create + progress updates + comments (session-local)
- Discover filters + keyword search
- Save/like/follow toggles
- Collections view
- Stitch-along join + submit
- Visual system (sidebar, warm craft palette in `src/styles.css`)
- Smoke coverage of core path

### Gaps vs PRD MVP checklist

| PRD item | Today |
|----------|--------|
| Account + profile | Hard-coded “You” as creator `c2` |
| Project CRUD + photos | Create yes; no real upload; no edit/delete; no persist |
| Progress history | Local only; no edit/delete of updates |
| Public discovery + filters | Yes (in-memory) |
| Collections / saves | Single default collection toggle |
| Follows / likes / comments | Local toggles; comments only on latest update |
| Creator profiles + external links | Seeded only |
| Stitch-along | One hard-coded event |
| Reporting / moderation | None |
| Analytics | None |
| Onboarding interests/skill | None |

### Working assumptions (challenge if wrong)

1. **Primary user for next 4–6 weeks:** private beta of hobbyists + a few creators (not public marketplace).
2. **Stay on Vite + Supabase** for first production path; revisit Next.js only if SEO/SSR or complex server workflows become blocking.
3. **Product name in UI stays “Needlepoint / project studio”** until branding decision.
4. **Hosted envs:** Supabase free/pro project + existing Vercel project for static SPA.
5. **You (Samir) will provide** Supabase project URL + anon key (and service role only for seed scripts, never in client).

---

## Proposed approach (phased)

```
Phase 0  Foundation (routing, structure, local persist)     ~ small, low risk
Phase 1  Backend + auth + seed                              critical path
Phase 2  Projects + updates + images                        core utility
Phase 3  Social graph (follow/like/comment/collections)     density
Phase 4  Stitch-along + creator polish + onboarding         PRD completeness
Phase 5  Beta hardening (moderation, analytics, QA)         launch readiness
```

Each phase ends with: `npm run lint`, `npm run build`, extended Playwright, and a git commit (push only when you approve).

---

## Phase 0 — App foundation (no backend yet)

**Objective:** Make the SPA maintainable and shareable before wiring a database.

### Task 0.1 — Project structure + React Router

**Files:**
- Create: `src/pages/HomePage.tsx`, `DiscoverPage.tsx`, `JournalPage.tsx`, `ProjectPage.tsx`, `ProfilePage.tsx`, `CollectionsPage.tsx`, `StitchAlongPage.tsx`
- Create: `src/components/{Sidebar,ProjectCard,EmptyState,SectionHeader,...}.tsx` (split from `App.tsx`)
- Create: `src/hooks/useAppState.ts` (state + actions extracted)
- Create: `src/lib/routing.ts` (path helpers)
- Modify: `src/App.tsx` → router shell only
- Modify: `src/main.tsx` → wrap `BrowserRouter`
- Modify: `package.json` — add `react-router-dom`
- Test: update `tests/mvp-smoke.spec.ts` to use paths/nav links

**Routes:**

| Path | Page |
|------|------|
| `/` | Home |
| `/discover` | Discover |
| `/journal` | New project + my projects |
| `/projects/:id` | Project detail |
| `/u/:handle` | Profile |
| `/collections` | Saved boards |
| `/stitch-alongs/:id` (or `/stitch-along` for MVP single) | Stitch-along |

**Steps:**
1. Install `react-router-dom`.
2. Extract presentational components without behavior changes.
3. Replace `view` state with routes; preserve all existing interactions.
4. Update smoke test selectors if nav becomes `<Link>`.
5. Verify: `npm run build` + smoke.

**Commit:** `refactor: split App into routed pages and components`

### Task 0.2 — Local persistence bridge

**Files:**
- Create: `src/lib/storage.ts` (`loadState` / `saveState` to `localStorage`)
- Modify: state hook to hydrate + persist projects, collections, follows, stitch-along join

**Why:** Zero backend still feels “sticky” during demo; later swap storage adapter for Supabase.

**Commit:** `feat: persist MVP state to localStorage`

### Task 0.3 — README + env template

**Files:**
- Modify: `README.md` — architecture diagram, scripts, phase status
- Create: `.env.example` (empty Supabase placeholders for Phase 1)

**Commit:** `docs: document current architecture and next phases`

---

## Phase 1 — Supabase backend, schema, auth

**Objective:** Real users and a PRD-aligned database with RLS.

### Task 1.1 — Supabase project wiring

**Files:**
- Create: `src/lib/supabase.ts` (browser client from `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- Create: `supabase/migrations/20260715_0001_init.sql`
- Create: `supabase/seed.sql` (migrate current `data.ts` content)
- Create: `scripts/seed.mjs` (optional service-role seeder)
- Modify: `.env.example`, `README.md`

**Schema (map from PRD; SQL types):**

```sql
-- core
profiles (id uuid PK = auth.users.id, name, handle unique, email, avatar_url,
          bio, skill_level, is_creator, location, created_at, updated_at)
profile_links (id, profile_id, label, url, sort_order)
profile_interests (profile_id, interest)  -- onboarding

projects (id, user_id, title, description, status, visibility, difficulty,
          pattern_source_name, pattern_source_url, primary_image_url,
          category, canvas_type, progress int, created_at, updated_at)
project_updates (id, project_id, user_id, body, milestone, created_at, updated_at)
project_update_images (id, update_id, url, sort_order)
materials (id, project_id, type, brand, color_name, color_code, notes)
tags (id, name, category)  -- category: stitch|color|theme|...
project_tags (project_id, tag_id)

collections (id, user_id, name, description, visibility, created_at, updated_at)
collection_items (collection_id, project_id, saved_at)

follows (follower_id, following_id, created_at, PK(follower_id, following_id))
reactions (id, user_id, target_type, target_id, reaction_type, unique(user,target,type))
comments (id, user_id, target_type, target_id, body, created_at, updated_at)

stitch_alongs (id, host_user_id, title, description, rules jsonb/text[],
               start_date, end_date, cover_image_url, status, created_at, updated_at)
stitch_along_submissions (stitch_along_id, project_id, user_id, submitted_at,
                          PK(stitch_along_id, project_id))

reports (id, reporter_id, target_type, target_id, reason, status, created_at)
```

**RLS principles:**
- Public can `SELECT` public projects + public profiles.
- Only owner can `INSERT/UPDATE/DELETE` own projects/updates/materials.
- Private projects only visible to owner.
- Reactions/comments/follows require auth; writes only as `auth.uid()`.
- Storage bucket `project-images`: public read, authenticated write to `user_id/` prefix.

**Commit:** `feat: add Supabase schema, client, and seed scaffolding`

### Task 1.2 — Auth UI + session

**Files:**
- Create: `src/pages/AuthPage.tsx` (email magic link or email+password — prefer magic link for craft audience)
- Create: `src/components/AuthGate.tsx`, `src/hooks/useSession.ts`
- Create: `src/pages/OnboardingPage.tsx` (interests + skill level; skippable)
- Modify: Sidebar — show signed-in profile / Sign in
- Test: Playwright auth can use test user or mocked session helper

**Acceptance (PRD Flow 1, partial):**
- Sign up / sign in under ~2 minutes
- Optional onboarding skippable
- Session survives refresh

**Commit:** `feat: add Supabase auth and onboarding shell`

### Task 1.3 — Profile model in app

**Files:**
- Create: `src/types/db.ts` (DB-aligned types) + mappers to UI types if needed
- Create: `src/api/profiles.ts`
- Modify: Profile page — load by handle from DB; edit-own-profile form (name, bio, skill, links, creator flag)

**Commit:** `feat: load and edit profiles from Supabase`

---

## Phase 2 — Projects, updates, images (core utility)

**Objective:** The wedge: project journal that persists.

### Task 2.1 — Project repository + list/detail

**Files:**
- Create: `src/api/projects.ts` (`listPublic`, `getById`, `listByUser`, `create`, `update`, `soft constraints`)
- Modify: Home / Discover / Project pages to fetch instead of seed state
- Keep filters client-side first; move to query params + server filters if slow

**Commit:** `feat: wire project list and detail to Supabase`

### Task 2.2 — Create / edit project journal

**Files:**
- Modify: `JournalPage` — create against API; require title + (image OR notes) per PRD
- Create: edit project route or modal for owner
- Status enum: `planned | in_progress | finished | paused` (normalize hyphen/space)
- Visibility: public/private enforced by RLS

**Commit:** `feat: create and edit projects with craft metadata`

### Task 2.3 — Image upload

**Files:**
- Create: `src/api/storage.ts` (upload to `project-images/{userId}/{uuid}`)
- Modify: journal + progress update forms — file input + preview; fall back to URL optional
- Constraints: image types, max size (~5–8MB), basic client validation

**Commit:** `feat: upload project images to Supabase Storage`

### Task 2.4 — Progress updates

**Files:**
- Create: `src/api/updates.ts`
- Modify: Project detail — chronological updates; owner add/edit/delete; progress recompute (manual % or status-based for MVP)

**Commit:** `feat: persistent project progress updates`

---

## Phase 3 — Social density

**Objective:** Follow, like, comment, collections — still craft-grounded.

### Task 3.1 — Reactions + comments

**Files:**
- Create: `src/api/social.ts`
- Target types: `project`, `project_update`
- UI: like toggles optimistic; comments on updates (not only latest)

**Commit:** `feat: likes and comments persisted per project update`

### Task 3.2 — Follows + home feed

**Files:**
- Follow profiles via `follows` table
- Home feed: updates from followed users first, then recommended public projects
- Metric cards driven by real counts for current user

**Commit:** `feat: follows and personalized home feed`

### Task 3.3 — Collections

**Files:**
- Default “Saved” collection auto-created on first save
- Allow create/rename collection (MVP: 1–N simple boards)
- Save button adds/removes `collection_items`

**Commit:** `feat: multi-collection saves`

---

## Phase 4 — Stitch-along, creators, onboarding completeness

### Task 4.1 — Stitch-along feature

**Files:**
- `src/api/stitchAlongs.ts`
- Seed one flagship SAL (migrate July Bookshop theme or update dates)
- Join + submit eligible public projects; participant grid; host profile link
- Admin/host: for MVP, seed host only; optional simple “create SAL” later

**Commit:** `feat: multi-user stitch-along join and submit`

### Task 4.2 — Creator discovery surface

**Files:**
- Discover page section: featured creators (`is_creator = true`)
- Profile: external links clickable; optional `link_clicks` table later for monetization analytics
- Track outbound clicks with a simple event table or PostHog in Phase 5

**Commit:** `feat: creator discovery and profile link polish`

### Task 4.3 — Onboarding feed relevance

**Files:**
- Store interests on profile
- Seed/recommend projects tagged with matching categories/colors/themes
- Empty-state copy that drives first project creation (activation)

**Commit:** `feat: interest-based starter feed after onboarding`

---

## Phase 5 — Beta hardening

### Task 5.1 — Reporting + minimal admin

**Files:**
- Report button on project/update/profile
- `reports` table + simple admin view (protected by `profiles.role = 'admin'` or allowlist email)

**Commit:** `feat: user reporting and basic admin queue`

### Task 5.2 — Analytics

- PostHog (or Vercel Analytics + custom events): signup, first project, first follow, SAL join, save
- Document event names in `docs/analytics.md`

**Commit:** `feat: product analytics events for activation metrics`

### Task 5.3 — Test suite expansion

**Files:**
- Expand Playwright: auth happy path (test user), create project with image mock, save, follow, SAL
- Add a few unit tests for pure helpers (filter, mappers) if vitest added — optional

**Commit:** `test: expand MVP e2e coverage`

### Task 5.4 — Performance / UX polish

- Loading/empty/error states on all data views
- Mobile sidebar (drawer) — PRD is web-first but stitchers use phones
- Image lazy-loading, sensible alt text
- Accessibility pass on forms and nav

**Commit:** `fix: mobile nav, loading states, a11y basics`

---

## Suggested implementation order (first sprint after approval)

If you want **one focused next PR** before the full multi-phase program:

1. **Phase 0** (routing + split `App.tsx` + localStorage) — ship quality, no secrets needed  
2. **Phase 1.1–1.2** once Supabase credentials exist  
3. **Phase 2** projects + images (utility wedge)  
4. Then social + SAL

Do **not** start marketplace, payments, or Next.js migration in parallel.

---

## Files likely to change (near-term)

| Path | Role |
|------|------|
| `src/App.tsx` | Shrink to router layout |
| `src/pages/*` | Route-level screens |
| `src/components/*` | Shared UI |
| `src/api/*` | Supabase repositories |
| `src/lib/supabase.ts` | Client |
| `src/types.ts` / `src/types/db.ts` | Align with schema |
| `src/data.ts` | Become seed source only, then remove from runtime |
| `src/styles.css` | Split later if needed; keep tokens |
| `tests/mvp-smoke.spec.ts` | Path-aware e2e |
| `supabase/migrations/*` | Schema |
| `package.json` | router, supabase deps |
| `README.md`, `.env.example` | Ops docs |
| `PRD.md` | Leave as product source of truth; optional status section |

---

## Tests / validation (every phase)

```bash
npm install
npm run lint
npm run build
npm run test:smoke
```

Manual checklist:
- [ ] Create project with craft tags and photo
- [ ] Add progress update; appears on project timeline
- [ ] Discover filter by stitch/difficulty/status
- [ ] Save to collection; appears under Saved
- [ ] Follow creator; see in home followed rail
- [ ] Join stitch-along; submit project
- [ ] Sign out / sign in; data still present (post–Phase 1)
- [ ] Private project not visible to other users (post–Phase 1 RLS)

---

## Risks, tradeoffs, open questions

### Risks
- **Cold start:** Need seeded content (keep high-quality demo projects in seed).
- **Supabase RLS bugs:** Wrong policies either leak private data or block writes — add policy tests / manual matrix.
- **Image rights:** Pattern photos may be copyrighted — reporting + clear “own work / fair use” guidance.
- **Monolith regression during split:** Phase 0 must keep smoke green.
- **Next.js PRD vs Vite:** Divergence from PRD “Recommended Tech Stack” is intentional for speed; document decision in README.

### Tradeoffs
| Choice | Pro | Con |
|--------|-----|-----|
| Vite + Supabase | Fast, reuses UI | Less SSR/SEO than Next |
| Magic link auth | Low friction | Email deliverability setup |
| Client filters first | Simple | May not scale past ~1k projects |
| Single default collection first | Ship faster | Multi-board later |

### Open questions for Samir (approve + answer)

1. **Backend:** Approve **Supabase + Vite** for beta, or insist on **Next.js + Prisma + Postgres** rewrite now?
2. **Auth method:** Magic link vs email/password vs Google OAuth?
3. **Branding:** Final product name / domain?
4. **Supabase:** Do you already have a project, or should the plan include “create Supabase project” steps with screenshots?
5. **Beta audience:** Needlepoint-only confirmed? Any adjacent canvaswork in v1?
6. **Priority after Phase 0:** Utility (projects/images) first, or social (follows/comments) first? *(Recommendation: utility first.)*
7. **Vercel:** Confirm project is already linked; any custom domain?

---

## Success criteria for “MVP complete” (this plan)

Matches PRD “First Release Checklist” with pragmatic beta bar:

- [ ] Auth + profile setup (incl. creator links)
- [ ] Project CRUD + image upload
- [ ] Progress updates history
- [ ] Public discovery + filters
- [ ] Collections / saves
- [ ] Follows, likes, comments
- [ ] One live stitch-along
- [ ] Basic reporting
- [ ] Analytics events for activation
- [ ] Seeded content so Discover never looks empty
- [ ] Smoke + extended e2e green on CI (GitHub Actions optional add-on)

---

## Execution handoff

After approval:

1. Confirm answers to open questions (especially backend + auth).
2. Execute **Phase 0** immediately (no credentials required).
3. On Supabase credentials, continue **Phase 1 → 2** as the first real multi-user vertical slice.
4. Prefer frequent commits; open PRs per phase if you want review gates on GitHub.

**Plan status:** Ready for Samir’s approval. No application code was changed in this planning pass (plan file only under `.hermes/plans/`).
