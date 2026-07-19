# Epic P — Product density PRD gaps (six themes)

Date: 2026-07-19  
Audience: Tech Lead, backend-dev, frontend-dev, qa-engineer  
Status: implementable product spec  
Parent: Epic P · Product density (collections, reporting, stitch-along depth, onboarding relevance, private projects, creator link tracking)

## Goal

Close the highest-leverage PRD gaps that make Needlepoint feel complete as a craft utility — not a thin social shell — without marketplace checkout, DMs, or greenfield redesigns.

Each theme below ships a **thin vertical slice** that is already half-present in schema, seed, or UI, and measurably increases product density (completeness / usefulness).

## Product thesis reminder

- Craft Studio journal + discovery + shops + link-outs.
- Marketplace/checkout, cart, Stripe, DMs, native apps: **out of scope**.
- Prefer iterative slices Samir can dogfood on mobile screenshots.
- Related shipped/spec’d work to reuse, not rewrite:
  - `docs/interest-ranked-feed.md` (onboarding ranking rules)
  - `docs/outbound-click-events.md` (shop/store outbound analytics contract)
  - `docs/epic-b-shop-connection-spec.md` (shop trust loop; B5 shop clicks)

---

## Current inventory (code vs PRD)

| Theme | PRD intent | What exists today | Gap |
| --- | --- | --- | --- |
| **P1 Collections** | Multi boards; save from Discover; profile collections | Demo multi-board localStorage; online save only hits first `Saved` via `toggleSaveOnline`; `/collections` is read-only; tables `collections` + `collection_items` exist; signup seeds one `Saved` row | No multi-board CRUD API/UI online; no default-collection guard; no move/remove board UX |
| **P2 Reporting** | Basic report + admin review | `reports` queue + `submit_report` RPC + `src/api/reports.ts` | No report UI entry points; no user confirmation states; no lightweight moderator surface |
| **P3 Stitch-along depth** | Multi SAL, host, join, submit, dates, participant count | Single hard-coded `stitchAlong` seed + localStorage; schema tables exist; UI is one-page join/submit | No multi-row online API; no host create; no list/detail routes; no public/private flag |
| **P4 Onboarding relevance** | Interests → personalized home/discover | `/onboarding` chips + `profile_interests` + skill; ranking **spec already written** | Discover/Studio still unranked / not interest-biased; no dismiss table |
| **P5 Private projects** | Public vs private journal; private stays off discovery | `visibility` on create/edit; project RLS; nested RLS migration; demo private `p5` | Client still treats all loaded projects as feed-eligible in places; owner “my private” journal path incomplete; SAL/collections/shop-link edge cases need product rules |
| **P6 Creator link tracking** | Trackable creator external links | `profile_links` CRUD; profile link strip UI; shop outbound events exist | No `creator_link_click` (or pattern-source) events; profile/pattern links fire zero analytics |

Contract tests already encode several intended contracts (and currently fail until implemented):

- `tests/collections-contract.test.mjs`
- `tests/reports-backend-contract.test.mjs`
- `tests/stitch-alongs-backend-contract.spec.ts`
- `tests/private-project-rls-contract.test.mjs`
- `tests/outbound-click-events-contract.test.mjs` (shop/store only; extend carefully for P6)

---

## Cross-theme dependencies

```
P5 private projects ──► P1 collections visibility of saved items
                     ├─► P3 stitch-along submissions (public projects only)
                     └─► Discover / Studio / profile grids / shop project tags

P4 onboarding interests ──► Discover + Studio ranking (see interest-ranked-feed.md)
                         └─► optional SAL recommendations later (out of P0)

P6 creator links ──► reuse no-PII outbound pattern from B5 / outbound-click-events.md
                  └─► distinct event_name + target shape (profile_link / pattern_source)

P2 reporting ──► targets project | profile | store (already in enum)
              └─► private projects: reporters can only report content they can see
```

Implementation order for least thrash:

