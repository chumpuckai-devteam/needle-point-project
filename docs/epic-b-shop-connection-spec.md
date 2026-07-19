# Epic B — High-value shop + connection sprint spec

Date: 2026-07-19
Audience: Tech Lead, frontend-dev, backend-dev, security-dev, qa-engineer
Status: sprint-ready product spec

## Goal
Turn the V3 shop loop into a trustworthy beta slice: real shop ownership, owner-editable shop presence, link-out catalog tooling, followed-shop utility, outbound intent analytics, and security hygiene. This deliberately preserves Needlepoint's current model: inspiration + local/online shop discovery + link-outs, not checkout.

## Current inventory from codebase
- Shop data model: `stores` has `owner_user_id`, public profile fields, location/lat/lng, `ships_nationwide`, `specialties`; `store_products` holds link-out catalog cards; `project_stores` attaches shops to projects (`available_at`, `pattern_from`, `threads_from`, `finishing`). See `src/types.ts` and `src/api/stores.ts`.
- Ownership and claim hardening already started: `store_claim_requests`, `request_store_claim`, `approve_store_claim_request`, `deny_store_claim_request`, `establish_store_owner`, `transfer_store_owner`, and `revoke_store_owner` live in `supabase/migrations/20260719203500_shop_claim_requests.sql`. Direct open claim updates are intentionally removed.
- Owner profile tooling already started: owners can edit name, description, website, location/city, avatar, cover, and specialties through `update_store_profile`; frontend form appears only for `isOwner` in `StoreDetailView`.
- Owner catalog tooling already started: `StoreDetailView` shows Add/Edit/Delete product actions only to owners; `store_products` RLS and `store-product-images` storage are owner-scoped.
- Follow utility already started: `store_follows`, `store_follow_counts()`, `my_followed_stores()`, `fetchFollowedStores()`, optimistic follow/unfollow, followed shops rail on Studio home, and hidden Follow button for owned shops.
- Analytics spec exists separately in `docs/outbound-click-events.md`; no implementation is visible yet for outbound tracking.
- Security-sensitive surfaces: owner assignment RPCs, direct `stores` updates, `store_products` writes, storage paths/buckets, follow row privacy, project-store link visibility, and outbound analytics no-PII constraints.

## Prioritized B1–B6 slice

### B1 — Verified shop claim requests and owner transfer controls
Priority: P0
Suggested owner profile: backend-dev for RPC/RLS + frontend-dev for user-facing states + security-dev review

What / why
- Replace beta-open "claim this shop" behavior with a moderated request lifecycle so real LNS owners cannot be hijacked.
- Keep unowned seeded shops claimable, but a claim only creates/updates a pending request; ownership changes only after approval by service/admin path or current owner transfer.

Scope in
- Request claim on unowned shop with optional message.
- Pending/approved/denied/cancelled states visible to requester where appropriate.
- Current owner or service/admin can approve or deny pending requests.
- Service/admin can establish owner for a shop without a pending request.
- Current owner or service/admin can transfer ownership to another existing profile.
- Service/admin can revoke owner back to unowned when needed.
- UI copy makes clear: "Request claim" is not instant ownership in online mode.

Scope out
- Automated document verification, domain/email verification, KYC, paid business verification.
- Public admin dashboard unless explicitly scoped; a service/admin script or internal-only route is acceptable for beta.
- Multi-owner roles; B1 remains single canonical owner.

User flow
1. Visitor opens an unowned shop detail page.
2. If signed out, "Request claim" prompts sign-in and returns to the shop.
3. Signed-in requester submits optional claim note.
4. App shows pending state and prevents duplicate pending requests for that store/requester.
5. Admin/current owner reviews pending request out-of-band/internal route and approves or denies.
6. On approve, `stores.owner_user_id` becomes requester or explicit `p_owner_user_id`; competing pending requests are denied.
7. On deny/cancel, shop remains unowned or owned by existing owner.
8. Current owner can initiate transfer by target profile id/email lookup if product approves lookup UX; service/admin can transfer directly.

