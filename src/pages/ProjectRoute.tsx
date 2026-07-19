import { useParams } from "react-router-dom";
import type { Creator, Project, Store } from "../types";
import type { DraftProject, View } from "../appModel";
import type { ReportInput } from "../api/reports";
import { DetailSkeleton, EmptyState } from "../components/ui";
import { uiCopy } from "../lib/uiCopy";
import { ProjectDetail } from "./ProjectDetailPage";

export function ProjectRoute(props: {
  projectById: (id: string) => Project | undefined;
  creatorById: (id: string) => Creator;
  followedCreators: string[];
  updateNote: string;
  updateMilestone: string;
  commentText: string;
  canComment?: boolean;
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
  shareProject: (id: string) => void;
  saveProjectEdits: (id: string, draft: DraftProject & { progress: number }, imageFile?: File | null) => Promise<void>;
  isOwnerFor: (project: Project) => boolean;
  canUpload: boolean;
  stores: Store[];
  setView: (view: View) => void;
  projectLoading?: boolean;
  onReport?: (input: ReportInput) => void | Promise<void>;
}) {
  const { id = "" } = useParams();
  const project = props.projectById(id);

  if (!project && props.projectLoading) {
    return <DetailSkeleton label="Loading project" />;
  }

  if (!project) {
    return (
      <EmptyState
        variant="detail"
        minHeight={320}
        title={uiCopy.projectDetail.notFound.title}
        body={uiCopy.projectDetail.notFound.body}
        action={uiCopy.projectDetail.notFound.cta}
        onAction={() => props.setView({ name: "discover" })}
      />
    );
  }

  const { isOwnerFor } = props;
  const projectStores = props.stores.filter((store) => (project.storeIds ?? []).includes(store.id));
  return (
    <ProjectDetail
      project={project}
      creator={props.creatorById(project.creatorId)}
      isOwner={isOwnerFor(project)}
      canUpload={props.canUpload}
      followedCreators={props.followedCreators}
      updateNote={props.updateNote}
      updateMilestone={props.updateMilestone}
      commentText={props.commentText}
      canComment={props.canComment !== false}
      updateBusy={props.updateBusy}
      updateError={props.updateError}
      updateImagePreview={props.updateImagePreview}
      updateImageUrl={props.updateImageUrl}
      setUpdateNote={props.setUpdateNote}
      setUpdateMilestone={props.setUpdateMilestone}
      setCommentText={props.setCommentText}
      setUpdateImageUrl={props.setUpdateImageUrl}
      onPickUpdateImage={props.onPickUpdateImage}
      onClearUpdateImage={props.onClearUpdateImage}
      addProgressUpdate={props.addProgressUpdate}
      addComment={props.addComment}
      toggleFollow={props.toggleFollow}
      toggleLike={props.toggleLike}
      toggleSave={props.toggleSave}
      shareProject={props.shareProject}
      saveProjectEdits={props.saveProjectEdits}
      stores={props.stores}
      projectStores={projectStores}
      setView={props.setView}
      onReport={props.onReport}
    />
  );
}
