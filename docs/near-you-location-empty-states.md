# Near You location denied and empty-state UX spec

Date: 2026-07-19
Audience: Tech Lead, frontend-dev, qa-engineer
Status: implementation-ready product spec

## Goal

Near You must never dead-end when a stitcher has not shared location, denies location, is on an unsupported browser/device, or has no local shops within the 60 mile driving radius. The experience should coach one safe retry path, explain browser settings only when useful, and always keep a clear path to online shops that ship.

This spec covers the location-driven Near You surface in `/stores` and any home/Studio shop strip that offers proximity ranking. It complements `docs/city-browse-ux.md`: Browse remains usable without GPS; proximity is an explicit enhancement, not a requirement.

## Product rules

- Do not call `navigator.geolocation` automatically on `/stores` page load. Location is requested only after a user taps/clicks a clear CTA.
- Online shops are always a visible recovery path when location is denied, unavailable, loading fails, or zero nearby local/hybrid shops are found.
- Never show precise coordinates, city inferred from coordinates, or raw browser error text in UI copy.
- Use the existing 60 mile radius from `LOCAL_DRIVING_RADIUS_MILES` for copy and acceptance.
- Use `storeType === "online"`, `storeType === "both"`, or `shipsNationwide === true` for the online-shops fallback list, sorted by the existing top-online rules: project count, ships nationwide, product count, then name.
- Keep marketplace/checkout out of scope. Copy must say shops link out to their own sites when explaining online shops.

## State model

Use a small explicit state machine so the frontend can pick exactly one user-facing state.

1. `permission_not_asked`
   - Default state on first render if no successful point is cached for this session.
   - Browser permission prompt has not been opened by this surface.
   - Show local/city directory content and online rail; show an optional "Use my location" card/CTA.

2. `requesting_location`
   - User tapped "Use my location" or "Try location again" and the browser request is active.
   - Show non-blocking loading copy in the location card. Keep existing shop lists visible where possible.

3. `location_ready_nearby`
   - Browser returned a point and at least one local/hybrid shop with coordinates is within 60 miles.
   - Show "Near you" first, then online shops as secondary.

4. `location_ready_empty_nearby`
   - Browser returned a point but there are zero local/hybrid shops within 60 miles.
   - Show an empty-nearby coaching card followed immediately by top online shops.

5. `location_denied_first_time`
   - Browser returned permission denied after a user-initiated request and this app surface has not yet recorded a denial in the current browser profile/session.
   - Show gentle denial copy with one retry CTA and one online shops CTA.

6. `location_denied_persistent`
   - Permission is already denied before request, or a second denied result occurs after retry, or `navigator.permissions.query({ name: "geolocation" })` returns `denied` where supported.
   - Show settings coaching copy; do not loop the same browser prompt as the primary CTA.

7. `location_unavailable_or_error`
   - `navigator.geolocation` is missing, timed out, returned unavailable, or the app is on a browser/device where location cannot be used.
   - Show fallback copy and online shops. Offer one retry only for timeout/unavailable; do not offer retry for missing geolocation support.

8. `no_shops_seeded`
   - The store list is empty or fails into a known empty data state.
   - Show the existing no-stores message plus recovery copy. Do not show fake online shops.

## Flow diagram / step list

### Flow A: Permission not yet asked

1. User opens `/stores`.
2. Page renders Browse content immediately: city directory/all shops and top online shops. No browser permission prompt appears.
3. Location card appears as an enhancement below the primary browse introduction or above the shop list.
4. Primary browse path remains visible: search/city/all shops.
5. User can tap:
   - Primary CTA: "Use my location"
   - Secondary CTA: "Browse online shops"
6. If user taps "Use my location", transition to `requesting_location`.
7. If user taps "Browse online shops", scroll/focus the online-shops section or apply the online filter; do not request permission.

Desktop differences:
- Location card may sit inline beside the directory intro or as a full-width panel above results.
- CTAs can be side-by-side: primary left, secondary right.

