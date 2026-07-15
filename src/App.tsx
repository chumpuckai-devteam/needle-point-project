import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { createProjectOnline, fetchPublicProjects, addProgressUpdateOnline } from "./api/projects";
import { completeOnboarding, fetchProfiles, toggleFollowOnline } from "./api/profiles";
import { addCommentOnline, toggleProjectLikeOnline, toggleSaveOnline } from "./api/social";
import { creators as seedCreators, initialCollections, initialProjects, stitchAlong as seedStitchAlong } from "./data";
import type { Collection, Creator, Project, StitchAlong } from "./types";
import {
  CollectionsView,
  DiscoverView,
  EmptyState,
  HomeView,
  JournalView,
  ProjectDetail,
  ProfileView,
  SectionHeader,
  Sidebar,
  StitchAlongView,
} from "./AppComponents";
import { AuthForm, AuthProvider, useAuth } from "./context/AuthContext";
import { isSupabaseConfigured } from "./lib/supabase";
import { loadFromStorage, saveToStorage } from "./lib/storage";
import { blankDraft, fallbackImages, splitList, unique } from "./appModel";
import type { DraftProject, View } from "./appModel";

const DEMO_CREATOR_ID = "c2";

const STORAGE_KEYS = {
  projects: "needle-point-project:projects",
  collections: "needle-point-project:collections",
  follows: "needle-point-project:follows",
  stitchAlong: "needle-point-project:stitchAlong",
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  );
}