1. **P5** private visibility rules (backend truth)  
2. **P1** collections (depends on private item visibility)  
3. **P2** reporting UI on top of existing RPC  
4. **P4** interest ranking (spec locked; independent of P1/P2)  
5. **P6** creator link clicks (extend analytics; after or parallel to B5 shop clicks)  
6. **P3** multi stitch-along (heavier UI; after private rules so submissions stay public-only)

P0 sprint recommendation (thin vertical slices only):

| Priority | Slice | Why first |
| --- | --- | --- |
| **P0** | P5 private project truth + owner journal | Trust + PRD Flow 2 completeness |
| **P0** | P1 multi-collections online | Highest daily-use density vs peers (Pinterest boards / Ravelry favorites) |
| **P0** | P2 report entry UI | Beta trust; backend already ready |
| **P0** | P4 interest-ranked Discover/Studio | Spec done; activation metric |
| **P1** | P6 creator link + pattern-source clicks | Completes PRD “links are trackable” after shop clicks |
| **P1** | P3 multi SAL list/detail + host create | Community anchor; needs more UI than the others |
| **Later** | Public collections, collaborative boards, paid private storage, affiliate payouts, admin full mod console, SAL chat | Explicitly out |

---

# Theme specs

For each theme: user problem → flows → edges → data → API/UI → AC → out of scope.

---

## P1 — Collections (multi-board saves)

### User problem

Stitchers save inspiration into one undifferentiated “Saved” bucket. PRD and peer habits (Pinterest boards, Ravelry favorites/queue) expect named boards (“Holiday finishing”, “Next on bars”). Without multi-board CRUD, saves do not create weekly return density.

### Primary flows

**F1 — Bookmark / unbookmark (default board)**  
1. Signed-in user taps bookmark on Discover, Studio, or project detail.  
2. Project is added to the user’s **default Saved** collection (create default if missing).  
3. `isSaved` becomes true on cards; `/collections` shows the project under Saved.  
4. Tap again removes from default Saved only (other boards keep their copies unless product later adds “remove everywhere”).

**F2 — Create / rename / delete board**  
1. User opens `/collections`.  
2. Creates a board with name (+ optional description).  
3. Can rename any non-system metadata; can delete non-default boards.  
4. Default Saved cannot be deleted (error copy: “Default Saved collection cannot be deleted.”).

**F3 — Save to a specific board**  
1. From project detail (P0) or long-press/menu on card (P1 polish), user chooses “Save to…”.  
2. Picker lists boards; user selects one or more, or creates new.  
3. Project appears in those boards; default bookmark state is true if any board contains it.

**F4 — Move / remove from board**  
1. On a board, user removes a tile → item leaves that board only.  
2. Optional “Move to…” removes from source and adds to target in one action.

### Edge cases

- Guest online: bookmark prompts sign-in (same as store follow). Demo mode keeps localStorage multi-board behavior.  
- Private projects: owner may save own private project into **own private boards** only. Non-owners never receive private project ids via collection item reads (RLS).  
- Public collection visibility: **P0 boards stay private** (default `collections.visibility = private`). Public boards are later.  
- Duplicate add to same board: idempotent upsert, no error toast spam.  
- Deleting a board does not delete projects.  
- Online hydrate: replace demo seed collections when signed-in remote collections load.  
- `isSaved` flag = membership in **any** of the user’s collections (or default only if cheaper — prefer any).

### Data model notes

Existing:

```
collections(id, user_id, name, description, visibility, created_at, updated_at)
collection_items(collection_id, project_id, saved_at)
```

Add for P0:

| Change | Why |
| --- | --- |
| `collections.is_default boolean not null default false` | Identify system Saved board |
| Unique partial index one default per user `where is_default` | Enforce single default |
| `ensure_default_collection(uid)` RPC/trigger | Repair users missing Saved |
| `prevent_default_collection_delete` trigger | Hard-stop deleting Saved |
| Index `collection_items(project_id)` | Saved-state lookups |

Keep `visibility` on collections but **do not build public board UX** in P0.

### API / UI touchpoints