Mobile differences:
- Location card is a single-column panel with CTAs stacked full-width.
- It must not be sticky over the bottom navigation and must fit within the existing `.page` safe-area padding.
- Tapping "Browse online shops" should scroll to the online section with the heading visible below the top nav; avoid hidden anchors behind sticky chrome.

### Flow B: First deny after user taps Use my location

1. User taps "Use my location".
2. Browser permission prompt appears.
3. User denies.
4. App shows `location_denied_first_time`.
5. The shop list switches to, or keeps, browse/online content. No blank Near You grid is shown.
6. CTA hierarchy:
   - Primary: "Try location again"
   - Secondary: "Browse online shops"
   - Tertiary text link: "How to enable location"
7. If user taps retry and the browser allows another prompt, transition to `requesting_location`.
8. If retry returns denied again, transition to `location_denied_persistent`.
9. If user taps online shops, scroll/focus online section.

### Flow C: Permanent deny / browser settings required

1. App detects persistent denial via Permissions API where available, or second consecutive denied result after a retry.
2. App shows `location_denied_persistent`.
3. Do not make "Try location again" the primary CTA because many browsers will not re-prompt.
4. CTA hierarchy:
   - Primary: "Browse online shops"
   - Secondary: "I changed settings — try again"
   - Tertiary help copy with settings steps.
5. If user taps "I changed settings — try again", call geolocation once. If it still denies, remain in persistent-deny state and keep online shops visible.

Desktop coaching:
- Copy may mention the lock/site-settings icon in the browser address bar.
- Do not try to deep-link into browser settings; unsupported and inconsistent.

Mobile coaching:
- Copy should be shorter and platform-neutral first.
- Optional help drawer or small text may say: "On iPhone or Android, open your browser/app settings, allow Location for Needlepoint, then return here."

### Flow D: Location request unavailable or times out

1. User taps "Use my location".
2. Browser/device lacks geolocation, times out, or returns unavailable.
3. App shows `location_unavailable_or_error`.
4. CTA hierarchy:
   - If timeout/unavailable: Primary "Try again"; Secondary "Browse online shops"
   - If unsupported browser/device: Primary "Browse online shops"; no retry CTA
5. Existing browse/search/city content remains available.

### Flow E: Location on but zero nearby results

1. User grants location.
2. App ranks local/hybrid stores by distance.
3. No local/hybrid store with coordinates is within 60 miles.
4. App shows `location_ready_empty_nearby`.
5. Header explains no local shops were found nearby and immediately presents top online shops.
6. CTA hierarchy:
   - Primary: "Browse online shops"
   - Secondary: "Browse all shops"
   - Optional secondary: "Refresh location"
7. Do not show a map, empty pin view, or directions prompt.

### Flow F: Location on with nearby results

1. User grants location.
2. App finds one or more local/hybrid shops within 60 miles.
3. Show a "Near you" section first with distance badges.
4. Show top online shops as a secondary section below nearby shops.
5. CTA hierarchy on the location card:
   - Primary/secondary depending on visual system: "Refresh location"
   - Secondary anchor: "Browse online shops"
6. If refreshed location later produces zero nearby results, transition to Flow E.

### Flow G: Store list truly empty

1. `/stores` loads with no store records.
2. Show `no_shops_seeded`.
3. Do not request location automatically.
4. CTA hierarchy:
   - Primary: "Check back soon"
   - Optional secondary if route exists: "Back to Studio"
5. If online shops list is also empty, do not show "Browse online shops" as a dead CTA.

## Final UI copy

### Shared labels

- Section eyebrow: "Shops"
- Primary page title for location-enhanced surface: "Local shops near you"
- Distance radius label: "within 60 mi"
- Online section title: "Online shops that ship"
- Online section helper: "Shop profiles link out to each shop's own site. Needlepoint does not handle checkout."
- All-shops recovery CTA: "Browse all shops"
- Online recovery CTA: "Browse online shops"

### `permission_not_asked`