Edge cases
- Existing owner: requester cannot create normal unowned claim; show "This shop already has an owner. Contact support for transfer."
- Pending claim by same requester: update message or show existing pending state; no duplicate row.
- Pending claim by someone else: show neutral "A claim request is already pending" without exposing requester identity.
- Approval after shop ownership changes: deny with owner changed / require service role.
- Transfer to missing profile: block with "New owner profile not found."
- Revoke owner: owner-only UI disappears, Follow button returns for non-owner users.
- Multi-owner requests: park; only one `owner_user_id` is supported this sprint.

Data touched
- `stores.owner_user_id`, `stores.updated_at`
- `store_claim_requests`: `store_id`, `requester_user_id`, `status`, `message`, `decision_note`, `decided_by`, `decided_at`, timestamps
- `profiles.id` for requester/current/new owner validation

Acceptance criteria
- Signed-out users cannot create claim requests and are routed to sign in.
- Signed-in users can create or update one pending claim request for an unowned shop.
- Claim request creation never updates `stores.owner_user_id`.
- Users cannot request ordinary claim on already-owned shops.
- Only current owner or service/admin can approve/deny a pending claim; only service/admin can establish/revoke ownership without current owner.
- Only current owner or service/admin can transfer ownership, and target profile must exist.
- Competing pending requests for the same shop are resolved safely when one is approved.
- Requesters can see their own claim status; unrelated users cannot read requester identity/message.
- Tests cover RPC/policy contracts and UI states for signed-out, pending, approved, denied, and already-owned shops.

### B2 — Owner shop profile editing
Priority: P0
Suggested owner profile: frontend-dev + backend-dev, with qa-engineer regression pass

What / why
- Make claimed shops feel real before any commerce: shop owners need to edit their public profile details and keep the shop page accurate.

Scope in
- Owner-only edit form on shop detail page.
- Editable: name, description, website URL, location label, city, avatar URL/upload, cover URL/upload, specialties.
- Validate client-side and server-side: required name, length limits, http(s) website, image URL shape, max 10 specialties.
- Clear success/error states; non-owners never see edit controls.
- Public read remains available for store pages.

Scope out
- Handle changes, region/country/geocode edits, business hours, phone, email, social links, SEO slug redirects.
- Rich text descriptions.
- Owner dashboard navigation beyond shop detail page controls.

User flow
1. Owner opens their shop detail page.
2. Header reads "Your shop" and exposes "Edit shop profile".
3. Owner edits fields and optionally uploads avatar/cover.
4. Save performs validation and writes via owner-only RPC/storage policies.
5. Public shop page refreshes with new profile fields.
6. Non-owner opening same shop sees only public details, Follow, and Visit website.

Edge cases
- Owner clears optional website/location/specialties: save succeeds and public page omits empty values gracefully.
- Invalid website or too-long text: save blocked before network and backed by RPC constraints.
- Upload succeeds but profile sync fails: uploaded object is removed or failure is surfaced without leaving broken public URL.
- Owner loses ownership mid-edit: save fails with not-owned error and UI should refresh/stop showing owner controls.
- Multi-owner: not supported; only `owner_user_id` can edit.

Data touched
- `stores`: `name`, `description`, `website_url`, `location`, `city`, `avatar_url`, `cover_image_url`, `specialties`, `updated_at`
- Storage bucket: `store-profile-images`, path `<store_id>/<avatar|cover>`

Acceptance criteria
- Only shop owner can see and submit profile edit controls.
- Server accepts only owner updates through `update_store_profile` or column-limited owner update path.
- Non-owner direct API attempts fail under RLS/RPC checks.
- Public page reflects saved fields after reload.
- Avatar and cover upload accept only approved image MIME types and size limits; storage writes are owner-only.
- Empty optional fields render without layout breakage.
- QA covers owner, non-owner, signed-out, invalid input, and upload failure paths.

### B3 — Owner catalog product CRUD with image upload
Priority: P0
Suggested owner profile: frontend-dev + backend-dev

