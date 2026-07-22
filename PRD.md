# Needlepoint Niche Social Platform PRD

## Summary

A niche social platform for needlepoint enthusiasts that combines project tracking, pattern discovery, community sharing, and creator commerce. The product should not be a generic Instagram or Twitter clone. The wedge is a purpose-built craft workspace where users can document work-in-progress projects, find patterns and materials, join stitch-alongs, discover local shops, and (later) find in-person stitching meetups and guilds with craft-specific metadata.

## Product Thesis

Generic social networks are useful for broad visibility but weak for craft-specific workflows. Needlepoint content on Instagram, Pinterest, Etsy, Facebook groups, and Reddit is fragmented across inspiration, purchasing, community, and personal progress tracking.

The product is viable if it starts as a valuable utility for a narrow audience and uses that utility to create social density. The first release should feel like a project journal plus pattern/inspiration library with lightweight community features, then grow into a fuller marketplace and creator network.

## Target Users

- Hobbyist needlepoint stitchers who want to track projects, save inspiration, and share progress.
- Advanced stitchers who participate in challenges, swaps, guilds, and stitch-alongs.
- Pattern designers and kit makers who need better discovery and monetization.
- Local shops, instructors, and guild organizers who want to promote classes, **stitching meetups**, events, and materials.

## Core Problem

Needlepoint enthusiasts currently spread their workflow across multiple tools:

- Instagram for sharing and following creators.
- Pinterest for inspiration boards.
- Etsy or independent stores for patterns and kits.
- Notes, spreadsheets, or paper notebooks for project tracking.
- Facebook groups, Reddit, Discord, or guild newsletters for community.

This fragmentation makes it hard to find relevant patterns, remember materials, track progress, discover creators, and participate in structured community activity.

## Goals

- Make it easy for stitchers to document and share needlepoint projects.
- Build a searchable library of projects, patterns, materials, stitches, and creators.
- Give creators and shops a better way to reach high-intent craft buyers.
- Seed social activity through project updates, comments, collections, stitch-alongs, and (post-MVP) local stitching meetups.
- Validate whether a niche craft audience will return weekly without relying on generic feed mechanics.

## Non-Goals

- Competing head-on with Instagram, X/Twitter, or Pinterest for broad social behavior.
- Building a full marketplace in the first release.
- **PARKED / non-goal: Phase D / Epic X commerce** — no carts, checkout, Stripe Connect, or in-app kit sales until engagement is proven.
- Supporting every fiber art category at launch.
- Creating complex creator monetization before engagement and retention are proven.
- Building private messaging before public community behavior is validated.
- Building full in-person event ticketing, paid RSVP checkout, or Zoom hosting in the first meetup slice (link-out or host-managed RSVP is enough at first).

## MVP Scope

The MVP is complete when users can:

- Create an account and profile.
- Create project journal entries with photos, status, notes, and materials.
- Tag projects with stitch type, canvas type, thread/brand, difficulty, color palette, and pattern source.
- Browse and search public projects.
- Save projects to personal collections. **Multi named boards (shipped)** — create/rename/delete boards; project detail **Save to board** checkboxes; remove from board on Saved page. Bookmark still toggles default Saved.
- Follow creators or other stitchers.
- Like and comment on project updates.
- Join a featured stitch-along or challenge.
- Publish creator profiles with links to patterns, shops, classes, or social accounts.

## MVP User Flows

## Flow 1: New User Onboarding

1. User signs up.
2. User selects interests such as beginner projects, ornaments, canvases, pillows, holiday designs, florals, animals, or modern patterns.
3. User selects skill level.
4. User follows suggested creators, shops, or topics.
5. User lands on a personalized home feed.

Acceptance criteria:

- User can complete signup in under 2 minutes.
- User can skip optional onboarding steps.
- Feed has relevant starter content based on selected interests.

## Flow 2: Create Project

1. User clicks New Project.
2. User adds project title, photos, status, notes, pattern source, thread/materials, and tags.
3. User marks project visibility as public or private.
4. User saves the project.
5. Project appears on the user's profile and, if public, in discovery surfaces.

Acceptance criteria:

- Project title and at least one photo or note are required.
- User can update project status: planned, in progress, finished, paused.
- User can add multiple progress updates to one project over time.

## Flow 3: Share Progress Update

1. User opens an existing project.
2. User adds a photo and short update.
3. User optionally tags materials, stitch technique, or milestone.
4. Update appears in follower feeds and on the project page.

Acceptance criteria:

- Updates preserve chronological project history.
- Followers can like and comment on updates.
- User can edit or delete their own update.

## Flow 4: Discover Inspiration

