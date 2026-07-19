# Empty, error, and loading-state audit

Date: 2026-07-19
Audience: Tech Lead, frontend-dev, qa-engineer
Status: implementation-ready product copy/spec

## Goal

Needlepoint should never flash a blank feed, strand a stitcher in generic error copy, or make an empty product surface feel broken. This audit covers Studio/feed, Shops, Journal, Project detail, and Auth. Marketplace/checkout remains out of scope; shop/catalog copy should reinforce that Needlepoint links out to shops' own sites.

## State display rules

- Show a skeleton when the app has started a known data request and does not yet have usable prior content for that exact module.
- Keep stale/prior content visible with a small inline status when a refresh or mutation fails after content already exists.
- Show an empty state only after loading has resolved successfully and the result set is valid but empty.
- Show an error state when the user cannot complete the intended action or the initial load for that module fails. Do not expose raw Supabase/browser errors as primary UI copy; log the raw message only for debugging.
- A top-level banner is acceptable for cross-surface sync failures, but each affected surface still needs local copy and recovery.
- Avoid copy like "No data," "Something went wrong," "Failed to load remote data," "Authentication failed," and raw exception text.

## Gap matrix

| Screen | State | Current behavior | Desired behavior |
| --- | --- | --- | --- |
| Studio feed `/` | Initial remote project/profile/store hydrate | `AppShell` starts online `projects` as `[]`; `HomeView` receives no feed loading flag, so an online boot can immediately render the feed empty state (`No posts yet`) before remote projects resolve. Followed shops rail has a skeleton prop but it is not passed from `App.tsx`. | Add `feedLoading` and `followedStoresLoading` from the remote hydrate. Show 3–5 post skeletons and rail skeletons until the first hydrate settles. Do not show empty copy during boot. |
| Studio feed `/` | Empty all feed | Existing empty: title `No posts yet`, body `Share a project photo, note, or short video.`, CTA `Create post`. | Keep CTA, but make copy warmer and clarify first action: title `Your Studio is ready for its first stitch`, body `Post a canvas photo, progress note, or short clip to start your project thread.` |
| Studio feed `/` | Followed-only feed empty while global feed exists | `HomeView` falls back from followed projects to all projects and changes subtitle; there is no explanation that followed makers have not posted. | Keep fallback feed, but show an inline coaching chip above it: `No followed makers have new stitches yet — here are fresh public projects while you find more people to follow.` CTA: `Explore creators` or `Browse Discover`. |
| Studio feed `/` | Remote sync error | `remoteError` banner shows raw messages or `Failed to load remote data`; feed may still show seeded/demo or stale content. | Keep content visible if available; show a local feed notice: `We couldn't refresh Studio just now. You're seeing the last stitches we have.` CTA `Try again` when retry exists. |
| Studio followed shops rail | Loading | Component has skeleton cards, but route never supplies `followedStoresLoading`. | Wire loading from hydrate and keep the skeleton for rail-only loading. |
| Studio followed shops rail | Empty | Existing: `You're not following any shops yet` / `Follow local and online shops to pin them here on Studio.` CTA `Browse shops`. | Accept with minor voice tweak: title `No favorite shops pinned yet`, body `Follow local or online shops and their new canvases will sit here on Studio.`, CTA `Browse shops`. |
| Shops `/stores` | Catalog loading | `stores` defaults to demo stores; no explicit shop-loading state, so online users may see demo or stale stores before remote stores settle. | If online remote stores are pending, show search shell plus 4 shop-card skeletons. If demo fallback is intentional, label it as demo only; production should not flash demo shops. |
| Shops `/stores` | Default browse empty city directory | City cards hide when there are no local/hybrid city candidates; only the generic `No shops yet` state appears if all stores are empty. | When no local cities but online shops exist, show `No local shop cities are listed yet` with online fallback immediately visible. |
| Shops `/stores` | Invalid ZIP/city input | Uses parser messages such as `Enter a ZIP or city to search.` / `Enter a 5-digit ZIP code.` and keeps previous discovery. | Accept behavior; copy should be product-voice and specific: `Enter a 5-digit ZIP, or try a city like Austin, TX.` Keep prior results visible. |
| Shops `/stores` | Ambiguous city | Existing panel asks `Which city did you mean?` and lists candidates. | Accept. Add body copy `Choose a city so we can show shops within about 60 miles.` already present. |
| Shops `/stores` | No local shops in radius | Existing location/status bar plus local empty panel; copy says `No local shops in this area` and `Widen the search...`. | Keep behavior; replace generic panel title with radius/place-aware copy: `No local shops within 60 miles of {place}`. Body: `Our directory is still growing here. Widen the hoop or jump to online shops that ship.` |
| Shops `/stores` | Geocode unavailable | Existing `geocode-unavailable` shares zero-local handling; no distinction between bad place and no stores. | Distinguish with copy: `We couldn't place that search on the map` and body `Try a nearby city or ZIP; we'll keep online shops visible below.` |
| Shops `/stores` | Browser location denied/unavailable | Existing status bar handles `Location is off` / `We couldn't get your location`, with ZIP/city and online CTAs. | Accept structure. Use persistent-deny settings copy only after repeat denial; first denial should be gentle. See `docs/near-you-location-empty-states.md`. |
| Shop detail `/stores/:handle` | Store not found | Existing route empty: `Store not found` / `That shop may have moved.` | Make it craft-specific: `Shop not found` / `That shop profile may have moved, been claimed under a new handle, or is no longer listed.` CTA `Browse shops`. |
| Shop detail `/stores/:handle` | Product catalog empty | Existing paragraph: owner `No catalog items yet. Add your first product above.`; visitor `No catalog items yet. Check back soon.` | Upgrade to `EmptyState`/panel. Owner: title `Your catalog shelf is empty`, body `Add canvases, threads, classes, or finishing links so stitchers can find them from tagged projects.`, CTA `Add product`. Visitor: title `This shop hasn't stocked its Needlepoint shelf yet`, body `Follow the shop or visit their website for the latest canvases and classes.` |
| Shop detail `/stores/:handle` | Projects available here empty | Existing paragraph: `No projects have tagged this store yet. Owners can mark “Available at” on a project.` | Owner title `No tagged projects yet`, body `Tag this shop in a journal entry when a canvas, kit, or finishing service came from here.` Visitor title `No stitched examples here yet`, body `When stitchers tag this shop, their finished and in-progress pieces will appear here.` |
| Shop detail owner forms | Product/profile mutation error | Parent passes raw `productError` / `profileError`; local validation is specific for required name and URL, but backend failures may be raw. | Map backend errors to action-specific copy. Keep field validation local; show a small banner with retry guidance. |
| Journal `/journal` | Initial my-projects loading | `myProjects` is derived from local app state; no loading state. On online boot it can briefly show `No journal entries yet`. | Add `journalLoading` until first project hydrate resolves. Show 3 mini project skeleton rows in the right rail; keep editor usable. |
| Journal `/journal` | Empty journal | Existing: `No journal entries yet` / `Save a project to start tracking progress.` | Use warmer onboarding copy: title `Your project journal is blank`, body `Save your first canvas, thread notes, and progress photos so future-you can pick up the stitch.` CTA optional `Start a project` if placed outside the form. |
| Journal `/journal` | Upload in progress | Existing inline `Uploading photo…`; submit shows `Saving…`. | Accept. Also reserve image preview space to avoid layout jump and use `aria-busy`. |
| Journal `/journal` | Upload/create error | Existing `uploadError` uses raw upload or create messages in red text. | Show crafted message plus raw details in expandable/dev-only log: `We couldn't attach that project photo. Try a smaller JPG/PNG/WebP, or save with a photo URL for now.` For save failure: `We couldn't save this journal entry. Your draft is still here — try again in a moment.` |
| Project detail `/projects/:id` | Missing/inaccessible project | Existing `Project not found` / `That project may have been moved, removed, or is not available.` | Accept privacy-preserving behavior; refine title/body: `Project not available` / `This canvas may be private, moved, or no longer shared.` CTA `Back to Discover`. |
| Project detail `/projects/:id` | Progress updates empty | `project.updates.map(...)` renders nothing after composer/help; no empty explanation for owner or visitor. | Owner empty state: `No progress updates yet` / `Log a stitch choice, milestone, or thread swap so the project has a timeline.` Visitor empty state: `No stitch notes yet` / `When the maker posts progress, updates will appear here.` |
| Project detail `/projects/:id` | Comments when no updates | Comment box always appears and comments latest update; if there are no updates, comment action has no visible effect. | Hide comment box until at least one update exists, or show disabled helper: `Comments open after the first progress update.` |
| Project detail `/projects/:id` | Shop the look empty despite store tags | If project stores exist but none have products, the `Shop the look` module is hidden silently. | Show a small non-commerce empty: `No shop links for this canvas yet` / `Tagged shops can add catalog links; checkout always happens on the shop's own site.` |
| Project detail edit/progress | Save/update errors | Existing `Could not save project`, `Update failed`, or raw error appears. | Replace with action-specific copy that preserves draft: project edit `We couldn't save those project edits. Your changes are still on screen — try again.` progress `We couldn't add that progress update. The note is still here; try again or remove the photo.` |
| Auth `/auth` and `/auth/signup` | Session loading | Existing loading card title `Loading your session…`, no skeleton. | Accept for brief load; use one auth-card skeleton if loading exceeds ~400ms. Copy can stay specific. |
| Auth sign in | Invalid credentials/network error | `AuthForm` shows raw Supabase message or generic `Authentication failed.` in neutral `auth-message`. | Map to `That email and password didn't match a Needlepoint account.` for invalid credentials; `We couldn't reach account services. Your stitches are safe — try again in a moment.` for network. Use `role=alert` and error styling. |
| Auth signup | Duplicate email/handle/weak password | Raw Supabase messages; handle uniqueness may surface later via profile. | Provide field-specific copy: duplicate email `An account already uses that email. Sign in instead?`; weak password `Use at least 6 characters for your Needlepoint password.`; handle `That handle is already stitched onto another profile. Try a variation.` |
| Auth account settings | Profile loading | Existing title `Loading your profile…`; whole settings page hidden. | Accept for first load; skeleton form if profile fetch is expected to be >400ms. |
| Auth account settings | Profile load error | Sets `error`, then still leaves loading and later renders form with blank fields and error text. | If initial profile load fails, show blocking error card: `We couldn't load your profile settings` / `Try again before editing so we don't overwrite your saved details.` CTA `Retry`. |
| Auth account settings | User has no projects | Existing empty `No projects yet` / `Create a journal entry to start tracking progress.` CTA `New project`. | Accept, with journal copy alignment: `Your project journal is blank` / `Start a canvas entry and it will appear here for quick access.` |

