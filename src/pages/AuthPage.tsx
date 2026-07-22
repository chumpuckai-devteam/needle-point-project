import { FormEvent, useCallback, useEffect, useState } from "react";
import { ExternalLink, Plus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchProfileById, updateProfile } from "../api/profiles";
import { fetchPublicProjects } from "../api/projects";
import { AuthForm, useAuth } from "../context/AuthContext";
import { MyReportsPanel } from "../components/MyReportsPanel";
import { userIsModerator } from "../api/reports";
import { isSupabaseConfigured } from "../lib/supabase";
import { mapAccountSaveError, uiCopy } from "../lib/uiCopy";
import type { Project } from "../types";
import { visibilityLabel } from "../appModel";
import { EmptyState, ErrorState, PageLoading, SectionHeader } from "../components/ui";

export function AuthPage() {
  const { isDemoMode, handle, user, signOut, loading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const mode: "signin" | "signup" = location.pathname.includes("/signup") ? "signup" : "signin";

  if (loading) {
    return (
      <section className="page auth-page">
        <div className="auth-card">
          <PageLoading eyebrow="Account" title={uiCopy.auth.sessionLoading} variant="detail" minHeight={280} />
        </div>
      </section>
    );
  }

  if (user && !isDemoMode) {
    return <AccountSettings userId={user.id} email={user.email} isModerator={userIsModerator(user)} onSignOut={() => void signOut()} onSaved={refreshUser} />;
  }

  if (isDemoMode) {
    return (
      <section className="page auth-page">
        <div className="auth-card">
          <SectionHeader eyebrow="Account" title={`Demo mode active as @${handle}`} />
          <p className="auth-lead">Supabase is not configured in this build, so you are using a local demo session.</p>
          <AuthForm mode="signin" />
        </div>
      </section>
    );
  }

  return (
    <section className="page auth-page">
      <div className="auth-card">
        <p className="auth-eyebrow">Account</p>
        <h1 className="auth-title">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
        <p className="auth-lead">
          {mode === "signin"
            ? "Sign in to keep journals, likes, and follows across devices."
            : "Join Needlepoint to share projects, follow stitchers, and save inspiration."}
        </p>

        <AuthForm mode={mode} key={mode} />

        <div className="auth-switch">
          {mode === "signin" ? (
            <p>
              New to Needlepoint?{" "}
              <button className="text-button" type="button" onClick={() => navigate("/auth/signup")}>
                Create an account
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <button className="text-button" type="button" onClick={() => navigate("/auth")}>
                Sign in
              </button>
            </p>
          )}
        </div>

        {mode === "signup" ? (
          <p className="auth-footnote">
            After creating an account, finish{" "}
            <button className="text-button" type="button" onClick={() => navigate("/onboarding")}>
              Onboarding
            </button>{" "}
            to set skill level and interests.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function AccountSettings({
  userId,
  email,
  isModerator = false,
  onSignOut,
  onSaved,
}: {
  userId: string;
  email?: string;
  isModerator?: boolean;
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
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(isSupabaseConfigured);

  const reloadProfile = useCallback(() => {
    setLoadingProfile(true);
    setLoadFailed(false);
    setError("");
    setRetryToken((token) => token + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await fetchProfileById(userId);
        if (cancelled) return;
        if (!profile) {
          setLoadFailed(true);
          setError(uiCopy.auth.account.loadError.body);
          return;
        }
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
        setLoadFailed(false);
        setError("");
      } catch (err) {
        console.error("account profile load failed", err);
        if (!cancelled) {
          setLoadFailed(true);
          setError(uiCopy.auth.account.loadError.body);
        }
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, retryToken]);

  // Pull current projects from local app state via a lightweight re-fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!isSupabaseConfigured) {
          if (!cancelled) {
            setMyProjects([]);
            setProjectsLoading(false);
          }
          return;
        }
        setProjectsLoading(true);
        const all = await fetchPublicProjects(userId);
        if (!cancelled) setMyProjects(all.filter((project) => project.creatorId === userId));
      } catch (err) {
        console.error("account journal list failed", err);
        // non-blocking — keep empty list rather than raw error in the rail
      } finally {
        if (!cancelled) setProjectsLoading(false);
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
      console.error("account settings save failed", err);
      setError(mapAccountSaveError(err));
    } finally {
      setBusy(false);
    }
  }

  if (loadingProfile) {
    return (
      <section className="page">
        <PageLoading eyebrow="Account" title={uiCopy.auth.account.loading} variant="detail" minHeight={320} />
      </section>
    );
  }

  if (loadFailed) {
    return (
      <section className="page">
        <ErrorState
          variant="detail"
          minHeight={320}
          title={uiCopy.auth.account.loadError.title}
          body={error || uiCopy.auth.account.loadError.body}
          action={uiCopy.auth.account.loadError.cta}
          onAction={reloadProfile}
        />
      </section>
    );
  }

  return (
    <section className="page">
      <SectionHeader eyebrow="Account settings" title={name || "Your profile"} />
      <div className="account-quick-links panel" data-testid="account-quick-links">
        <p className="field-help">Jump to places that are under More on mobile.</p>
        <div className="account-quick-link-grid">
          <button type="button" className="secondary" onClick={() => navigate("/collections")}>
            Saved boards
          </button>
          <button type="button" className="secondary" onClick={() => navigate("/messages")}>
            Messages
          </button>
          <button type="button" className="secondary" onClick={() => navigate("/meetups")}>
            Meetups
          </button>
          <button type="button" className="secondary" onClick={() => navigate("/stitch-along")}>
            Stitch-along
          </button>
          {handle ? (
            <button type="button" className="secondary" onClick={() => navigate(`/u/${handle}`)}>
              Public profile
            </button>
          ) : null}
        </div>
      </div>
      <MyReportsPanel enabled />
      {isModerator ? (
        <div className="panel" data-testid="moderation-entry">
          <h2>Moderator tools</h2>
          <p className="field-help">Review open abuse reports from the community.</p>
          <button type="button" className="primary" onClick={() => navigate("/moderation")}>
            Open report queue
          </button>
        </div>
      ) : null}
      <div className="editor-layout">
        <form className="panel form-grid" onSubmit={(event) => void save(event)} aria-busy={busy || undefined}>
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
          {message ? (
            <p className="full-field" role="status">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="full-field field-error" role="alert">
              {error}
            </p>
          ) : null}
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
            {projectsLoading ? (
              <p className="field-help" aria-busy="true">
                {uiCopy.journal.loading}
              </p>
            ) : myProjects.length ? (
              myProjects.map((project) => (
                <button className="mini-update" key={project.id} type="button" onClick={() => navigate(`/projects/${project.id}`)}>
                  <img src={project.image} alt="" />
                  <span>
                    <strong>{project.title}</strong>
                    <small>
                      {project.status} · {project.progress}% · {visibilityLabel(project.visibility)}
                    </small>
                  </span>
                </button>
              ))
            ) : (
              <EmptyState
                title={uiCopy.auth.account.projectsEmpty.title}
                body={uiCopy.auth.account.projectsEmpty.body}
                action={uiCopy.auth.account.projectsEmpty.cta}
                onAction={() => navigate("/journal")}
              />
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
