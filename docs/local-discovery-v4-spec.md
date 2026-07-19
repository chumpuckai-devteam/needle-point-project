# Epic L / Phase V4 — Local discovery UX flows and API contracts

Date: 2026-07-19
Audience: Tech Lead, frontend-dev, backend-dev, qa-engineer
Status: implementation-ready product spec

## Goal
Help stitchers find nearby needlepoint shops without making GPS mandatory. Phase V4 adds explicit zip/city search, city/map browse, and coached geo empty states while reusing the existing 60 mile proximity rank from `src/lib/geo.ts` (`LOCAL_DRIVING_RADIUS_MILES = 60`, `rankStoresForUser`, `haversineMiles`).

Needlepoint remains a discovery and link-out product in this milestone: shop profiles, catalog cards, external website/product links, follow/claim surfaces, and local/online fallback. No marketplace checkout is introduced.

## Current product/code context
- Existing browse route is `/stores`; shop details are canonical at `/stores/:handle`.
- Store data already exposes `city`, `region`, `country`, `location`, `latitude`, `longitude`, `storeType`, `shipsNationwide`, `specialties`, `projectCount`, and optional products/follower count.
- Current frontend proximity behavior lives in `src/lib/geo.ts` and ranks local/hybrid stores within 60 miles before online fallback.
- Existing `docs/city-browse-ux.md` intentionally made V1 directory-first and map-later. Epic L supersedes that for Phase V4 by allowing a lightweight map/city browse, but still keeps GPS opt-in and avoids forced permission prompts.
- Contract tests already point toward a future `search_stores` RPC with zip/city inputs; this spec defines the product contract workers should converge on.

## Product principles
1. Location is useful, not required. Users can search by zip or city, browse city cards, or opt into browser location.
2. Nearby means within 60 miles unless the user explicitly expands the radius.
3. Local first, then useful online fallback. If no local/hybrid shop is inside the chosen radius, show top online/ships-nationwide shops with clear copy.
4. Map augments the list; list remains primary and fully usable on mobile and with assistive tech.
5. Empty states should coach the next best action instead of dead-ending.

## Information architecture

### `/stores`
Default shop discovery page.

Required modules:
1. Search panel
   - Input supports US ZIP, ZIP+4, city, or `city, region`.
   - Placeholder: "Enter a ZIP or city"
   - Primary CTA: "Find shops"
   - Secondary CTA: "Use my location"; this is explicit and never fires on page load.
   - Helper copy: "We show local shops within about 60 miles, then online shops that ship."

2. City browse panel
   - Featured/available city cards grouped by normalized `city + region + country` from local/hybrid shops.
   - Card fields: city label, shop count, specialty preview, up to 2 example shops.
   - Sort: most shops first, then alphabetical.
   - Clicking a city runs the same search contract as city search and updates the URL.

3. Results list
   - Primary browse surface for all modes.
   - Store card fields: cover/avatar, name, handle, city/location, type chip (`Local`, `Local + ships`, `Online`), distance when available, `Ships nationwide`, up to 3 specialties, project count, follower count if available, CTA "View shop".
   - Cards deep-link to `/stores/:handle`.

4. Map preview / map browse
   - Lightweight pin map for stores with valid coordinates in the current result set.
   - On mobile, map appears below search controls and above or collapsed beside the list; list remains accessible without map interaction.
   - Selecting a pin highlights the matching list card and exposes the same `View shop` CTA.
   - If map provider/token is unavailable, gracefully hide map and keep city/list browse fully functional.

5. Online fallback rail
   - Visible when local results are empty or below the list as secondary discovery.
   - Copy: "Online shops that ship" / "Needlepoint links you out to each shop's own site. Checkout happens there."

