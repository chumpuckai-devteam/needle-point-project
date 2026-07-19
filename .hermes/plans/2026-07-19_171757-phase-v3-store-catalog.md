# Needlepoint Phase V3 — Store Catalog + Connection

> **For Hermes:** Tech Lead orchestrates via role profiles + kanban board `needlepoint`. Do **not** implement until Samir approves. After approval: decompose/assign, wait for workers, integrate, then deploy only on request.

**Goal:** Close the store loop so stitchers can see shoppable catalog cards, “Shop the look” on projects, follow stores, and reliably tag **Available at** — still **no checkout/marketplace**.

**Architecture:** Stay Vite + React + Supabase dual-mode. Extend existing `stores` / `store_products` / `project_stores`. Add `store_follows`. Seed richer catalog + project↔store links. UI polish on Moss & Flax.

**Tech stack:** React 19, Vite 6, TypeScript, Supabase JS, existing CSS design system, Playwright smoke.

**Prod:** https://needle-point-project.vercel.app  
**Repo:** `/opt/data/workspace/needle-point-project` (branch `main`, clean)  
**Kanban board:** `needlepoint` (workdir = repo)

---

## Current state (reviewed 2026-07-19)

### Shipped (keep)
| Area | Status |
|------|--------|
| Dual-mode Vite + Supabase | Live |
| Auth `/auth` + `/auth/signup` separate screens | Live |
| Craft Studio feed (unique vs X) | Live |
| Moss & Flax palette | Live |
| Journal photos, edit project, progress updates | Live |
| Stores list + detail routes (`/stores`, `/stores/:handle`) | Live |
| `store_products` table + read path in API | Live (UI shows catalog when data exists) |
| Available at picker on journal/edit | Live |
| Proximity rank (60mi) + top online fallback | Live |
| Demo stores (3) with lat/lng on 2 | Live |

### Gaps for V3
| Gap | Evidence |
|-----|----------|
| Catalog almost empty | DB: only **1** `store_products` row (Canopy Canvas); 0/0 on other stores |
| No project↔store tags in prod data | `project_stores` **0** rows → store detail empty “Projects available here” |
| No store follows | Only creator `follows`; no `store_follows` table/UI |
| No “Shop the look” on project detail | Available at meta exists; no product cards from tagged stores |
| No product CRUD for owners | Read-only seed catalog; no owner form |
| Loose store write RLS | `stores_owner_write` allows any authenticated user (`or auth.uid() is not null`) — security debt |
| README lag | Still describes early MVP; missing Studio/stores/proximity |

### Explicit non-goals (this sprint)
- Cart, checkout, Stripe, inventory, shipping rates
- Claim-store verification flow (V4+)
- Map UI (coords already used for ranking)
- Marketplace multi-vendor payouts

---

## Proposed approach

```
product-analyst  → acceptance criteria lock (optional, short)
backend-dev      → store_follows migration + seed products/links + tighten RLS
security-dev     → review store RLS + write policies
frontend-dev     → Shop the look, follow store, richer catalog UX, demo parity
mobile-engineer  → phone check catalog + project store sections
qa-engineer      → dogfood prod/local smoke matrix
devops-engineer  → Vercel deploy after green gate (on Samir request)
```

Orchestrator (default/Toad) owns plan, kanban, integration commits if workers use worktrees, Discord thread updates.

---

## Step-by-step plan

### Task 0 — Product lock (product-analyst) — optional if Samir OK’s this plan as-is

**Objective:** Confirm V3 acceptance criteria in one short brief.

**Acceptance (proposed):**
1. Each seeded store shows ≥2 catalog products with name, image, price label, external link-out.
2. ≥2 public projects tagged Available at ≥1 store; store detail shows those projects.
3. Project detail shows **Shop the look**: products from tagged stores (link-out only).
4. Signed-in user can **Follow / Unfollow** a store; count or button state persists (Supabase + demo localStorage).
5. Available at on create/edit still works and persists via `project_stores`.
6. No checkout UI; marketplace language avoided.
7. Lint + build + smoke green; mobile not broken on store/project pages.

