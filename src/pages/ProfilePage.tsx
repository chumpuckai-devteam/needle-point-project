import { ExternalLink, UserRound } from "lucide-react";
import type { Creator, Project } from "../types";
import type { View } from "../appModel";
import type { ReportInput } from "../api/reports";
import { EmptyState, SectionTitle } from "../components/ui";
import { ReportControl } from "../components/ReportControl";
import { CreatorLinkAnalytics } from "../components/CreatorLinkAnalytics";

export function ProfileView({
  creator,
  projects,
  isSelf = false,
  isFollowed,
  toggleFollow,
  onExternalLinkClick,
  onReport,
  onMessage,
  setView,
}: {
  creator: Creator;
  projects: Project[];
  isSelf?: boolean;
  isFollowed: boolean;
  toggleFollow: (id: string) => void;
  onExternalLinkClick?: (creatorId: string, link: { id?: string; label: string; url: string }) => void;
  onReport?: (input: ReportInput) => void | Promise<void>;
  onMessage?: () => void;
  setView: (view: View) => void;
}) {
  const publicCount = projects.filter((project) => project.visibility === "public").length;
  const projectCountLabel = isSelf ? projects.length : publicCount;

  return (
    <section className="page">
      <div className="profile-header ig-profile-header">
        <img src={creator.avatar} alt="" />
        <div>
          <p className="eyebrow">{creator.isCreator ? "Creator" : "Stitcher"}</p>
          <h1>{creator.name}</h1>
          <p>
            @{creator.handle}
            {creator.location ? ` · ${creator.location}` : ""} · {creator.followers.toLocaleString()} followers · {projectCountLabel}{" "}
            {projectCountLabel === 1 ? "project" : "projects"}
            {isSelf ? " (includes private)" : ""}
          </p>
          <p>{creator.bio}</p>
          <div className="tag-row">{creator.specialties.map((tag) => <span key={tag}>{tag}</span>)}</div>
        </div>
        {!isSelf ? (
          <div className="profile-actions">
            <button className={`secondary ${isFollowed ? "selected" : ""}`} type="button" onClick={() => toggleFollow(creator.id)}>
              <UserRound size={17} /> {isFollowed ? "Following" : "Follow"}
            </button>
            {onMessage ? (
              <button className="secondary" type="button" onClick={onMessage}>
                Message
              </button>
            ) : null}
            {onReport ? (
              <ReportControl targetType="profile" targetId={creator.id} targetLabel={`@${creator.handle}`} onSubmit={onReport} />
            ) : null}
          </div>
        ) : (
          <button className="secondary" type="button" onClick={() => setView({ name: "journal" })}>
            Your journal
          </button>
        )}
      </div>
      <div className="link-strip">
        {creator.links.map((link) => (
          <a
            href={link.url}
            target="_blank"
            rel="noreferrer"
            key={link.id ?? link.label}
            onClick={() => onExternalLinkClick?.(creator.id, link)}
          >
            {link.label} <ExternalLink size={14} />
          </a>
        ))}
      </div>
      {isSelf ? <CreatorLinkAnalytics profileId={creator.id} /> : null}
      <SectionTitle title={isSelf ? "Your projects" : "Projects"} />
      {projects.length ? (
        <div className="ig-grid" aria-label="Profile project grid">
          {projects.map((project) => (
            <button type="button" className="ig-grid-cell" key={project.id} onClick={() => setView({ name: "project", id: project.id })}>
              <img src={project.image} alt={project.visibility === "private" && isSelf ? "Private project" : project.title} />
              {isSelf && project.visibility === "private" ? (
                <span className="visibility-badge private ig-grid-badge">Private</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No projects yet"
          body={isSelf ? "Create a journal entry to start tracking progress." : "When this stitcher posts, their photos will fill this grid."}
          action={isSelf ? "New project" : undefined}
          onAction={isSelf ? () => setView({ name: "journal" }) : undefined}
        />
      )}
    </section>
  );
}

export { ProfileView as ProfilePage };