### Recommended URLs
- `/stores` — default browse, no search active.
- `/stores?zip=78701` — zip search results.
- `/stores?city=Austin&region=TX&country=US` — city search results.
- `/stores?lat=30.2672&lng=-97.7431&radius=60&source=location` — browser-location results; do not persist exact coordinates server-side unless a later privacy spec approves it.
- `/stores/city/us/tx/austin` — optional shareable city deep link if route cost is small. Query-param URL is acceptable if reload-safe and canonicalization is documented.

## User flows and acceptance criteria

### Flow 1 — Search by ZIP
User flow:
1. User opens `/stores`.
2. User enters `78701` or `78701-1234` and submits.
3. App normalizes the input to `78701` and resolves it to a search point.
4. Results show local/hybrid shops within 60 miles, sorted nearest first.
5. If at least one nearby local/hybrid exists, online-capable shops appear after local results or in the fallback rail.
6. User opens a shop detail via `/stores/:handle`.

Acceptance criteria:
- Valid US 5-digit ZIP and ZIP+4 are accepted; ZIP+4 is normalized to the first 5 digits before querying.
- Search never prompts for browser geolocation.
- When coordinates resolve successfully, every local/hybrid store with coordinates receives `distanceMiles`; local/hybrid stores within `radiusMiles` appear before online-only stores.
- Default radius is 60 miles.
- Results expose the active place label, e.g. "Shops near 78701".
- Result cards with distance show rounded display via existing distance formatting rules (`< 1 mi`, one decimal under 10, whole miles after).
- Clicking any result opens the canonical detail route and hard refresh works.

Zero results inside 60 miles:
- If no local/hybrid shop is within 60 miles, show an empty local section titled "No local shops within 60 miles of 78701".
- Show at least two next actions when available: "Expand to 100 miles" and "Try a nearby city".
- Show the online fallback rail ranked by online strength.

Invalid ZIP:
- Inputs that are not 5 digits or ZIP+4 (for ZIP mode) do not call the search RPC.
- Error copy: "Enter a 5-digit ZIP code."
- The previous successful results remain visible until a valid new search runs; if no previous result exists, keep default browse.

### Flow 2 — Search by city
User flow:
1. User opens `/stores`.
2. User enters `Austin`, `Austin, TX`, or selects a suggested city card.
3. App resolves the city to one or more candidate places.
4. If unambiguous, results run with that city center and 60 mile radius.
5. If ambiguous, user selects the intended city/region before results are replaced.

Acceptance criteria:
- City search accepts city-only, `city, region`, and city card selection.
- City and region normalization is case-insensitive and trims whitespace.
- If one city candidate is known from local store data or geocoder lookup, search executes immediately.
- If multiple candidates exist, show an ambiguity picker with city, region, country, and shop count when known.
- Selecting a candidate updates URL state and result heading, e.g. "Needlepoint shops near Austin, TX".
- City cards and typed city search share the same backend/search result contract so QA can test one ranking path.

Ambiguous city:
- Example: `Portland` may resolve to `Portland, OR` and `Portland, ME`.
- Do not guess solely from browser locale.
- Copy: "Which Portland did you mean?"
- Options include a clear label and count when available: "Portland, OR — 2 shops".
- User can cancel and keep prior results/default browse.

Zero city results:
- If selected city has no local/hybrid shop within 60 miles, show "No local shops listed near [City] yet".
- Suggested actions: try a nearby city, enter a ZIP, expand the area, browse online shops that ship.

### Flow 3 — Browse by map/city
User flow:
1. User opens `/stores`.
2. User scans city cards and/or map pins without sharing current location.
3. User selects a city card or visible map area/city.
4. List filters to the selected city/search area; map pins update to the same stores.
5. User selects a pin or list card and opens shop detail.

