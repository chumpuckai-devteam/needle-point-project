import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import type { StoreProductInput, StoreProfileInput } from "../api/stores";
import type { StitchingMeetupInput } from "../api/meetups";
import type { DraftProject, View } from "../appModel";
import type { Collection, Creator, Project, StitchAlong, StitchingMeetup, StitchingMeetupRsvpStatus, Store } from "../types";
import {
  AuthPage,
  CollectionsView,
  DiscoverView,
  HomeView,
  JournalView,
  MeetupsRoute,
  OnboardingPage,
  ProfileRoute,
  ProjectRoute,
  StitchAlongRoute,
  StoreRoute,
  StoresView,
} from "../pages";

export type DiscoverFilters = {
  category: string;
  difficulty: string;
  stitch: string;
  color: string;
  status: string;
};

export type StitchAlongCreateInput = {
  title: string;
  description: string;
  theme: string;
  rules: string[];
  startDate: string;
  endDate: string;
  coverImageUrl: string;
};

export type AppRoutesProps = {
  studioFeedProjects: Project[];
  publicProjects: Project[];
  accessibleProjects: Project[];
  filteredProjects: Project[];
  creatorById: (id: string) => Creator;
  creatorByHandle: (handle: string) => Creator | undefined;
  projectById: (id: string) => Project | undefined;
  setView: (view: View) => void;
  toggleLike: (id: string) => void;
  toggleSave: (id: string) => void;
  shareProject: (id: string) => void;
  toggleFollow: (id: string) => void;
  stitchAlong: StitchAlong;
  stitchAlongs: StitchAlong[];
  followedCreators: string[];
  followedStores: string[];
  savedCount: number;
  stores: Store[];
  openDiscover: (patch?: Partial<{ category: string; stitch: string; color: string; status: string; query: string }>) => void;
  dismissRecommendation: (surface: "discover" | "studio", projectId: string) => void;
  hasInterests: boolean;
  /** Signed-in (or demo) may create posts; guests should not see create CTAs. */
  canPost: boolean;
  /** Studio boot still loading remote projects. */
  feedLoading: boolean;
  /** Followed shops rail still hydrating. */
  followedStoresLoading: boolean;
  /** Shop catalog still hydrating. */
  storesLoading: boolean;
  /** True when Studio remote refresh failed (local feed notice + retry). */
  feedRefreshError: boolean;
  onRetryFeed: () => void;
  categories: string[];
  stitches: string[];
  colors: string[];
  query: string;
  filters: DiscoverFilters;
  setQuery: Dispatch<SetStateAction<string>>;
  setFilters: Dispatch<SetStateAction<DiscoverFilters>>;
  collections: Collection[];
  canManageCollections: boolean;
  onCreateCollection: (input: { name: string; description: string }) => Promise<void>;
  onRenameCollection: (id: string, input: { name: string; description: string }) => Promise<void>;
  onDeleteCollection: (id: string) => Promise<void>;
  onReport: (input: import("../api/reports").ReportInput) => Promise<void>;
  draft: DraftProject;
  setDraft: Dispatch<SetStateAction<DraftProject>>;
  submitProject: (event: FormEvent<HTMLFormElement>) => void;
  myProjects: Project[];
  canUpload: boolean;
  uploadBusy: boolean;
  uploadError: string;
  imagePreview: string;
  onPickImage: (file: File | null) => void;
  onClearImage: () => void;
  /** Journal list still hydrating from remote boot. */
  journalLoading: boolean;
  toggleStoreFollow: (storeId: string) => void;
  viewerId: string | null;
  isDemoMode: boolean;
  claimBusy: boolean;
  claimPendingStoreIds: string[];
  claimNotice: string;
  productBusy: boolean;
  productError: string;
  onClaimStore: (storeId: string) => void;
  onCreateProduct: (storeId: string, input: StoreProductInput, imageFile?: File | null) => Promise<void>;
  onUpdateProduct: (
    storeId: string,
    productId: string,
    input: StoreProductInput,
    imageFile?: File | null,
  ) => Promise<void>;
  onDeleteProduct: (storeId: string, productId: string) => Promise<void>;
  profileBusy: boolean;
  profileError: string;
  profileSuccess: string;
  onUpdateProfile: (
    storeId: string,
    input: StoreProfileInput,
    files?: { avatarFile?: File | null; coverFile?: File | null },
  ) => Promise<void>;
  joinStitchAlong: (stitchAlongId?: string) => void;
  submitToStitchAlong: (projectId: string, stitchAlongId?: string) => void;
  canHost: boolean;
  onCreateStitchAlong: (input: StitchAlongCreateInput) => void;
  salCreateBusy: boolean;
  salCreateError: string;
  meetups: StitchingMeetup[];
  onCreateMeetup: (input: StitchingMeetupInput) => void;
  meetupCreateBusy: boolean;
  meetupCreateError: string;
  onMeetupRsvp: (meetupId: string, status: StitchingMeetupRsvpStatus | null) => void;
  onCancelMeetup: (meetupId: string) => void;
  meetupRsvpBusy: boolean;
  ownedStoreId: string | null;
  updateNote: string;
  updateMilestone: string;
  commentText: string;
  canComment: boolean;
  updateBusy: boolean;
  updateError: string;
  updateImagePreview: string;
  updateImageUrl: string;
  setUpdateNote: Dispatch<SetStateAction<string>>;
  setUpdateMilestone: Dispatch<SetStateAction<string>>;
  setCommentText: Dispatch<SetStateAction<string>>;
  setUpdateImageUrl: Dispatch<SetStateAction<string>>;
  onPickUpdateImage: (file: File | null) => void;
  onClearUpdateImage: () => void;
  addProgressUpdate: (id: string) => void;
  addComment: (projectId: string) => void;
  saveProjectEdits: (
    projectId: string,
    draft: DraftProject & { progress: number },
    imageFile?: File | null,
  ) => Promise<void>;
  isOwnerFor: (project: Project) => boolean;
  /** Project detail still waiting on first remote hydrate. */
  projectLoading: boolean;
};

