import { useParams } from "react-router-dom";
import type { Creator, Project } from "../types";
import type { View } from "../appModel";
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
}: {
  creatorByHandle: (handle: string) => Creator | undefined;
  projects: Project[];
  viewerId: string | null;
  followedCreators: string[];
  toggleFollow: (id: string) => void;
  setView: (view: View) => void;
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
  // Other profiles: public only. Own profile: include private journal pieces with badges.
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
        if (!link.id) return;
        void recordCreatorLinkClick({ profileId: creatorId, profileLinkId: link.id, linkUrl: link.url });
      }}
      setView={setView}
    />
  );
}
