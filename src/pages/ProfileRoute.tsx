import { useParams } from "react-router-dom";
import type { Creator, Project } from "../types";
import type { View } from "../appModel";
import type { ReportInput } from "../api/reports";
import { recordCreatorLinkClick } from "../api/creatorLinkClicks";
import { EmptyState } from "../components/ui";
import { ProfileView } from "./ProfilePage";

export function ProfileRoute({
  creatorByHandle,
  projects,
  viewerId,
  followedCreators,
  toggleFollow,
  setView,
  onReport,
  onMessageUser,
}: {
  creatorByHandle: (handle: string) => Creator | undefined;
  projects: Project[];
  viewerId: string | null;
  followedCreators: string[];
  toggleFollow: (id: string) => void;
  setView: (view: View) => void;
  onReport?: (input: ReportInput) => void | Promise<void>;
  onMessageUser?: (userId: string) => void | Promise<void>;
}) {
  const { handle = "" } = useParams();
  const creator = creatorByHandle(handle);
  if (!creator)
    return (
      <EmptyState
        variant="detail"
        minHeight={280}
        title="Profile not found"
        body="That stitcher profile is not available."
        action="Back home"
        onAction={() => setView({ name: "home" })}
      />
    );

  const isSelf = Boolean(viewerId && creator.id === viewerId);
  const profileProjects = projects.filter(
    (project) => project.creatorId === creator.id && (project.visibility === "public" || isSelf),
  );

  return (
    <ProfileView
      creator={creator}
      projects={profileProjects}
      isSelf={isSelf}
      isFollowed={followedCreators.includes(creator.id)}
      toggleFollow={toggleFollow}
      onExternalLinkClick={(creatorId, link) => {
        // Online analytics only when first-class profile_link id exists.
        if (link.id) {
          void recordCreatorLinkClick({ profileId: creatorId, profileLinkId: link.id, linkUrl: link.url });
        }
      }}
      onReport={
        !isSelf && onReport
          ? (input) => onReport({ ...input, targetType: "profile", targetId: creator.id, targetLabel: `@${creator.handle}` })
          : undefined
      }
      onMessage={!isSelf && onMessageUser ? () => void onMessageUser(creator.id) : undefined}
      setView={setView}
    />
  );
}