**Deliverable:** Comment on kanban parent task or update this plan’s acceptance section only if criteria change.

---

### Task 1 — Backend: store_follows + seed + RLS harden (backend-dev)

**Objective:** Data layer for follows; rich demo catalog; safer writes.

**Files:**
- Create: `supabase/migrations/20260719180000_store_follows_and_seed.sql`
- Modify: `src/api/stores.ts` — follow helpers, ensure products always mapped
- Modify: `src/data.ts` — demo-mode products + storeIds on sample projects + followedStores
- Modify: `src/types.ts` — `followerCount?`, `isFollowed?` on Store if needed

**Migration contents (intent):**
1. `store_follows (follower_id uuid references profiles, store_id uuid references stores, created_at, PK(follower_id, store_id))`
2. RLS: public can count/select follows as needed; insert/delete only `auth.uid() = follower_id`
3. Tighten `stores` / `store_products` write policies:
   - Prefer: owner_user_id = auth.uid() for updates/deletes
   - Inserts: authenticated may insert store only if owner_user_id = auth.uid() (or keep service-role seed only)
   - **Do not** leave `or auth.uid() is not null` on write-all
4. Seed 2–4 products per store (link-out URLs can be placeholder shop pages)
5. Seed `project_stores` linking existing public projects to relevant stores

**API additions:**
```ts
toggleStoreFollowOnline(userId, storeId, currentlyFollowing)
fetchFollowedStoreIds(userId): Promise<string[]>
// optionally include follower_count in fetchStores via count query
```

**Validation:**
- Apply migration via Supabase MCP `apply_migration`
- SQL checks: product_count ≥ 2 per store; project_stores > 0
- Run security advisors after policy change

**Commit:** `feat: store follows, catalog seed, harden store RLS`

---

### Task 2 — Security review (security-dev)

**Objective:** Confirm store/follow RLS least privilege; no secret leaks.

**Steps:**
1. Review new migration policies
2. `mcp__supabase__get_advisors` security
3. Matrix: anon read stores/products OK; anon cannot write follows; user A cannot delete user B follow; non-owner cannot edit store_products of another owner
4. File findings as kanban comment; file tiny fix PR only if critical

**Commit (if fixes):** `fix(security): tighten store product write policies`

---

### Task 3 — Frontend: Shop the look + follow + catalog polish (frontend-dev)

**Objective:** Complete connection UX on Moss & Flax.

**Files:**
- Modify: `src/AppComponents.tsx` — Project detail “Shop the look”; Store detail Follow button; empty states
- Modify: `src/App.tsx` — wire followedStores state (localStorage key + online hydrate/toggle)
- Modify: `src/styles.css` — product strip on project, follow button states, contrast on dark/light
- Modify: `src/lib/storage.ts` if storage shape expands
- Touch: journal Available at only if broken

**UI notes (Samir prefs):**
- Craft language (“Studio”, stitch-forward), not generic X clone
- High contrast form/control text
- Link-out products: external icon + “Shop” / price label — no cart
- Follow button mirrors creator follow patterns

**Demo mode:** full parity without Supabase env.

**Validation:** `npm run lint && npm run build`

**Commit:** `feat: shop the look and follow stores`

---

### Task 4 — Mobile pass (mobile-engineer)

**Objective:** Phone-usable store catalog + project shop strip + follow CTA.

**Focus:**
- Product grid not overflowing
- Follow + Visit website action row wraps cleanly
- Bottom nav not covering CTAs
- Touch targets ≥44px

**Commit (if needed):** `fix(mobile): store and shop-the-look layout`

---

### Task 5 — QA dogfood (qa-engineer)

**Objective:** Evidence-based release gate.

**Matrix:**
| # | Path | Expected |
|---|------|----------|
| 1 | `/stores` | 3 stores; proximity sections if geo allowed |
| 2 | Store detail | Catalog ≥2; projects section if tagged |
| 3 | Project detail | Shop the look when tagged |
| 4 | Follow store (signed in) | Toggle persists refresh |
| 5 | Journal Available at | Tag store; appears on store page |
| 6 | Auth screens | Separate sign-in/signup; footer switch |
| 7 | Demo mode (no env) | Same flows offline |
| 8 | Mobile viewport | No horizontal scroll critical paths |

