import { FormEvent, useMemo, useState } from "react";
import {
  Bookmark,
  CalendarDays,
  ExternalLink,
  Filter,
  Heart,
  Home,
  MessageCircle,
  Plus,
  Search,
  Sparkles,
  UserRound,
} from "lucide-react";
import { creators, initialCollections, initialProjects, stitchAlong as seedStitchAlong } from "./data";
import type { Collection, Creator, Difficulty, Project, Status, StitchAlong } from "./types";

type View =
  | { name: "home" }
  | { name: "discover" }
  | { name: "project"; id: string }
  | { name: "profile"; id: string }
  | { name: "collections" }
  | { name: "journal" }
  | { name: "stitchAlong" };

type DraftProject = {
  title: string;
  image: string;
  status: Status;
  difficulty: Difficulty;
  category: string;
  canvasType: string;
  materials: string;
  stitchTypes: string;
  colors: string;
  notes: string;
  patternSource: string;
  patternUrl: string;
  visibility: "public" | "private";
};

const blankDraft: DraftProject = {
  title: "",
  image: "",
  status: "in progress",
  difficulty: "confident beginner",
  category: "ornament",
  canvasType: "18 mesh canvas",
  materials: "DMC floss, wool",
  stitchTypes: "basketweave, continental",
  colors: "rose, cream",
  notes: "",
  patternSource: "Personal stash",
  patternUrl: "",
  visibility: "public",
};

const statusOptions: Status[] = ["planned", "in progress", "finished", "paused"];
const difficultyOptions: Difficulty[] = ["beginner", "confident beginner", "intermediate", "advanced"];

const fallbackImages = [
  "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1459908676235-d5f02a50184b?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1499744937866-d7e566a20a61?auto=format&fit=crop&w=1200&q=82",
];

