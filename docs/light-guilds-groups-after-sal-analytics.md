# Light guilds/groups — parked until SAL depth + analytics prove need

Date: 2026-07-22  
Audience: Samir, Tech Lead, frontend-dev, backend-dev  
Status: parked product spec — do not build yet  
Related: `docs/epic-p-product-density-spec.md` P3 Stitch-along depth, `docs/outbound-click-events.md`, `docs/monetization-strategies.md`

## Decision summary

Needlepoint may eventually need lightweight guild/group spaces, but this should not become a forum product. The current product thesis is still craft workspace + local shop discovery + stitch-alongs + meetups. Build guilds/groups only after SAL depth and analytics show that users are repeatedly trying to organize around the same hosts, cities, shops, designers, or recurring stitching cohorts and the existing SAL/meetup surfaces are too temporary.

Current recommendation: keep this parked. First finish and measure multi-SAL depth, meetups, follows, comments, shop link-outs, and RSVP/click reporting. If those surfaces do not show repeated community clustering, groups would add navigation and moderation cost without solving a proven problem.

## Problem this could solve later

Stitchers often organize around local guilds, shops, instructors, designers, and recurring themes. Once Needlepoint has multiple active SALs and meetups, users may need a lightweight home for an ongoing cohort:

- A shop-hosted stitching circle that runs several meetups and SALs over time.
- A local guild that wants one profile-like home with upcoming events and shared public projects.
- A designer or instructor cohort that hosts recurring SALs/classes and wants followers to find the next activity.
- A city craft pod where stitchers want to discover active happenings without joining a full message board.

This is not a need to create Reddit, Facebook Groups, Discord, or long-form forums inside Needlepoint. The job is discovery, continuity, and lightweight identity around recurring craft activity.

## Explicit scope boundary: light groups/guilds, not forums

A Needlepoint guild/group is a curated container around existing product primitives:

- SALs
- meetups/classes
- public project submissions
- members/followers
- shop/designer/instructor profile links
- short announcements or pinned notes

It is explicitly not:

- a full forum
- nested channels
- arbitrary discussion boards
- long-form threaded topics
- private chat rooms
- Discord replacement
- Facebook Groups clone
- marketplace storefront
- paid membership platform
- moderation-heavy community network

If a proposal requires topic trees, per-post moderation queues, channel permissions, realtime chat, or infinite user-generated threads, it is out of scope for this feature and should be rejected or re-scoped.

## Go-ahead criteria: what SAL depth + analytics must prove first

Do not start implementation until at least one beachhead cohort/city shows sustained repeated behavior across SALs/meetups and the team can answer “who needs this group home and why now?” with data.

Minimum recommended evidence before build:

1. SAL supply and participation
   - At least 3 active or recently active public SALs in the same 60–90 day window.
   - At least 2 SALs hosted by the same shop/designer/instructor or serving the same city/theme.
   - Median joined users per active SAL is high enough to create visible social proof; initial target: 10+ joins per SAL or a clear upward trend from beta baseline.
   - Public project submissions happen after joins, not just joins with no follow-through; initial target: 25–40% of joined users submit or update a public project.

2. Repeat cohort behavior
   - A meaningful share of users join more than one SAL or meetup connected to the same host/city/theme; initial target: 20%+ repeat participation within a cohort.
   - Users follow the same shops/creators whose SALs or meetups they join.
   - Users return to SAL detail pages after joining, not only at first discovery.

3. Meetups and local density
   - At least one city/metro has multiple shops, meetups, or guild/instructor partners active enough that a shared container would reduce discovery friction.
   - Meetup RSVPs/waitlists indicate recurring local interest, not one-off curiosity.
   - Shop follows + meetup RSVPs + SAL joins cluster around the same local entities.

4. Search/navigation pain
   - Users or hosts ask where to find “everything from this shop/guild/designer/city” or “the next event after this SAL.”
   - Analytics show repeated visits to host/store/profile/SAL pages that could be better served by a single lightweight hub.
   - Support/interview notes mention continuity, event discovery, or local group identity more than general discussion.