**Backend / `src/api/collections.ts` (new)**  
Contract expected by `tests/collections-contract.test.mjs`:

- `listCollectionsOnline(userId)`
- `createCollectionOnline({ name, description? })`
- `renameCollectionOnline(id, { name, description? })`
- `deleteCollectionOnline(id)` — rejects default
- `addProjectToCollectionOnline(collectionId, projectId)`
- `removeProjectFromCollectionOnline(collectionId, projectId)`
- `moveProjectBetweenCollectionsOnline(fromId, toId, projectId)`
- Uses `ensure_default_collection` when listing/saving

**Adjust**

- `src/api/social.ts` `toggleSaveOnline` → operate on default collection via helper `getDefaultCollectionOnline`
- `src/api/projects.ts` saved-state join should understand `is_default` / any membership
- `src/App.tsx` hydrate collections when `user.id` present; stop treating seed boards as source of truth online
- `CollectionsView`: create/rename/delete; empty states; per-board remove
- Project detail: “Save to…” sheet (minimal list + create)

### Acceptance criteria (P0)

1. New auth user (or ensure RPC) has exactly one default `Saved` collection.  
2. Bookmark toggles membership in default Saved online and updates card `isSaved`.  
3. User can create a second named board and add/remove projects without affecting unrelated boards.  
4. Default Saved cannot be deleted; API returns clear error.  
5. Non-owners cannot read another user’s private boards or private project memberships.  
6. Owner saving a private project into own board does not leak that project id to other users.  
7. Demo mode still supports ≥2 boards via localStorage without Supabase.  
8. Contract tests in `tests/collections-contract.test.mjs` pass; smoke covers bookmark → `/collections` shows item.

### Out of scope (P1 collections)

- Collaborative/shared editing of boards  
- Public board discovery / SEO board pages  
- Drag-and-drop reorder, cover image collage generator  
- Folder nesting, smart/auto boards  
- Paid “unlimited private boards”

---

## P2 — Reporting (user report → queue)

### User problem

PRD launch checklist requires basic reporting and admin review. Without a visible Report action, beta users cannot flag spam, harassment, scam shops, or IP-adjacent abuse — and mods have no intake queue even though the table exists.

### Primary flows

**F1 — Report content**  
1. Signed-in user opens project detail, profile, or store detail.  
2. Opens “Report” control (menu or text button; not buried only in footer).  
3. Chooses reason enum; optional notes (≤1000).  
4. Submits via `submitReportOnline` → RPC `submit_report`.  
5. Sees success: “Thanks — we received your report.”  
6. Duplicate open report on same target: clear error, no second queue row.

**F2 — Auth gate**  
1. Guest taps Report → “Sign in to report” → `/auth` with return path.

**F3 — Moderator read (minimal)**  
1. User with `app_metadata.role` admin/moderator can `fetchReportQueueOnline()`.  
2. P0 may be API/script-only or a tiny internal `/mod/reports` route gated in UI; full case-management UX is later.

### Edge cases

- Rate limit: RPC already blocks >1 report / 30s and ≥5 / 10 minutes — surface friendly copy.  
- Self-report: allowed but low value; no special block required for P0.  
- Private project: only visible to owner — non-owners cannot usefully report what they cannot open; if deep link 404s, no report.  
- Invalid reason / overlong notes: client `validateReportInput` + server checks.  
- Target deleted later: report row remains for audit (no FK required on target_id).  
- Do not store free-text copies of the full project body beyond optional short `target_label` (title/handle, ≤160).

### Data model notes

Already shipped in `supabase/migrations/20260719211000_reports_queue.sql`:

- `report_target_type`: `project | profile | store`
- `report_status`: `queued | open | reviewed | dismissed`
- reasons: `spam | harassment | hate | scam | nudity | self_harm | illegal | other`
- unique open report per (reporter, type, id)
- RLS: insert own queued; select own or admin; admin update; no client delete

No schema change required for P0 UI slice unless product adds `comment` target later (out of scope).

### API / UI touchpoints

**Exists**