## Approved-ready copy keys

### Studio/feed

- `studio.feed.loading.label`: `Loading fresh stitches…`
- `studio.feed.empty.title`: `Your Studio is ready for its first stitch`
- `studio.feed.empty.body`: `Post a canvas photo, progress note, or short clip to start your project thread.`
- `studio.feed.empty.cta`: `Create post`
- `studio.feed.followedEmptyInline.body`: `No followed makers have new stitches yet — here are fresh public projects while you find more people to follow.`
- `studio.feed.refreshError.title`: `Studio couldn't refresh`
- `studio.feed.refreshError.body`: `You're seeing the last stitches we have. Try again when your connection settles.`
- `studio.followedShops.empty.title`: `No favorite shops pinned yet`
- `studio.followedShops.empty.body`: `Follow local or online shops and their new canvases will sit here on Studio.`
- `studio.followedShops.empty.cta`: `Browse shops`

### Shops discovery

- `shops.loading.label`: `Loading shop shelves…`
- `shops.allEmpty.title`: `No shops are listed yet`
- `shops.allEmpty.body`: `The directory is still being threaded. Check back soon, or add seed shops before launch.`
- `shops.localCitiesEmpty.title`: `No local shop cities are listed yet`
- `shops.localCitiesEmpty.body`: `Online shops that ship are still available below while we grow the local directory.`
- `shops.invalidSearch.body`: `Enter a 5-digit ZIP, or try a city like Austin, TX.`
- `shops.ambiguousCity.title`: `Which {city} did you mean?`
- `shops.ambiguousCity.body`: `Choose a city so we can show shops within about {radiusMiles} miles.`
- `shops.zeroLocal.title`: `No local shops within {radiusMiles} miles of {place}`
- `shops.zeroLocal.body`: `Our directory is still growing here. Widen the hoop or jump to online shops that ship.`
- `shops.zeroLocal.expandCta`: `Expand to {nextRadiusMiles} miles`
- `shops.zeroLocal.onlineCta`: `Browse online shops`
- `shops.geocodeError.title`: `We couldn't place that search on the map`
- `shops.geocodeError.body`: `Try a nearby city or ZIP; we'll keep online shops visible below.`
- `shops.location.firstDenied.title`: `Location is off for now`
- `shops.location.firstDenied.body`: `No worries — search by ZIP or city, or browse online shops that ship.`
- `shops.location.persistentDenied.title`: `Location needs a browser setting change`
- `shops.location.persistentDenied.body`: `Open your browser's site settings, allow location for Needlepoint, then try again. You can still search by ZIP or city.`
- `shops.location.unavailable.title`: `We couldn't get your location`
- `shops.location.unavailable.body`: `Try a ZIP or city instead. Online shops that ship are still below.`

