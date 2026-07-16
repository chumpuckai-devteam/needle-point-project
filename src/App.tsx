import { createProjectOnline, fetchPublicProjects, addProgressUpdateOnline } from "./api/projects";
import { completeOnboarding, fetchProfileById, fetchProfiles, toggleFollowOnline, updateProfile } from "./api/profiles";
import { addCommentOnline, toggleProjectLikeOnline, toggleSaveOnline } from "./api/social";
import { uploadProjectImage, validateImageFile } from "./api/images";
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
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { ExternalLink, Plus } from "lucide-react";

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
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [updateNote, setUpdateNote] = useState("");
  const [commentText, setCommentText] = useState("");
  const [remoteError, setRemoteError] = useState("");

  const meCreatorId = isDemoMode ? DEMO_CREATOR_ID : user?.id ?? DEMO_CREATOR_ID;

  useEffect(() => saveToStorage(STORAGE_KEYS.projects, projects), [projects]);
  useEffect(() => saveToStorage(STORAGE_KEYS.collections, collections), [collections]);
  useEffect(() => saveToStorage(STORAGE_KEYS.follows, followedCreators), [followedCreators]);
  useEffect(() => saveToStorage(STORAGE_KEYS.stitchAlong, stitchAlong), [stitchAlong]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
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

  function openDiscover(patch?: Partial<{ category: string; stitch: string; color: string; status: string; query: string }>) {
    setFilters({
      category: patch?.category ?? "all",
      difficulty: "all",
      stitch: patch?.stitch ?? "all",
      color: patch?.color ?? "all",
      status: patch?.status ?? "all",
    });
    setQuery(patch?.query ?? "");
    navigate("/discover");
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

  function clearDraftImage() {
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setPendingImageFile(null);
    setImagePreview("");
    setUploadError("");
    setDraft((current) => ({ ...current, image: "" }));
  }

  function pickDraftImage(file: File | null) {
    if (!file) return;
    const invalid = validateImageFile(file);
    if (invalid) {
      setUploadError(invalid);
      return;
    }
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setPendingImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setUploadError("");
    // Prefer uploaded file over a previous pasted URL until save
    setDraft((current) => ({ ...current, image: "" }));
  }

  async function submitProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim() || uploadBusy) return;

    setUploadBusy(true);
    setUploadError("");
    try {
      let image = draft.image.trim();
      if (pendingImageFile) {
        if (!user && isSupabaseConfigured) {
          throw new Error("Sign in to upload photos.");
        }
        image = await uploadProjectImage(user?.id || "demo-user", pendingImageFile);
      }
      if (!image) image = fallbackImages[projects.length % fallbackImages.length];

      const progress = draft.status === "finished" ? 100 : draft.status === "planned" ? 5 : 20;
      const materials = splitList(draft.materials);
      const stitchTypes = splitList(draft.stitchTypes);
      const colors = splitList(draft.colors);
      const notes = draft.notes.trim();
      const payload = {
        title: draft.title.trim(),
        notes,
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
              image,
              likes: 0,
              comments: [],
            },
          ],
          ...payload,
        };
      }

      setProjects((current) => [project, ...current]);
      if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
      setPendingImageFile(null);
      setImagePreview("");
      setDraft(blankDraft);
      setView({ name: "project", id: project.id });
      setRemoteError("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save project";
      setUploadError(message);
      setRemoteError(message);
    } finally {
      setUploadBusy(false);
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
        {remoteError && (
          <div className="page" style={{ paddingBottom: 0 }}>
            <p className="eyebrow" style={{ color: "#8a2f2f" }}>
              {remoteError}
            </p>
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
                savedCount={savedProjects.length}
                categories={categories}
                stitches={stitches}
                colors={colors}
                openDiscover={openDiscover}
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
          <Route
            path="/journal"
            element={
              <JournalView
                draft={draft}
                setDraft={setDraft}
                submitProject={(event) => void submitProject(event)}
                myProjects={myProjects}
                setView={setView}
                canUpload={Boolean(user) || !isSupabaseConfigured}
                uploadBusy={uploadBusy}
                uploadError={uploadError}
                imagePreview={imagePreview}
                onPickImage={pickDraftImage}
                onClearImage={clearDraftImage}
              />
            }
          />
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
  const { isDemoMode, handle, user, signOut, loading, refreshUser } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const navigate = useNavigate();

  if (loading) {
    return (
      <section className="page">
        <SectionHeader eyebrow="Account" title="Loading your session…" />
      </section>
    );
  }

  if (user && !isDemoMode) {
    return <AccountSettings userId={user.id} email={user.email} onSignOut={() => void signOut()} onSaved={refreshUser} />;
  }

  if (isDemoMode) {
    return (
      <section className="page">
        <SectionHeader eyebrow="Account" title={`Demo mode active as @${handle}`} />
        <p>Supabase is not configured in this build, so you are using a local demo session.</p>
        <AuthForm mode="signin" />
      </section>
    );
  }

  return (
    <section className="page">
      <SectionHeader eyebrow="Account" title="Sign in to Needlepoint" />
      <p>Create an account or sign in to keep journals, likes, and follows across devices.</p>
      <div className="card-actions wrap" style={{ marginBottom: 12 }}>
        <button className={mode === "signin" ? "selected" : ""} type="button" onClick={() => setMode("signin")}>
          Sign in
        </button>
        <button className={mode === "signup" ? "selected" : ""} type="button" onClick={() => setMode("signup")}>
          Create account
        </button>
      </div>
      <AuthForm mode={mode} />
      <p style={{ marginTop: 16 }}>
        New here? After signup, visit{" "}
        <button className="text-button" type="button" onClick={() => navigate("/onboarding")}>
          Onboarding
        </button>{" "}
        to set skill and interests.
      </p>
    </section>
  );
}

function AccountSettings({
  userId,
  email,
  onSignOut,
  onSaved,
}: {
  userId: string;
  email?: string;
  onSignOut: () => void;
  onSaved: (patch: { name?: string; handle?: string }) => void;
}) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [skillLevel, setSkillLevel] = useState("confident beginner");
  const [location, setLocation] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isCreator, setIsCreator] = useState(false);
  const [linksText, setLinksText] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [myProjects, setMyProjects] = useState<Project[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await fetchProfileById(userId);
        if (cancelled || !profile) return;
        setName(profile.name);
        setHandle(profile.handle);
        setBio(profile.bio);
        setSkillLevel(profile.skillLevel || "confident beginner");
        setLocation(profile.location || "");
        setAvatarUrl(profile.avatar.startsWith("http") ? profile.avatar : "");
        setIsCreator(profile.isCreator);
        setLinksText(
          profile.links.length
            ? profile.links.map((link) => `${link.label} | ${link.url}`).join("\n")
            : "",
        );
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load profile");
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Pull current projects from local app state via a lightweight re-fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!isSupabaseConfigured) return;
        const all = await fetchPublicProjects(userId);
        if (!cancelled) setMyProjects(all.filter((project) => project.creatorId === userId));
      } catch {
        // non-blocking
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const links = linksText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [label, ...rest] = line.split("|");
          return { label: (label || "").trim(), url: rest.join("|").trim() };
        })
        .filter((link) => link.label && link.url);

      const profile = await updateProfile(userId, {
        name,
        handle,
        bio,
        skillLevel,
        location,
        avatarUrl: avatarUrl === "/assets/needlepoint-hero.png" ? "" : avatarUrl,
        isCreator,
        links,
      });
      onSaved({ name: profile.name, handle: profile.handle });
      setMessage("Account settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save account settings");
    } finally {
      setBusy(false);
    }
  }

  if (loadingProfile) {
    return (
      <section className="page">
        <SectionHeader eyebrow="Account" title="Loading your profile…" />
      </section>
    );
  }

  return (
    <section className="page">
      <SectionHeader eyebrow="Account settings" title={name || "Your profile"} />
      <div className="editor-layout">
        <form className="panel form-grid" onSubmit={(event) => void save(event)}>
          <div className="full-field account-identity">
            <img src={avatarUrl || "/assets/needlepoint-hero.png"} alt="" />
            <div>
              <strong>@{handle || "handle"}</strong>
              <p style={{ margin: "4px 0 0" }}>{email || "No email on file"}</p>
            </div>
          </div>
          <label htmlFor="account-name">
            Display name
            <input id="account-name" value={name} onChange={(event) => setName(event.target.value)} required autoComplete="name" />
          </label>
          <label htmlFor="account-handle">
            Handle
            <input
              id="account-handle"
              value={handle}
              onChange={(event) => setHandle(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              required
              minLength={3}
              maxLength={32}
              autoComplete="username"
            />
          </label>
          <label htmlFor="account-location">
            Location
            <input id="account-location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City, State" />
          </label>
          <label htmlFor="account-skill">
            Skill level
            <select id="account-skill" value={skillLevel} onChange={(event) => setSkillLevel(event.target.value)}>
              <option>beginner</option>
              <option>confident beginner</option>
              <option>intermediate</option>
              <option>advanced</option>
              <option>advanced stitcher</option>
              <option>creator shop</option>
            </select>
          </label>
          <label htmlFor="account-avatar" className="full-field">
            Avatar image URL
            <input id="account-avatar" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://…" inputMode="url" />
          </label>
          <label htmlFor="account-bio" className="full-field">
            Bio
            <textarea id="account-bio" value={bio} onChange={(event) => setBio(event.target.value)} placeholder="What do you stitch?" rows={4} />
          </label>
          <label className="checkbox-field" htmlFor="account-creator">
            <input id="account-creator" type="checkbox" checked={isCreator} onChange={(event) => setIsCreator(event.target.checked)} />
            <span>Creator / shop profile</span>
          </label>
          <label htmlFor="account-links" className="full-field">
            External links (one per line: Label | https://…)
            <textarea
              id="account-links"
              value={linksText}
              onChange={(event) => setLinksText(event.target.value)}
              rows={4}
              placeholder={"Pattern shop | https://example.com\nInstagram | https://instagram.com/you"}
            />
          </label>
          <button className="primary full-field" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save account settings"}
          </button>
          {message && <p className="full-field">{message}</p>}
          {error && (
            <p className="full-field" style={{ color: "#8a2f2f" }}>
              {error}
            </p>
          )}
        </form>

        <div className="stack">
          <div className="panel">
            <h2>Quick links</h2>
            <div className="card-actions wrap">
              <button className="secondary" type="button" onClick={() => navigate(`/u/${handle || "me"}`)}>
                View public profile
              </button>
              <button className="secondary" type="button" onClick={() => navigate("/journal")}>
                <Plus size={16} /> New project
              </button>
              <button className="secondary" type="button" onClick={() => navigate("/onboarding")}>
                Edit interests
              </button>
              <button className="secondary" type="button" onClick={onSignOut}>
                Sign out
              </button>
            </div>
          </div>
          <div className="panel">
            <h2>Your journal</h2>
            {myProjects.length ? (
              myProjects.map((project) => (
                <button className="mini-update" key={project.id} type="button" onClick={() => navigate(`/projects/${project.id}`)}>
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
              <EmptyState title="No projects yet" body="Create a journal entry to start tracking progress." action="New project" onAction={() => navigate("/journal")} />
            )}
          </div>
          <div className="panel">
            <h2>Creator tips</h2>
            <p>Add shop and class links above so stitchers can find your patterns from project pages.</p>
            <a className="external" href="https://needle-point-project.vercel.app" target="_blank" rel="noreferrer">
              Open production site <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>
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
