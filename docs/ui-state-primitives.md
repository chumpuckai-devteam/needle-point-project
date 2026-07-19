# UI state primitives (skeleton / empty / error)

Shared Moss & Flax surfaces for loading, empty, and recoverable errors across Studio feed, shops, journal, project detail, and auth.

**Source:** `src/components/ui.tsx`  
**Styles:** `src/styles.css` (search “Shared empty / error / loading”)  
**Barrel:** also re-exported from `src/AppComponents.tsx`

## Goals

- Stable dimensions so loading → content (or empty) does not jump the layout
- Title / body / CTA slots on empty and error
- Layout variants matching list, card, and detail patterns
- Tokens only (`--np-ink`, `--np-muted`, `--np-panel`, `--np-line`, teal/gold)

## Components

| Export | Use for |
|--------|---------|
| `Skeleton` | Single shimmer bone (width/height/circle) |
| `SkeletonText` | Stack of text lines |
| `FeedPostSkeleton` | One Studio feed row |
| `FeedListSkeleton` | Vertical list of feed rows (`aria-busy`) |
| `CardSkeleton` | Visual tile or wide project card |
| `CardGridSkeleton` | Collections / profile / discover grids |
| `DetailSkeleton` | Project / shop / profile hydrate |
| `PageLoading` | Auth session / generic page hydrate |
| `EmptyState` | No results / not found / zero data |
| `ErrorState` | Load failure with retry CTA |

### `StateVariant`

`panel` (default) · `inline` (dashed, lighter) · `compact` · `detail` (taller min-height)

Empty and error also accept:

- `action` + `onAction` — primary button
- `cta` — custom React node (links, dual buttons)
- `icon` — override default Inbox / AlertCircle
- `children` — extra slot under the body
- `minHeight` — number (px) or CSS string; reserve space for swap stability

## List example (Studio / Discover)

```tsx
import { EmptyState, ErrorState, FeedListSkeleton } from "../components/ui";
import { FeedPost } from "../components/feed";

function StudioFeed({ loading, error, feed, onRetry, ... }) {
  if (loading) {
    return <FeedListSkeleton count={3} withMedia label="Loading Studio feed" />;
  }

  if (error) {
    return (
      <ErrorState
        variant="panel"
        minHeight={280}
        title="Couldn’t load the feed"
        body={error}
        action="Try again"
        onAction={onRetry}
      />
    );
  }

  if (!feed.length) {
    return (
      <EmptyState
        variant="panel"
        minHeight={280}
        title="No posts yet"
        body="Share a project photo, note, or short video."
        action="Create post"
        onAction={() => setView({ name: "journal" })}
      />
    );
  }

  return (
    <div className="feed-timeline" aria-label="Studio feed">
      {feed.map((project) => (
        <FeedPost key={project.id} project={project} /* ... */ />
      ))}
    </div>
  );
}
```

`FeedListSkeleton` already applies `.feed-timeline` + a reserved `min-height` so swapping to real posts keeps the column height steady.

## Detail example (project / shop / profile)

```tsx
import { DetailSkeleton, EmptyState, ErrorState } from "../components/ui";

function ProjectGate({ loading, error, project, retry, setView }) {
  if (loading) {
    return <DetailSkeleton label="Loading project" />;
  }

  if (error) {
    return (
      <ErrorState
        variant="detail"
        minHeight={320}
        title="Couldn’t open this project"
        body={error}
        action="Retry"
        onAction={retry}
      />
    );
  }

  if (!project) {
    return (
      <EmptyState
        variant="detail"
        minHeight={320}
        title="Project not found"
        body="That project may have been moved, removed, or is not available."
        action="Back to discover"
        onAction={() => setView({ name: "discover" })}
      />
    );
  }

  return <ProjectDetail project={project} /* ... */ />;
}
```

## Card grid example

```tsx
import { CardGridSkeleton, EmptyState } from "../components/ui";

{loading ? (
  <CardGridSkeleton count={4} label="Loading saved projects" />
) : items.length === 0 ? (
  <EmptyState
    variant="inline"
    minHeight={220}
    title="Nothing saved here yet"
    body="Save projects from discovery to build this board."
  />
) : (
  <div className="saved-grid">{/* tiles */}</div>
)}
```

## Auth / page hydrate

```tsx
import { PageLoading } from "../components/ui";

if (loading) {
  return (
    <section className="page auth-page">
      <div className="auth-card">
        <PageLoading eyebrow="Account" title="Loading your session…" variant="detail" minHeight={280} />
      </div>
    </section>
  );
}
```

## Layout stability checklist

1. Prefer the matching skeleton (`FeedListSkeleton` / `CardGridSkeleton` / `DetailSkeleton`) over a spinner alone.
2. Pass the same `minHeight` (or rely on built-in mins) on empty/error as the loaded region.
3. Keep one parent wrapper (e.g. `.feed-timeline` or `.page`) across loading and loaded states when possible.
4. Use `aria-busy` / `role="status"` (skeletons) and `role="alert"` (errors) — already set on primitives.
5. Mobile (≤720px): detail skeletons stack to a single column; feed body pad collapses like real posts.
6. `prefers-reduced-motion: reduce` disables shimmer animation (static bone fill).

## Live call sites (seeded)

- `AuthPage` — `PageLoading` for session + profile hydrate
- `HomePage` — `EmptyState` with `minHeight` on empty Studio feed
- `ProjectRoute` / `ProfileRoute` / `StoreRoute` — detail `EmptyState` for not-found

Wire `FeedListSkeleton` / `ErrorState` wherever remote lists gain explicit loading/error flags.

## Building custom skeletons

```tsx
import { Skeleton, SkeletonText } from "../components/ui";

<div className="my-row" aria-busy="true" aria-label="Loading row">
  <Skeleton circle width={40} height={40} />
  <div>
    <Skeleton width="40%" height={12} />
    <SkeletonText lines={2} lastWidth="55%" />
  </div>
</div>
```

Shimmer animation: `@keyframes np-shimmer` (also used by followed-shops rail cards).