### Shop detail

- `shopDetail.notFound.title`: `Shop not found`
- `shopDetail.notFound.body`: `That shop profile may have moved, been claimed under a new handle, or is no longer listed.`
- `shopDetail.notFound.cta`: `Browse shops`
- `shopDetail.catalog.empty.owner.title`: `Your catalog shelf is empty`
- `shopDetail.catalog.empty.owner.body`: `Add canvases, threads, classes, or finishing links so stitchers can find them from tagged projects.`
- `shopDetail.catalog.empty.owner.cta`: `Add product`
- `shopDetail.catalog.empty.visitor.title`: `This shop hasn't stocked its Needlepoint shelf yet`
- `shopDetail.catalog.empty.visitor.body`: `Follow the shop or visit their website for the latest canvases and classes.`
- `shopDetail.projects.empty.owner.title`: `No tagged projects yet`
- `shopDetail.projects.empty.owner.body`: `Tag this shop in a journal entry when a canvas, kit, or finishing service came from here.`
- `shopDetail.projects.empty.visitor.title`: `No stitched examples here yet`
- `shopDetail.projects.empty.visitor.body`: `When stitchers tag this shop, their finished and in-progress pieces will appear here.`
- `shopDetail.productSave.error`: `We couldn't save that catalog item. Your product details are still here — try again.`
- `shopDetail.profileSave.error`: `We couldn't save the shop profile. Your edits are still on screen — try again.`
- `shopDetail.claim.error`: `We couldn't send the claim request. Try again, or contact Needlepoint support if this is your shop.`

