/**
 * Usage examples for shared UI state primitives (list + detail).
 * Not mounted in the app router — copy patterns into pages, or import in a
 * local playground. Full guide: docs/ui-state-primitives.md
 */
import type { ReactNode } from "react";
import {
  CardGridSkeleton,
  DetailSkeleton,
  EmptyState,
  ErrorState,
  FeedListSkeleton,
  PageLoading,
} from "./ui";

/** List surface: loading → error → empty → content, stable min height. */
export function ListStateExample({
  phase,
  onRetry,
  onCreate,
  children,
}: {
  phase: "loading" | "error" | "empty" | "ready";
  onRetry?: () => void;
  onCreate?: () => void;
  children?: ReactNode;
}) {
  if (phase === "loading") {
    return <FeedListSkeleton count={3} withMedia label="Loading posts" />;
  }
  if (phase === "error") {
    return (
      <ErrorState
        variant="panel"
        minHeight={280}
        title="Couldn’t load the feed"
        body="Check your connection and try again."
        action="Try again"
        onAction={onRetry}
      />
    );
  }
  if (phase === "empty") {
    return (
      <EmptyState
        variant="panel"
        minHeight={280}
        title="No posts yet"
        body="Share a project photo, note, or short video."
        action="Create post"
        onAction={onCreate}
      />
    );
  }
  return <div className="feed-timeline">{children}</div>;
}

/** Detail surface: loading → error → not found → content. */
export function DetailStateExample({
  phase,
  onRetry,
  onBack,
  children,
}: {
  phase: "loading" | "error" | "empty" | "ready";
  onRetry?: () => void;
  onBack?: () => void;
  children?: ReactNode;
}) {
  if (phase === "loading") {
    return <DetailSkeleton label="Loading project" />;
  }
  if (phase === "error") {
    return (
      <ErrorState
        variant="detail"
        minHeight={320}
        title="Couldn’t open this project"
        body="Something went wrong while loading details."
        action="Retry"
        onAction={onRetry}
      />
    );
  }
  if (phase === "empty") {
    return (
      <EmptyState
        variant="detail"
        minHeight={320}
        title="Project not found"
        body="That project may have been moved, removed, or is not available."
        action="Back home"
        onAction={onBack}
      />
    );
  }
  return <>{children}</>;
}

/** Card grid + auth page hydrate samples. */
export function OtherStateExamples() {
  return (
    <div className="page" style={{ display: "grid", gap: 24 }}>
      <CardGridSkeleton count={4} label="Loading cards" />
      <PageLoading eyebrow="Account" title="Loading your session…" variant="detail" minHeight={240} />
      <EmptyState
        variant="inline"
        title="Nothing saved here yet"
        body="Save projects from discovery to build this board."
        minHeight={180}
      />
    </div>
  );
}