Acceptance criteria:
- Default `/stores` never calls `navigator.geolocation` on mount.
- City browse works using `city`, `region`, and `country`; it does not require coordinates.
- Map pins render only for stores with valid `latitude` and `longitude`.
- Stores without coordinates still appear in the list if they match the city/search contract.
- Pin count and list count are allowed to differ only because some list results have no coordinates; UI copy should explain "Some shops do not have map pins yet" when applicable.
- Selecting a map pin highlights or scrolls to exactly one list card for that store.
- Selecting a city card or map city updates the same active search state and can be copied/reloaded from the URL.
- If the map fails to load, QA can still complete the entire browse flow through city cards/list.

No results in current map/city view:
- Show a local empty state in the list panel rather than a blank map.
- Suggested actions: reset map, expand radius, enter ZIP/city, or browse online shops.

### Flow 4 — Use my location / location denied
User flow:
1. User clicks "Use my location".
2. Browser permission prompt appears only after that click.
3. If granted, app uses browser coordinates as `{ lat, lng }`, radius defaults to 60, and results use the same proximity ranking contract.
4. If denied, app keeps default or previous browse state and shows coached recovery copy.

Acceptance criteria:
- No permission prompt appears before the user clicks "Use my location".
- Loading state copy: "Finding shops near you…"
- Success state copy: "Sorted by distance from your location."
- Denied state copy: "Location is off. You can still search by ZIP or city."
- Denial does not hide city browse, search, or online fallback.
- Timeout/error state copy: "We couldn't get your location. Try a ZIP or city instead."
- App must not store precise browser coordinates in persistent user/profile tables in this milestone.

### Flow 5 — Expand area from empty state
User flow:
1. User searches by ZIP/city/location and sees no local shops within 60 miles.
2. User clicks "Expand to 100 miles".
3. Results re-run with radius 100 and update the active heading/copy.
4. If still empty, user can expand once more to 150 miles or switch to online shops.

Acceptance criteria:
- Radius expansion is explicit; initial search remains 60 miles.
- Supported radius choices for V4: 60, 100, 150 miles.
- The response includes `radiusMiles` and `query.radiusMiles` so frontend and QA can verify which radius produced the view.
- Expanded radius does not change the core ranking: local/hybrid by distance first, then online fallback.
- Do not auto-expand without user action.

## API / worker contract sketch

This is a product-level contract, not a final TypeScript/SQL signature. Backend/frontend workers should keep names aligned when implementing.

### Request input
`searchStores(input)` accepts one search mode at a time:

```ts
type StoreDiscoveryInput =
  | { mode: "zip"; zip: string; radiusMiles?: 60 | 100 | 150 }
  | { mode: "city"; city: string; region?: string; country?: string; radiusMiles?: 60 | 100 | 150 }
  | { mode: "point"; lat: number; lng: number; radiusMiles?: 60 | 100 | 150; source: "location" | "map" | "city-geocode" }
  | { mode: "browse"; cityKey?: string; bounds?: MapBounds };

type MapBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};
```

Validation rules:
- `radiusMiles` defaults to 60 and is clamped to allowed values: 60, 100, 150.
- ZIP accepts `12345` or `12345-6789`; backend receives/stores/searches `12345`.
- City is required for city mode; region/country are optional until ambiguity resolution requires them.
- Point mode requires finite lat in `[-90, 90]` and lng in `[-180, 180]`.
- Browse bounds are for map viewport filtering only; do not use bounds as a replacement for city/zip radius search unless explicitly selected by the user.