function App() {
  const [view, setView] = useState<View>({ name: "home" });
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [collections, setCollections] = useState<Collection[]>(initialCollections);
  const [stitchAlong, setStitchAlong] = useState<StitchAlong>(seedStitchAlong);
  const [followedCreators, setFollowedCreators] = useState<string[]>(["c1"]);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ category: "all", difficulty: "all", stitch: "all", color: "all", status: "all" });
  const [draft, setDraft] = useState<DraftProject>(blankDraft);
  const [updateNote, setUpdateNote] = useState("");
  const [commentText, setCommentText] = useState("");

  const creatorById = (id: string) => creators.find((creator) => creator.id === id)!;
  const projectById = (id: string) => projects.find((project) => project.id === id);
  const savedProjects = projects.filter((project) => project.isSaved);
  const myProjects = projects.filter((project) => project.creatorId === "c2");
  const activeProjects = projects.filter((project) => project.status === "in progress").length;
  const totalComments = projects.reduce((count, project) => count + project.updates.reduce((sum, update) => sum + update.comments.length, 0), 0);

  const categories = unique(projects.map((project) => project.category));
  const stitches = unique(projects.flatMap((project) => project.stitchTypes));
  const colors = unique(projects.flatMap((project) => project.colors));

  const filteredProjects = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return projects.filter((project) => {
      const creator = creatorById(project.creatorId);
      const haystack = [
        project.title,
        project.notes,
        project.patternSource,
        project.category,
        project.canvasType,
        creator.name,
        creator.handle,
        ...project.materials,
        ...project.stitchTypes,
        ...project.colors,
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!normalized || haystack.includes(normalized)) &&
        (filters.category === "all" || project.category === filters.category) &&
        (filters.difficulty === "all" || project.difficulty === filters.difficulty) &&
        (filters.stitch === "all" || project.stitchTypes.includes(filters.stitch)) &&
        (filters.color === "all" || project.colors.includes(filters.color)) &&
        (filters.status === "all" || project.status === filters.status)
      );
    });
  }, [filters, projects, query]);

  function toggleLike(id: string) {
    setProjects((current) =>
      current.map((project) =>
        project.id === id
          ? { ...project, isLiked: !project.isLiked, likes: project.likes + (project.isLiked ? -1 : 1) }
          : project,
      ),
    );
  }

  function toggleSave(id: string) {
    setProjects((current) => current.map((project) => (project.id === id ? { ...project, isSaved: !project.isSaved } : project)));
    setCollections((current) =>
      current.map((collection) =>
        collection.id === "col1"
          ? {
              ...collection,
              projectIds: collection.projectIds.includes(id)
                ? collection.projectIds.filter((projectId) => projectId !== id)
                : [...collection.projectIds, id],
            }
          : collection,
      ),
    );
  }

  function toggleFollow(id: string) {
    setFollowedCreators((current) => (current.includes(id) ? current.filter((creatorId) => creatorId !== id) : [...current, id]));
  }

  function submitProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim() || !draft.notes.trim()) return;

    const project: Project = {
      id: `p${Date.now()}`,
      title: draft.title.trim(),
      creatorId: "c2",
      image: draft.image.trim() || fallbackImages[projects.length % fallbackImages.length],
      status: draft.status,
      difficulty: draft.difficulty,
      category: draft.category.trim() || "journal",
      canvasType: draft.canvasType.trim() || "18 mesh canvas",
      stitchTypes: splitList(draft.stitchTypes),
      materials: splitList(draft.materials),
      colors: splitList(draft.colors),
      patternSource: draft.patternSource.trim() || "Personal stash",
      patternUrl: draft.patternUrl.trim() || "https://example.com/new-project",
      notes: draft.notes.trim(),
      likes: 0,
      isLiked: false,
      isSaved: false,
      visibility: draft.visibility,
      progress: draft.status === "finished" ? 100 : draft.status === "planned" ? 5 : 20,
      updates: [
        {
          id: `u${Date.now()}`,
          date: "Today",
          milestone: "Project started",
          note: draft.notes.trim(),
          image: fallbackImages[(projects.length + 1) % fallbackImages.length],
          likes: 0,
          comments: [],
        },
      ],
    };

    setProjects((current) => [project, ...current]);
    setDraft(blankDraft);
    setView({ name: "project", id: project.id });
  }

  function addProgressUpdate(projectId: string) {
    if (!updateNote.trim()) return;
    setProjects((current) =>
      current.map((project) =>
        project.id === projectId
          ? {
              ...project,
              progress: Math.min(100, project.progress + 12),
              status: project.status === "planned" ? "in progress" : project.status,
              updates: [
                {
                  id: `u${Date.now()}`,
                  date: "Today",
                  milestone: "Progress logged",
                  note: updateNote.trim(),
                  image: project.image,
                  likes: 0,
                  comments: [],
                },
                ...project.updates,
              ],
            }
          : project,
      ),
    );
    setUpdateNote("");
  }

  function addComment(projectId: string) {
    if (!commentText.trim()) return;
    setProjects((current) =>
      current.map((project) =>
        project.id === projectId
          ? {
              ...project,
              updates: project.updates.map((update, index) =>
                index === 0
                  ? {
                      ...update,
                      comments: [...update.comments, { id: `cm${Date.now()}`, author: "You", body: commentText.trim() }],
                    }
                  : update,
              ),
            }
          : project,
      ),
    );
    setCommentText("");
  }

  function joinStitchAlong() {
    setStitchAlong((current) => ({ ...current, joined: !current.joined }));
  }

  function submitToStitchAlong(projectId: string) {
    setStitchAlong((current) =>
      current.participantProjectIds.includes(projectId)
        ? current
        : { ...current, participantProjectIds: [projectId, ...current.participantProjectIds], joined: true },
    );
  }

  const activeProject = view.name === "project" ? projectById(view.id) : undefined;
  const activeProfile = view.name === "profile" ? creatorById(view.id) : undefined;

  return (
    <div className="app-shell">
      <Sidebar view={view.name} setView={setView} savedCount={savedProjects.length} />
      <main>
        {view.name === "home" && (
          <HomeView
            projects={projects}
            stitchAlong={stitchAlong}
            followedCreators={followedCreators}
            activeProjects={activeProjects}
            savedCount={savedProjects.length}
            totalComments={totalComments}
            creatorById={creatorById}
            setView={setView}
            toggleLike={toggleLike}
            toggleSave={toggleSave}
          />
        )}
        {view.name === "discover" && (
          <DiscoverView
            projects={filteredProjects}
            categories={categories}
            stitches={stitches}
            colors={colors}
            query={query}
            filters={filters}
            setQuery={setQuery}
            setFilters={setFilters}
            clearFilters={() => {
              setQuery("");
              setFilters({ category: "all", difficulty: "all", stitch: "all", color: "all", status: "all" });
            }}
            creatorById={creatorById}
            setView={setView}
            toggleLike={toggleLike}
            toggleSave={toggleSave}
          />
        )}
        {view.name === "collections" && (
          <CollectionsView collections={collections} projects={projects} creatorById={creatorById} setView={setView} />
        )}
        {view.name === "journal" && (
          <JournalView draft={draft} setDraft={setDraft} submitProject={submitProject} myProjects={myProjects} setView={setView} />
        )}
        {view.name === "stitchAlong" && (
          <StitchAlongView
            stitchAlong={stitchAlong}
            projects={projects}
            myProjects={myProjects}
            creatorById={creatorById}
            joinStitchAlong={joinStitchAlong}
            submitToStitchAlong={submitToStitchAlong}
            setView={setView}
          />
        )}
        {activeProject && (
          <ProjectDetail
            project={activeProject}
            creator={creatorById(activeProject.creatorId)}
            followedCreators={followedCreators}
            updateNote={updateNote}
            commentText={commentText}
            setUpdateNote={setUpdateNote}
            setCommentText={setCommentText}
            addProgressUpdate={addProgressUpdate}
            addComment={addComment}
            toggleFollow={toggleFollow}
            toggleLike={toggleLike}
            toggleSave={toggleSave}
            setView={setView}
          />
        )}
        {activeProfile && (
          <ProfileView
            creator={activeProfile}
            projects={projects.filter((project) => project.creatorId === activeProfile.id)}
            isFollowed={followedCreators.includes(activeProfile.id)}
            toggleFollow={toggleFollow}
            setView={setView}
          />
        )}
      </main>
    </div>
  );
}