- `src/api/reports.ts`: `validateReportInput`, `submitReportOnline`, `fetchReportQueueOnline`
- RPC `submit_report(p_target_type, p_target_id, p_reason, p_notes, p_target_label)`

**Add**

- Shared `ReportDialog` component (reason select, notes, submit, error/success)
- Entry points:
  - `ProjectDetail` — Report project
  - `ProfileView` — Report profile
  - `StoreDetailView` — Report shop
- Wire `target_label` to human title/handle/name for mod skimming
- Optional: “My reports” status list later; not P0

### Acceptance criteria (P0)

1. Signed-in user can file exactly one open/queued report per target via UI.  
2. Guest is sent to auth and can complete report after sign-in.  
3. Client never sends `reporter_id`; DB sets actor from `auth.uid()`.  
4. Duplicate and rate-limit errors show non-technical copy.  
5. Success state does not expose other users’ reports.  
6. Admin/mod JWT can read queue rows; normal users only see own.  
7. `tests/reports-backend-contract.test.mjs` remains green; add UI smoke or component test for dialog open → validate.

### Out of scope (P2)

- Automated image/text moderation ML  
- Report-a-comment / report-a-message (no DMs)  
- Public “trust & safety” marketing site  
- Full admin console with SLA, assignment, bulk actions  
- Legal hold / export workflows

---

## P3 — Stitch-along depth (multi-event community anchor)

### User problem

PRD Flow 5 and launch strategy depend on time-bound stitch-alongs. Today the app has one hard-coded SAL in localStorage, so hosts cannot create events and stitchers cannot browse more than a single banner challenge.

### Primary flows

**F1 — Browse SALs**  
1. User opens `/stitch-along` (list) or home rail “Active stitch-alongs”.  
2. Sees public active (and optionally upcoming) SALs: cover, title, dates, host, participant count.  
3. Opens `/stitch-along/:id` detail.

**F2 — Join + submit**  
1. Signed-in user joins a SAL (`stitch_along_joins`).  
2. Submits one of **their public** projects (`stitch_along_submissions`).  
3. Participant grid shows public submissions only.  
4. Re-submit same project is idempotent.

**F3 — Host create (P0 thin)**  
1. Signed-in user with creator flag **or any authenticated user** (decide: any auth user for beta) creates SAL: title, description, theme, rules[], start/end dates, cover URL/upload optional, `is_public=true`.  
2. Becomes `host_user_id`; can edit/end own SAL.  
3. Seed keeps at least one flagship public SAL for cold start.

### Edge cases

- Private project submit: **blocked** with copy “Only public projects can be submitted.”  
- Ended SAL: join allowed for browsing; submit may be blocked after `end_date` (P0: block submit when `status=ended` or `end_date < today`).  
- Draft/private SAL (`is_public=false`): visible only to host.  
- Demo mode: keep single local SAL behavior if online APIs absent.  
- Participant count: `joins` count and/or distinct submission authors — show joins as primary.  
- Deleting SAL: host soft-end preferred (`status=ended`) over hard delete in P0.

### Data model notes

Existing tables: `stitch_alongs`, `stitch_along_joins`, `stitch_along_submissions`, status enum `draft|active|ended`.

Add for multi-SAL contract:

| Change | Why |
| --- | --- |
| `stitch_alongs.is_public boolean not null default true` | Host-only drafts |
| Indexes on public window, joins.user_id, submissions.user_id | List/detail perf |
| RLS replace broad public-read with `is_public OR host OR service_role` | Private drafts |
| Host insert/update/delete policies | Host create |
| Submission insert requires public parent project + ownership | Align with P5 |

### API / UI touchpoints

**New `src/api/stitchAlongs.ts`** (per contract test):

- `listPublicStitchAlongsOnline()`
- `getStitchAlongOnline(id)`
- `createStitchAlongOnline(userId, input)`
- `joinStitchAlongOnline(stitchAlongId, userId)`
- `submitToStitchAlongOnline(stitchAlongId, projectId, userId)`

