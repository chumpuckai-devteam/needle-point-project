import { Bookmark, Heart, MessageCircle, Share2, X } from "lucide-react";
import type { Creator, Project, Status, Store } from "../types";
import type { View } from "../appModel";
import { projectCommentCount, resolveMediaKind } from "../appModel";
import { uiCopy } from "../lib/uiCopy";

const STATUS_LABELS: Record<Status, string> = {
  planned: "Planned",
  "in progress": "WIP",
  finished: "Finished",
  paused: "Paused",
};

function creatorInitials(creator: Creator) {
  const source = (creator.name || creator.handle || "NP").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function shouldShowProjectTitle(title: string, body: string) {
  const cleaned = title.trim();
  if (!cleaned) return false;
  if (cleaned.toLowerCase() === body.trim().toLowerCase()) return false;
  // Avoid showing single UI-ish words that look like action chrome
  if (/^(bookmark|like|share|comment|save|post)$/i.test(cleaned)) return false;
  return true;
}

export type FollowedStoreRailItem = Pick<Store, "id" | "name" | "handle" | "avatar" | "storeType" | "city" | "location">;

function storeRailMeta(store: FollowedStoreRailItem) {
  if (store.storeType === "online") return "Online";
  if (store.city?.trim()) return store.city.trim();
  if (store.location?.trim()) return store.location.trim();
  if (store.storeType === "both") return "Local · ships";
  return "Local";
}

/**
 * Horizontal Followed shops rail for Studio home.
 * Parent supplies resolved stores + loading; empty CTA opens Shops browse.
 */

export function FollowedStoresRail({
  stores,
  loading = false,
  setView,
}: {
  stores: FollowedStoreRailItem[];
  loading?: boolean;
  setView: (view: View) => void;
}) {
  const goBrowseShops = () => setView({ name: "stores" });

  return (
    <section className="followed-stores-rail" aria-label="Followed shops">
      <div className="followed-stores-rail-header">
        <h2 className="followed-stores-rail-title">Followed shops</h2>
        {!loading && stores.length > 0 ? (
          <button type="button" className="text-button" onClick={goBrowseShops}>
            Browse shops
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="store-rail-scroll" aria-busy="true" aria-label="Loading followed shops">
          {[0, 1, 2].map((i) => (
            <div key={i} className="store-rail-card store-rail-card-skeleton" aria-hidden="true">
              <span className="store-rail-skel-avatar" />
              <span className="store-rail-skel-line" />
              <span className="store-rail-skel-line short" />
            </div>
          ))}
        </div>
      ) : stores.length === 0 ? (
        <div className="followed-stores-empty">
          <strong>{uiCopy.studio.followedShops.empty.title}</strong>
          <p>{uiCopy.studio.followedShops.empty.body}</p>
          <button type="button" className="primary" onClick={goBrowseShops}>
            {uiCopy.studio.followedShops.empty.cta}
          </button>
        </div>
      ) : (
        <div className="store-rail-scroll" role="list">
          {stores.map((store) => {
            const avatarSrc = store.avatar?.trim() || "/assets/needlepoint-hero.png";
            return (
              <button
                key={store.id}
                type="button"
                role="listitem"
                className="store-rail-card"
                onClick={() => setView({ name: "store", handle: store.handle })}
                aria-label={`Open ${store.name}`}
              >
                <img src={avatarSrc} alt="" />
                <span className="store-rail-card-name">{store.name}</span>
                <small>{storeRailMeta(store)}</small>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function FeedPost({
  project,
  creator,
  setView,
  toggleLike,
  toggleSave,
  shareProject,
  onDismiss,
  matchHint,
}: {
  project: Project;
  creator: Creator;
  setView: (view: View) => void;
  toggleLike: (id: string) => void;
  toggleSave: (id: string) => void;
  shareProject: (id: string) => void;
  /** Optional skip/dismiss for recommendation surfaces. */
  onDismiss?: (projectId: string) => void;
  /** Optional “Because you picked …” copy when matched interests exist. */
  matchHint?: string;
}) {
  const mediaKind = resolveMediaKind(project);
  const commentCount = projectCommentCount(project);
  const body = project.notes?.trim() || "";
  const showTitle = shouldShowProjectTitle(project.title || "", body);
  const avatarSrc = creator.avatar?.trim() || "";
  const initials = creatorInitials(creator);
  const statusLabel = STATUS_LABELS[project.status] || project.status;
  const hint =
    matchHint ??
    (project.matchedInterests?.length
      ? `Because you picked ${project.matchedInterests.slice(0, 2).join(" · ")}`
      : undefined);

  return (
    <article className="feed-post">
      <header className="feed-post-header">
        <button
          type="button"
          className="feed-avatar-btn"
          onClick={() => setView({ name: "profile", id: creator.id })}
          aria-label={`@${creator.handle}`}
        >
          {avatarSrc ? (
            <img src={avatarSrc} alt="" className="feed-avatar" />
          ) : (
            <span className="feed-avatar feed-avatar-fallback" aria-hidden="true">
              {initials}
            </span>
          )}
        </button>

        <div className="feed-post-heading">
          <div className="feed-post-meta">
            <button type="button" className="feed-name" onClick={() => setView({ name: "profile", id: creator.id })}>
              {creator.name}
            </button>
            <button type="button" className="feed-handle" onClick={() => setView({ name: "profile", id: creator.id })}>
              @{creator.handle}
            </button>
            {project.updates[0]?.date ? <span className="feed-dot">·</span> : null}
            {project.updates[0]?.date ? <span className="feed-time">{project.updates[0].date}</span> : null}
            <span className={`feed-status status-${project.status.replace(/\s+/g, "-")}`}>{statusLabel}</span>
          </div>
          {hint ? <p className="feed-match-hint">{hint}</p> : null}
        </div>

        {onDismiss ? (
          <button
            type="button"
            className="feed-dismiss"
            onClick={() => onDismiss(project.id)}
            aria-label="Not interested"
            title="Not interested"
          >
            <X size={16} />
          </button>
        ) : null}
      </header>

      <div className="feed-post-body">
        {showTitle ? (
          <button type="button" className="feed-post-title" onClick={() => setView({ name: "project", id: project.id })}>
            {project.title}
          </button>
        ) : null}

        {body ? (
          <button type="button" className="feed-post-text" onClick={() => setView({ name: "project", id: project.id })}>
            {body}
          </button>
        ) : !showTitle && project.title?.trim() ? (
          <button type="button" className="feed-post-text" onClick={() => setView({ name: "project", id: project.id })}>
            {project.title}
          </button>
        ) : null}

        {mediaKind === "image" && project.image ? (
          <button type="button" className="feed-media" onClick={() => setView({ name: "project", id: project.id })}>
            <img src={project.image} alt={project.title} />
          </button>
        ) : null}

        {mediaKind === "video" && project.videoUrl ? (
          <div className="feed-media feed-media-video">
            <video controls playsInline preload="metadata" poster={project.image || undefined} src={project.videoUrl}>
              <track kind="captions" />
            </video>
          </div>
        ) : null}

        {mediaKind === "text" && !body && !project.title ? (
          <p className="feed-post-text muted">Untitled post</p>
        ) : null}

        <div className="feed-actions" role="group" aria-label="Post actions">
          <button type="button" className="feed-action" onClick={() => setView({ name: "project", id: project.id })} aria-label="Comment">
            <MessageCircle size={18} />
            {commentCount > 0 ? <span>{commentCount}</span> : null}
          </button>
          <button
            type="button"
            className={`feed-action like ${project.isLiked ? "selected" : ""}`}
            onClick={() => toggleLike(project.id)}
            aria-label={project.isLiked ? "Unlike" : "Like"}
            aria-pressed={project.isLiked}
          >
            <Heart size={18} fill={project.isLiked ? "currentColor" : "none"} />
            {project.likes > 0 ? <span>{project.likes}</span> : null}
          </button>
          <button
            type="button"
            className={`feed-action bookmark ${project.isSaved ? "selected" : ""}`}
            onClick={() => toggleSave(project.id)}
            aria-label={project.isSaved ? "Remove from saved" : "Save"}
            aria-pressed={project.isSaved}
          >
            <Bookmark size={18} fill={project.isSaved ? "currentColor" : "none"} />
          </button>
          <button type="button" className="feed-action" onClick={() => shareProject(project.id)} aria-label="Share">
            <Share2 size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}

export function VisualProjectTile({
  project,
  creator,
  setView,
  toggleLike,
  toggleSave,
}: {
  project: Project;
  creator: Creator;
  setView: (view: View) => void;
  toggleLike: (id: string) => void;
  toggleSave: (id: string) => void;
}) {
  const mediaKind = resolveMediaKind(project);
  return (
    <article className="visual-tile">
      <button type="button" className="visual-tile-media" onClick={() => setView({ name: "project", id: project.id })}>
        {mediaKind === "video" && project.videoUrl ? (
          <video muted playsInline preload="metadata" poster={project.image || undefined} src={project.videoUrl} />
        ) : project.image ? (
          <img src={project.image} alt={project.title} />
        ) : (
          <div className="visual-tile-text-only">
            <span>{project.title}</span>
          </div>
        )}
      </button>
      <div className="visual-tile-meta">
        <button type="button" className="linklike" onClick={() => setView({ name: "profile", id: creator.id })}>
          @{creator.handle}
        </button>
        <strong className="visual-tile-title">{project.title}</strong>
        <div className="card-actions">
          <button type="button" onClick={() => toggleLike(project.id)} className={project.isLiked ? "selected" : ""}>
            <Heart size={16} /> {project.likes}
          </button>
          <button type="button" onClick={() => toggleSave(project.id)} className={project.isSaved ? "selected" : ""}>
            <Bookmark size={16} />
          </button>
          <button type="button" onClick={() => setView({ name: "project", id: project.id })}>
            <MessageCircle size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}

export function ProjectCard({
  project,
  creator,
  setView,
  toggleLike,
  toggleSave,
  compact = false,
}: {
  project: Project;
  creator: Creator;
  setView: (view: View) => void;
  toggleLike: (id: string) => void;
  toggleSave: (id: string) => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <VisualProjectTile project={project} creator={creator} setView={setView} toggleLike={toggleLike} toggleSave={toggleSave} />
    );
  }
  return (
    <article className="project-card">
      <button className="image-button" onClick={() => setView({ name: "project", id: project.id })}>
        {project.image ? <img src={project.image} alt={project.title} /> : <div className="visual-tile-text-only"><span>{project.title}</span></div>}
      </button>
      <div className="card-body">
        <div>
          <button className="linklike" onClick={() => setView({ name: "profile", id: creator.id })}>
            @{creator.handle}
          </button>
          <h3>{project.title}</h3>
          <p>{project.notes}</p>
        </div>
        <div className="tag-row">
          <span>{project.difficulty}</span>
          <span>{project.status}</span>
          <span>{project.stitchTypes[0]}</span>
        </div>
        <div className="progress"><span style={{ width: `${project.progress}%` }} /></div>
        <div className="card-actions">
          <button onClick={() => toggleLike(project.id)} className={project.isLiked ? "selected" : ""}>
            <Heart size={17} /> {project.likes}
          </button>
          <button onClick={() => toggleSave(project.id)} className={project.isSaved ? "selected" : ""}>
            <Bookmark size={17} /> Save
          </button>
          <button onClick={() => setView({ name: "project", id: project.id })}>
            <MessageCircle size={17} /> {project.updates.reduce((count, update) => count + update.comments.length, 0)}
          </button>
        </div>
      </div>
    </article>
  );
}
