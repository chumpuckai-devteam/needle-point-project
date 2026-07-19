# City browse UX — local LNS discovery v1

Date: 2026-07-19
Audience: Tech Lead, frontend-dev, backend-dev, qa-engineer
Status: implementation-ready product spec

## Goal
Make local needlepoint shop discovery usable without GPS by introducing a directory-first `/stores` browse experience. A stitcher can land on Browse, scan featured cities or all shops, pick a city, and open any shop detail by deep link.

## Product decision: city directory first, map later
V1 should not ship an interactive map. The current store data already has `city`, `region`, `country`, `location`, `latitude`, and `longitude`, but map UI adds dependency, token, privacy, and mobile performance surface area that is not required for the acceptance target.

Use a city/directory browse for V1:
- Default browse never prompts for geolocation.
- Optional distance-based ranking can remain a future enhancement, but it must be user-initiated and non-blocking if kept.
- Latitude/longitude stay useful for future map/proximity ranking, not required for this flow.
- The Browse IA should feel like a curated craft directory, not a generic map app.

## Current code context
- Existing routes include `/stores` and `/stores/:handle` in `src/App.tsx`.
- Store cards currently open detail through `setView({ name: "store", handle })`, which resolves to `/stores/:handle`.
- Store shape already includes `handle`, `storeType`, `city`, `region`, `country`, `location`, `shipsNationwide`, `specialties`, `projectCount`, and optional coordinates in `src/types.ts`.
- `StoresView` currently attempts browser location on mount; this should be removed or changed to an explicit secondary action for v1 because browse must work without GPS.

## Information architecture

### `/stores` — Browse shops
Primary entry for Local Needlepoint Shops.

Sections:
1. Hero / intent
   - Title: "Browse needlepoint shops"
   - Copy: "Find local needlepoint shops by city, or browse online shops that ship. No location sharing required."
   - Optional search field placeholder: "Search city, shop, or specialty"

2. City directory
   - Group local and hybrid shops by normalized `city + region`.
   - City card fields:
     - City label, e.g. "Portland, OR"
     - Shop count
     - Specialty preview from shops in that city, e.g. "finishing, classes, painted canvases"
     - Example shop names, up to 2
   - Sort order:
     1. Cities with most shops
     2. Then alphabetical by city label
   - Clicking a city applies a city filter in-place or navigates to a shareable city URL (recommended URL shape below).

3. Shop list / cards
   - Shows shops for selected city, all shops if no city is selected, or search results if a query is present.
   - Card fields:
     - Cover/avatar
     - Shop name and `@handle`
     - City/location or "Online shop"
     - Type chip: Local, Local + ships, Online
     - Ships nationwide chip when true
     - Specialty chips, max 3
     - Project count and follower count if available
     - Primary CTA: "View shop"
   - Cards deep-link to `/stores/:handle`.

4. Online shops rail
   - Separate section for `storeType === "online"` or shops with `shipsNationwide === true`.
   - Visible on all-shops and empty local/city states.
   - Copy should preserve marketplace boundary: "Shop profiles link out to the shop's own site. Needlepoint does not handle checkout."

5. Empty states
   - No shops seeded at all: "No shops yet" + "Shop profiles will appear here once seeded or claimed."
   - City has no shops: "No shops listed in this city yet" + nearby fallback is not required; show online shops that ship.
   - Search has no results: "No shops matched your search" + clear-search action + online shops rail.

### `/stores/city/:country/:region/:city` — optional shareable city deep link
Recommended for frontend/backend implementation if route cost is small.

Examples:
- `/stores/city/us/or/portland`
- `/stores/city/us/tx/austin`

Behavior:
- Loads the same Browse UI with the city filter preselected.
- Slugs are lowercase URL-safe display values.
- The app resolves slug to `country`, `region`, and `city` from loaded stores; if no match, show city empty state with a back-to-all-shops action.

If this route is deferred, `/stores?city=portland-or` is acceptable for v1, but the chosen URL must be shareable and reload-safe.

### `/stores/:handle` — Shop detail deep link
Canonical shop detail URL remains:
- `/stores/canopycanvas`
- `/stores/threadandtonic`
- `/stores/bookshopwindows`

Rules:
- The URL is based on stable `stores.handle`.
- Opening a detail URL directly must hydrate the store from Supabase/demo data and render the shop detail or the existing not-found state.
- Shop cards, city cards' shop previews, project "Available at" tags, followed-shop rails, and owner tools should all use this URL shape.

## User flows

### Flow 1: Land on Browse and scan all shops
1. User opens `/stores` from nav or a shared link.
2. Page renders immediately with city directory, all-shop cards, and online shops; no browser permission prompt appears.
3. User scans city cards or shop cards.
4. User clicks a shop card.
5. App opens `/stores/:handle`.