**Types**

- Extend `StitchAlong` with `isPublic`, `startDate`, `endDate`, `status`, `participantCount?`, `coverImageUrl?`

**UI**

- `/stitch-along` list + `/stitch-along/:id` detail (keep old path as list)
- Home rail uses live list when online
- Host create form (simple panel; not a separate marketing CMS)
- Submit picker filters `myProjects` to `visibility === 'public'`

### Acceptance criteria (P0/P1)

1. ≥1 public SAL listable online; detail route works for deep links.  
2. Auth user can join and submit a public owned project; submission appears for others.  
3. Private project cannot be submitted; RLS and client both enforce.  
4. Host can create a public SAL that appears in the list.  
5. Non-hosts cannot edit/delete others’ SALs.  
6. Private/draft SAL not visible to non-hosts.  
7. Demo single-SAL path still works offline.  
8. `tests/stitch-alongs-backend-contract.spec.ts` passes.

### Out of scope (P3)

- SAL chat / comments thread beyond existing project comments  
- Paid SALs, tickets, certificates  
- Multi-host moderators  
- Automatic weekly email digests  
- Guild calendars / recurring series generator

---

## P4 — Onboarding relevance (interest-ranked feeds)

### User problem

Users pick interests at onboarding, but Discover/Studio ignore them — so the first session feels generic and PRD Flow 1 acceptance (“relevant starter content”) fails.

### Spec authority

**Implement `docs/interest-ranked-feed.md` as written.** Do not fork ranking rules here. This section only binds product priority, surfaces, and AC pointers.

### Primary flows

1. Signup → optional `/onboarding` interests + skill → Save or Skip.  
2. Land on Studio: followed creators first (if any), then interest-biased recommendations.  
3. Open Discover: after explicit filters/search, order remaining public projects by interest score.  
4. Skip/dismiss on a recommendation removes that project from that surface’s future recs.

### Edge cases (summary; full detail in interest-ranked-feed.md)

- Skip onboarding / empty interests → stable default ranking, never empty solely due to missing interests.  
- Explicit Discover filters are hard constraints; interests only re-order.  
- Diversity penalty / creator streak cap.  
- Guests: default ranking; no persistent dismiss unless later anonymous design.

### Data model notes

- Inputs: `profile_interests.interest`, `profiles.skill_level`  
- Add: dismissals `(user_id, project_id, surface, dismissed_at)` with surface `discover|studio`  
- Preferred RPC: `get_recommended_projects(surface, limit, cursor)`

### API / UI touchpoints

- Backend ranking RPC or server helper  
- `DiscoverView` / `HomeView` consume ranked order  
- Optional “Because you picked florals” only if `matched_interests` returned  
- Onboarding already writes interests — no redesign of chip set in P0  
- Account “Edit interests” already routes to `/onboarding`

### Acceptance criteria (P0)

Use the numbered AC list in `docs/interest-ranked-feed.md` (items 1–10) unchanged. Engineering must include at least one ranking fixture and one skip/dismiss fixture.

### Out of scope (P4)

- ML personalization, collaborative filtering  
- Using bio/email/geo/search history as signals  
- Notification digests of “new matches”  
- Shop ranking by interests (stores keep proximity/online rules)

---

## P5 — Private projects (journal privacy that holds)

### User problem

PRD Flow 2 lets stitchers mark projects private. If private WIPs still leak into Discover, profiles, stitch-alongs, collection public reads, or tag tables, users will not trust the journal — and shops/links attached to private drafts create awkward discovery edges.

### Primary flows

**F1 — Create private**  
1. User creates project with visibility `private`.  
2. Project appears in owner Journal / Account “Your journal” / own profile (owner view).  
3. Does **not** appear in Discover, Studio recommendations, other users’ profile grids, or public SAL boards.

**F2 — Toggle visibility**  
1. Owner edits project public ↔ private.  
2. Going private immediately removes it from public surfaces (RLS + client filters).  
3. Going public makes it eligible for discovery and SAL submit.

