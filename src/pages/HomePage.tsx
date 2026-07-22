import { useEffect, useMemo, useState } from "react";
import { CalendarDays, MapPin, Plus, UsersRound } from "lucide-react";
import type { Creator, Project, StitchAlong, StitchingMeetup, Store } from "../types";
import type { View } from "../appModel";
import {
  formatDistanceMiles,
  LOCAL_DRIVING_RADIUS_MILES,
  rankStoresForUser,
  requestBrowserLocation,
  type GeoPoint,
} from "../lib/geo";
import { loadLocationConsent } from "../lib/locationConsent";
import { filterUpcomingMeetups, formatMeetupPlace, formatMeetupWhen } from "../lib/meetups";
import { FeedPost, FollowedStoresRail, type FollowedStoreRailItem } from "../components/feed";
import { EmptyState, ErrorState, FeedListSkeleton } from "../components/ui";
import { uiCopy } from "../lib/uiCopy";
import { HOME_BRAND, HOME_FEED_ARIA } from "../lib/brand";
import { ThemeToggle } from "../components/ThemeToggle";

export function HomeView(props: {
  projects: Project[];
  stitchAlong: StitchAlong;
  /** Active stitch-alongs for the Studio rail (multi-SAL). */
  stitchAlongs?: StitchAlong[];
  /** Upcoming public meetups for Studio rail. */
  meetups?: StitchingMeetup[];
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
  onAddComment?: (projectId: string, body: string) => void | Promise<void>;
  onRequireAuth?: () => void;
  toggleSave: (id: string) => void;
  shareProject: (id: string) => void;
  dismissRecommendation?: (projectId: string) => void;
  hasInterests?: boolean;
  /** Hide create CTAs for signed-out guests. */
  canPost?: boolean;
  /** True while remote Studio boot is still in flight. */
  feedLoading?: boolean;
  /** True when remote Studio refresh failed after/during boot. */
  feedRefreshError?: boolean;
  onRetryFeed?: () => void;
}) {
  void props.savedCount;
  const canPost = props.canPost !== false;
  const feedLoading = Boolean(props.feedLoading);
  const feedRefreshError = Boolean(props.feedRefreshError);
  const feed = props.projects;
  const followedFeedCount = feed.filter((project) => props.followedCreators.includes(project.creatorId)).length;
  const showFollowedEmptyCoach =
    !feedLoading &&
    feed.length > 0 &&
    props.followedCreators.length > 0 &&
    followedFeedCount === 0;
  const [userPoint, setUserPoint] = useState<GeoPoint | null>(null);

  const activeStitchAlongs = useMemo(() => {
    const list = props.stitchAlongs?.length ? props.stitchAlongs : props.stitchAlong ? [props.stitchAlong] : [];
    return list.filter((event) => event.isPublic !== false && (event.status ?? "active") !== "ended").slice(0, 6);
  }, [props.stitchAlong, props.stitchAlongs]);

  const upcomingMeetups = useMemo(
    () => filterUpcomingMeetups(props.meetups ?? []).slice(0, 6),
    [props.meetups],
  );

  const followedStoresForRail = useMemo(() => {
    const ids = props.followedStoreIds ?? [];
    if (!ids.length) return [] as FollowedStoreRailItem[];
    const byId = new Map(props.stores.map((store) => [store.id, store]));
    return ids.map((id) => byId.get(id)).filter((store): store is Store => Boolean(store));
  }, [props.followedStoreIds, props.stores]);

  useEffect(() => {
    let cancelled = false;
    // Only use GPS on home after the user allowed location on Shops (no silent prompt).
    if (loadLocationConsent() !== "allowed") return;
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
          <h1 className="feed-title">{HOME_BRAND}</h1>
          <p className="feed-subtitle">Your home in the Palace — shops up top, stitches below</p>
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

      {!canPost ? (
        <div className="guest-theme-slot" data-testid="guest-theme-toggle">
          <ThemeToggle compact />
        </div>
      ) : null}

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

      {upcomingMeetups.length > 0 ? (
        <section className="studio-sal-rail studio-meetup-rail" aria-label="Upcoming stitching meetups">
          <div className="followed-stores-rail-header">
            <h2 className="followed-stores-rail-title">
              <UsersRound size={16} aria-hidden /> Stitching meetups
            </h2>
            <button type="button" className="text-button" onClick={() => props.setView({ name: "meetups" })}>
              See all
            </button>
          </div>
          <div className="store-rail-scroll" role="list">
            {upcomingMeetups.map((meetup) => (
              <button
                key={meetup.id}
                type="button"
                role="listitem"
                className="sal-rail-card"
                onClick={() => props.setView({ name: "meetup", id: meetup.id })}
              >
                <img src={meetup.coverImageUrl || "/assets/needlepoint-hero.png"} alt="" />
                <span className="store-rail-card-name">{meetup.title}</span>
                <small>
                  <MapPin size={12} aria-hidden /> {formatMeetupPlace(meetup)}
                </small>
                <small>{formatMeetupWhen(meetup)}</small>
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
        <div className="feed-store-strip-block" aria-label="Shops near you">
          <div className="followed-stores-rail-header">
            <h2 className="followed-stores-rail-title">
              <MapPin size={16} aria-hidden /> Shops near you
            </h2>
            <button type="button" className="text-button" onClick={() => props.setView({ name: "stores" })}>
              See all
            </button>
          </div>
          <div className="feed-store-strip">
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
        </div>
      )}

      <section className="palace-feed-section" aria-labelledby="palace-feed-heading">
        <header className="palace-feed-header">
          <div>
            <p className="palace-feed-kicker">Community</p>
            <h2 id="palace-feed-heading" className="palace-feed-title">
              Latest stitches
            </h2>
            <p className="palace-feed-lede">
              {followedFeedCount
                ? "Posts from makers you follow, then fresh public projects"
                : props.hasInterests
                  ? "Projects matched to your interests, plus fresh public stitches"
                  : "Progress notes, photos, and finished canvases from the community"}
            </p>
          </div>
        </header>

      {feedRefreshError && !feedLoading && feed.length > 0 ? (
        <div className="feed-refresh-notice panel" role="status">
          <div>
            <strong>{uiCopy.studio.feed.refreshError.title}</strong>
            <p>{uiCopy.studio.feed.refreshError.body}</p>
          </div>
          {props.onRetryFeed ? (
            <button type="button" className="secondary" onClick={props.onRetryFeed}>
              {uiCopy.studio.feed.refreshError.cta}
            </button>
          ) : null}
        </div>
      ) : null}

      {showFollowedEmptyCoach ? (
        <div className="feed-followed-coach" role="status">
          <p>{uiCopy.studio.feed.followedEmptyInline}</p>
          <button type="button" className="text-button" onClick={() => props.openDiscover()}>
            {uiCopy.studio.feed.followedEmptyCta}
          </button>
        </div>
      ) : null}

      {feedLoading ? (
        <FeedListSkeleton count={4} withMedia label={uiCopy.studio.feed.loading} />
      ) : feedRefreshError && feed.length === 0 ? (
        <div className="feed-timeline" aria-label={HOME_FEED_ARIA}>
          <ErrorState
            variant="panel"
            minHeight={280}
            title={uiCopy.studio.feed.refreshError.title}
            body={uiCopy.studio.feed.refreshError.body}
            action={props.onRetryFeed ? uiCopy.studio.feed.refreshError.cta : undefined}
            onAction={props.onRetryFeed}
          />
        </div>
      ) : feed.length ? (
        <div className="feed-timeline" aria-label={HOME_FEED_ARIA}>
          {feed.map((project) => (
            <FeedPost
              key={project.id}
              project={project}
              creator={props.creatorById(project.creatorId)}
              setView={props.setView}
              toggleLike={props.toggleLike}
              toggleSave={props.toggleSave}
              shareProject={props.shareProject}
              onDismiss={props.dismissRecommendation}
              canComment={canPost}
              onAddComment={props.onAddComment}
              onRequireAuth={props.onRequireAuth}
            />
          ))}
        </div>
      ) : (
        <div className="feed-timeline" aria-label={HOME_FEED_ARIA}>
          <EmptyState
            variant="panel"
            minHeight={280}
            title={uiCopy.studio.feed.empty.title}
            body={canPost ? uiCopy.studio.feed.empty.body : uiCopy.studio.feed.empty.guestBody}
            action={canPost ? uiCopy.studio.feed.empty.cta : uiCopy.studio.feed.empty.guestCta}
            onAction={() => props.setView({ name: canPost ? "journal" : "auth" })}
          />
        </div>
      )}
      </section>
    </section>
  );
}

export { HomeView as HomePage };