5. Retention/value signal
   - Cohort members have better 4-week retention, project updates, shop clicks, comments, or meetup RSVPs than non-cohort users.
   - Shops/designers can explain a paid or strategic reason for wanting the surface: meetup fill, SAL sponsorship, guild reputation, or local visibility.

If the evidence is weak, continue improving SAL detail, host pages, shop pages, meetup discovery, and analytics instead.

## Analytics needed before deciding

Instrument or make queryable these signals before implementation planning:

### SAL depth events/counts

- `sal_view`: SAL detail viewed by user/anon cohort, SAL id, host id/type, surface.
- `sal_join`: user joins SAL.
- `sal_submit_project`: user submits a public project.
- `sal_project_update_after_join`: user updates a submitted project after joining.
- SAL repeat participation: users joining/submitting to more than one SAL by host/city/theme.
- SAL host recurrence: number of SALs per host over trailing 90 days.

Use stable IDs and coarse context only; follow the no-PII pattern in `docs/outbound-click-events.md`. Do not store free-text notes, raw URLs, precise location, IP, user agent, or custom tracking IDs for this decision.

### Meetup/local signals

- Meetup detail views, RSVP/register/waitlist counts, cancellation/no-show if available.
- Repeat RSVP by host/shop/city.
- Shop profile views, follows, website/product clicks, and DMs where applicable.
- City-level density: active shops, active meetups, active SAL participants.

### Group-demand derived signals

These can initially be computed without building groups:

- Cohort candidate score by `(host_id | shop_id | city | theme)`:
  - active SAL count
  - active meetup count
  - unique joined users
  - repeat users
  - project submissions
  - shop follows
  - outbound clicks / RSVP intent
- Host continuity gap:
  - users who join a SAL and later visit the same host/store/profile looking for related events.
- User research tags:
  - “guild,” “group,” “circle,” “club,” “where is the next one,” “local stitching night,” “same host.”

## Minimal feature shape if criteria are met

### Object model

A light group/guild is a profile-like hub with optional host ownership:

- name
- handle/slug
- type: `local_guild | shop_circle | designer_cohort | instructor_group | theme_group`
- short description
- location label only when relevant; no precise member locations
- owner/manager user id or store/profile association
- optional cover/avatar
- public visibility only for V1
- member/follower count
- linked SALs
- linked meetups/classes
- public project gallery from linked SALs or tagged public projects

Membership in V1 should be closer to “follow/join this circle” than a private permission model. Keep it public, reversible, and low stakes.

### User flows

F1 — Discover a guild/group from an existing surface
1. User opens a SAL, meetup, shop profile, or creator profile.
2. If the host has a qualifying group, a small card links to the group hub.
3. User opens the hub to see current SALs, upcoming meetups, and public project activity.

F2 — Follow/join a light group
1. Signed-in user taps Follow/Join on a group hub.
2. Group appears in a small “Your circles” rail or Account/Studio section.
3. User can unfollow/leave at any time.
4. Guest is sent to auth with return path.

F3 — Host-managed group page
1. Approved host/shop/designer creates or claims one group hub.
2. Host can edit name, description, cover, and which existing SALs/meetups are featured.
3. Host cannot create arbitrary forum threads or private channels.

F4 — Project association
1. Public SAL submissions can appear in the group project gallery.
2. Optional later: public project can be tagged to one group if the owner chooses.
3. Private projects never appear.

### V1 surfaces

- Group detail route, e.g. `/groups/:handle` or `/guilds/:handle` after naming decision.
- Small cards from SAL detail, meetup detail, shop profile, creator profile.
- “Your circles” rail on Studio only if the user follows at least one.
- Admin/host create/edit can be manual or hidden in V1; no public self-serve until moderation is ready.

## Non-goals

