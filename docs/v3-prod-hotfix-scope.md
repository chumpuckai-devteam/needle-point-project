# V3 prod hotfix scope — Samir go/no-go gate

Date: 2026-07-19
Source inventory: `dogfood-output/v3-prod-bugs/bug-inventory.md`
Status: proposed; blocked until Samir explicitly says GO or NO-GO

## Product decision needed

Recommendation: GO on a minimal P1-only hotfix wave before returning to feature work.

Why: prod is up, but the V3 shop connection loop is not trustworthy on production. Live data exists for project-store links and unclaimed shops, but the shipped UI currently hides the core beta proof points: project ↔ store merchandising and signed-in shop claim entry.

## Hotfix wave H1 — in scope

### H1.1 Project ↔ store hydration on production
Priority: P1
Owner lane: frontend-dev
Bug source: P1-1 / PROJECT-HYDRATION

What ships
- Ensure online projects hydrate with current `storeIds` after remote project and store ids are available.
- Prevent stale demo/localStorage project ids from poisoning online navigation/hydration when Supabase is configured.
- Preserve offline/demo behavior without expanding feature scope.

Acceptance criteria
- Fresh production-like browser profile: `/stores/canopycanvas` renders non-empty "Projects available here" using live `project_stores` rows.
- `/stores/threadandtonic` and `/stores/bookshopwindows` render their tagged projects when links exist, not the false empty "No projects have tagged this store yet" state.
- `/projects/e36a3046-812f-469c-9331-330336099ccb` renders "Available at" store chips for Bookshop Door Canvas.
- The same project page renders "Shop the look" product cards sourced from tagged stores' catalogs.
- Cold Discover → project click lands on a UUID project route and does not show `/projects/p*` or hard "Project not found" from stale demo ids.
- Desktop and 390×844 mobile both pass the same functional assertions; mobile can have minor visual polish deferred if no overflow/regression.
- Regression checks: Studio feed, Discover, stores list, store catalog cards, auth routes, and SPA deep links still load.

Rollout / risk notes
- This is expected to be frontend-only if the existing `project_stores` REST data remains readable.
- Retest against a production-like build, not only Vite dev, because the bug is in prod boot ordering.
- If localStorage cleanup is changed, confirm demo/offline mode still shows seed projects.

### H1.2 Signed-in claim CTA for unowned shops
Priority: P1
Owner lane: frontend-dev with backend-dev validation
Bug source: P1-2 / CLAIM-CTA

What ships
- Signed-in non-owner users can see the claim entry point on unowned shops in online mode.
- Guest users are not allowed to mutate claim/ownership and should be routed to sign in if a claim entry is shown.
- Existing owner behavior remains scoped: owner tools only for the current owner; non-owners do not see owner CRUD.

Acceptance criteria
- Signed-out guest on `/stores/threadandtonic` or `/stores/bookshopwindows`: no direct ownership mutation is possible; claim either hidden or routes to sign-in with clear copy.
- Signed-in non-owner on `/stores/threadandtonic`: sees a "Claim this shop" / equivalent claim CTA because the shop has no `owner_user_id`.
- Signed-in non-owner on `/stores/bookshopwindows`: sees the same claim CTA because the shop has no `owner_user_id`.
- Signed-in non-owner on owned `/stores/canopycanvas`: does not see claim CTA, "Your shop", or owner product controls.
- Canopy owner (`samirsview`) on `/stores/canopycanvas`: sees owner state/tools; does not see Follow/claim for own shop.
- If QA exercises the claim mutation, it uses a disposable account/store or documented cleanup SQL; do not corrupt shared beta seed ownership.
- Backend-dev confirms current RLS/RPC/data path either supports the intended beta claim behavior or explicitly marks implementation no-go until safe claim request handling is present.

Rollout / risk notes
- Keep this as claim entry restoration, not the full moderated owner verification epic.
- Do not expand into automated document verification, multi-owner roles, public admin tooling, marketplace, checkout, or payments.
- The main production risk is accidental ownership mutation on beta seed stores; QA must use a cleanup plan before clicking through mutation flows.

### H1.3 Release checkpoint and deploy hygiene
Priority: P1 process gate
Owner lane: tech lead / devops-engineer, with QA release note
Bug source: P1-3 / PROD-LOCAL divergence

What ships
- A clean hotfix checkpoint that identifies exactly which git SHA / Vercel deployment contains H1.1 and H1.2.
- No claims that V3 is green until production serves the fixed bundle and QA has retested the original repros.

Acceptance criteria
- Working tree changes included in hotfix are isolated from unrelated feature backlog where possible.
- `npm run lint` and `npm run build` pass before deploy handoff.
- QA runs the H1 acceptance suite against production-like build/staging and records pass/fail before prod deploy.
- DevOps deploy note includes version/SHA, deployment time, checks run, and rollback path.
- Post-deploy smoke confirms prod no longer serves the failing asset baseline (`index-C4be41jh.js`) for the tested routes.

Rollout / risk notes
- This is a release-management gate, not a product feature.
- If unrelated dirty-tree work cannot be separated quickly, Tech Lead should decide whether to ship the already-bundled local fixes or pause for branch hygiene.

## Explicitly out of scope for this hotfix

Defer to later epics unless Samir expands scope:
- P2-2 guest journal up-front auth gate.
- P2-3 stronger signup empty-submit validation.
- P2-4 duplicate "Ships nationwide" copy on online-only stores.
- P2-5 follow return-to-store continuation after auth.
- P2-6 mobile bottom-nav/content visual polish beyond no-regression checks.
- Full verified shop claim request lifecycle, admin dashboard, owner transfer UX, or document/domain verification.
- Owner catalog/profile CRUD feature expansion beyond regression smoke for existing owner paths.
- Collections, reports, stitch-alongs, private projects, creator analytics, local-discovery expansion, native apps, marketplace checkout, cart, Stripe, payouts, inventory, tax, shipping, or DMs.

## Recommended implementation order

1. Frontend-dev: ship H1.1 hydration/localStorage fix and H1.2 claim CTA condition together as one tight UI/data boot hotfix.
2. Backend-dev: validate claim data path/RLS; only patch backend if H1.2 cannot be safely exercised in online mode.
3. QA: rerun original P1 repros plus core V3 smoke on a production-like build.
4. DevOps: deploy after QA release-readiness GO, then smoke prod and record SHA/deploy note.

## Samir decision prompt

Please choose one:
- GO: promote Epic H hotfixes ahead of feature work with H1 scope exactly as above.
- GO, expanded: promote hotfixes and add specific P2 items Samir names.
- NO-GO: keep feature work priority and leave prod V3 known-red until later.