**F3 — Owner-only deep link**  
1. Owner can open `/projects/:id` for private project while signed in.  
2. Other users get not-found / empty (no existence leak beyond generic copy).

### Edge cases

- **Likes/comments/saves by others:** cannot start on private content; existing public social rows should not re-expose private parent (nested RLS migration).  
- **Collections:** owner may keep private project in private boards; public board feature (later) must strip private ids (already constrained by nested RLS).  
- **Shop tags (`project_stores`):** P0 rule — allow owner to tag stores on private projects for personal planning, but **store detail “Projects available here” and Shop the look for other users only include public projects**. Implement via query join on `projects.visibility = 'public'` (or owner).  
- **Pattern source URL** on private project: still owner-visible; no public SEO assumption.  
- **Demo `p5`:** remains owner-only for demo user `c2`; never in Discover filters.  
- **fetch paths:** online boot should load (a) public projects for feed and (b) owner’s own projects including private for journal — either one RLS-friendly select as now, then **client-partition** feeds to `visibility === 'public'` except owner journal/profile-self.  
- **Search:** private never matches for non-owners.

### Data model notes

- `projects.visibility` already `public|private` with select RLS.  
- Nested hardening migration `20260719210500_private_project_nested_rls.sql` must remain authoritative for tags, comments, reactions, collection_items, SAL submissions.  
- Verify/fix any remaining broad policies (e.g. historical “Project tags readable”, “Submissions public read”) against contract tests.  
- No new visibility enum values in P0 (`unlisted` later if needed).

### API / UI touchpoints

- `src/api/projects.ts`: keep returning owner-private rows to owner; document feed consumers must filter  
- `App.tsx` `filteredProjects`, Home feed, profile route for **other** users: public only  
- Journal + Account settings: show owner private  
- Project detail meta already shows visibility; ensure non-owner never mounts private detail data  
- SAL submit picker: public only (P3)  
- Store linked projects: public only for non-owners  
- Optional badge “Private” on owner journal tiles

### Acceptance criteria (P0)

1. Non-owner REST/anon reads return zero rows for a private project and its nested tags/updates/comments/reactions/collection memberships/submissions.  
2. Owner can create, edit, and view private projects in journal.  
3. Discover/Studio never list other users’ private projects.  
4. Profile `/u/:handle` for another user shows only their public projects.  
5. Private project cannot be submitted to a stitch-along.  
6. Store pages do not list another user’s private projects under “Projects available here.”  
7. Toggling private→public makes the project eligible for discovery without manual cache hacks beyond normal reload/state update.  
8. `tests/private-project-rls-contract.test.mjs` passes; add/keep a client filter unit or smoke where demo private is absent from Discover.

### Out of scope (P5)

- Shared private projects / guild-only visibility  
- Password-protected links  
- Paid private vault / export encryption  
- `unlisted` (link-only) visibility  
- Auto-hide private media from CDN beyond existing storage policies (storage path hardening is security track)

---

## P6 — Creator link tracking (profile + pattern intent)

### User problem

PRD creator profiles and success metrics require trackable external links (`Creator profile links`, “External link clicks”). Shop product/website clicks are specified in B5; creator profile links and pattern-source exits still fire no events, so creator value is unmeasurable.

### Primary flows

**F1 — Profile link click**  
1. User on `/u/:handle` clicks a `profile_links` chip (Pattern shop, Classes, Instagram, etc.).  
2. Immediately before navigation, client records `creator_link_click` (best effort).  
3. External page opens (`target=_blank` as today).

**F2 — Pattern source click**  
1. User on project detail clicks “Pattern source: …”.  
2. Records `pattern_source_click` with project + optional creator id context.  
3. Navigation proceeds even if insert fails.

**F3 — Creator aggregate (read)**  
1. Creator or admin can query counts by day for their profile links / projects (RPC aggregate only).  
2. P0 UI can be deferred to a simple “Link clicks (7d)” line on Account settings for own profile; raw rows never exposed to clients.

### Edge cases