### Journal

- `journal.loading.label`: `Loading your project journal…`
- `journal.empty.title`: `Your project journal is blank`
- `journal.empty.body`: `Save your first canvas, thread notes, and progress photos so future-you can pick up the stitch.`
- `journal.upload.error`: `We couldn't attach that project photo. Try a smaller JPG/PNG/WebP, or save with a photo URL for now.`
- `journal.save.error`: `We couldn't save this journal entry. Your draft is still here — try again in a moment.`
- `journal.save.authError`: `Sign in to save projects across devices, or switch to demo mode for local testing.`

### Project detail

- `projectDetail.notFound.title`: `Project not available`
- `projectDetail.notFound.body`: `This canvas may be private, moved, or no longer shared.`
- `projectDetail.notFound.cta`: `Back to Discover`
- `projectDetail.updates.empty.owner.title`: `No progress updates yet`
- `projectDetail.updates.empty.owner.body`: `Log a stitch choice, milestone, or thread swap so the project has a timeline.`
- `projectDetail.updates.empty.visitor.title`: `No stitch notes yet`
- `projectDetail.updates.empty.visitor.body`: `When the maker posts progress, updates will appear here.`
- `projectDetail.comments.disabledUntilUpdate`: `Comments open after the first progress update.`
- `projectDetail.shopTheLook.empty.title`: `No shop links for this canvas yet`
- `projectDetail.shopTheLook.empty.body`: `Tagged shops can add catalog links; checkout always happens on the shop's own site.`
- `projectDetail.edit.error`: `We couldn't save those project edits. Your changes are still on screen — try again.`
- `projectDetail.update.error`: `We couldn't add that progress update. The note is still here; try again or remove the photo.`

