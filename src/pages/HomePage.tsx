import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Plus } from "lucide-react";
import type { Creator, Project, StitchAlong, Store } from "../types";
import type { View } from "../appModel";
import {
  formatDistanceMiles,
  LOCAL_DRIVING_RADIUS_MILES,
  rankStoresForUser,
  requestBrowserLocation,
  type GeoPoint,
} from "../lib/geo";
import { FeedPost, FollowedStoresRail, type FollowedStoreRailItem } from "../components/feed";
import { EmptyState } from "../components/ui";

export function HomeView(props: {
  projects: Project[];
  stitchAlong: StitchAlong;
  /** Active stitch-alongs for the Studio rail (multi-SAL). */
  stitchAlongs?: StitchAlong[];
  followedCreators: string[];
  /** Store ids the user follows; resolved against `stores` for the rail. */
  followedStoreIds?: string[];
  /** When true, rail shows skeletons (remote hydrate). */
  followedStoresLoading?: boolean;
  savedCount: number;
  stores: Store[];
  creatorById: (id: string) => Creator;
  setView: (view: View) => void;
  openDiscover: (patch?: Partial<{ category: string; stitch: string; color: string; status: string; query: string }>) => void;
  toggleLike: (id: string) => void;
  toggleSave: (id: string) => void;
  shareProject: (id: string) => void;
  dismissRecommendation?: (projectId: string) => void;
  hasInterests?: boolean;
  /** Hide create CTAs for signed-out guests. */
  canPost?: boolean;
  /** True while remote Studio boot is still in flight. */
  feedLoading?: boolean;
}) {
  void props.savedCount;
  void props.openDiscover;
  const canPost = props.canPost !== false;
  const feedLoading = Boolean(props.feedLoading);
  const feed = props.projects;
  const followedFeedCount = feed.filter((project) => props.followedCreators.includes(project.creatorId)).length;
  const [userPoint, setUserPoint] = useState<GeoPoint | null>(null);

  const activeStitchAlongs = useMemo(() => {
    const list = props.stitchAlongs?.length ? props.stitchAlongs : props.stitchAlong ? [props.stitchAlong] : [];
    return list.filter((event) => event.isPublic !== false && (event.status ?? "active") !== "ended").slice(0, 6);
  }, [props.stitchAlong, props.stitchAlongs]);

  const followedStoresForRail = useMemo(() => {
    const ids = props.followedStoreIds ?? [];
    if (!ids.length) return [] as FollowedStoreRailItem[];
    const byId = new Map(props.stores.map((store) => [store.id, store]));
    return ids.map((id) => byId.get(id)).filter((store): store is Store => Boolean(store));
  }, [props.followedStoreIds, props.stores]);

  useEffect(() => {
    let cancelled = false;
    requestBrowserLocation()
      .then((point) => {
        if (!cancelled) setUserPoint(point);
      })
      .catch(() => {
        /* optional on home strip */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rankedStores = useMemo(
    () => rankStoresForUser(props.stores, userPoint, LOCAL_DRIVING_RADIUS_MILES).shown.slice(0, 10),
    [props.stores, userPoint],
  );

  return (
    <section className="page feed-page">
      <header className="feed-topbar">
        <div>
          <h1 className="feed-title">Studio</h1>
          <p className="feed-subtitle">
            {followedFeedCount
              ? "Canvases from people you follow, then picks matched to your interests"
              : props.hasInterests
                ? "Picks matched to your onboarding interests"
                : "Projects, progress notes, photos & video"}
          </p>
        </div>
        <div className="feed-top-actions">
          {canPost ? (
            <button className="primary" type="button" onClick={() => props.setView({ name: "journal" })}>
              <Plus size={18} /> New post
            </button>
          ) : (
            <button className="secondary" type="button" onClick={() => props.setView({ name: "auth" })}>
              Sign in to post
            </button>
          )}
        </div>
      </header>

      {activeStitchAlongs.length > 0 ? (
        <section className="studio-sal-rail" aria-label="Active stitch-alongs">
          <div className="followed-stores-rail-header">
            <h2 className="followed-stores-rail-title">
              <CalendarDays size={16} aria-hidden /> Active stitch-alongs
            </h2>
            <button type="button" className="text-button" onClick={() => props.setView({ name: "stitchAlong" })}>
              See all
            </button>
          </div>
          <div className="store-rail-scroll" role="list">
            {activeStitchAlongs.map((event) => (
              <button
                key={event.id}
                type="button"
                role="listitem"
                className="sal-rail-card"
                onClick={() => props.setView({ name: "stitchAlong", id: event.id })}
              >
                <img src={event.coverImageUrl || "/assets/needlepoint-hero.png"} alt="" />
                <span className="store-rail-card-name">{event.title}</span>
                <small>
                  {event.dates}
                  {typeof event.participantCount === "number" ? ` · ${event.participantCount} joined` : ""}
                </small>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <FollowedStoresRail
        stores={followedStoresForRail}
        loading={Boolean(props.followedStoresLoading)}
        setView={props.setView}
      />

      {rankedStores.length > 0 && (
        <div className="feed-store-strip" aria-label="Shops near you">
          {rankedStores.map((store) => (
            <button
              key={store.id}
              type="button"
              className="feed-store-chip"
              onClick={() => props.setView({ name: "store", handle: store.handle })}
            >
              <img src={store.avatar || "/assets/needlepoint-hero.png"} alt="" />
              <span>
                {store.name}
                {store.distanceMiles != null ? ` · ${formatDistanceMiles(store.distanceMiles)}` : ""}
              </span>
            </button>
          ))}
          <button type="button" className="feed-store-chip more" onClick={() => props.setView({ name: "stores" })}>
            All shops
          </button>
        </div>
      )}

      <div className="feed-timeline" aria-label="Studio feed">
        {feedLoading ? (
          <div className="feed-list-skeleton" aria-busy="true" aria-label="Loading studio feed">
            {[0, 1].map((i) => (
              <article key={i} className="feed-post feed-post-skeleton" aria-hidden="true">
                <header className="feed-post-header">
                  <span className="feed-avatar feed-skel-avatar skeleton-bone skeleton-bone--circle" />
                  <div className="feed-post-heading">
                    <div className="feed-skel-meta">
                      <span className="skeleton-text-line" style={{ width: "40%" }} />
                      <span className="skeleton-text-line" style={{ width: "24%" }} />
                    </div>
                  </div>
                </header>
                <div className="feed-skel-media skeleton-bone" />
                <div className="feed-skel-actions">
                  <span className="skeleton-text-line" style={{ width: "48px" }} />
                  <span className="skeleton-text-line" style={{ width: "48px" }} />
                  <span className="skeleton-text-line" style={{ width: "48px" }} />
                  <span className="skeleton-text-line" style={{ width: "48px" }} />
                </div>
              </article>
            ))}
          </div>
        ) : feed.length ? (
          feed.map((project) => (
            <FeedPost
              key={project.id}
              project={project}
              creator={props.creatorById(project.creatorId)}
              setView={props.setView}
              toggleLike={props.toggleLike}
              toggleSave={props.toggleSave}
              shareProject={props.shareProject}
              onDismiss={props.dismissRecommendation}
            />
          ))
        ) : (
          <EmptyState
            variant="panel"
            minHeight={280}
            title="No posts yet"
            body={canPost ? "Share a project photo, note, or short video." : "Sign in to share a project photo, note, or short video."}
            action={canPost ? "Create post" : "Sign in"}
            onAction={() => props.setView({ name: canPost ? "journal" : "auth" })}
          />
        )}
      </div>
    </section>
  );
}

export { HomeView as HomePage };