- Full forums, topic boards, nested comment threads, or channels.
- Private groups, invite codes, role hierarchies, complex permissions, or paid membership.
- Realtime chat or DM replacement.
- Marketplace checkout, carts, subscriptions, dues, or ticketing.
- Public SEO community pages before moderation and quality bar are proven.
- Algorithmic group recommendations beyond simple existing interest/city/host signals.
- User location sharing or precise map-based member discovery.
- General-purpose “create any group about anything.”

## Dependencies

Build only after these are true or explicitly accepted as constraints:

- Multi-SAL list/detail/host create is live and measured.
- Meetup RSVP/register/waitlist analytics are queryable.
- Shop follow, outbound click, profile/store views, and creator/profile link intent are queryable enough for cohort scoring.
- Private project visibility rules remain authoritative; group galleries only show public projects.
- Reporting/moderation entry points exist for project/profile/store and can be extended to group if needed.
- Naming decision: “guilds” may be more needlepoint-native, but “groups” may be clearer to new users. Avoid implying official ANG/EGA affiliation unless verified.
- Host eligibility decision: shop owner, creator, instructor, admin-approved user, or any signed-in user.
- Moderation owner decision: who can remove a group, edit metadata, or handle abuse reports.

## Validation plan before build

1. Create a weekly dashboard/query for cohort candidates by host/city/theme using SAL joins, submissions, meetup RSVPs, shop follows, and outbound clicks.
2. Interview 5–10 high-intent users or hosts from the strongest cohort candidates.
3. Test naming with users: “Guild,” “Circle,” “Group,” “Club,” or “Cohort.”
4. Manually mock 1–2 hub pages in docs or a non-shipped prototype before schema work.
5. If demand is still strong, write an implementation PRD for a single V1 slice: public group hub + follow + linked SALs/meetups. Do not include forum/threading in that PRD.

## Implementation slice only if approved later

P0 should be one thin vertical slice:

- Admin/manual create group.
- Public group detail page.
- Follow/join group.
- Link existing SALs and meetups to group.
- Show public submitted projects from linked SALs.
- Basic report group entry if reporting framework exists.

P0 should not include self-serve public group creation unless moderation capacity is already decided.

## Acceptance criteria for a future implementation PRD

Before engineering starts, the PRD must confirm:

1. The feature is described as light guilds/groups, not forums.
2. The analytics thresholds or qualitative evidence that triggered build are linked directly in the PRD.
3. V1 uses existing primitives: SALs, meetups, public projects, follows, shop/creator profiles.
4. Private project leakage is explicitly blocked.
5. Forum/chat/channel/threading behavior is listed under non-goals.
6. Success metrics are defined before launch.
7. Host creation and moderation ownership are decided.

## Success metrics if built

- % of group followers who return weekly.
- SAL joins/submissions from group hubs.
- Meetup RSVPs from group hubs.
- Repeat participation in same host/city/theme cohort.
- Shop follows and outbound clicks from group-adjacent surfaces.
- Report/abuse rate per active group.
- Number of active groups with ≥1 new linked activity per month.

## Open questions

- Should the user-facing name be “Guilds,” “Groups,” “Circles,” or “Clubs”?
- Are official needlepoint guilds a target partner category, or should V1 focus on shop/designer/instructor circles first?
- Should groups be public-only indefinitely, or is private membership ever necessary?
- Who is allowed to create a group: admin only, shop owners, creators, instructors, or any signed-in user?
- Does Needlepoint need group-level reporting before launch, or can reports target group owners/content initially?
- Should local groups require a city label, and how do we avoid implying exact member locations?
- Is a group follow distinct from following the shop/creator host, or should it be a presentation layer over existing follows?

## Bottom line

Light guilds/groups are a later continuity layer, not a product pillar to build now. The right next step is to deepen and instrument SALs and meetups, then let repeated host/city/theme behavior prove whether a lightweight hub is needed. If the proof appears, ship a public profile-like hub around existing SALs, meetups, and public projects — not a forum.
