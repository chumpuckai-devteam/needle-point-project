import { FormEvent, useEffect, useId, useState } from "react";
import { Bookmark, CalendarDays, ExternalLink, Filter, Heart, Home, MessageCircle, Plus, Search, Share2, Sparkles, Store as StoreIcon, UserRound } from "lucide-react";
import type { Collection, Creator, Difficulty, Project, Status, StitchAlong, Store } from "./types";
import type { DraftProject, View } from "./appModel";
import { difficultyOptions, projectCommentCount, resolveMediaKind, statusOptions } from "./appModel";

export function Sidebar({ view, setView, savedCount }: { view: string; setView: (view: View) => void; savedCount: number }) {
  const items = [
    { id: "home", label: "Home", icon: Home, action: () => setView({ name: "home" }) },
    { id: "discover", label: "Discover", icon: Search, action: () => setView({ name: "discover" }) },
    { id: "stores", label: "Stores", icon: StoreIcon, action: () => setView({ name: "stores" }) },
    { id: "journal", label: "Post", icon: Plus, action: () => setView({ name: "journal" }) },
    { id: "collections", label: `Saved (${savedCount})`, icon: Bookmark, action: () => setView({ name: "collections" }) },
    { id: "stitchAlong", label: "Stitch-along", icon: CalendarDays, action: () => setView({ name: "stitchAlong" }) },
    { id: "auth", label: "Account", icon: UserRound, action: () => setView({ name: "auth" }) },
    { id: "onboarding", label: "Onboarding", icon: Sparkles, action: () => setView({ name: "onboarding" }) },
  ];

  return (
    <aside className="sidebar">
      <button className="brand" onClick={() => setView({ name: "home" })} aria-label="Go home">
        <span className="brand-mark">NP</span>
        <span>
          <strong>Needlepoint</strong>
          <small>visual studio</small>
        </span>
      </button>
      <nav aria-label="Primary navigation">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} className={view === item.id ? "active" : ""} onClick={item.action}>
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export function HomeView(props: {
  projects: Project[];
  stitchAlong: StitchAlong;
  followedCreators: string[];
  savedCount: number;
  stores: Store[];
  creatorById: (id: string) => Creator;
  setView: (view: View) => void;
  openDiscover: (patch?: Partial<{ category: string; stitch: string; color: string; status: string; query: string }>) => void;
  toggleLike: (id: string) => void;
  toggleSave: (id: string) => void;
  shareProject: (id: string) => void;
}) {
  void props.stitchAlong;
  const followedFeed = props.projects.filter((project) => props.followedCreators.includes(project.creatorId));
  const feed = followedFeed.length ? followedFeed : props.projects;

  return (
    <section className="page feed-page">
      <header className="feed-topbar">
        <div>
          <h1 className="feed-title">Home</h1>
          <p className="feed-subtitle">
            {followedFeed.length ? "Posts from people you follow" : "Latest projects · text, photos & video"}
          </p>
        </div>
        <div className="feed-top-actions">
          <button className="primary" type="button" onClick={() => props.setView({ name: "journal" })}>
            <Plus size={18} /> Post
          </button>
        </div>
      </header>

      {props.stores.length > 0 && (
        <div className="feed-store-strip" aria-label="Shops">
          {props.stores.slice(0, 10).map((store) => (
            <button key={store.id} type="button" className="feed-store-chip" onClick={() => props.setView({ name: "store", handle: store.handle })}>
              <img src={store.avatar || "/assets/needlepoint-hero.png"} alt="" />
              <span>{store.name}</span>
            </button>
          ))}
          <button type="button" className="feed-store-chip more" onClick={() => props.setView({ name: "stores" })}>
            All shops
          </button>
        </div>
      )}

      <div className="feed-timeline" aria-label="Post feed">
        {feed.length ? (
          feed.map((project) => (
            <FeedPost
              key={project.id}
              project={project}
              creator={props.creatorById(project.creatorId)}
              setView={props.setView}
              toggleLike={props.toggleLike}
              toggleSave={props.toggleSave}
              shareProject={props.shareProject}
            />
          ))
        ) : (
          <EmptyState title="No posts yet" body="Share a project photo, note, or short video." action="Create post" onAction={() => props.setView({ name: "journal" })} />
        )}
      </div>
    </section>
  );
}

/** X/IG-style vertical post: text, image, or video + social actions. */
export function FeedPost({
  project,
  creator,
  setView,
  toggleLike,
  toggleSave,
  shareProject,
}: {
  project: Project;
  creator: Creator;
  setView: (view: View) => void;
  toggleLike: (id: string) => void;
  toggleSave: (id: string) => void;
  shareProject: (id: string) => void;
}) {
  const mediaKind = resolveMediaKind(project);
  const commentCount = projectCommentCount(project);
  const body = project.notes?.trim() || "";
  const showTitle = project.title?.trim() && project.title.trim() !== body.slice(0, project.title.length);

  return (
    <article className="feed-post">
      <button type="button" className="feed-avatar-btn" onClick={() => setView({ name: "profile", id: creator.id })} aria-label={`@${creator.handle}`}>
        <img src={creator.avatar} alt="" className="feed-avatar" />
      </button>
      <div className="feed-post-body">
        <div className="feed-post-meta">
          <button type="button" className="feed-name" onClick={() => setView({ name: "profile", id: creator.id })}>
            {creator.name}
          </button>
          <button type="button" className="feed-handle" onClick={() => setView({ name: "profile", id: creator.id })}>
            @{creator.handle}
          </button>
          {project.updates[0]?.date ? <span className="feed-dot">·</span> : null}
          {project.updates[0]?.date ? <span className="feed-time">{project.updates[0].date}</span> : null}
        </div>

        {showTitle ? (
          <button type="button" className="feed-post-title" onClick={() => setView({ name: "project", id: project.id })}>
            {project.title}
          </button>
        ) : null}

        {body ? (
          <button type="button" className="feed-post-text" onClick={() => setView({ name: "project", id: project.id })}>
            {body}
          </button>
        ) : !showTitle ? (
          <button type="button" className="feed-post-title" onClick={() => setView({ name: "project", id: project.id })}>
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
            aria-label={project.isSaved ? "Remove bookmark" : "Bookmark"}
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

export function DiscoverView(props: {
  projects: Project[];
  categories: string[];
  stitches: string[];
  colors: string[];
  query: string;
  filters: { category: string; difficulty: string; stitch: string; color: string; status: string };
  setQuery: (query: string) => void;
  setFilters: (filters: { category: string; difficulty: string; stitch: string; color: string; status: string }) => void;
  clearFilters: () => void;
  creatorById: (id: string) => Creator;
  setView: (view: View) => void;
  toggleLike: (id: string) => void;
  toggleSave: (id: string) => void;
  shareProject: (id: string) => void;
}) {
  return (
    <section className="page feed-page">
      <SectionHeader eyebrow="Discover" title="Explore canvases, stitches, and creators" />
      <div className="searchbar">
        <Search size={18} />
        <input value={props.query} onChange={(event) => props.setQuery(event.target.value)} placeholder="Try florals, velvet, basketweave..." />
      </div>
      <div className="filters">
        <Filter size={18} />
        <Select label="Category" value={props.filters.category} options={props.categories} onChange={(category) => props.setFilters({ ...props.filters, category })} />
        <Select label="Difficulty" value={props.filters.difficulty} options={difficultyOptions} onChange={(difficulty) => props.setFilters({ ...props.filters, difficulty })} />
        <Select label="Stitch" value={props.filters.stitch} options={props.stitches} onChange={(stitch) => props.setFilters({ ...props.filters, stitch })} />
        <Select label="Color" value={props.filters.color} options={props.colors} onChange={(color) => props.setFilters({ ...props.filters, color })} />
        <Select label="Status" value={props.filters.status} options={statusOptions} onChange={(status) => props.setFilters({ ...props.filters, status })} />
        <button className="secondary" onClick={props.clearFilters}>Clear</button>
      </div>
      {props.projects.length > 0 ? (
        <div className="feed-timeline discover-feed" aria-label="Discover feed">
          {props.projects.map((project) => (
            <FeedPost
              key={project.id}
              project={project}
              creator={props.creatorById(project.creatorId)}
              setView={props.setView}
              toggleLike={props.toggleLike}
              toggleSave={props.toggleSave}
              shareProject={props.shareProject}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="No matching projects" body="Try a broader stitch, color, status, or creator search." action="Reset filters" onAction={props.clearFilters} />
      )}
    </section>
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

export function ProjectDetail(props: {
  project: Project;
  creator: Creator;
  isOwner: boolean;
  canUpload: boolean;
  followedCreators: string[];
  updateNote: string;
  updateMilestone: string;
  commentText: string;
  updateBusy: boolean;
  updateError: string;
  updateImagePreview: string;
  updateImageUrl: string;
  setUpdateNote: (value: string) => void;
  setUpdateMilestone: (value: string) => void;
  setCommentText: (value: string) => void;
  setUpdateImageUrl: (value: string) => void;
  onPickUpdateImage: (file: File | null) => void;
  onClearUpdateImage: () => void;
  addProgressUpdate: (id: string) => void;
  addComment: (id: string) => void;
  toggleFollow: (id: string) => void;
  toggleLike: (id: string) => void;
  toggleSave: (id: string) => void;
  saveProjectEdits: (id: string, draft: DraftProject & { progress: number }, imageFile?: File | null) => Promise<void>;
  stores: Store[];
  projectStores: Store[];
  setView: (view: View) => void;
}) {
  const isFollowed = props.followedCreators.includes(props.creator.id);
  const [editing, setEditing] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState("");
  const [editDraft, setEditDraft] = useState<DraftProject & { progress: number }>(() => projectToDraft(props.project));
  const [editPreview, setEditPreview] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const editFileId = useId();
  const updateFileId = useId();
  const updatePreview = props.updateImagePreview || props.updateImageUrl || "";

  useEffect(() => {
    if (!editing) setEditDraft(projectToDraft(props.project));
  }, [props.project, editing]);

  function pickEditImage(file: File | null) {
    if (!file) return;
    if (editPreview.startsWith("blob:")) URL.revokeObjectURL(editPreview);
    setEditFile(file);
    setEditPreview(URL.createObjectURL(file));
    setEditDraft((current) => ({ ...current, image: "" }));
  }

  async function onSaveEdits(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editDraft.title.trim() || editBusy) return;
    setEditBusy(true);
    setEditError("");
    try {
      await props.saveProjectEdits(props.project.id, { ...editDraft }, editFile);
      if (editPreview.startsWith("blob:")) URL.revokeObjectURL(editPreview);
      setEditFile(null);
      setEditPreview("");
      setEditing(false);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "Could not save project");
    } finally {
      setEditBusy(false);
    }
  }

  return (
    <section className="page">
      <div className="detail-layout">
        <div>
          {props.project.videoUrl ? (
            <video className="detail-image" controls playsInline preload="metadata" poster={props.project.image || undefined} src={props.project.videoUrl} />
          ) : props.project.image ? (
            <img className="detail-image" src={props.project.image} alt={props.project.title} />
          ) : (
            <div className="detail-image text-detail-card"><span>{props.project.title}</span></div>
          )}
          <div className="panel">
            <SectionTitle title="Progress updates" />
            {props.isOwner ? (
              <div className="update-composer">
                <label htmlFor="update-milestone">
                  <span className="label-text">Milestone</span>
                  <input
                    id="update-milestone"
                    value={props.updateMilestone}
                    onChange={(event) => props.setUpdateMilestone(event.target.value)}
                    placeholder="Border done, thread swap…"
                  />
                </label>
                <textarea
                  value={props.updateNote}
                  onChange={(event) => props.setUpdateNote(event.target.value)}
                  placeholder="Log a stitch choice, milestone, or thread swap..."
                />
                <div className="image-upload-field">
                  <span className="field-label">Update photo</span>
                  {updatePreview ? (
                    <div className="image-upload-preview compact">
                      <img src={updatePreview} alt="Update preview" />
                      <div className="card-actions wrap">
                        <label className="secondary file-button" htmlFor={updateFileId}>
                          Replace photo
                        </label>
                        <button className="secondary" type="button" onClick={props.onClearUpdateImage}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="image-upload-dropzone compact" htmlFor={updateFileId}>
                      <strong>{props.canUpload ? "Upload a photo" : "Add a photo URL"}</strong>
                      <span>Optional — JPG/PNG/WebP up to 8MB</span>
                    </label>
                  )}
                  <input
                    id={updateFileId}
                    type="file"
                    accept="image/*"
                    className="visually-hidden"
                    disabled={!props.canUpload || props.updateBusy}
                    onChange={(event) => {
                      props.onPickUpdateImage(event.target.files?.[0] ?? null);
                      event.target.value = "";
                    }}
                  />
                  <Field label="Or image URL" value={props.updateImageUrl} onChange={props.setUpdateImageUrl} placeholder="https://…" />
                </div>
                {props.updateError && (
                  <p className="field-help" style={{ color: "#8a2f2f" }}>
                    {props.updateError}
                  </p>
                )}
                <button
                  className="primary"
                  type="button"
                  disabled={props.updateBusy || (!props.updateNote.trim() && !updatePreview)}
                  onClick={() => props.addProgressUpdate(props.project.id)}
                >
                  {props.updateBusy ? "Saving…" : "Add update"}
                </button>
              </div>
            ) : (
              <p className="field-help">Only the project owner can post progress updates.</p>
            )}
            {props.project.updates.map((update) => (
              <article className="timeline" key={update.id}>
                <img src={update.image || props.project.image} alt="" />
                <div>
                  <strong>{update.milestone}</strong>
                  <small>{update.date}</small>
                  <p>{update.note}</p>
                  {update.comments.map((comment) => (
                    <p className="comment" key={comment.id}>
                      <b>{comment.author}:</b> {comment.body}
                    </p>
                  ))}
                </div>
              </article>
            ))}
            <div className="comment-box">
              <input value={props.commentText} onChange={(event) => props.setCommentText(event.target.value)} placeholder="Comment on the latest update" />
              <button className="secondary" type="button" onClick={() => props.addComment(props.project.id)}>
                Comment
              </button>
            </div>
          </div>
        </div>
        <aside className="panel sticky">
          <p className="eyebrow">{props.project.status}</p>
          <h1>{props.project.title}</h1>
          <button className="profile-chip" type="button" onClick={() => props.setView({ name: "profile", id: props.creator.id })}>
            <img src={props.creator.avatar} alt="" />
            <span>
              {props.creator.name}
              <small>@{props.creator.handle}</small>
            </span>
          </button>
          {props.isOwner && !editing && (
            <button className="secondary full" type="button" onClick={() => setEditing(true)} style={{ marginBottom: 12 }}>
              Edit project
            </button>
          )}
          {editing ? (
            <form className="form-grid" onSubmit={(event) => void onSaveEdits(event)}>
              <Field label="Title" value={editDraft.title} onChange={(title) => setEditDraft({ ...editDraft, title })} required className="full-field" />
              <div className="full-field image-upload-field">
                <span className="field-label">Cover photo</span>
                <div className="image-upload-preview compact">
                  <img src={editPreview || editDraft.image || props.project.image} alt="" />
                  <div className="card-actions wrap">
                    <label className="secondary file-button" htmlFor={editFileId}>
                      Upload photo
                    </label>
                  </div>
                </div>
                <input
                  id={editFileId}
                  type="file"
                  accept="image/*"
                  className="visually-hidden"
                  disabled={!props.canUpload || editBusy}
                  onChange={(event) => {
                    pickEditImage(event.target.files?.[0] ?? null);
                    event.target.value = "";
                  }}
                />
                <Field label="Or image URL" value={editDraft.image} onChange={(image) => setEditDraft({ ...editDraft, image })} placeholder="https://…" />
              </div>
              <label htmlFor="edit-status">
                <span className="label-text">Status</span>
                <select id="edit-status" value={editDraft.status} onChange={(event) => setEditDraft({ ...editDraft, status: event.target.value as Status })}>
                  {statusOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label htmlFor="edit-difficulty">
                <span className="label-text">Difficulty</span>
                <select
                  id="edit-difficulty"
                  value={editDraft.difficulty}
                  onChange={(event) => setEditDraft({ ...editDraft, difficulty: event.target.value as Difficulty })}
                >
                  {difficultyOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <Field label="Category" value={editDraft.category} onChange={(category) => setEditDraft({ ...editDraft, category })} />
              <Field label="Canvas type" value={editDraft.canvasType} onChange={(canvasType) => setEditDraft({ ...editDraft, canvasType })} />
              <Field label="Materials" value={editDraft.materials} onChange={(materials) => setEditDraft({ ...editDraft, materials })} className="full-field" />
              <Field label="Stitch types" value={editDraft.stitchTypes} onChange={(stitchTypes) => setEditDraft({ ...editDraft, stitchTypes })} className="full-field" />
              <Field label="Colors" value={editDraft.colors} onChange={(colors) => setEditDraft({ ...editDraft, colors })} className="full-field" />
              <Field label="Pattern source" value={editDraft.patternSource} onChange={(patternSource) => setEditDraft({ ...editDraft, patternSource })} />
              <Field label="Pattern URL" value={editDraft.patternUrl} onChange={(patternUrl) => setEditDraft({ ...editDraft, patternUrl })} />
              <label htmlFor="edit-visibility">
                <span className="label-text">Visibility</span>
                <select
                  id="edit-visibility"
                  value={editDraft.visibility}
                  onChange={(event) => setEditDraft({ ...editDraft, visibility: event.target.value as "public" | "private" })}
                >
                  <option>public</option>
                  <option>private</option>
                </select>
              </label>
              <label htmlFor="edit-progress">
                <span className="label-text">Progress %</span>
                <input
                  id="edit-progress"
                  type="number"
                  min={0}
                  max={100}
                  value={editDraft.progress}
                  onChange={(event) => setEditDraft({ ...editDraft, progress: Number(event.target.value) || 0 })}
                />
              </label>
              <label className="full-field" htmlFor="edit-notes">
                <span className="label-text">Notes</span>
                <textarea id="edit-notes" value={editDraft.notes} onChange={(event) => setEditDraft({ ...editDraft, notes: event.target.value })} rows={4} />
              </label>
              {props.stores.length > 0 && (
                <div className="full-field store-picker">
                  <span className="field-label">Available at (stores)</span>
                  <div className="store-picker-options">
                    {props.stores.map((store) => {
                      const checked = editDraft.storeIds.includes(store.id);
                      return (
                        <label key={store.id} className="checkbox-field">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setEditDraft((current) => ({
                                ...current,
                                storeIds: checked ? current.storeIds.filter((id) => id !== store.id) : [...current.storeIds, store.id],
                              }))
                            }
                          />
                          <span>
                            {store.name}
                            <small> @{store.handle}</small>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
              {editError && (
                <p className="full-field field-help" style={{ color: "#8a2f2f" }}>
                  {editError}
                </p>
              )}
              <div className="full-field card-actions wrap">
                <button className="primary" type="submit" disabled={editBusy || !editDraft.title.trim()}>
                  {editBusy ? "Saving…" : "Save changes"}
                </button>
                <button
                  className="secondary"
                  type="button"
                  disabled={editBusy}
                  onClick={() => {
                    if (editPreview.startsWith("blob:")) URL.revokeObjectURL(editPreview);
                    setEditFile(null);
                    setEditPreview("");
                    setEditing(false);
                    setEditError("");
                    setEditDraft(projectToDraft(props.project));
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <p>{props.project.notes}</p>
              <div className="progress large">
                <span style={{ width: `${props.project.progress}%` }} />
              </div>
              <div className="card-actions wrap">
                <button type="button" onClick={() => props.toggleLike(props.project.id)} className={props.project.isLiked ? "selected" : ""}>
                  <Heart size={17} /> {props.project.likes}
                </button>
                <button type="button" onClick={() => props.toggleSave(props.project.id)} className={props.project.isSaved ? "selected" : ""}>
                  <Bookmark size={17} /> Save
                </button>
                {!props.isOwner && (
                  <button type="button" onClick={() => props.toggleFollow(props.creator.id)} className={isFollowed ? "selected" : ""}>
                    <UserRound size={17} /> {isFollowed ? "Following" : "Follow"}
                  </button>
                )}
              </div>
              <Meta label="Difficulty" value={props.project.difficulty} />
              <Meta label="Canvas" value={props.project.canvasType} />
              <Meta label="Materials" value={props.project.materials.join(", ") || "—"} />
              <Meta label="Stitches" value={props.project.stitchTypes.join(", ") || "—"} />
              <Meta label="Colors" value={props.project.colors.join(", ") || "—"} />
              <Meta label="Visibility" value={props.project.visibility} />
              {props.projectStores.length > 0 && (
                <div className="available-at">
                  <Meta label="Available at" value="" />
                  <div className="store-chip-list">
                    {props.projectStores.map((store) => (
                      <button
                        key={store.id}
                        type="button"
                        className="store-chip"
                        onClick={() => props.setView({ name: "store", handle: store.handle })}
                      >
                        <StoreIcon size={14} />
                        {store.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <a className="external" href={props.project.patternUrl} target="_blank" rel="noreferrer">
                Pattern source: {props.project.patternSource} <ExternalLink size={15} />
              </a>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}

function projectToDraft(project: Project): DraftProject & { progress: number } {
  return {
    title: project.title,
    image: project.image.startsWith("http") ? project.image : project.image,
    videoUrl: project.videoUrl ?? "",
    status: project.status,
    difficulty: project.difficulty,
    category: project.category,
    canvasType: project.canvasType,
    materials: project.materials.join(", "),
    stitchTypes: project.stitchTypes.join(", "),
    colors: project.colors.join(", "),
    notes: project.notes,
    patternSource: project.patternSource,
    patternUrl: project.patternUrl,
    visibility: project.visibility,
    storeIds: project.storeIds ?? [],
    progress: project.progress,
  };
}

export function JournalView({
  draft,
  setDraft,
  submitProject,
  myProjects,
  setView,
  canUpload,
  uploadBusy,
  uploadError,
  imagePreview,
  onPickImage,
  onClearImage,
  stores,
}: {
  draft: DraftProject;
  setDraft: (draft: DraftProject) => void;
  submitProject: (event: FormEvent<HTMLFormElement>) => void;
  myProjects: Project[];
  setView: (view: View) => void;
  canUpload: boolean;
  uploadBusy: boolean;
  uploadError: string;
  imagePreview: string;
  onPickImage: (file: File | null) => void;
  onClearImage: () => void;
  stores: Store[];
}) {
  const fileInputId = useId();
  const preview = imagePreview || draft.image;

  return (
    <section className="page">
      <SectionHeader eyebrow="Project journal" title="Create a public project entry" />
      <div className="editor-layout">
        <form className="panel form-grid" onSubmit={submitProject}>
          <Field label="Title" value={draft.title} onChange={(title) => setDraft({ ...draft, title })} placeholder="Monogram clutch canvas" required />
          <div className="full-field image-upload-field">
            <span className="field-label">Project photo</span>
            {preview ? (
              <div className="image-upload-preview">
                <img src={preview} alt="Project preview" />
                <div className="card-actions wrap">
                  <label className="secondary file-button" htmlFor={fileInputId}>
                    Replace photo
                  </label>
                  <button className="secondary" type="button" onClick={onClearImage}>
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <label className="image-upload-dropzone" htmlFor={fileInputId}>
                <span className="action-card-icon">
                  <Plus size={18} />
                </span>
                <strong>{canUpload ? "Upload a photo" : "Add a photo URL"}</strong>
                <span>{canUpload ? "JPG, PNG, or WebP up to 8MB. You can also paste a URL below." : "Sign in with Supabase to upload files, or paste a URL."}</span>
              </label>
            )}
            <input
              id={fileInputId}
              type="file"
              accept="image/*"
              className="visually-hidden"
              disabled={!canUpload || uploadBusy}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                onPickImage(file);
                event.target.value = "";
              }}
            />
            <Field label="Or image URL" value={draft.image} onChange={(image) => setDraft({ ...draft, image })} placeholder="https://…" />
            <Field label="Video URL (optional)" value={draft.videoUrl} onChange={(videoUrl) => setDraft({ ...draft, videoUrl })} placeholder="https://…/clip.mp4" />
            {uploadBusy && <p className="field-help">Uploading photo…</p>}
            {uploadError && (
              <p className="field-help" style={{ color: "#8a2f2f" }}>
                {uploadError}
              </p>
            )}
          </div>
          <label htmlFor="project-status">
            <span className="label-text">Status</span>
            <select id="project-status" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Status })}>
              {statusOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label htmlFor="project-difficulty">
            <span className="label-text">Difficulty</span>
            <select id="project-difficulty" value={draft.difficulty} onChange={(event) => setDraft({ ...draft, difficulty: event.target.value as Difficulty })}>
              {difficultyOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <Field label="Category" value={draft.category} onChange={(category) => setDraft({ ...draft, category })} />
          <Field label="Canvas type" value={draft.canvasType} onChange={(canvasType) => setDraft({ ...draft, canvasType })} />
          <Field label="Materials" value={draft.materials} onChange={(materials) => setDraft({ ...draft, materials })} />
          <Field label="Stitch types" value={draft.stitchTypes} onChange={(stitchTypes) => setDraft({ ...draft, stitchTypes })} />
          <Field label="Colors" value={draft.colors} onChange={(colors) => setDraft({ ...draft, colors })} />
          <Field label="Pattern source" value={draft.patternSource} onChange={(patternSource) => setDraft({ ...draft, patternSource })} />
          <Field label="Pattern URL" value={draft.patternUrl} onChange={(patternUrl) => setDraft({ ...draft, patternUrl })} placeholder="https://…" />
          <label htmlFor="project-visibility">
            <span className="label-text">Visibility</span>
            <select id="project-visibility" value={draft.visibility} onChange={(event) => setDraft({ ...draft, visibility: event.target.value as "public" | "private" })}>
              <option>public</option>
              <option>private</option>
            </select>
          </label>
          <label className="full-field" htmlFor="project-notes">
            <span className="label-text">Notes</span>
            <textarea
              id="project-notes"
              value={draft.notes}
              onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
              placeholder="What are you stitching, what are you testing, and what should future you remember?"
            />
          </label>
          {stores.length > 0 && (
            <div className="full-field store-picker">
              <span className="field-label">Available at (stores)</span>
              <div className="store-picker-options">
                {stores.map((store) => {
                  const checked = draft.storeIds.includes(store.id);
                  return (
                    <label key={store.id} className="checkbox-field">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setDraft({
                            ...draft,
                            storeIds: checked ? draft.storeIds.filter((id) => id !== store.id) : [...draft.storeIds, store.id],
                          })
                        }
                      />
                      <span>
                        {store.name}
                        <small> @{store.handle}</small>
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="field-help">Tag local or online shops that supply this canvas / kit / finishing.</p>
            </div>
          )}
          <button className="primary full-field" type="submit" disabled={!draft.title.trim() || uploadBusy}>
            <Plus size={18} /> {uploadBusy ? "Saving…" : "Save project"}
          </button>
        </form>
        <div className="panel">
          <SectionTitle title="Your journal" />
          {myProjects.length > 0 ? (
            myProjects.map((project) => (
              <button className="mini-update" key={project.id} onClick={() => setView({ name: "project", id: project.id })}>
                <img src={project.image} alt="" />
                <span>
                  <strong>{project.title}</strong>
                  <small>
                    {project.status} · {project.progress}% · {project.visibility}
                  </small>
                </span>
              </button>
            ))
          ) : (
            <EmptyState title="No journal entries yet" body="Save a project to start tracking progress." />
          )}
        </div>
      </div>
    </section>
  );
}

export function CollectionsView({
  collections,
  projects,
  creatorById,
  setView,
}: {
  collections: Collection[];
  projects: Project[];
  creatorById: (id: string) => Creator;
  setView: (view: View) => void;
}) {
  return (
    <section className="page">
      <SectionHeader eyebrow="Collections" title="Saved projects and inspiration boards" />
      <div className="collection-list">
        {collections.map((collection) => (
          <article className="panel" key={collection.id}>
            <h2>{collection.name}</h2>
            <p>{collection.description}</p>
            <div className="project-grid">
              {collection.projectIds
                .map((id) => projects.find((project) => project.id === id))
                .filter((project): project is Project => Boolean(project))
                .map((project) => (
                  <button className="saved-tile" key={project.id} onClick={() => setView({ name: "project", id: project.id })}>
                    <img src={project.image} alt="" />
                    <span>{project.title}<small>{creatorById(project.creatorId).name}</small></span>
                  </button>
                ))}
              {collection.projectIds.length === 0 && <EmptyState title="Nothing saved here yet" body="Save projects from discovery to build this board." />}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ProfileView({
  creator,
  projects,
  isFollowed,
  toggleFollow,
  setView,
}: {
  creator: Creator;
  projects: Project[];
  isFollowed: boolean;
  toggleFollow: (id: string) => void;
  setView: (view: View) => void;
}) {
  return (
    <section className="page">
      <div className="profile-header ig-profile-header">
        <img src={creator.avatar} alt="" />
        <div>
          <p className="eyebrow">{creator.isCreator ? "Creator" : "Stitcher"}</p>
          <h1>{creator.name}</h1>
          <p>
            @{creator.handle}
            {creator.location ? ` · ${creator.location}` : ""} · {creator.followers.toLocaleString()} followers · {projects.length} projects
          </p>
          <p>{creator.bio}</p>
          <div className="tag-row">{creator.specialties.map((tag) => <span key={tag}>{tag}</span>)}</div>
        </div>
        <button className={`secondary ${isFollowed ? "selected" : ""}`} onClick={() => toggleFollow(creator.id)}>
          <UserRound size={17} /> {isFollowed ? "Following" : "Follow"}
        </button>
      </div>
      <div className="link-strip">
        {creator.links.map((link) => (
          <a href={link.url} target="_blank" rel="noreferrer" key={link.label}>
            {link.label} <ExternalLink size={14} />
          </a>
        ))}
      </div>
      <SectionTitle title="Projects" />
      {projects.length ? (
        <div className="ig-grid" aria-label="Profile project grid">
          {projects.map((project) => (
            <button type="button" className="ig-grid-cell" key={project.id} onClick={() => setView({ name: "project", id: project.id })}>
              <img src={project.image} alt={project.title} />
            </button>
          ))}
        </div>
      ) : (
        <EmptyState title="No projects yet" body="When this stitcher posts, their photos will fill this grid." />
      )}
    </section>
  );
}

export function StoresView({ stores, setView }: { stores: Store[]; setView: (view: View) => void }) {
  return (
    <section className="page">
      <SectionHeader eyebrow="Stores" title="Local shops and online suppliers" />
      <p className="lede">
        Stores connect with stitchers who promote canvases and finishes — no marketplace checkout yet, just presence and supply links.
      </p>
      {stores.length ? (
        <div className="store-grid">
          {stores.map((store) => (
            <button key={store.id} type="button" className="store-card panel" onClick={() => setView({ name: "store", handle: store.handle })}>
              <img className="store-card-cover" src={store.coverImage || store.avatar} alt="" />
              <div className="store-card-body">
                <img className="store-card-avatar" src={store.avatar} alt="" />
                <strong>{store.name}</strong>
                <small>@{store.handle}</small>
                <p>{store.description || "Needlepoint supplier"}</p>
                <div className="tag-row">
                  <span>{store.storeType === "local" ? "Local" : store.storeType === "both" ? "Local + ships" : "Online"}</span>
                  {store.location ? <span>{store.location}</span> : null}
                  {store.shipsNationwide ? <span>Ships</span> : null}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState title="No stores yet" body="Shop profiles will appear here once seeded or claimed." />
      )}
    </section>
  );
}

export function StoreDetailView({
  store,
  projects,
  setView,
}: {
  store: Store;
  projects: Project[];
  setView: (view: View) => void;
}) {
  return (
    <section className="page">
      <div className="store-detail-hero panel">
        <img className="store-detail-cover" src={store.coverImage || store.avatar} alt="" />
        <div className="store-detail-head">
          <img src={store.avatar} alt="" />
          <div>
            <p className="eyebrow">Store</p>
            <h1>{store.name}</h1>
            <p>
              @{store.handle}
              {store.location ? ` · ${store.location}` : ""}
              {store.shipsNationwide ? " · Ships nationwide" : ""}
            </p>
            <p>{store.description}</p>
            <div className="tag-row">
              {store.specialties.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            <div className="card-actions wrap" style={{ marginTop: 12 }}>
              {store.websiteUrl ? (
                <a className="secondary" href={store.websiteUrl} target="_blank" rel="noreferrer">
                  Visit website <ExternalLink size={14} />
                </a>
              ) : null}
              <button type="button" className="secondary" onClick={() => setView({ name: "stores" })}>
                All stores
              </button>
            </div>
          </div>
        </div>
      </div>

      {store.products.length > 0 && (
        <>
          <SectionTitle title="Catalog" />
          <div className="product-grid">
            {store.products.map((product) => (
              <article key={product.id} className="product-card panel">
                <img src={product.image} alt={product.name} />
                <strong>{product.name}</strong>
                <p>{product.description}</p>
                <div className="metric-row">
                  <span>{product.priceLabel || product.category}</span>
                  {product.externalUrl ? (
                    <a href={product.externalUrl} target="_blank" rel="noreferrer">
                      Shop link <ExternalLink size={13} />
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      <SectionTitle title="Projects available here" />
      {projects.length ? (
        <div className="visual-grid">
          {projects.map((project) => (
            <button key={project.id} type="button" className="ig-grid-cell" onClick={() => setView({ name: "project", id: project.id })}>
              <img src={project.image} alt={project.title} />
            </button>
          ))}
        </div>
      ) : (
        <p className="field-help">No projects have tagged this store yet. Owners can mark “Available at” on a project.</p>
      )}
    </section>
  );
}

export function StitchAlongView({
  stitchAlong,
  projects,
  myProjects,
  creatorById,
  joinStitchAlong,
  submitToStitchAlong,
  setView,
}: {
  stitchAlong: StitchAlong;
  projects: Project[];
  myProjects: Project[];
  creatorById: (id: string) => Creator;
  joinStitchAlong: () => void;
  submitToStitchAlong: (projectId: string) => void;
  setView: (view: View) => void;
}) {
  const host = creatorById(stitchAlong.hostId);
  const participantProjects = stitchAlong.participantProjectIds
    .map((id) => projects.find((project) => project.id === id))
    .filter((project): project is Project => Boolean(project));

  return (
    <section className="page">
      <div className="stitch-hero">
        <div>
          <p className="eyebrow">{stitchAlong.dates}</p>
          <h1>{stitchAlong.title}</h1>
          <p>{stitchAlong.description}</p>
          <button className={`primary ${stitchAlong.joined ? "selected" : ""}`} onClick={joinStitchAlong}>
            <Sparkles size={18} /> {stitchAlong.joined ? "Joined" : "Join stitch-along"}
          </button>
        </div>
      </div>
      <div className="two-column">
        <div className="panel">
          <h2>Rules and theme</h2>
          <p>{stitchAlong.theme}</p>
          <ul>{stitchAlong.rules.map((rule) => <li key={rule}>{rule}</li>)}</ul>
          <button className="profile-chip" onClick={() => setView({ name: "profile", id: host.id })}>
            <img src={host.avatar} alt="" />
            <span>Hosted by {host.name}<small>@{host.handle}</small></span>
          </button>
        </div>
        <div className="panel">
          <h2>Submit a project</h2>
          {myProjects.length > 0 ? myProjects.map((project) => (
            <button className={`mini-update ${stitchAlong.participantProjectIds.includes(project.id) ? "submitted" : ""}`} key={project.id} onClick={() => submitToStitchAlong(project.id)}>
              <img src={project.image} alt="" />
              <span>
                <strong>{project.title}</strong>
                <small>{stitchAlong.participantProjectIds.includes(project.id) ? "Submitted" : "Tap to submit"}</small>
              </span>
            </button>
          )) : <EmptyState title="No projects to submit" body="Create a journal entry first, then submit it here." action="New project" onAction={() => setView({ name: "journal" })} />}
        </div>
      </div>
      <SectionTitle title="Participant projects" />
      <div className="project-grid">
        {participantProjects.map((project) => (
          <button className="profile-project" key={project.id} onClick={() => setView({ name: "project", id: project.id })}>
            <img src={project.image} alt="" />
            <strong>{project.title}</strong>
            <small>{creatorById(project.creatorId).name}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

export function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  const id = useId();
  return (
    <label htmlFor={id}>
      {label}
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="all">All</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

export function Field({
  label,
  value,
  onChange,
  placeholder = "",
  required = false,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className={className}>
      <span className="label-text">
        {label}
        {required ? <span className="required-mark"> Required</span> : null}
      </span>
      <input id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} />
    </label>
  );
}

export function Meta({ label, value }: { label: string; value: string }) {
  return <div className="meta"><span>{label}</span><strong>{value}</strong></div>;
}

export function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric-card"><strong>{value}</strong><span>{label}</span></div>;
}

export function EmptyState({ title, body, action, onAction }: { title: string; body: string; action?: string; onAction?: () => void }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{body}</p>
      {action && <button className="secondary" onClick={onAction}>{action}</button>}
    </div>
  );
}

export function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return <header className="section-header"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></header>;
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <div className="section-title"><h2>{title}</h2>{action && <button className="text-button" onClick={onAction}>{action}</button>}</div>;
}