/** Declarative route tree. Data and actions come from AppShell. */
export function AppRoutes(props: AppRoutesProps) {
  const sharedProps = {
    projects: props.publicProjects,
    creatorById: props.creatorById,
    setView: props.setView,
    toggleLike: props.toggleLike,
    toggleSave: props.toggleSave,
    shareProject: props.shareProject,
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <HomeView
            {...sharedProps}
            projects={props.studioFeedProjects}
            stitchAlong={props.stitchAlong}
            stitchAlongs={props.stitchAlongs}
            followedCreators={props.followedCreators}
            followedStoreIds={props.followedStores}
            followedStoresLoading={props.followedStoresLoading}
            savedCount={props.savedCount}
            stores={props.stores}
            meetups={props.meetups}
            openDiscover={props.openDiscover}
            dismissRecommendation={(projectId) => props.dismissRecommendation("studio", projectId)}
            hasInterests={props.hasInterests}
            canPost={props.canPost}
            feedLoading={props.feedLoading}
            feedRefreshError={props.feedRefreshError}
            onRetryFeed={props.onRetryFeed}
          />
        }
      />
      <Route
        path="/discover"
        element={
          <DiscoverView
            {...sharedProps}
            projects={props.filteredProjects}
            categories={props.categories}
            stitches={props.stitches}
            colors={props.colors}
            query={props.query}
            filters={props.filters}
            setQuery={props.setQuery}
            setFilters={props.setFilters}
            clearFilters={() => {
              props.setQuery("");
              props.setFilters({ category: "all", difficulty: "all", stitch: "all", color: "all", status: "all" });
            }}
            dismissRecommendation={(projectId) => props.dismissRecommendation("discover", projectId)}
            hasInterests={props.hasInterests}
          />
        }
      />
      <Route
        path="/collections"
        element={
          <CollectionsView
            collections={props.collections}
            projects={props.accessibleProjects}
            creatorById={props.creatorById}
            setView={props.setView}
            canManage={props.canManageCollections}
            onCreateCollection={props.onCreateCollection}
            onRenameCollection={props.onRenameCollection}
            onDeleteCollection={props.onDeleteCollection}
          />
        }
      />
      <Route
        path="/journal"
        element={
          <JournalView
            draft={props.draft}
            setDraft={props.setDraft}
            submitProject={props.submitProject}
            myProjects={props.myProjects}
            setView={props.setView}
            canUpload={props.canUpload}
            uploadBusy={props.uploadBusy}
            uploadError={props.uploadError}
            imagePreview={props.imagePreview}
            onPickImage={props.onPickImage}
            onClearImage={props.onClearImage}
            stores={props.stores}
            journalLoading={props.journalLoading}
          />
        }
      />
      <Route
        path="/stores"
        element={
          <StoresView stores={props.stores} storesLoading={props.storesLoading} setView={props.setView} onRetry={props.onRetryFeed} />
        }
      />
      <Route
        path="/stores/:handle"
        element={
          <StoreRoute
            stores={props.stores}
            storesLoading={props.storesLoading}
            projects={props.publicProjects}
            meetups={props.meetups}
            followedStores={props.followedStores}
            toggleStoreFollow={props.toggleStoreFollow}
            currentUserId={props.viewerId}
            isDemoMode={props.isDemoMode}
            claimBusy={props.claimBusy}
            claimPendingStoreIds={props.claimPendingStoreIds}
            claimNotice={props.claimNotice}
            productBusy={props.productBusy}
            productError={props.productError}
            onClaimStore={props.onClaimStore}
            onCreateProduct={props.onCreateProduct}
            onUpdateProduct={props.onUpdateProduct}
            onDeleteProduct={props.onDeleteProduct}
            profileBusy={props.profileBusy}
            profileError={props.profileError}
            profileSuccess={props.profileSuccess}
            onUpdateProfile={props.onUpdateProfile}
            setView={props.setView}
            onReport={props.onReport}
          />
        }
      />
      <Route
        path="/stitch-along"
        element={
          <StitchAlongRoute
            stitchAlongs={props.stitchAlongs}
            projects={props.publicProjects}
            myProjects={props.myProjects}
            creatorById={props.creatorById}
            joinStitchAlong={props.joinStitchAlong}
            submitToStitchAlong={props.submitToStitchAlong}
            setView={props.setView}
            canHost={props.canHost}
            onCreate={props.onCreateStitchAlong}
            createBusy={props.salCreateBusy}
            createError={props.salCreateError}
          />
        }
      />
      <Route
        path="/stitch-along/:id"
        element={
          <StitchAlongRoute
            stitchAlongs={props.stitchAlongs}
            projects={props.publicProjects}
            myProjects={props.myProjects}
            creatorById={props.creatorById}
            joinStitchAlong={props.joinStitchAlong}
            submitToStitchAlong={props.submitToStitchAlong}
            setView={props.setView}
            canHost={props.canHost}
            onCreate={props.onCreateStitchAlong}
            createBusy={props.salCreateBusy}
            createError={props.salCreateError}
          />
        }
      />
      <Route
        path="/meetups"
        element={
          <MeetupsRoute
            meetups={props.meetups}
            stores={props.stores}
            creatorById={props.creatorById}
            setView={props.setView}
            canHost={props.canHost}
            viewerId={props.viewerId}
            ownedStoreId={props.ownedStoreId}
            onCreate={props.onCreateMeetup}
            createBusy={props.meetupCreateBusy}
            createError={props.meetupCreateError}
            onRsvp={props.onMeetupRsvp}
            onCancel={props.onCancelMeetup}
            rsvpBusy={props.meetupRsvpBusy}
          />
        }
      />
      <Route
        path="/meetups/:id"
        element={
          <MeetupsRoute
            meetups={props.meetups}
            stores={props.stores}
            creatorById={props.creatorById}
            setView={props.setView}
            canHost={props.canHost}
            viewerId={props.viewerId}
            ownedStoreId={props.ownedStoreId}
            onCreate={props.onCreateMeetup}
            createBusy={props.meetupCreateBusy}
            createError={props.meetupCreateError}
            onRsvp={props.onMeetupRsvp}
            onCancel={props.onCancelMeetup}
            rsvpBusy={props.meetupRsvpBusy}
          />
        }
      />
      <Route
        path="/projects/:id"
        element={
          <ProjectRoute
            projectById={props.projectById}
            creatorById={props.creatorById}
            followedCreators={props.followedCreators}
            updateNote={props.updateNote}
            updateMilestone={props.updateMilestone}
            commentText={props.commentText}
            canComment={props.canComment}
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
            isOwnerFor={props.isOwnerFor}
            canUpload={props.canUpload}
            stores={props.stores}
            setView={props.setView}
            projectLoading={props.projectLoading}
            onReport={props.onReport}
          />
        }
      />
      <Route
        path="/u/:handle"
        element={
          <ProfileRoute
            creatorByHandle={props.creatorByHandle}
            projects={props.accessibleProjects}
            viewerId={props.viewerId}
            followedCreators={props.followedCreators}
            toggleFollow={props.toggleFollow}
            setView={props.setView}
            onReport={props.onReport}
          />
        }
      />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/auth/signup" element={<AuthPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