function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isDemoMode } = useAuth();
  const [creators, setCreators] = useState<Creator[]>(seedCreators);
  const [projects, setProjects] = useState<Project[]>(() => loadFromStorage(STORAGE_KEYS.projects, initialProjects));
  const [collections, setCollections] = useState<Collection[]>(() => loadFromStorage(STORAGE_KEYS.collections, initialCollections));
  const [stitchAlong, setStitchAlong] = useState<StitchAlong>(() => loadFromStorage(STORAGE_KEYS.stitchAlong, seedStitchAlong));
  const [followedCreators, setFollowedCreators] = useState<string[]>(() => loadFromStorage(STORAGE_KEYS.follows, ["c1"]));
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ category: "all", difficulty: "all", stitch: "all", color: "all", status: "all" });
  const [draft, setDraft] = useState<DraftProject>(blankDraft);
  const [updateNote, setUpdateNote] = useState("");
  const [commentText, setCommentText] = useState("");
  const [remoteError, setRemoteError] = useState("");
  const [hydrating, setHydrating] = useState(false);

  const meCreatorId = isDemoMode ? DEMO_CREATOR_ID : user?.id ?? DEMO_CREATOR_ID;

  useEffect(() => saveToStorage(STORAGE_KEYS.projects, projects), [projects]);
  useEffect(() => saveToStorage(STORAGE_KEYS.collections, collections), [collections]);
  useEffect(() => saveToStorage(STORAGE_KEYS.follows, followedCreators), [followedCreators]);
  useEffect(() => saveToStorage(STORAGE_KEYS.stitchAlong, stitchAlong), [stitchAlong]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    setHydrating(true);
    (async () => {
      try {
        const [remoteProjects, remoteProfiles] = await Promise.all([
          fetchPublicProjects(user?.id ?? null),
          fetchProfiles(),
        ]);
        if (cancelled) return;
        if (remoteProfiles.length) setCreators(remoteProfiles);
        if (remoteProjects.length) setProjects(remoteProjects);
        setRemoteError("");
      } catch (error) {
        if (!cancelled) {
          setRemoteError(error instanceof Error ? error.message : "Failed to load remote data");
        }
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const creatorById = useCallback(
    (id: string) => creators.find((creator) => creator.id === id) ?? creators[0] ?? seedCreators[0],
    [creators],
  );
  const creatorByHandle = useCallback((handle: string) => creators.find((creator) => creator.handle === handle), [creators]);
  const projectById = (id: string) => projects.find((project) => project.id === id);
  const savedProjects = projects.filter((project) => project.isSaved);
  const myProjects = projects.filter((project) => project.creatorId === meCreatorId);
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
  }, [creatorById, filters, projects, query]);

  function setView(view: View) {
    navigate(pathForView(view));
  }

  function toggleLike(id: string) {
    const project = projects.find((item) => item.id === id);
    setProjects((current) =>
      current.map((item) =>
        item.id === id ? { ...item, isLiked: !item.isLiked, likes: item.likes + (item.isLiked ? -1 : 1) } : item,
      ),
    );
    if (isSupabaseConfigured && user && project) {
      void toggleProjectLikeOnline(id, user.id, project.isLiked).catch((error) => {
        setRemoteError(error instanceof Error ? error.message : "Like failed");
      });
    }
  }

  function toggleSave(id: string) {
    const project = projects.find((item) => item.id === id);
    setProjects((current) => current.map((item) => (item.id === id ? { ...item, isSaved: !item.isSaved } : item)));
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
    if (isSupabaseConfigured && user && project) {
      void toggleSaveOnline(user.id, id, project.isSaved).catch((error) => {
        setRemoteError(error instanceof Error ? error.message : "Save failed");
      });
    }
  }

  function toggleFollow(id: string) {
    const currently = followedCreators.includes(id);
    setFollowedCreators((current) => (currently ? current.filter((creatorId) => creatorId !== id) : [...current, id]));
    if (isSupabaseConfigured && user) {
      void toggleFollowOnline(user.id, id, currently).catch((error) => {
        setRemoteError(error instanceof Error ? error.message : "Follow failed");
      });
    }
  }

  async function submitProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim() || !draft.notes.trim()) return;

    const image = draft.image.trim() || fallbackImages[projects.length % fallbackImages.length];
    const progress = draft.status === "finished" ? 100 : draft.status === "planned" ? 5 : 20;
    const materials = splitList(draft.materials);
    const stitchTypes = splitList(draft.stitchTypes);
    const colors = splitList(draft.colors);
    const payload = {
      title: draft.title.trim(),
      notes: draft.notes.trim(),
      image,
      status: draft.status,
      difficulty: draft.difficulty,
      category: draft.category.trim() || "journal",
      canvasType: draft.canvasType.trim() || "18 mesh canvas",
      materials,
      stitchTypes,
      colors,
      patternSource: draft.patternSource.trim() || "Personal stash",
      patternUrl: draft.patternUrl.trim() || "https://example.com/new-project",
      visibility: draft.visibility,
      progress,
    };

    try {
      let project: Project;
      if (isSupabaseConfigured && user) {
        project = await createProjectOnline({ userId: user.id, ...payload });
      } else {
        project = {
          id: `p${Date.now()}`,
          creatorId: meCreatorId,
          isLiked: false,
          isSaved: false,
          likes: 0,
          updates: [
            {
              id: `u${Date.now()}`,
              date: "Today",
              milestone: "Project started",
              note: payload.notes,
              image: fallbackImages[(projects.length + 1) % fallbackImages.length],
              likes: 0,
              comments: [],
            },
          ],
          ...payload,
        };
      }

      setProjects((current) => [project, ...current]);
      setDraft(blankDraft);
      setView({ name: "project", id: project.id });
      setRemoteError("");
    } catch (error) {
      setRemoteError(error instanceof Error ? error.message : "Could not save project");
    }
  }

  function addProgressUpdate(projectId: string) {
    if (!updateNote.trim()) return;
    const note = updateNote.trim();
    const project = projects.find((item) => item.id === projectId);
    setProjects((current) =>
      current.map((item) =>
        item.id === projectId
          ? {
              ...item,
              progress: Math.min(100, item.progress + 12),
              status: item.status === "planned" ? "in progress" : item.status,
              updates: [
                {
                  id: `u${Date.now()}`,
                  date: "Today",
                  milestone: "Progress logged",
                  note,
                  image: item.image,
                  likes: 0,
                  comments: [],
                },
                ...item.updates,
              ],
            }
          : item,
      ),
    );
    setUpdateNote("");
    if (isSupabaseConfigured && user && project) {
      void addProgressUpdateOnline(projectId, user.id, note, project.image).catch((error) => {
        setRemoteError(error instanceof Error ? error.message : "Update failed");
      });
    }
  }

  function addComment(projectId: string) {
    if (!commentText.trim()) return;
    const body = commentText.trim();
    const author = user?.name || "You";
    const project = projects.find((item) => item.id === projectId);
    const latestUpdateId = project?.updates[0]?.id;
    setProjects((current) =>
      current.map((item) =>
        item.id === projectId
          ? {
              ...item,
              updates: item.updates.map((update, index) =>
                index === 0
                  ? {
                      ...update,
                      comments: [...update.comments, { id: `cm${Date.now()}`, author, body }],
                    }
                  : update,
              ),
            }
          : item,
      ),
    );
    setCommentText("");
    if (isSupabaseConfigured && user && latestUpdateId && !latestUpdateId.startsWith("u") && !latestUpdateId.startsWith("local-")) {
      void addCommentOnline(latestUpdateId, user.id, body).catch((error) => {
        setRemoteError(error instanceof Error ? error.message : "Comment failed");
      });
    }
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

  const sharedProps = {
    projects,
    creatorById,
    setView,
    toggleLike,
    toggleSave,
  };

  return (
    <div className="app-shell">
      <Sidebar view={viewNameForPath(location.pathname)} setView={setView} savedCount={savedProjects.length} />
      <main>
        {(hydrating || remoteError) && (
          <div className="page" style={{ paddingBottom: 0 }}>
            {hydrating && <p className="eyebrow">Syncing with Supabase…</p>}
            {remoteError && <p className="eyebrow" style={{ color: "#8a2f2f" }}>{remoteError}</p>}
          </div>
        )}
        <Routes>
          <Route
            path="/"
            element={
              <HomeView
                {...sharedProps}
                stitchAlong={stitchAlong}
                followedCreators={followedCreators}
                activeProjects={activeProjects}
                savedCount={savedProjects.length}
                totalComments={totalComments}
              />
            }
          />
          <Route
            path="/discover"
            element={
              <DiscoverView
                {...sharedProps}
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
              />
            }
          />
          <Route path="/collections" element={<CollectionsView collections={collections} projects={projects} creatorById={creatorById} setView={setView} />} />
          <Route path="/journal" element={<JournalView draft={draft} setDraft={setDraft} submitProject={submitProject} myProjects={myProjects} setView={setView} />} />
          <Route
            path="/stitch-along"
            element={
              <StitchAlongView
                stitchAlong={stitchAlong}
                projects={projects}
                myProjects={myProjects}
                creatorById={creatorById}
                joinStitchAlong={joinStitchAlong}
                submitToStitchAlong={submitToStitchAlong}
                setView={setView}
              />
            }
          />
          <Route
            path="/projects/:id"
            element={
              <ProjectRoute
                projectById={projectById}
                creatorById={creatorById}
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
            }
          />
          <Route path="/u/:handle" element={<ProfileRoute creatorByHandle={creatorByHandle} projects={projects} followedCreators={followedCreators} toggleFollow={toggleFollow} setView={setView} />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function ProjectRoute(props: {
  projectById: (id: string) => Project | undefined;
  creatorById: (id: string) => Creator;
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
  const { id = "" } = useParams();
  const project = props.projectById(id);
  if (!project) return <EmptyState title="Project not found" body="That project may have been moved or removed." action="Back to discover" onAction={() => props.setView({ name: "discover" })} />;

  return <ProjectDetail project={project} creator={props.creatorById(project.creatorId)} {...props} />;
}

function ProfileRoute({
  creatorByHandle,
  projects,
  followedCreators,
  toggleFollow,
  setView,
}: {
  creatorByHandle: (handle: string) => Creator | undefined;
  projects: Project[];
  followedCreators: string[];
  toggleFollow: (id: string) => void;
  setView: (view: View) => void;
}) {
  const { handle = "" } = useParams();
  const creator = creatorByHandle(handle);
  if (!creator) return <EmptyState title="Profile not found" body="That stitcher profile is not available." action="Back home" onAction={() => setView({ name: "home" })} />;

  return <ProfileView creator={creator} projects={projects.filter((project) => project.creatorId === creator.id)} isFollowed={followedCreators.includes(creator.id)} toggleFollow={toggleFollow} setView={setView} />;
}

function AuthPage() {
  const { isDemoMode, handle, user, signOut } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  return (
    <section className="page">
      <SectionHeader eyebrow="Auth" title={isDemoMode ? `Demo mode active as @${handle}` : "Sign in to Needlepoint"} />
      <p>
        {isSupabaseConfigured
          ? "Password auth via Supabase. Create an account, then log project journals that persist for every device."
          : "Supabase env is missing, so the app uses a local demo session. Follow docs/supabase-setup.md to go multi-user."}
      </p>
      {user && !isDemoMode && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <p>
            Signed in as <strong>{user.name}</strong> (@{user.handle})
          </p>
          <button className="secondary" type="button" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      )}
      <div className="card-actions wrap" style={{ marginBottom: 12 }}>
        <button className={mode === "signin" ? "selected" : ""} type="button" onClick={() => setMode("signin")}>
          Sign in
        </button>
        <button className={mode === "signup" ? "selected" : ""} type="button" onClick={() => setMode("signup")}>
          Create account
        </button>
      </div>
      <AuthForm mode={mode} />
    </section>
  );
}

function OnboardingPage() {
  const { handle, user, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const interests = ["beginner projects", "ornaments", "canvases", "pillows", "holiday", "florals", "animals", "modern patterns"];
  const [selected, setSelected] = useState<string[]>(() => loadFromStorage("needle-point-project:interests", ["ornaments", "florals"]));
  const [skill, setSkill] = useState(() => loadFromStorage("needle-point-project:skill", "confident beginner"));

  function toggleInterest(interest: string) {
    setSelected((current) => (current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest]));
  }

  async function finish() {
    saveToStorage("needle-point-project:interests", selected);
    saveToStorage("needle-point-project:skill", skill);
    if (!isDemoMode && user) {
      try {
        await completeOnboarding(user.id, selected, skill);
      } catch {
        // still allow local completion
      }
    }
    navigate("/");
  }

  return (
    <section className="page">
      <SectionHeader eyebrow="Onboarding" title="Set up your stitching profile" />
      <div className="panel form-grid">
        <p className="full-field">Welcome @{handle}. Pick interests (skippable) so discovery can feel craft-specific from day one.</p>
        <label htmlFor="onboarding-skill" className="full-field">
          Skill level
          <select id="onboarding-skill" value={skill} onChange={(event) => setSkill(event.target.value)}>
            <option>beginner</option>
            <option>confident beginner</option>
            <option>intermediate</option>
            <option>advanced</option>
          </select>
        </label>
        <div className="tag-row full-field">
          {interests.map((interest) => (
            <button key={interest} type="button" className={selected.includes(interest) ? "selected" : ""} onClick={() => toggleInterest(interest)}>
              {interest}
            </button>
          ))}
        </div>
        <button className="secondary" type="button" onClick={() => navigate("/")}>
          Skip for now
        </button>
        <button className="primary" type="button" onClick={() => void finish()}>
          Save preferences
        </button>
      </div>
    </section>
  );
}

function pathForView(view: View) {
  if (view.name === "home") return "/";
  if (view.name === "discover") return "/discover";
  if (view.name === "journal") return "/journal";
  if (view.name === "collections") return "/collections";
  if (view.name === "stitchAlong") return "/stitch-along";
  if (view.name === "auth") return "/auth";
  if (view.name === "onboarding") return "/onboarding";
  if (view.name === "project") return `/projects/${view.id}`;
  const creator = seedCreators.find((candidate) => candidate.id === view.id);
  return `/u/${creator?.handle ?? view.id}`;
}

function viewNameForPath(pathname: string) {
  if (pathname.startsWith("/discover")) return "discover";
  if (pathname.startsWith("/journal")) return "journal";
  if (pathname.startsWith("/collections")) return "collections";
  if (pathname.startsWith("/stitch-along")) return "stitchAlong";
  if (pathname.startsWith("/projects")) return "project";
  if (pathname.startsWith("/u/")) return "profile";
  if (pathname.startsWith("/auth")) return "auth";
  if (pathname.startsWith("/onboarding")) return "onboarding";
  return "home";
}

export default App;