### Response shape
```ts
type StoreDiscoveryResponse = {
  query: {
    mode: "zip" | "city" | "point" | "browse";
    displayLabel: string;
    zip?: string;
    city?: string;
    region?: string;
    country?: string;
    center?: { lat: number; lng: number };
    radiusMiles: number;
    expandedFromRadiusMiles?: number;
  };
  status: "ok" | "invalid-input" | "ambiguous-city" | "zero-local" | "geocode-unavailable";
  message?: string;
  cityCandidates?: CityCandidate[];
  list: StoreDiscoveryListItem[];
  mapPins: StoreDiscoveryMapPin[];
  onlineFallback: StoreDiscoveryListItem[];
  counts: {
    totalList: number;
    localWithinRadius: number;
    localOutsideRadius: number;
    onlineFallback: number;
    mapPins: number;
  };
};

type CityCandidate = {
  city: string;
  region: string;
  country: string;
  displayLabel: string;
  center?: { lat: number; lng: number };
  shopCount?: number;
};

type StoreDiscoveryListItem = {
  id: string;
  handle: string;
  name: string;
  storeType: "local" | "online" | "both";
  avatarUrl: string;
  coverImageUrl: string;
  location: string;
  city: string;
  region: string;
  country: string;
  shipsNationwide: boolean;
  specialties: string[];
  projectCount: number;
  followerCount?: number;
  websiteUrl?: string;
  distanceMiles?: number | null;
  proximityRank: "nearby" | "online" | "far";
  detailUrl: string; // /stores/:handle
};

type StoreDiscoveryMapPin = {
  storeId: string;
  handle: string;
  name: string;
  lat: number;
  lng: number;
  proximityRank: "nearby" | "far" | "online";
  distanceMiles?: number | null;
  detailUrl: string;
};
```

### Ranking rules
Reuse the current 60 mile proximity behavior from `src/lib/geo.ts` as the source of truth:
1. Compute `distanceMiles` with haversine distance from the selected center for local/hybrid shops with coordinates.
2. `nearby`: local/hybrid stores with `distanceMiles <= radiusMiles`, sorted ascending by distance.
3. `far`: local/hybrid stores outside radius or missing coordinates; do not include in the primary list for radius search unless explicitly needed for map/browse context.
4. `onlineFallback`: online-capable stores (`storeType === "online"` or `storeType === "both"` or `shipsNationwide`) sorted by online score: `projectCount * 10 + shipsNationwide * 5 + products.length`, then name.
5. Primary `list` for a successful radius search is `nearby` first. Online fallback appears after local results or in a separate rail; for `zero-local`, list may be empty while `onlineFallback` is populated.
6. For default browse with no center, list local/hybrid shops alphabetically or by city grouping, then online fallback; do not invent distances.
7. Never rank stores by exact user coordinates after location denial or before explicit permission.

### Backend/RPC expectations
Suggested Supabase RPC shape:
`public.search_stores(p_zip text default '', p_city text default '', p_region text default '', p_country text default 'US', p_lat double precision default null, p_lng double precision default null, p_radius_miles integer default 60)`

Minimum backend responsibilities:
- Normalize ZIP/city/region/country consistently with frontend validation.
- Resolve ZIP/city to a center point before distance ranking, or return `geocode-unavailable` / `ambiguous-city` with candidates.
- Return enough store fields for list cards and map pins in a single request.
- Preserve public read access for anon/authenticated users; do not require auth for discovery.
- Do not expose private owner/requester data.
- Do not introduce checkout, cart, payment, inventory, or order fields.

Implementation note: if backend geocoding is deferred, frontend may use a static seed of known city/ZIP centers for beta, but the response must still match this contract so workers can replace it with a proper geocoder later.

## Edge cases and copy guidance

### Invalid input
- ZIP invalid: "Enter a 5-digit ZIP code."
- Empty city/search submit: "Enter a ZIP or city to search."
- Unsupported country in V4: "Local search is US-only for this beta. Try browsing online shops that ship."

### Ambiguous city
- Title: "Which [City] did you mean?"
- Body: "Choose a city so we can show shops within about 60 miles."
- Actions: candidate buttons, "Search by ZIP instead", "Cancel".

### No local shops within 60 miles
- Title: "No local shops within 60 miles of [place]"
- Body: "We're still growing the shop directory. You can widen the search or browse online shops that ship nationwide."
- Actions: "Expand to 100 miles", "Try nearby city", "Enter ZIP", "Browse online shops".

