# Needlepoint Project — Supabase setup (greenfield)

There is **no existing Supabase project**. Create one, apply the migration, then wire Vite env vars.

## 1. Create project

1. Go to https://supabase.com/dashboard and create a free project (region of your choice).
2. Wait until the database is ready.
3. Open **Project Settings → API**:
   - Copy **Project URL** → `VITE_SUPABASE_URL`
   - Copy **anon public** key → `VITE_SUPABASE_ANON_KEY`
4. (Optional, local scripts only) Copy **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`  
   **Never** put the service role key in the Vite client or commit it.

## 2. Auth settings (password)

1. **Authentication → Providers → Email**: enable Email.
2. Disable “Confirm email” for early private beta if you want frictionless testing  
   (or leave it on and use the confirmation link).
3. Set Site URL to your Vite origin, e.g. `http://127.0.0.1:5173` and production Vercel URL.
4. Add redirect URLs for local + production.

## 3. Apply schema

### Option A — SQL editor (fastest for first setup)

1. Open **SQL → New query**.
2. Paste the full contents of  
   `supabase/migrations/20260715120000_init.sql`
3. Run. If `storage.buckets` insert fails because storage schema differs, create a public bucket named `project-images` in **Storage** UI and re-run only the storage policies section if needed.

### Option B — Supabase CLI

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

## 4. Local env

```bash
cp .env.example .env.local
# edit values
npm run dev
```

Without env vars, the app runs in **demo mode** (localStorage + seed data, no real multi-user auth).

## 5. Seed content (optional)

After at least one real user exists (or using service role), load demo creators/projects with:

```bash
# requires SUPABASE_SERVICE_ROLE_KEY + VITE_SUPABASE_URL in env
npm run seed
```

(Implement/adjust `scripts/seed.mjs` as needed.)

## 6. Verify

- Sign up with email + password
- Profile row appears in `profiles`
- Create a project; row appears with RLS (only owner edits)
- Upload image under Storage `project-images/<user-id>/...`

## 7. Shop ownership + claim security

Shop ownership is stored on `stores.owner_user_id`, but public clients must not
write that column directly. Unowned shops are claimable only through the verified
request flow introduced in `supabase/migrations/20260719203500_shop_claim_requests.sql`:

1. Signed-in requester calls `request_store_claim(store_id, message)`.
2. A pending row is created in `store_claim_requests`; this does **not** grant
   product or shop write access.
3. A current owner (for transfers) or a service-role/admin process approves or
   denies with `approve_store_claim_request(...)` / `deny_store_claim_request(...)`.
4. Admin/service setup can use `establish_store_owner(...)`; support-only revoke
   can use `revoke_store_owner(...)`; current owners can use
   `transfer_store_owner(...)` for handoff.

Policy matrix:

| Surface | Public/anon | Authenticated non-owner | Requester | Current owner | Service role/admin |
| --- | --- | --- | --- | --- | --- |
| `stores` select | Allowed | Allowed | Allowed | Allowed | Allowed |
| `stores.owner_user_id` direct update | Blocked | Blocked | Blocked | Blocked | Allowed by service-role bypass/RPC |
| Store profile direct update | Blocked | Blocked | Blocked | Owner-only editable columns | Allowed |
| `store_products` insert/update/delete | Blocked | Blocked | Blocked until approved | Allowed for owned store | Allowed |
| `store_claim_requests` insert | Blocked | Own pending request for unowned shop | Own pending request | Own pending request if shop unowned | Allowed |
| Claim approve/deny | Blocked | Blocked | Blocked | Allowed for owned-store transfer requests | Allowed |

Do not recreate the historical `stores_claim_unowned` policy; it let any signed-in
user take an unowned catalog shop and then write products.

`supabase/migrations/20260719212000_authoritative_shop_owner_rls.sql` is the final
ownership hardening layer for the beta shop milestone:

- Normal authenticated clients cannot directly insert or delete `stores` rows.
- Direct `stores` updates are column-granted to public profile fields only; never
  grant `owner_user_id` to `authenticated` clients.
- Shop creation, deletion, ownership establishment, revoke, and support transfers
  are service/admin or owner-transfer RPC paths, not generic table writes.
- Existing owned shops keep their owner-scoped profile edit path; orphaned/unowned
  seeded shops stay public-readable and can only enter ownership through a claim
  request approval or service/admin establishment.

## 8. Shop product photo storage

Owner-managed catalog product photos use the public Supabase Storage bucket
`store-product-images`, created by
`supabase/migrations/20260719204500_store_product_images_storage.sql`.

- Public read: bucket is public so saved/generated public URLs render images, but
  `storage.objects` `select`/LIST is owner-scoped by
  `supabase/migrations/20260719205500_tighten_storage_listing_rls.sql` to prevent
  anonymous or cross-owner object enumeration.
- Write path convention: `<store_id>/<product_id>/<filename>`.
- Write authorization: only the authenticated owner of `stores.owner_user_id` for
  that product's `store_products.store_id` can insert/update/delete objects under
  the product prefix. Anonymous writes and non-owner writes are rejected by RLS.
- Frontend config: no new env var is required; `src/api/stores.ts` exports
  `STORE_PRODUCT_IMAGES_BUCKET` and `uploadStoreProductImage(storeId, productId, file)`.
- Product rows remain the source of truth: upload after the `store_products` row
  exists, then save the returned public URL in `store_products.image_url` via the
  existing owner-only product update path.

## 9. Follow/connection API contract