function Sidebar({ view, setView, savedCount }: { view: string; setView: (view: View) => void; savedCount: number }) {
  const items = [
    { id: "home", label: "Home", icon: Home, action: () => setView({ name: "home" }) },
    { id: "discover", label: "Discover", icon: Search, action: () => setView({ name: "discover" }) },
    { id: "journal", label: "Journal", icon: Plus, action: () => setView({ name: "journal" }) },
    { id: "collections", label: `Saved (${savedCount})`, icon: Bookmark, action: () => setView({ name: "collections" }) },
    { id: "stitchAlong", label: "Stitch-along", icon: CalendarDays, action: () => setView({ name: "stitchAlong" }) },
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

function HomeView(props: {
  projects: Project[];
  stitchAlong: StitchAlong;
  followedCreators: string[];
  activeProjects: number;
  savedCount: number;
  totalComments: number;
  creatorById: (id: string) => Creator;
  setView: (view: View) => void;
  toggleLike: (id: string) => void;
  toggleSave: (id: string) => void;
}) {
  const followedUpdates = props.projects.filter((project) => props.followedCreators.includes(project.creatorId));

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
          <div className="stats-row" aria-label="Project activity summary">
            <Metric label="Projects" value={props.projects.length.toString()} />
            <Metric label="Active" value={props.activeProjects.toString()} />
            <Metric label="Saved" value={props.savedCount.toString()} />
            <Metric label="Comments" value={props.totalComments.toString()} />
          </div>
          <SectionTitle title="Discovery Feed" action="View all" onAction={() => props.setView({ name: "discover" })} />
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
            {followedUpdates.map((project) => (
              <button key={project.id} className="mini-update" onClick={() => props.setView({ name: "project", id: project.id })}>
                <img src={project.image} alt="" />
                <span>
                  <strong>{project.title}</strong>
                  <small>{project.updates[0]?.milestone}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DiscoverView(props: {
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

function ProjectCard({
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

function ProjectDetail(props: {
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

function JournalView({
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
          <label>Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Status })}>{statusOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
          <label>Difficulty<select value={draft.difficulty} onChange={(event) => setDraft({ ...draft, difficulty: event.target.value as Difficulty })}>{difficultyOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
          <Field label="Category" value={draft.category} onChange={(category) => setDraft({ ...draft, category })} />
          <Field label="Canvas type" value={draft.canvasType} onChange={(canvasType) => setDraft({ ...draft, canvasType })} />
          <Field label="Materials" value={draft.materials} onChange={(materials) => setDraft({ ...draft, materials })} />
          <Field label="Stitch types" value={draft.stitchTypes} onChange={(stitchTypes) => setDraft({ ...draft, stitchTypes })} />
          <Field label="Colors" value={draft.colors} onChange={(colors) => setDraft({ ...draft, colors })} />
          <Field label="Pattern source" value={draft.patternSource} onChange={(patternSource) => setDraft({ ...draft, patternSource })} />
          <Field label="Pattern URL" value={draft.patternUrl} onChange={(patternUrl) => setDraft({ ...draft, patternUrl })} placeholder="Optional source link" />
          <label>Visibility<select value={draft.visibility} onChange={(event) => setDraft({ ...draft, visibility: event.target.value as "public" | "private" })}><option>public</option><option>private</option></select></label>
          <label className="full-field">Notes<textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="What are you stitching, what are you testing, and what should future you remember?" /></label>
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

function CollectionsView({
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

function ProfileView({
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

function StitchAlongView({
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

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="all">All</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function Field({ label, value, onChange, placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label>{label}<input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div className="meta"><span>{label}</span><strong>{value}</strong></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric-card"><strong>{value}</strong><span>{label}</span></div>;
}

function EmptyState({ title, body, action, onAction }: { title: string; body: string; action?: string; onAction?: () => void }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{body}</p>
      {action && <button className="secondary" onClick={onAction}>{action}</button>}
    </div>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return <header className="section-header"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></header>;
}

function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <div className="section-title"><h2>{title}</h2>{action && <button className="text-button" onClick={onAction}>{action}</button>}</div>;
}

function unique(values: string[]) {
  return Array.from(new Set(values)).sort();
}

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export default App;