1. User searches by pattern theme, stitch type, material, difficulty, color, or creator.
2. User filters results.
3. User opens a project detail page.
4. User saves the project to a collection.
5. User follows the project creator or clicks through to the pattern source.

Acceptance criteria:

- Search supports keyword plus structured filters.
- Project cards show image, title, creator, difficulty, and status.
- Saved projects appear in user collections.

## Flow 5: Join Stitch-Along

1. User opens a featured challenge or stitch-along.
2. User reviews theme, dates, rules, and examples.
3. User joins.
4. User submits a project or progress update to the stitch-along.
5. User sees other participant submissions.

Acceptance criteria:

- Stitch-along (**multi-SAL + host tools shipped**: filters, templates, end event, roster)s have start/end dates, host, description, and participant count.
- Users can submit eligible projects.
- Stitch-along pages create a concentrated discovery surface.

## Flow 6: Creator Profile

1. Pattern designer or shop creates a creator profile.
2. Creator adds bio, links, shop URL, pattern categories, and sample projects.
3. Users can follow the creator.
4. Creator's projects and links appear in discovery.

Acceptance criteria:

- Creator profiles support external purchase links.
- Creator status can be basic at launch, without payments.
- Links are trackable for future monetization analysis.

## Primary Screens

## Home Feed

Shows:

- Followed creator updates.
- Recommended projects based on interests.
- Active stitch-alongs.
- Prompts to log project progress.

## Discover

Shows:

- Search bar.
- Filter controls for category, difficulty, material, stitch type, color, and status.
- Project grid.
- Featured creators and collections.

## Project Detail

Shows:

- Project photos.
- Title and creator.
- Status and progress history.
- Materials, stitch tags, difficulty, pattern source, and notes.
- Like, comment, save, and follow actions.

## Project Editor

Shows:

- Photo uploader.
- Title, description, and project status.
- Materials list.
- Tags and difficulty.
- Pattern source link.
- Visibility setting.

## Profile

Shows:

- User or creator bio.
- Project grid.
- Collections.
- Follow/follower counts.
- External links for creators.

## Stitch-Along Page

Shows:

- Challenge details.
- Host profile.
- Dates and rules.
- Participant projects.
- Join and submit buttons.

## Data Model

## User

- id
- name
- handle
- email
- profilePhotoUrl
- bio
- skillLevel
- interests
- isCreator
- createdAt
- updatedAt

## Project

- id
- userId
- title
- description
- status
- visibility
- difficulty
- patternSourceName
- patternSourceUrl
- primaryImageUrl
- createdAt
- updatedAt

## ProjectUpdate

- id
- projectId
- userId
- body
- imageUrls
- milestone
- createdAt
- updatedAt

## Material

- id
- projectId
- type
- brand
- colorName
- colorCode
- notes

## Tag

- id
- name
- category

## ProjectTag

- projectId
- tagId

## Collection

- id
- userId
- name
- description
- visibility
- createdAt
- updatedAt

## CollectionItem

- collectionId
- projectId
- savedAt

## Follow

- followerId
- followingId
- createdAt

## Reaction

- id
- userId
- targetType
- targetId
- reactionType
- createdAt

## Comment

- id
- userId
- targetType
- targetId
- body
- createdAt
- updatedAt

## StitchAlong

- id
- hostUserId
- title
- description
- rules
- startDate
- endDate
- coverImageUrl
- status
- createdAt
- updatedAt

## StitchAlongSubmission

- stitchAlongId
- projectId
- userId
- submittedAt

## StitchingMeetup (post-MVP / roadmap)

In-person or hybrid local gatherings distinct from multi-week **stitch-alongs** (online challenges). Meetups are place-and-time community events; stitch-alongs are project challenges with galleries.

- id
- hostUserId (stitcher, shop owner, instructor, or guild organizer)
- hostStoreId (optional — when a local needlepoint shop hosts)
- title
- description
- coverImageUrl
- startAt / endAt (local datetime + timezone)
- timezone
- locationType: `in_person` | `hybrid` | `online`
- venueName
- address / city / region / postalCode / country
- latitude / longitude (optional, for near-you rank; not required for ZIP/city browse)
- capacity (optional)
- rsvpMode: `registration` | `external_link` | `interest_only` (legacy)
- externalRsvpUrl (optional)
- skillLevel / topics tags (e.g. beginners welcome, finishing, ornaments)
- visibility: `public` | `unlisted`
- status: `draft` | `scheduled` | `cancelled` | `ended`
- capacity (optional seat limit)
- createdAt / updatedAt

## StitchingMeetupRegistration

Capacity-aware seat hold (replaces soft Going/Interested).

- meetupId
- userId
- status: `registered` | `cancelled`
- createdAt / updatedAt
- registeredCount derived; spotsLeft = capacity − registered when capacity set