What / why
- Give shop owners a lightweight merchandising surface: link-out catalog cards with real images and price labels, still no inventory or checkout.

Scope in
- Owner-only create/edit/delete catalog item from shop detail page.
- Fields: name, description, category, price label, external shop URL, product image URL/upload.
- Product image upload to owner-scoped `store-product-images` bucket after product row exists; saved public URL becomes `store_products.image_url`.
- Non-owner users see catalog cards and external "Shop link"/"Shop" links.
- Product cards can appear on store detail and project "Shop the look" surfaces via existing project-store tags.

Scope out
- SKUs, inventory, variants, shipping, tax, cart, payments, discounts, coupons.
- Bulk import, CSV, Shopify sync, product-level project tagging unless a later slice explicitly adds it.
- Product ownership separate from shop ownership.

User flow
1. Owner opens their shop page and clicks "Add product".
2. Owner enters display copy, link-out URL, price label/category, and uploads or pastes an image.
3. App creates row and uploads image if provided.
4. Owner can edit details or replace image.
5. Owner can delete product after confirmation.
6. Shoppers click outbound product links and leave Needlepoint.

Edge cases
- Missing external URL: catalog item may render without outbound CTA if product is informational.
- Invalid/large image: prevent upload with specific message.
- Product row create succeeds, image upload fails: keep row with fallback or surface retry, but do not orphan unauthorized storage object.
- Delete with linked projects: removing product should not remove shop/project relationship; Shop the look simply has one fewer product.
- Transfer/revoke owner: prior owner immediately loses CRUD access; new owner gains it.

Data touched
- `store_products`: `store_id`, `name`, `description`, `image_url`, `price_label`, `external_url`, `category`, `sort_order`
- Storage bucket: `store-product-images`, path `<store_id>/<product_id>/<filename>`
- `project_stores` only read for where catalog appears; no write in B3 except existing project edit flow.

Acceptance criteria
- Only owners can create/update/delete products for their shop.
- Non-owner and signed-out direct table writes fail under RLS.
- Product images are public-readable but insert/update/delete are owner-only and path-scoped to the shop/product.
- Owner UI supports create, edit, delete, cancel, busy, and error states.
- Store detail catalog updates optimistically or after reload without duplicating cards.
- Project Shop the look displays products for stores tagged on a project and remains link-out only.
- Tests cover RLS contracts, image policy path scoping, and UI smoke for owner vs non-owner controls.

### B4 — Followed shops utility on Studio home
Priority: P1
Suggested owner profile: frontend-dev + backend-dev

What / why
- Following a shop should create immediate utility: the Studio home should remember shops a stitcher cares about and get them back to catalog/local pages quickly.

Scope in
- Follow/unfollow button on shop detail for non-owner signed-in users; offline/demo can use local state.
- Hide Follow for owned shop to avoid self-follow ambiguity.
- Studio home followed-shops rail with loading, empty, and populated states.
- RPC returns current user's followed shops only, newest-first, plus public follower counts.
- Store detail and list show public follower count from aggregate RPC.

Scope out
- Notifications, email alerts, push, algorithmic feed ranking, DMs, blocked-user system unless existing profile block primitives are introduced elsewhere.
- Following products or brands separate from shops.
- Public follower lists.

User flow
1. User opens a shop they do not own.
2. User clicks "Follow store"; button flips to "Following" optimistically.
3. Studio home shows the shop in the Followed shops rail.
4. User can click rail card to return to the shop.
5. User can unfollow from shop detail; rail removes the shop.

Edge cases
- Signed-out online user clicks Follow: route to sign-in and do not create row.
- Follow duplicate: idempotent UI; DB primary key prevents duplicate row.
- Unfollow non-existent row: should be harmless from user perspective.
- Owner opens own shop: no Follow button; transfer/revoke updates button visibility.
- Blocked users: no block system in this slice. If blocking lands first, follow RPCs must exclude blocked shops/users and delete follow rows on block.
- Private follow rows: user can see own follows; only aggregate counts are public.