Headline: "Want shops near you?"
Body: "Share your location to sort local needlepoint shops within 60 miles. You can keep browsing by city or online shops without sharing."
Primary CTA: "Use my location"
Secondary CTA: "Browse online shops"
Tertiary/helper: "Location is only used for this search and is not shown on your profile."

### `requesting_location`

Headline: "Finding shops near you…"
Body: "Checking for local needlepoint shops within 60 miles. Online shops are still available below."
Disabled/loading CTA: "Locating…"
Secondary CTA: "Browse online shops"

### `location_ready_nearby`

Headline when one shop: "1 shop within 60 mi"
Headline when multiple shops: "{count} shops within 60 mi"
Body: "Sorted by distance from your location. You can refresh location or browse online shops that ship."
Primary CTA: "Refresh location"
Secondary CTA: "Browse online shops"
Near section title: "Near you"
Online section title: "Online shops that ship"

### `location_ready_empty_nearby`

Headline: "No local shops within 60 mi"
Body: "We couldn't find a local needlepoint shop close by yet. Here are online shops that ship so you can keep stitching."
Primary CTA: "Browse online shops"
Secondary CTA: "Browse all shops"
Optional secondary CTA: "Refresh location"
Online section title: "Online shops that ship"
Empty-nearby card alt body for no online shops: "We couldn't find a nearby local shop, and online shop profiles are not available yet. Try browsing all shops or check back soon."

### `location_denied_first_time`

Headline: "Location is off for Needlepoint"
Body: "No worries — you can try again, or browse online shops that ship without sharing location."
Primary CTA: "Try location again"
Secondary CTA: "Browse online shops"
Tertiary link: "How to enable location"
Expanded helper: "If your browser asks again, choose Allow. If it does not ask, use the site settings in your browser to allow Location for Needlepoint."

### `location_denied_persistent`

Headline: "Location is blocked in your browser"
Body: "Your browser is not allowing Needlepoint to check nearby shops. You can change site settings, then come back and try again."
Primary CTA: "Browse online shops"
Secondary CTA: "I changed settings — try again"
Tertiary/helper: "Look for the lock or site settings icon in your browser. On iPhone or Android, open browser settings, allow Location for Needlepoint, then return here."

### `location_unavailable_or_error` — timeout/unavailable

Headline: "We couldn't get your location"
Body: "The request timed out or your device could not share location. Try again, or browse online shops that ship."
Primary CTA: "Try again"
Secondary CTA: "Browse online shops"

### `location_unavailable_or_error` — unsupported

Headline: "Location is not available here"
Body: "This browser or device cannot share location with Needlepoint. You can still browse by city or shop online."
Primary CTA: "Browse online shops"
Secondary CTA: "Browse all shops"

### `no_shops_seeded`

Headline: "No shops yet"
Body: "Shop profiles will appear here once they are seeded or claimed."
Primary CTA: "Check back soon"
Optional secondary CTA: "Back to Studio"

## CTA hierarchy and behavior

- Primary CTA must be visually dominant and first in source order.
- Secondary CTA must be visible without horizontal scrolling.
- On mobile, all CTAs in the state card are 44px minimum height and full-width or easy-to-tap stacked buttons.
- "Browse online shops" behavior:
  - If online section is already on the page, scroll to it and move focus to the "Online shops that ship" heading.
  - If an online filter/tab exists, apply it and announce the changed result count to assistive tech.
  - If no online shops exist, hide/disable this CTA and use the no-online fallback copy above.
- "Try location again" behavior:
  - Only appears when the browser may reasonably re-prompt or retry.
  - After a second denied result, switch to persistent-deny copy.
- "I changed settings — try again" behavior:
  - Makes one fresh geolocation request after the user says settings changed.
  - Does not promise the app can open settings.

## Analytics events

Analytics are optional for this slice, but if implemented they must be no-PII and follow the minimization approach in `docs/outbound-click-events.md`. Do not store precise coordinates, IP-derived location, search terms, user agent strings, or browser error text.

Suggested events:

1. `near_you_location_cta_click`
   - Fires when user taps a location-related CTA.
   - Allowed payload: `surface`, `cta`, `prior_state`.
   - Example `cta` values: `use_my_location`, `try_location_again`, `settings_retry`, `refresh_location`.

2. `near_you_location_result`
   - Fires after a user-initiated location request resolves.
   - Allowed payload: `surface`, `result`, `nearby_count`, `online_count`, `radius_miles`.
   - Example `result` values: `ready_nearby`, `ready_empty`, `denied`, `unavailable`, `timeout`, `unsupported`.
   - Do not include latitude, longitude, raw error code text, or inferred city.

3. `near_you_online_fallback_click`
   - Fires when user taps "Browse online shops" from any location state.
   - Allowed payload: `surface`, `prior_state`, `online_count`.

4. `near_you_settings_help_open`
   - Fires when user opens the settings-help copy/drawer.
   - Allowed payload: `surface`, `prior_state`.

Recommended `surface` values:
- `stores_near_you`
- `studio_shop_strip`
- `home_shop_strip` if that surface exists separately

## When to show each state

- Show `permission_not_asked` when there is no current session point and the user has not tapped a location CTA on this surface.
- Show `requesting_location` immediately after a location CTA starts a browser request.
- Show `location_ready_nearby` only when a granted point exists and `ranked.nearby.length > 0`.
- Show `location_ready_empty_nearby` when a granted point exists and `ranked.nearby.length === 0`.
- Show `location_denied_first_time` after the first user-initiated `PERMISSION_DENIED` result if the app has not detected persistent denial.
- Show `location_denied_persistent` when Permissions API says `denied`, or after a second denied result from the same surface/session.
- Show `location_unavailable_or_error` for timeout, position unavailable, unsupported geolocation, or other non-permission failures.
- Show `no_shops_seeded` only when there are no store records to render. If local results are empty but online shops exist, use the online fallback states instead.

## Acceptance criteria checklist

Phone-friendly:
- [ ] `/stores` loads on a 390px-wide mobile viewport without horizontal overflow.
- [ ] State-card CTAs are at least 44px tall and do not require side-scrolling.
- [ ] Permission-denied and empty-nearby copy is readable without opening a modal.
- [ ] Settings coaching fits in the page or a lightweight disclosure; it is not hidden behind hover-only UI.

Bottom-nav safe:
- [ ] Location cards and online-shop anchors are not fixed over bottom navigation.
- [ ] Page bottom padding includes `env(safe-area-inset-bottom)` as the app already does for mobile `.page`.
- [ ] Scrolling to "Online shops that ship" leaves the heading visible below sticky top/bottom chrome.

Clear online-shop path:
- [ ] Every denied, unavailable, timeout, and zero-nearby state shows online shops when at least one online-capable shop exists.
- [ ] Every such state includes a visible "Browse online shops" CTA unless no online shops exist.
- [ ] Online shop copy preserves the boundary: profiles link out; Needlepoint does not handle checkout.

Retry coaching:
- [ ] First denied state offers "Try location again" and a short explanation.
- [ ] Persistent denied state switches the primary CTA to "Browse online shops" and explains browser settings.
- [ ] Unsupported geolocation state does not show a dead retry CTA.
- [ ] Timeout/unavailable state offers one retry plus online fallback.

Implementation clarity:
- [ ] No `navigator.geolocation` call runs automatically on `/stores` mount.
- [ ] Location requests happen only from explicit user actions.
- [ ] Raw browser error strings are mapped to the exact product copy in this spec.
- [ ] Zero nearby local results use online fallback, not a blank grid.
- [ ] Analytics, if added, exclude precise location, raw browser errors, search terms, user agents, and any PII.

## Out of scope

- Interactive maps, map pins, clustering, routes, directions, or geocoder autocomplete.
- Checkout, cart, payments, seller fulfillment, or marketplace flows.
- Browser-specific deep links into settings.
- Persisting exact user location or building a location history.
- Asking for location on initial page render.
