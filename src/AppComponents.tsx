import { FormEvent, useId, useMemo } from "react";
import { Bookmark, CalendarDays, ExternalLink, Filter, Heart, Home, MessageCircle, Plus, Search, Sparkles, UserRound } from "lucide-react";
import type { Collection, Creator, Difficulty, Project, Status, StitchAlong } from "./types";
import type { DraftProject, View } from "./appModel";
import { difficultyOptions, statusOptions } from "./appModel";

export function Sidebar({ view, setView, savedCount }: { view: string; setView: (view: View) => void; savedCount: number }) {
  const items = [
    { id: "home", label: "Home", icon: Home, action: () => setView({ name: "home" }) },
    { id: "discover", label: "Discover", icon: Search, action: () => setView({ name: "discover" }) },
    { id: "journal", label: "Journal", icon: Plus, action: () => setView({ name: "journal" }) },
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
          <small>project studio</small>
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
  categories: string[];
  stitches: string[];
  colors: string[];
  creatorById: (id: string) => Creator;
  setView: (view: View) => void;
  openDiscover: (patch?: Partial<{ category: string; stitch: string; color: string; status: string; query: string }>) => void;
  toggleLike: (id: string) => void;
  toggleSave: (id: string) => void;
}) {
  const followedUpdates = props.projects.filter((project) => props.followedCreators.includes(project.creatorId));

  const categoryCards = useMemo(() => {
    const counts = new Map<string, number>();
    for (const project of props.projects) {
      const key = project.category?.trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8)
      .map(([label, count]) => ({ kind: "category" as const, label, count }));
  }, [props.projects]);

  const tagCards = useMemo(() => {
    const counts = new Map<string, { count: number; kind: "stitch" | "color" }>();
    for (const project of props.projects) {
      for (const stitch of project.stitchTypes) {
        const key = stitch.trim();
        if (!key) continue;
        const current = counts.get(key) ?? { count: 0, kind: "stitch" as const };
        counts.set(key, { count: current.count + 1, kind: "stitch" });
      }
      for (const color of project.colors) {
        const key = color.trim();
        if (!key) continue;
        const current = counts.get(key) ?? { count: 0, kind: "color" as const };
        counts.set(key, { count: current.count + 1, kind: current.kind === "stitch" ? "stitch" : "color" });
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
      .slice(0, 8)
      .map(([label, meta]) => ({ kind: meta.kind, label, count: meta.count }));
  }, [props.projects]);

  const browseCards = categoryCards.length
    ? categoryCards
    : tagCards.length
      ? tagCards
      : [
          { kind: "category" as const, label: "ornament", count: 0 },
          { kind: "category" as const, label: "pillow", count: 0 },
          { kind: "category" as const, label: "framed piece", count: 0 },
          { kind: "stitch" as const, label: "basketweave", count: 0 },
        ];

  const actions = [
    { id: "journal", title: "Log a project", body: "Start a journal entry with materials and progress.", icon: Plus, run: () => props.setView({ name: "journal" }) },
    { id: "discover", title: "Browse projects", body: "Search by stitch, color, pattern, or creator.", icon: Search, run: () => props.openDiscover() },
    { id: "stitch", title: "Join stitch-along", body: "See the current theme and share your canvas.", icon: CalendarDays, run: () => props.setView({ name: "stitchAlong" }) },
    { id: "saved", title: "Open saved", body: props.savedCount ? `${props.savedCount} saved for later.` : "Bookmark projects as you browse.", icon: Bookmark, run: () => props.setView({ name: "collections" }) },
  ];

  return (
    <section className="page">
      <div className="hero-panel">
        <div>
          <p className="eyebrow">Today in your hoop</p>
          <h1>Track the work, find the thread, join the stitchers.</h1>
          <p>Log project notes, browse craft-specific inspiration, and keep creator links close to the canvas.</p>
        </div>
        <button className="primary" onClick={() => props.setView({ name: "journal" })}>
          <Plus size={18} /> New project
        </button>
      </div>
      <div className="two-column">
        <div className="stack">
          <div>
            <SectionTitle title="Quick actions" />
            <div className="action-grid" aria-label="Quick actions">
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <button key={action.id} type="button" className="action-card" onClick={action.run}>
                    <span className="action-card-icon">
                      <Icon size={18} />
                    </span>
                    <strong>{action.title}</strong>
                    <span>{action.body}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <SectionTitle title="Browse by theme" action="Open discover" onAction={() => props.openDiscover()} />
            <div className="browse-grid" aria-label="Top categories and tags">
              {browseCards.map((card) => (
                <button
                  key={`${card.kind}-${card.label}`}
                  type="button"
                  className="browse-card"
                  onClick={() =>
                    props.openDiscover(
                      card.kind === "category"
                        ? { category: card.label }
                        : card.kind === "stitch"
                          ? { stitch: card.label }
                          : { color: card.label },
                    )
                  }
                >
                  <small>{card.kind}</small>
                  <strong>{card.label}</strong>
                  <span>{card.count ? `${card.count} project${card.count === 1 ? "" : "s"}` : "Explore"}</span>
                </button>
              ))}
            </div>
          </div>

          <SectionTitle title="Discovery Feed" action="View all" onAction={() => props.openDiscover()} />
          {props.projects.map((project) => (
            <ProjectCard key={project.id} project={project} creator={props.creatorById(project.creatorId)} {...props} />
          ))}
        </div>
        <div className="stack">
          <div className="panel">
            <p className="eyebrow">Featured stitch-along</p>
            <h2>{props.stitchAlong.title}</h2>
            <p>{props.stitchAlong.description}</p>
            <div className="metric-row">
              <span>{props.stitchAlong.dates}</span>
              <span>{props.stitchAlong.participantProjectIds.length} projects</span>
            </div>
            <button className="secondary full" onClick={() => props.setView({ name: "stitchAlong" })}>
              <Sparkles size={17} /> Open stitch-along
            </button>
          </div>
          <div className="panel">
            <p className="eyebrow">Followed updates</p>
            {followedUpdates.length ? (
              followedUpdates.map((project) => (
                <button key={project.id} className="mini-update" onClick={() => props.setView({ name: "project", id: project.id })}>
                  <img src={project.image} alt="" />
                  <span>
                    <strong>{project.title}</strong>
                    <small>{project.updates[0]?.milestone}</small>
                  </span>
                </button>
              ))
            ) : (
              <p style={{ marginBottom: 0, color: "#74675d" }}>Follow creators to see their latest milestones here.</p>
            )}
          </div>
        </div>
      </div>
    </section>
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
}) {
  return (
    <section className="page">
      <SectionHeader eyebrow="Discover" title="Search by pattern, thread, stitch, color, or creator" />
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
        <div className="project-grid">
          {props.projects.map((project) => (
            <ProjectCard key={project.id} project={project} creator={props.creatorById(project.creatorId)} {...props} compact />
          ))}
        </div>
      ) : (
        <EmptyState title="No matching projects" body="Try a broader stitch, color, status, or creator search." action="Reset filters" onAction={props.clearFilters} />
      )}
    </section>
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
  return (
    <article className={`project-card ${compact ? "compact" : ""}`}>
      <button className="image-button" onClick={() => setView({ name: "project", id: project.id })}>
        <img src={project.image} alt={project.title} />
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
  followedCreators: string[];
  updateNote: string;
  commentText: string;
  setUpdateNote: (value: string) => void;
  setCommentText: (value: string) => void;
  addProgressUpdate: (id: string) => void;
  addComment: (id: string) => void;
  toggleFollow: (id: string) => void;
  toggleLike: (id: string) => void;
  toggleSave: (id: string) => void;
  setView: (view: View) => void;
}) {
  const isFollowed = props.followedCreators.includes(props.creator.id);
  return (
    <section className="page">
      <div className="detail-layout">
        <div>
          <img className="detail-image" src={props.project.image} alt={props.project.title} />
          <div className="panel">
            <SectionTitle title="Progress updates" />
            <div className="update-composer">
              <textarea value={props.updateNote} onChange={(event) => props.setUpdateNote(event.target.value)} placeholder="Log a stitch choice, milestone, or thread swap..." />
              <button className="primary" onClick={() => props.addProgressUpdate(props.project.id)}>Add update</button>
            </div>
            {props.project.updates.map((update) => (
              <article className="timeline" key={update.id}>
                <img src={update.image} alt="" />
                <div>
                  <strong>{update.milestone}</strong>
                  <small>{update.date}</small>
                  <p>{update.note}</p>
                  {update.comments.map((comment) => (
                    <p className="comment" key={comment.id}><b>{comment.author}:</b> {comment.body}</p>
                  ))}
                </div>
              </article>
            ))}
            <div className="comment-box">
              <input value={props.commentText} onChange={(event) => props.setCommentText(event.target.value)} placeholder="Comment on the latest update" />
              <button className="secondary" onClick={() => props.addComment(props.project.id)}>Comment</button>
            </div>
          </div>
        </div>
        <aside className="panel sticky">
          <p className="eyebrow">{props.project.status}</p>
          <h1>{props.project.title}</h1>
          <button className="profile-chip" onClick={() => props.setView({ name: "profile", id: props.creator.id })}>
            <img src={props.creator.avatar} alt="" />
            <span>{props.creator.name}<small>@{props.creator.handle}</small></span>
          </button>
          <p>{props.project.notes}</p>
          <div className="progress large"><span style={{ width: `${props.project.progress}%` }} /></div>
          <div className="card-actions wrap">
            <button onClick={() => props.toggleLike(props.project.id)} className={props.project.isLiked ? "selected" : ""}><Heart size={17} /> {props.project.likes}</button>
            <button onClick={() => props.toggleSave(props.project.id)} className={props.project.isSaved ? "selected" : ""}><Bookmark size={17} /> Save</button>
            <button onClick={() => props.toggleFollow(props.creator.id)} className={isFollowed ? "selected" : ""}><UserRound size={17} /> {isFollowed ? "Following" : "Follow"}</button>
          </div>
          <Meta label="Difficulty" value={props.project.difficulty} />
          <Meta label="Canvas" value={props.project.canvasType} />
          <Meta label="Materials" value={props.project.materials.join(", ")} />
          <Meta label="Stitches" value={props.project.stitchTypes.join(", ")} />
          <Meta label="Colors" value={props.project.colors.join(", ")} />
          <a className="external" href={props.project.patternUrl} target="_blank" rel="noreferrer">
            Pattern source: {props.project.patternSource} <ExternalLink size={15} />
          </a>
        </aside>
      </div>
    </section>
  );
}

export function JournalView({
  draft,
  setDraft,
  submitProject,
  myProjects,
  setView,
}: {
  draft: DraftProject;
  setDraft: (draft: DraftProject) => void;
  submitProject: (event: FormEvent<HTMLFormElement>) => void;
  myProjects: Project[];
  setView: (view: View) => void;
}) {
  return (
    <section className="page">
      <SectionHeader eyebrow="Project journal" title="Create a public project entry" />
      <div className="editor-layout">
        <form className="panel form-grid" onSubmit={submitProject}>
          <Field label="Title" value={draft.title} onChange={(title) => setDraft({ ...draft, title })} placeholder="Monogram clutch canvas" />
          <Field label="Image URL" value={draft.image} onChange={(image) => setDraft({ ...draft, image })} placeholder="Optional photo URL" />
          <label htmlFor="project-status">Status<select id="project-status" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Status })}>{statusOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
          <label htmlFor="project-difficulty">Difficulty<select id="project-difficulty" value={draft.difficulty} onChange={(event) => setDraft({ ...draft, difficulty: event.target.value as Difficulty })}>{difficultyOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
          <Field label="Category" value={draft.category} onChange={(category) => setDraft({ ...draft, category })} />
          <Field label="Canvas type" value={draft.canvasType} onChange={(canvasType) => setDraft({ ...draft, canvasType })} />
          <Field label="Materials" value={draft.materials} onChange={(materials) => setDraft({ ...draft, materials })} />
          <Field label="Stitch types" value={draft.stitchTypes} onChange={(stitchTypes) => setDraft({ ...draft, stitchTypes })} />
          <Field label="Colors" value={draft.colors} onChange={(colors) => setDraft({ ...draft, colors })} />
          <Field label="Pattern source" value={draft.patternSource} onChange={(patternSource) => setDraft({ ...draft, patternSource })} />
          <Field label="Pattern URL" value={draft.patternUrl} onChange={(patternUrl) => setDraft({ ...draft, patternUrl })} placeholder="Optional source link" />
          <label htmlFor="project-visibility">Visibility<select id="project-visibility" value={draft.visibility} onChange={(event) => setDraft({ ...draft, visibility: event.target.value as "public" | "private" })}><option>public</option><option>private</option></select></label>
          <label className="full-field" htmlFor="project-notes">Notes<textarea id="project-notes" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="What are you stitching, what are you testing, and what should future you remember?" /></label>
          <button className="primary full-field" type="submit" disabled={!draft.title.trim() || !draft.notes.trim()}><Plus size={18} /> Save project</button>
        </form>
        <div className="panel">
          <SectionTitle title="Your journal" />
          {myProjects.length > 0 ? (
            myProjects.map((project) => (
              <button className="mini-update" key={project.id} onClick={() => setView({ name: "project", id: project.id })}>
                <img src={project.image} alt="" />
                <span><strong>{project.title}</strong><small>{project.status} · {project.progress}% · {project.visibility}</small></span>
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
      <div className="profile-header">
        <img src={creator.avatar} alt="" />
        <div>
          <p className="eyebrow">{creator.isCreator ? "Creator profile" : "Stitcher profile"}</p>
          <h1>{creator.name}</h1>
          <p>@{creator.handle} · {creator.location} · {creator.followers.toLocaleString()} followers</p>
          <p>{creator.bio}</p>
          <div className="tag-row">{creator.specialties.map((tag) => <span key={tag}>{tag}</span>)}</div>
        </div>
        <button className={`secondary ${isFollowed ? "selected" : ""}`} onClick={() => toggleFollow(creator.id)}>
          <UserRound size={17} /> {isFollowed ? "Following" : "Follow"}
        </button>
      </div>
      <div className="link-strip">
        {creator.links.map((link) => (
          <a href={link.url} target="_blank" rel="noreferrer" key={link.label}>{link.label} <ExternalLink size={14} /></a>
        ))}
      </div>
      <div className="project-grid">
        {projects.map((project) => (
          <button className="profile-project" key={project.id} onClick={() => setView({ name: "project", id: project.id })}>
            <img src={project.image} alt="" />
            <strong>{project.title}</strong>
            <small>{project.difficulty} · {project.status}</small>
          </button>
        ))}
      </div>
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

export function Field({ label, value, onChange, placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  const id = useId();
  return <label htmlFor={id}>{label}<input id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
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