### No shops in selected city directory
- Title: "No shops listed in [City] yet"
- Body: "Try a nearby city or check online shops that ship needlepoint supplies."
- Actions: "Clear city", "Enter ZIP", "Browse online shops".

### Location denied
- Title: "Location is off"
- Body: "No problem — search by ZIP or city to find local needlepoint shops."
- Actions: focus ZIP/city input, "Browse city directory", "Online shops that ship".

### Location timeout/error
- Title: "We couldn't get your location"
- Body: "Try a ZIP or city instead. You can still browse shops without sharing location."
- Actions: focus search input, retry location, browse online shops.

### Map has fewer pins than list results
- Inline note: "Some shops don't have map pins yet, but they're included in the list."

### No stores seeded at all
- Title: "No shops yet"
- Body: "Shop profiles will appear here once seeded or claimed."
- Actions: none required beyond standard navigation.

## QA acceptance matrix

| Scenario | Given | When | Then |
|---|---|---|---|
| ZIP happy path | Stores exist near `78701` | User searches `78701` | Local/hybrid shops within 60 miles sort by nearest distance; online fallback remains available. |
| ZIP+4 normalization | User enters `78701-1234` | Search submits | Query uses `78701`; heading/result label is valid; no validation error. |
| Invalid ZIP | User enters `unknown` in ZIP mode | Search submits | RPC is not called; error says "Enter a 5-digit ZIP code." |
| City happy path | User searches `Austin, TX` | City resolves | Results use city center + 60 miles; URL/heading show Austin, TX. |
| Ambiguous city | User searches `Portland` with multiple candidates | Search resolves candidates | User sees candidate picker and prior results are preserved until choice. |
| City card browse | User opens `/stores` | User selects a city card | Same results contract as city search; clear action returns to default browse. |
| Map browse | Results include coordinate stores | User selects a pin | Matching list card highlights/scrolls and `View shop` opens `/stores/:handle`. |
| Map unavailable | Map provider fails | User browses shops | List/city search still fully works; no hard error blocks discovery. |
| Zero local | Valid search has no local/hybrid within 60 miles | Results render | Empty local coaching appears with expand/nearby/ZIP/online actions and online fallback. |
| Expand radius | Zero-local user clicks expand | Radius changes to 100 | Results re-run and heading/contract expose `radiusMiles: 100`. |
| Location denied | Browser denies permission after click | App catches denial | Search/city browse remain; copy points user to ZIP/city. |
| No permission on load | New browser profile opens `/stores` | Page loads | No geolocation prompt appears before user clicks "Use my location". |

## Out of scope for Phase V4
- Marketplace checkout, cart, payments, inventory sync, order status, taxes, shipping labels, or in-app purchasing.
- Automated shop verification, claim workflow changes, or owner role redesign beyond existing shop detail links.
- Personalized saved addresses or persistent exact user location storage.
- Push/email notifications for nearby shops.
- Directions/routing, opening hours, phone/email contact fields, reviews, ratings, or sponsored ranking.
- Full geocoder/autocomplete vendor evaluation unless needed by backend to satisfy city/ZIP center resolution.
- International postal-code support beyond displaying existing non-US city/country labels.
- Map clustering, drawing tools, route planning, or advanced map filters.

## Final acceptance criteria
- A signed-out user can open `/stores`, search by valid ZIP, search/select a city, browse city cards/map/list, and open `/stores/:handle` without granting location.
- A signed-in or signed-out user can explicitly choose "Use my location" and get 60 mile proximity results or coached denial/error recovery.
- Zero-results, invalid ZIP, ambiguous city, and location-denied states are visible, specific, and offer testable next actions.
- Frontend and backend workers can implement against a stable input/response contract covering zip, city, point, radius, list results, map pins, and online fallback.
- QA can verify ranking with the existing 60 mile proximity logic and can test radius expansion without product follow-up questions.
- Scope remains local discovery and external shop link-out only; no marketplace/checkout work is implied.