Data touched
- `store_follows`: `follower_id`, `store_id`, `created_at`
- RPCs: `store_follow_counts()`, `my_followed_stores()`
- localStorage fallback key `needle-point-project:storeFollows` for demo/offline mode

Acceptance criteria
- Signed-in user can follow/unfollow a non-owned shop exactly once.
- Signed-out online user is prompted to sign in and no remote follow row is created.
- Owned shop does not display Follow/Following for the owner.
- Studio rail renders loading skeleton, empty CTA, and newest-first followed shops.
- Direct follow rows are not public-readable; aggregate follower counts expose only `store_id` + count.
- Follow errors roll back optimistic state and show a useful error.
- Tests cover the followed-stores RPC contract and a UI smoke for owner vs non-owner follow controls.

### B5 — Outbound shop intent analytics
Priority: P1
Suggested owner profile: backend-dev + frontend-dev, with product-analyst review of event contract

What / why
- Before considering marketplace work, measure whether Needlepoint drives high-intent offsite traffic to shop product and website destinations.

Scope in
- Implement the contract in `docs/outbound-click-events.md`.
- Track user-initiated product link clicks as `shop_link_click`.
- Track store website clicks as `store_website_click`.
- Store only stable IDs, destination host, surface, placement, and server timestamp.
- Best-effort tracking must never block outbound navigation.
- Queryable daily counts by event/product/store.

Scope out
- Checkout events, orders, revenue, affiliate attribution, coupons, full URL tracking, session/user identity, raw user agent/IP/device fingerprinting.
- PostHog or third-party analytics unless explicitly approved.
- Owner-facing analytics dashboard unless counts are needed for a later slice.

User flow
1. User clicks a product Shop link on project Shop the look or store product grid.
2. App emits `shop_link_click` with product/store IDs, host, surface, placement.
3. Browser opens the external shop URL.
4. User clicks store "Visit website".
5. App emits `store_website_click` with store ID, host, surface, placement.
6. Product/admin can query aggregate counts later.

Edge cases
- Missing or malformed URL: do not emit raw URL; omit host or store `unknown` and do not block UI.
- Repeated user clicks: one event per user-initiated click.
- Prefetch/render/hover: no event.
- New tab navigation: use best-effort beacon/insert without delaying navigation beyond a tiny window.
- Privacy: no full URLs, query strings, search terms, user IDs, emails, handles, notes, IP, UA, or JSON payload escape hatch.

Data touched
- New `outbound_click_events` table or equivalent narrow store:
  - `event_name`, `product_id`, `store_id`, `destination_type`, `destination_host`, `surface`, `placement`, `occurred_at`
- Read-only aggregate query/RPC if counts need to be displayed later.

Acceptance criteria
- Product outbound links emit exactly one `shop_link_click` per intentional click.
- Store website links emit exactly one `store_website_click` per intentional click.
- Event schema contains no PII and no full URL/path/query/fragment fields.
- Tracking failure does not prevent outbound navigation.
- Counts are queryable by event name, product, store, and day.
- Tests assert payload minimization and click-handler placement on both product and store surfaces.

### B6 — Shop security hygiene and regression audit
Priority: P0 parallel gate for B1–B5
Suggested owner profile: security-dev, with backend-dev fixes and qa-engineer verification

What / why
- The shop slice touches ownership, public links, media, and analytics. Treat security as a milestone gate, not a cleanup task.

Scope in
- Audit RLS and grants for `stores`, `store_products`, `store_follows`, `store_claim_requests`, `project_stores`, storage buckets, and analytics table.
- Verify no broad authenticated write policy remains for store/product ownership-sensitive paths.
- Verify `owner_user_id` cannot be changed by normal profile-edit or product-edit flows.
- Verify media storage path policies cannot be crossed between shops/products.
- Verify follow privacy: direct rows are own-only; aggregate counts are public-only counts.
- Verify outbound analytics schema cannot collect PII through generic JSON/payload columns.
- Add contract tests and a manual QA checklist for owner/non-owner/signed-out roles.