- Missing/invalid URL: no event.  
- Owner clicking own links: still count (simpler; no filter) unless spam becomes an issue.  
- Demo mode: no-op or local counter; do not block UI.  
- Label changes on profile links: events key by `profile_link_id` when available, not label text.  
- Do **not** store full URL/query/UTM — host only, same as shop events.  
- Do not put `user_id` / email / IP on event rows.

### Data model notes

Extend analytics carefully. Preferred approach:

**Option A (recommended):** widen `outbound_click_events` event_name check to include:

| event_name | keys | destination_type |
| --- | --- | --- |
| `shop_link_click` | product_id + store_id | `product_external_url` |
| `store_website_click` | store_id | `store_website_url` |
| `creator_link_click` | `profile_id` + optional `profile_link_id` | `profile_link_url` |
| `pattern_source_click` | `project_id` + optional `creator_profile_id` | `pattern_source_url` |

Requires nullable `store_id` relaxation **or** a parallel table `creator_outbound_click_events` if changing shop table constraints is too risky mid-B5.

**Option B (safer isolation):** new table `creator_link_click_events` with the same no-PII philosophy and its own counts RPC.

Product default: **Option B** if B5 shop table is already live with strict store_id NOT NULL checks; **Option A** only if migration can land atomically with shop events before heavy prod reliance.

Payload minimization (both options):

- Allowed: stable ids, event_name, destination_type, destination_host, surface, placement, occurred_at  
- Forbidden: full URL, path, query, PII, raw user agent, payload jsonb dump  
- Surfaces: `profile_link_strip`, `project_pattern_source`, etc.

### API / UI touchpoints

- Extend `src/api/clickEvents.ts` (or `creatorClickEvents.ts`) with normalize-host helper reuse  
- `ProfileView` link `<a onClick>` → record then navigate  
- `ProjectDetail` pattern source anchor → record  
- Account settings optional 7-day count via RPC  
- Update `docs/outbound-click-events.md` **or** add short addendum section rather than conflicting rules  
- Tests: mirror outbound contract style for new event names and no full URL

### Acceptance criteria (P0/P1)

1. Each user-initiated profile link click records exactly one `creator_link_click` with profile id, optional link id, host, surface.  
2. Each user-initiated pattern source click records exactly one `pattern_source_click` with project id and host.  
3. No impression/hover events; no event when URL empty.  
4. No PII / full URL in DB, client logs, or errors.  
5. Counts queryable by day for profile and for project pattern exits.  
6. Tracking failure never blocks opening the external link.  
7. Shop/store events from B5 remain unchanged and green.

### Out of scope (P6)

- Affiliate network integrations, paid commission  
- Rewriting outbound URLs through a redirector domain (optional later)  
- Email click tracking  
- Creator payout dashboards  
- Auto-fetch OpenGraph previews for links

---

## Thin vertical slice checklist (engineering handoff)

Build in this order unless Tech Lead reorders for staffing:

| Step | Slice | Backend | Frontend | Verify |
| --- | --- | --- | --- | --- |
| 1 | P5 private truth | Finish nested RLS + store/SAL public filters | Feed/profile/store client filters; journal shows private | private-project contract + Discover smoke |
| 2 | P1 collections | `is_default`, ensure/prevent RPCs, `collections.ts` | Multi-board UI + save-to + hydrate | collections-contract + bookmark smoke |
| 3 | P2 reporting UI | (done) | ReportDialog on project/profile/store | reports-contract + manual auth gate |
| 4 | P4 ranking | RPC + dismissals | Discover/Studio consume rank | interest-ranked-feed.md AC 1–10 |
| 5 | P6 creator clicks | events table/RPC | Profile + pattern anchors | no-PII contract tests |
| 6 | P3 multi SAL | `is_public`, RLS, `stitchAlongs.ts` | list/detail/create/join/submit | stitch-alongs-backend-contract |

### Files likely touched