**Deliverable:** Bug list with severity; block deploy on P0/P1.

---

### Task 6 — Deploy (devops-engineer) — only after Samir + QA green

**Objective:** Ship to Vercel prod with existing project wiring.

**Notes:**
- Team `team_VrjFH9IZfQwVEmF7PrEEx9RJ`, project `prj_Q5u4Lq13A2kgdHAMsruditowSahb`
- Prod URL https://needle-point-project.vercel.app
- Ensure `VITE_SUPABASE_*` present; forceNew deploy if cache stale
- Do not commit secrets

**Commit:** none required if already on main; otherwise merge then deploy.

---

### Task 7 — Docs touch (orchestrator or frontend)

**Files:** `README.md` — Studio feed, stores, proximity, dual-mode, Phase V3 status  
**Optional:** mark V3 done in `.hermes/plans/2026-07-16_visual-social-stores.md`

---

## Files likely to change

| Path | Role |
|------|------|
| `supabase/migrations/20260719180000_store_follows_and_seed.sql` | follows + seed + RLS |
| `src/api/stores.ts` | follow + product helpers |
| `src/types.ts` | store follow fields |
| `src/data.ts` | demo products / tags / follows |
| `src/App.tsx` | state wiring |
| `src/AppComponents.tsx` | Shop the look, Follow UI |
| `src/styles.css` | layout/contrast |
| `src/lib/storage.ts` | followedStores persistence |
| `README.md` | status |
| `tests/mvp-smoke.spec.ts` | optional path if selectors break |

---

## Tests / validation

```bash
cd /opt/data/workspace/needle-point-project
npm run lint
npm run build
npm run test:smoke
```

Manual: matrix in Task 5 against prod after deploy.

Supabase:
- advisors security
- SQL row counts for products / project_stores / store_follows

---

## Risks, tradeoffs, open questions

### Risks
- Tightening RLS may break owner-less seed stores if client tried to write products as any auth user — seed should be migration/service only.
- Empty Shop the look until project_stores seeded — seed is mandatory in Task 1.
- Geo permission denial already handled by online fallback; don’t regress.

### Tradeoffs
| Choice | Why |
|--------|-----|
| Seed-owned catalog vs full owner CRUD UI | Ship connection loop faster; owner CRUD can be V3.1 if needed |
| store_follows table vs polymorphic follows | Clearer RLS and queries for stores |
| Link-out only | Stays out of marketplace scope |

### Decisions (Samir 2026-07-19)
1. **Owner product CRUD:** **Out of scope this sprint.** Plain English: we are **not** building a form for shop owners to add/edit products themselves yet. We **pre-load** demo products in the database and show them in the app. Owner self-serve catalog editing = later if needed.
2. **Follow stores require auth:** **YES.** Guests see catalog; Follow prompts sign-in.
3. **Deploy after V3:** **AUTO** after QA green (no second “deploy” ping required).

---

## Success criteria (MVP V3 done)

- [ ] ≥2 products per demo store in Supabase + demo mode
- [ ] project_stores links show on store pages
- [ ] Project detail Shop the look with external product links
- [ ] Follow/unfollow store persists for signed-in users
- [ ] Available at create/edit still works
- [ ] Store write RLS least-privilege (no open auth write-all)
- [ ] lint/build/smoke green
- [ ] QA matrix no open P0/P1
- [ ] README reflects current product

---

## Execution handoff (after approval)

1. Promote kanban tasks from triage → assign roles with `--workspace dir:/opt/data/workspace/needle-point-project` (or worktrees if parallel).
2. Order: backend → security (can overlap review) → frontend → mobile → qa → devops.
3. Tech Lead integrates, reports in this Discord thread with URLs + what to screenshot.
4. No deploy until explicit Samir approval.

**Plan status:** Ready for Samir’s approval. Board `needlepoint` seeded with parent + child tasks in triage. No application code changed in this planning pass.