Store follows live in `store_follows`, keyed by `(follower_id, store_id)`. Direct
rows remain private to the authenticated follower through RLS; public UI should use
aggregate counts and the RPCs below instead of writing the table directly.

| RPC / client helper | Auth | Status / error contract | Analytics event |
| --- | --- | --- | --- |
| `follow_store(store_id)` / `followStoreOnline(storeId)` | Authenticated | Idempotent success returns `{ store_id, is_following: true, followed_at, follower_count }`; `28000` auth required; `P0002` shop not found; `23514` owner self-follow blocked. | Emit `store_follow` only after success, with `store_id`, `follower_count`, and UI surface/placement. |
| `unfollow_store(store_id)` / `unfollowStoreOnline(storeId)` | Authenticated | Idempotent success, including missing rows, returns `{ is_following: false, followed_at: null, follower_count }`; `28000` auth required; `P0002` shop not found. | Emit `store_unfollow` only after success with the same minimized fields. |
| `is_following_store(store_id)` / `isFollowingStoreOnline(storeId)` | Authenticated | Returns current user connection state plus public count; does not expose other follower IDs. | No event; read-only state check. |
| `my_store_following(limit, offset)` / `fetchStoreFollowing(limit, offset)` | Authenticated | Returns followed shops newest-first with `followed_at` and `follower_count`; limit is clamped to `1..100`. | Feed/rail impressions may reference returned `store_id`s only. |
| `store_followers(store_id, limit, offset)` / `fetchStoreFollowers(storeId, limit, offset)` | Shop owner only | Returns follower profile basics for the owner of that shop; unrelated users get `42501`. This keeps public follower lists out of scope. | Owner analytics may count rows, but should not persist profile IDs in event payloads. |

Frontend query keys should keep using `FOLLOWED_STORES_QUERY_KEY` for the Studio
followed-shops rail. The stable connection payload is camel-cased in
`StoreFollowConnectionState`: `storeId`, `isFollowing`, `followedAt`, and
`followerCount`.

## 10. Creator profile external-link clicks

Creator profile link analytics live in `creator_link_clicks`, introduced by
`supabase/migrations/20260719211500_creator_link_clicks.sql`.

- Public/anonymous and authenticated clients may insert one click row for a
  first-class `profile_links.id` + matching creator profile/link URL. The RLS
  insert policy verifies the link belongs to the creator and that the profile is
  marked `is_creator`.
- Raw reads are creator-scoped: authenticated users can select only rows where
  `profile_id = auth.uid()`; service-role/admin can read through normal bypass.
- Aggregates for dashboards should call `creator_link_click_counts(...)`, which
  returns counts grouped by `profile_link_id`, `link_url`, and day for the
  authenticated creator only.
- The client helper is `recordCreatorLinkClick(...)` in
  `src/api/creatorLinkClicks.ts`; it is best-effort and intentionally ignores
  failures so outbound navigation is never blocked.

## 11. Shop search by ZIP or city

Frontend callers can use `fetchStores({ zip, city, region, limit })` from
`src/api/stores.ts`. With no params it preserves the legacy `stores` select ordered
by name. With any location param, it calls the public `search_stores` RPC from
`supabase/migrations/20260719211000_shop_location_search.sql`.

Contract:

- `zip`: optional US ZIP. The client accepts `12345` or ZIP+4 (`12345-6789`) and
  sends only the first five digits.
- `city`: optional city name, trimmed and lowercased for case-insensitive matching.
- `region`: optional state/region hint, trimmed/lowercased; it strengthens city
  matches and can rank same-region shops when city is missing.
- `limit`: optional cap; the RPC clamps it between 1 and 100 and defaults to 50.
- Ranking: exact postal code first, then city+region, then city, then region, then
  online/catalog fallback strength (online or ships nationwide, tagged projects,
  product count, name).
- Empty/unknown locations are not hard failures: the RPC still returns public shops
  ordered toward online/catalog fallback results. Existing lat/lng proximity ranking
  remains unchanged for geolocation-based frontend paths.

## 12. Store city browse and detail APIs

Frontend callers can use `fetchStoreCityDirectory(limit?) -> StoreCityDirectoryEntry[]`
from `src/api/stores.ts` to render the no-GPS city directory on `/stores`.
It calls the public `store_city_directory(p_limit)` RPC from
`supabase/migrations/20260719212500_store_city_directory_detail.sql`.

`StoreCityDirectoryEntry` response shape:

- `city`, `region`, `country`: display/location keys from `stores`.
- `citySlug`, `regionSlug`, `countrySlug`: URL-safe lowercase slugs for optional
  shareable routes like `/stores/city/us/or/portland`.
- `shopCount`: count of local or hybrid (`local` / `both`) shops in that city.
- `specialtyPreview`: up to three distinct specialties for city cards.
- `exampleShopNames` / `exampleShopHandles`: up to two shops for previews/deep links.

Store detail routes should use `fetchStoreByIdentifier(identifier) -> Store | null`.
It calls `store_detail(p_identifier)` and accepts a canonical handle/slug or a store
UUID, normalizing values like `@canopycanvas` and `/stores/canopycanvas?from=city`.
The helper maps the RPC response to the existing `Store` shape, including card/detail
fields plus `projectCount`, `followerCount`, products, and optional coordinates.
`fetchStoreByHandle` and `fetchStoreBySlug` intentionally delegate to this stable
identifier fetch path.

Public browse: anon and authenticated clients can execute both RPCs. Writes remain
covered by existing owner/claim RLS policies; these APIs expose only public shop
profile fields and aggregate counts suitable for browse/detail UI.