Scope out
- Full penetration test, external vendor review, SOC/compliance work, marketplace/payment compliance.
- Moderation/reporting system unless blocked-user/report primitives are separately prioritized.

Security review flow
1. Enumerate shop-related tables/functions/buckets and grants.
2. For each role (anon, authenticated non-owner, owner, current owner, service/admin), list allowed actions.
3. Add/confirm tests for denied paths, not just happy paths.
4. Run lint/build/test suite and capture failures.
5. Block release if any P0 write/read leak remains.

Edge cases
- Migration order can recreate dropped broad policies; tests should read all migrations or final schema when possible.
- Security definer RPCs must validate `auth.uid()`/`auth.role()` explicitly and use safe `search_path`.
- Storage public read is okay for images; write/delete must be owner path-scoped.
- Existing local/demo mode may simulate owner state; online security cannot rely on demo checks.

Data touched
- Primarily tests/docs/policies; may patch any table/RPC/storage policy above if gaps are found.

Acceptance criteria
- No authenticated non-owner can update/delete another shop's profile or products.
- No authenticated user can directly set, clear, or transfer `stores.owner_user_id` outside approved RPCs.
- Claim request rows expose only involved requester/current owner/service/admin views.
- Direct follow rows are not public; unrelated users cannot enumerate follower IDs.
- Storage policies enforce owner-scoped insert/update/delete for profile and product images.
- Analytics writes cannot include raw payloads/PII/full URLs.
- `npm run lint` and `npm run build` pass after implementation tasks; security contract tests pass or blockers are filed.

## Dependencies and sequencing
1. B6 starts immediately as a review gate and should inspect each implementation branch.
2. B1 must land before any real owner onboarding because B2/B3 depend on trustworthy `owner_user_id`.
3. B2 and B3 can run in parallel after B1's ownership model is stable, but both depend on owner-only RLS and storage policy review from B6.
4. B4 can run parallel to B2/B3 because follows do not mutate ownership; it depends on follow privacy and the `my_followed_stores()` RPC.
5. B5 can run after link surfaces are stable enough to instrument; it should not wait for dashboards. It depends on final product/store link placement from B3 and no-PII approval from B6.
6. QA should verify the integrated path: claim/owner -> edit profile -> add product -> project Shop the look link-out -> follow/unfollow -> Studio rail -> analytics row.

## Explicit non-goals for Epic B sprint
- Marketplace, checkout, cart, Stripe/Connect, payouts, order management, tax, shipping labels.
- DMs/chat between stitchers and shops.
- Multi-owner/team roles and staff permissions.
- Automated business verification/KYC.
- Inventory quantities, variants, SKU import/sync, Shopify/Etsy integrations.
- Affiliate attribution, revenue analytics, coupon/referral tracking.
- Product-level tagging on project images unless a later slice explicitly scopes it.
- Native mobile work.

## Outcome tracking notes
Milestone done means:
- Trust: a real shop can be claimed only through a moderated/approved path; non-owners cannot mutate shop/profile/product data.
- Owner value: a claimed owner can make a shop page look credible and maintain at least one link-out product with an image.
- Stitcher utility: a stitcher can follow shops and reliably return to them from Studio.
- Shop intent: product and website link-outs are counted in a privacy-preserving way.
- Release confidence: security contract tests and lint/build pass, and QA has role-based evidence for owner, non-owner, and signed-out flows.

Suggested milestone metrics:
- Claimed shops with complete profile fields: name + description + website + avatar/cover + at least 3 specialties.
- Claimed shops with >= 1 catalog product with non-placeholder image and external URL.
- Follow rate: store follows / signed-in store detail views.
- Rail engagement: followed rail clicks / Studio sessions with followed shops.
- Outbound intent: `shop_link_click` and `store_website_click` per store detail view and per project Shop the look view.
- Security: zero known P0/RLS blockers before beta owner onboarding.