**Cancellation policy (product copy):** Guests may cancel free up to **48 hours** before start; cancel frees the seat for others / waitlist. Within 48 hours, contact the host. Enforced server-side + UI lock.

## Recommended Tech Stack

- Frontend: Next.js with React.
- Backend: Next.js server actions or API routes.
- Database: Postgres.
- ORM: Prisma.
- Auth: Clerk, Supabase Auth, or NextAuth.
- Image storage: S3-compatible storage, Cloudflare R2, or Supabase Storage.
- Search: Postgres full-text search for MVP; Algolia, Meilisearch, or Typesense later.
- Moderation: Basic reporting and admin review for MVP; automated image/text moderation later.
- Analytics: PostHog or similar product analytics.

## Differentiators

- Craft-specific metadata instead of generic captions and hashtags.
- Progress journals instead of isolated posts.
- Searchable materials, stitch types, pattern sources, and difficulty.
- Stitch-alongs as recurring **online** community anchors.
- **Stitching meetups** as local, time-bound in-person anchors (shops, guilds, living-room stitch nights).
- Creator and shop discovery tied to actual project outcomes.
- Collections designed around projects and patterns, not generic image boards.

## Monetization Options

MVP should validate engagement before monetization, but early architecture should support:

- Creator profile upgrades.
- Shop and instructor listings.
- Affiliate tracking for pattern and kit purchases.
- Marketplace take rate on patterns or kits.
- Paid stitch-alongs, classes, or featured meetup listings.
- Premium user features such as advanced project tracking, private collections, and exportable project logs.

## Success Metrics

Activation:

- Signup-to-first-project rate.
- Signup-to-first-follow rate.
- Onboarding completion rate.

Engagement:

- Weekly active users.
- Projects created per active user.
- Progress updates per project.
- Saves per project.
- Comments per public project.
- Stitch-along participation rate.
- (Post-MVP) Meetup views, RSVPs / interested counts, and meetups created by shops or guild hosts.

Retention:

- Week 1 and Week 4 retention.
- Percentage of users with multiple project updates.
- Returning users who interact with saved collections.

Creator value:

- Creator profile follows.
- External link clicks.
- Project saves from creator pages.
- Stitch-along submissions per host.

## MVP Launch Strategy

Start with one tightly defined community segment:

- Needlepoint ornaments.
- Beginner-friendly canvases.
- Modern needlepoint designers.
- Holiday stitch-alongs.
- Local needlepoint shops and instructors.

Recommended first launch path:

1. Recruit 20-50 creators, shops, and advanced hobbyists before public launch.
2. Seed 300-500 high-quality public projects with structured tags.
3. Host one flagship stitch-along to create time-bound engagement.
4. Launch to a waitlist of hobbyists through Instagram, Reddit, Facebook groups, newsletters, and local guilds.
5. Track whether users create projects and return to update them.
6. After local shop discovery is trusted, pilot **stitching meetups** with a handful of LNS hosts and guild organizers (directory + RSVP interest before full event ops).

## Risks

- Cold start: the product may feel empty without high-quality seeded content.
- Creator acquisition: pattern designers may prefer existing Instagram/Etsy audiences.
- Niche size: needlepoint alone may be too narrow unless monetization is strong.
- Moderation: copied pattern images and attribution disputes may create trust issues.
- Marketplace creep: adding commerce too early could distract from engagement.
- Generic feed trap: if the app becomes only another posting surface, users will stay on larger networks.

## Open Questions

- Should the first wedge be needlepoint only, or needlepoint plus adjacent canvaswork?
- Are creators more motivated by traffic, sales, community, or project attribution?
- Which metadata matters most to stitchers: thread colors, stitch types, canvas mesh, pattern source, difficulty, or finishing style?
- Should private project tracking be free, paid, or limited?
- What is the minimum seeded content volume required for the discovery page to feel alive?
- For stitching meetups: interest-only RSVP first, or in-app going/waitlist from day one?
- Should meetup hosts be limited to verified shops/guilds at first, or open to any signed-in stitcher?
- How much precise address/map detail should be public vs revealed after RSVP (safety / privacy)?

## Post-MVP Roadmap

Ordered themes after private-beta density (Needlepoint Palace (home feed), shops, stitch-alongs, collections, reporting). Dates are intentional placeholders — sequence matters more than calendar.

### Phase A — Harden private beta (current / near-term)