Acceptance criteria:
- `/stores` does not call `navigator.geolocation` on mount.
- User can see at least one useful browse surface when stores exist: city directory, all-shop list, or online shops rail.
- Every rendered shop card has a visible CTA/affordance and opens the canonical detail route.

### Flow 2: Pick a city and open a store
1. User opens `/stores`.
2. User selects "Portland, OR" or another city card.
3. Browse switches to selected-city context with a heading like "Needlepoint shops in Portland, OR".
4. Shop list shows local/hybrid shops matching that city.
5. User opens a shop detail via `/stores/:handle`.
6. Back navigation returns to the city-filtered Browse context when using a shareable city URL, or to `/stores` if implemented in-place.

Acceptance criteria:
- City filtering uses store `city`, `region`, and `country`; it must not depend on coordinates.
- City count matches visible local/hybrid shops in that city.
- City filter can be cleared to return to all shops.
- Detail deep link works after a hard refresh.

### Flow 3: Search or scan without a local city
1. User opens `/stores` and types a city, shop name, handle, or specialty.
2. Matching city cards and shop cards narrow in place.
3. If no local city result exists, the page shows an empty message plus online shops that ship.
4. User can clear search and continue browsing.

Acceptance criteria:
- Search checks at minimum `name`, `handle`, `city`, `region`, `location`, and `specialties`.
- Search results do not require auth or GPS.
- Online shops remain discoverable when local results are empty.

### Flow 4: Shared shop detail link
1. User receives `/stores/bookshopwindows`.
2. User opens the URL in a new tab or after a hard refresh.
3. App renders Bookshop Windows LNS detail with products, projects, follow/claim/owner actions as applicable.
4. If the handle is unknown, app shows the existing "Store not found" state with a route back to Browse.

Acceptance criteria:
- `/stores/:handle` is canonical and reload-safe in Vercel SPA rewrites.
- The not-found state never redirects silently to home.
- Detail page keeps external website/product links as link-outs only; no checkout or cart is introduced.

## Data/backend expectations

Minimum data needed from `stores`:
- `id`
- `handle`
- `name`
- `store_type`
- `description`
- `avatar_url`
- `cover_image_url`
- `website_url`
- `location`
- `city`
- `region`
- `country`
- `ships_nationwide`
- `specialties`
- optional `projectCount` / follower count aggregations

Backend/API acceptance:
- `fetchStores()` must return enough fields to build the directory without a second per-city request.
- `fetchStoreByHandle(handle)` must support direct detail hydration.
- Empty `city` is valid for online-only stores and should not break grouping.
- Duplicate city labels across countries should remain distinguishable by `country`; US display may use "City, ST" while non-US can use "City, Region, Country".

## Frontend implementation notes

Recommended changes:
- Replace auto-location behavior in `StoresView` with directory state: `query`, `selectedCity`, derived `cityGroups`, derived `visibleStores`, and `onlineStores`.
- Keep route `/stores` for all browse.
- Add either `/stores/city/:country/:region/:city` or query-param support for shareable city filters.
- Reuse existing store card styling where possible; avoid map libraries.
- Keep any "Use my location" control out of P0 acceptance. If present, it must be an explicit button below the directory and never required.

## Out of scope for v1
- Interactive map, pins, clustering, map search, directions, or geocoder autocomplete.
- GPS-required ranking or forced permission prompt.
- Checkout, cart, inventory, payment, order status, marketplace seller tools.
- Claim verification changes beyond links to existing shop detail claim flows.
- New admin tooling for city curation.

## QA checklist
- `/stores` loads with geolocation permission blocked and still shows directory content.
- `/stores` loads in a browser profile that has never granted location; no permission prompt appears.
- City card selection filters by city/region/country and can be cleared.
- Search by "Portland", "Austin", shop handle, and specialty returns expected cards in demo data.
- Online-only shops appear in the online rail and are not grouped into blank city.
- `/stores/canopycanvas`, `/stores/threadandtonic`, and `/stores/bookshopwindows` render directly after hard refresh.
- Unknown `/stores/not-a-real-shop` shows not-found with a Browse recovery path.
- Mobile viewport shows city cards and shop cards without horizontal overflow.
- No checkout/cart UI appears anywhere in the flow.

## Final acceptance criteria
- Browse without GPS: A signed-out or signed-in user can open `/stores`, browse by city/list/search, and open a shop detail without granting location or seeing a browser geolocation prompt.
- City directory: Local/hybrid shops are grouped by city/region/country with counts and useful card metadata; online-only shops have a separate discoverable surface.
- Deep link to detail: Every shop has a canonical `/stores/:handle` URL that works from cards, copied links, and hard refresh; unknown handles show a recoverable not-found state.
- Scope control: V1 ships as directory/list UX, not a map, and keeps all commerce as external link-out only.