### Auth/account

- `auth.session.loading`: `Loading your session…`
- `auth.signin.invalid.title`: `Sign in didn't match`
- `auth.signin.invalid.body`: `That email and password didn't match a Needlepoint account.`
- `auth.signin.network.body`: `We couldn't reach account services. Your stitches are safe — try again in a moment.`
- `auth.signup.emailExists.body`: `An account already uses that email. Sign in instead?`
- `auth.signup.weakPassword.body`: `Use at least 6 characters for your Needlepoint password.`
- `auth.signup.handleTaken.body`: `That handle is already stitched onto another profile. Try a variation.`
- `auth.signup.generic.body`: `We couldn't create the account just now. Your form is still here — try again.`
- `auth.account.loading`: `Loading your profile…`
- `auth.account.loadError.title`: `We couldn't load your profile settings`
- `auth.account.loadError.body`: `Try again before editing so we don't overwrite your saved details.`
- `auth.account.saveError.body`: `We couldn't save account settings. Your edits are still here — try again.`
- `auth.account.projects.empty.title`: `Your project journal is blank`
- `auth.account.projects.empty.body`: `Start a canvas entry and it will appear here for quick access.`

## Implementation notes for engineers

1. Add explicit first-load flags in `AppShell` for projects/profiles/stores/stitch-alongs instead of inferring loading from empty arrays.
2. Pass `followedStoresLoading` to `HomeView`; the rail already has skeleton markup.
3. Prefer local module status over only `remoteError`. The current global banner is useful but not enough context for feed, stores, journal, and auth.
4. Use `EmptyState` for product catalog and tagged-project empties on shop detail; plain helper paragraphs are too easy to miss.
5. Hide or disable the project comment box when `project.updates.length === 0`.
6. Create a small error-mapping helper for Supabase/auth/mutation errors so product copy is stable while raw errors remain available in console/logging.
7. Preserve user drafts on every save/upload/update error; copy above assumes the form is not cleared.

## Audited code surfaces

- `src/App.tsx` route wiring, remote hydrate, global banner, project/store mutations.
- `src/pages/HomePage.tsx` Studio feed, followed shops rail, feed empty.
- `src/components/feed.tsx` followed shops skeleton/empty behavior.
- `src/pages/StoresPage.tsx` shop search, location, zero-local, city ambiguity, all-empty handling.
- `src/pages/StoreRoute.tsx` missing shop route.
- `src/pages/StoreDetailPage.tsx` catalog, tagged projects, owner mutation errors.
- `src/pages/JournalPage.tsx` editor upload/save and journal empty.
- `src/pages/ProjectRoute.tsx` missing/inaccessible project route.
- `src/pages/ProjectDetailPage.tsx` progress updates, comments, shop-the-look, edit/update errors.
- `src/pages/AuthPage.tsx` auth/account page loading, profile load/save, account journal empty.
- `src/context/AuthContext.tsx` sign-in/sign-up busy/error copy.

## Verification notes

- This task produced a product spec/document only; no app code was intentionally changed.
- `npm run build` was run to understand current verification status. It fails on pre-existing TypeScript route props: `StitchAlongRoute` requires `canHost` at `src/App.tsx:1212` and `src/App.tsx:1226`. This audit does not change or fix that unrelated build failure.