- Guest browse + auth-gated write/interact.
- Shop connection (catalog, follow, claim, owner tools).
- Local discovery (ZIP/city, near-you coaching). **Map depth (shipped):** pin filters (All/Nearby/Local/Online) + zoom clusters.
- Quality, smoke coverage, moderation basics. **Shop claim queue (shipped):** moderator/owner approve-deny for directory claims.
- **First-time guide & help tips (shipped)** — on-page tooltips / lightweight coach marks for first-time users (Needlepoint Palace, Saved boards, Shops, Meetups, More menu, report). Users must be able to **reopen / recall tips** later (e.g. Account → “Show help tips” or a Help entry), not only see them once. Prefer short, skippable steps; no blocking modal wall.

### Phase B — Stitching meetups (local community)

**Goal:** Help stitchers find **in-person stitching nights**, guild sit-and-stitches, and shop-hosted open stitch times—managed **on Needlepoint**, not on an external Eventbrite-style site.

**Why now (after shops + local discovery):** Meetups need trustworthy local/shop context. ZIP/city and shop profiles already give a place layer; meetups attach **when + who hosts** to that layer.

**Product rules (source of truth):**

1. **On-site registration** — Guests **Register**, waitlist, cancel, and manage seats **in this app**. New meetups always use `registration` mode. External RSVP URLs are **legacy only** (not offered on create).
2. **Stores create meetups** — Shop owners host open-stitch nights linked to their shop immediately (`store_link_status = approved`).
3. **Users can create meetups** — Community hosts may publish a public night with free-text venue. They **cannot** claim a shop as the meetup location unless the **store approves** a venue request (`pending` → `approved` / `rejected`).
4. **My Meetups** — Signed-in users manage registrations and hosting from Browse | My meetups.

**In scope (shipped / current):**

- Public meetup list + detail + `/meetups/mine`.
- Create meetup for signed-in hosts; store link ownership or approval gate.
- Register / waitlist / cancel / confirmation receipt / host roster / ICS.
- Shop profile: approved upcoming nights + owner **Venue requests** queue.

**Out of scope for meetups core:**

- Paid tickets, Stripe checkout.
- Host QR check-in hardware.
- Live video hosting inside the app.
- Complex recurring series editor.

**Acceptance criteria:**

- Guest browses upcoming public meetups without an account.
- Signed-in user registers and cancels on-site; capacity + waitlist behave correctly.
- Store owner hosts shop-linked meetup without extra approval.
- Non-owner requesting a shop venue stays pending until the store approves; shop page only lists approved links.
- No marketplace checkout required.

### Phase B.1 — Meetup tickets & confirmation (future)

Build only after free registration is trusted:

- Paid or free **tickets** with confirmation email / in-app ticket state. **In-app free ticket + door code + QR (shipped)**; email deferred.
- Host check-in (QR or name list). **Name-list check-in (shipped)** — host taps Check in on roster; **code check-in (shipped)**; camera scan later.
- Waitlist notify + expire hold (auto-promote already ships for free seats). **In-app promote notify (shipped)** — when a seat opens, the next waitlist guest gets a notification (“You got a seat!”). **24h promote hold + Confirm seat + expire (shipped)**.
- **Cancel deadline server-side (shipped)** — free cancel until **48h** before start (more time for last-minute seat fills); UI locks cancel; waitlist leave anytime.
- Stripe adapters optional.

### Phase C — Deeper community & creator value

- Richer stitch-along hosting tools.
- Product-level Shop the look tags (**shipped**) — optional specific catalog products on projects; empty = store catalog sample.\n- Creator analytics (link clicks, meetup draw). **Store owner outbound click panel (shipped)** — 30-day product + website totals on own shop. **Creator profile link clicks panel (shipped)**. **Host meetup draw strip (shipped)**.
- Guilds / groups (lighter than full forums).
- **Private DMs (M3.A + M3.B live)** — 1:1 user↔user and user↔store. Inbox `/messages`, Message CTAs, **unread badges**, mark-read on open, light poll while viewing. No groups / media / websockets yet.

### Phase D — Commerce (PARKED / non-goal until engagement)

- **Status: PARKED / non-goal.** Do not queue implementation work for carts, checkout, Stripe Connect, or in-app kit sales.
- **Unlock condition:** only revisit after proven engagement — utility + density show weekly return and purchase intent through link-outs/shop follows/outbound clicks.

## First Release Checklist

- Build auth and profile setup.
- Build project CRUD with image upload.
- Build project updates and progress history.
- Build public project discovery with filters.
- Build collections and saved projects.
- Build follows, likes, and comments.
- Build creator profile links.
- Build one stitch-along feature.
- Add basic reporting and admin moderation.
- Add analytics for activation, engagement, and retention.
- **Roadmap:** on-site meetup registration + store venue approval (Phase B); tickets (B.1); **DMs user↔user and user↔store (Phase C)**; **first-time guide / tooltips + recall help (Phase A)**; commerce parked (D).
