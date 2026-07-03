# Needlepoint Niche Social Platform PRD

## Summary

A niche social platform for needlepoint enthusiasts that combines project tracking, pattern discovery, community sharing, and creator commerce. The product should not be a generic Instagram or Twitter clone. The wedge is a purpose-built craft workspace where users can document work-in-progress projects, find patterns and materials, join stitch-alongs, and discover creators with craft-specific metadata.

## Product Thesis

Generic social networks are useful for broad visibility but weak for craft-specific workflows. Needlepoint content on Instagram, Pinterest, Etsy, Facebook groups, and Reddit is fragmented across inspiration, purchasing, community, and personal progress tracking.

The product is viable if it starts as a valuable utility for a narrow audience and uses that utility to create social density. The first release should feel like a project journal plus pattern/inspiration library with lightweight community features, then grow into a fuller marketplace and creator network.

## Target Users

- Hobbyist needlepoint stitchers who want to track projects, save inspiration, and share progress.
- Advanced stitchers who participate in challenges, swaps, guilds, and stitch-alongs.
- Pattern designers and kit makers who need better discovery and monetization.
- Local shops, instructors, and guild organizers who want to promote classes, events, and materials.

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
- Seed social activity through project updates, comments, collections, and stitch-alongs.
- Validate whether a niche craft audience will return weekly without relying on generic feed mechanics.

## Non-Goals

- Competing head-on with Instagram, X/Twitter, or Pinterest for broad social behavior.
- Building a full marketplace in the first release.
- Supporting every fiber art category at launch.
- Creating complex creator monetization before engagement and retention are proven.
- Building private messaging before public community behavior is validated.

## MVP Scope

The MVP is complete when users can:

- Create an account and profile.
- Create project journal entries with photos, status, notes, and materials.
- Tag projects with stitch type, canvas type, thread/brand, difficulty, color palette, and pattern source.
- Browse and search public projects.
- Save projects to personal collections.
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

- Stitch-alongs have start/end dates, host, description, and participant count.
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
- Stitch-alongs as recurring community anchors.
- Creator and shop discovery tied to actual project outcomes.
- Collections designed around projects and patterns, not generic image boards.

## Monetization Options

MVP should validate engagement before monetization, but early architecture should support:

- Creator profile upgrades.
- Shop and instructor listings.
- Affiliate tracking for pattern and kit purchases.
- Marketplace take rate on patterns or kits.
- Paid stitch-alongs or classes.
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