- `supabase/migrations/*` — collections default, SAL public flag, creator click events, any residual private RLS  
- `src/api/collections.ts` (new), `stitchAlongs.ts` (new), `social.ts`, `projects.ts`, `clickEvents.ts` / new creator clicks, `reports.ts` (wire only)  
- `src/App.tsx`, `src/AppComponents.tsx`, `src/types.ts`, `src/data.ts`  
- `tests/*-contract.*`, `tests/mvp-smoke.spec.ts`  
- Docs already authoritative: `docs/interest-ranked-feed.md`, `docs/outbound-click-events.md` (addendum for P6)

### Demo vs online matrix

| Capability | Demo (no Supabase) | Online |
| --- | --- | --- |
| Multi collections | localStorage boards | Postgres boards + default Saved |
| Report | local toast “demo only” or hide | RPC queue |
| Multi SAL | single seed SAL | list/detail host create |
| Interest rank | client-side score OK | RPC preferred |
| Private projects | filter seed `p5` out of Discover | RLS + client partition |
| Creator link clicks | no-op | insert events |

---

## Prioritization summary

### P0 — ship for product density this epic

1. **Private projects hold** (P5) — trust foundation for everything social.  
2. **Multi-collections** (P1) — weekly-return utility.  
3. **Report UI** (P2) — backend ready; smallest UI win for beta trust.  
4. **Interest-ranked feeds** (P4) — onboarding promise kept (`interest-ranked-feed.md`).

### P1 — immediately after / parallel if staffed

5. **Creator + pattern link tracking** (P6) — completes creator metrics beside shop B5.  
6. **Multi stitch-along + host create** (P3) — community anchor; more UI surface area.

### Later / park

- Public collections & board SEO  
- Comment-level reports, automated moderation  
- SAL chat, paid SAL, multi-host  
- Unlisted projects, shared private journals  
- Affiliate redirector & payouts  
- Interest-based shop ranking  
- Full moderator console

---

## Open questions

Resolved defaults (implementers should use these unless Samir overrides):

| # | Question | Default for P0 |
| --- | --- | --- |
| Q1 | Who can host a SAL? | Any authenticated user |
| Q2 | Bookmark removes from default only or all boards? | Default only |
| Q3 | Public collections? | No — private boards only |
| Q4 | Creator click table shared with shop events? | Prefer separate table if shop constraints are strict |
| Q5 | Moderator UI required in-app? | API/RLS enough; optional tiny gated route |
| Q6 | Private projects on store tags? | Stored for owner; public store surfaces hide them |
| Q7 | Onboarding chip vocabulary changes? | No — keep current 8 chips |

Still open (non-blocking for P0 slices):

1. Should pattern_source clicks attribute to project creator only, or also to `pattern_source_name` free text? → **P0: project_id + creator_profile_id only.**  
2. Is a 7-day click count on Account settings worth UI this epic or metrics-only? → **Metrics/RPC first; UI optional.**  
3. After private→public, should existing collection savers be notified? → **No notifications in epic P.**

---

## Outcome notes

When P0 slices land, Needlepoint should feel denser in the PRD sense:

- Stitchers can **organize inspiration** (collections), **trust the journal** (private), **flag abuse** (report), and **see relevant craft content on day one** (onboarding rank).  
- P1 then makes **creator exits measurable** and **stitch-alongs real multi-events**, matching PRD launch strategy without marketplace creep.

Success signals (product):

- Saves per WAU ↑; ≥1 named non-default board among active savers  
- Report funnel usable in dogfood (submit success >0 in staging)  
- Post-onboarding Discover top-6 interest bias visible in fixture tests  
- Zero private project ids in anon Discover payloads  
- (P1) creator_link_click and pattern_source_click counts queryable  

---

## Ready for implementation

Backend-dev and frontend-dev can implement **P0 slices (P5 → P1 → P2 → P4)** from this doc plus `docs/interest-ranked-feed.md` without further product clarification.  
P6 should follow `docs/outbound-click-events.md` no-PII rules.  
P3 follows the multi-SAL contract already sketched in `tests/stitch-alongs-backend-contract.spec.ts` and this theme section.
